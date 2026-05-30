import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function calcStreak(dates: string[]): number {
  const sorted = [...dates].sort().reverse();
  let streak = 0;
  const cursor = new Date();
  for (const d of sorted) {
    const expected = cursor.toISOString().split("T")[0];
    if (d === expected) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }
  return streak;
}

function periodKey(period: "weekly" | "monthly"): string {
  const now = new Date();
  if (period === "weekly") {
    // ISO week: YYYY-Www
    const jan1 = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${String(week).padStart(2, "0")}`;
  }
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response("Unauthorized", { status: 401, headers: CORS });

    const body = await req.json().catch(() => ({}));
    const period: "weekly" | "monthly" = body.period === "monthly" ? "monthly" : "weekly";
    const days = period === "weekly" ? 7 : 30;
    const pKey = periodKey(period);

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) return new Response("Unauthorized", { status: 401, headers: CORS });

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Return cached if same period key exists
    const { data: cached } = await db
      .from("ai_insights")
      .select("content, created_at")
      .eq("user_id", user.id)
      .eq("type", "reflection")
      .eq("period", period)
      .contains("metadata", { period_key: pKey })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify({ content: cached.content, cached: true }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const { data: habits } = await db
      .from("habits")
      .select("id, name, emoji, type, target_count")
      .eq("user_id", user.id);

    if (!habits || habits.length === 0) {
      return new Response(JSON.stringify({ content: null }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const { data: completions } = await db
      .from("habit_completions")
      .select("habit_id, completed_date, count")
      .eq("user_id", user.id)
      .gte("completed_date", cutoff);

    const habitStats = habits.map((h) => {
      const hComp = (completions ?? []).filter((c) => c.habit_id === h.id);
      const doneDates = hComp
        .filter((c) => h.type === "count" ? c.count >= h.target_count : c.count >= 1)
        .map((c) => c.completed_date);
      const consistency = Math.round((doneDates.length / days) * 100);
      const streak = calcStreak(doneDates);

      // Day-of-week breakdown (for weekly period)
      const dowCounts = [0, 0, 0, 0, 0, 0, 0];
      if (period === "weekly") {
        doneDates.forEach((d) => { dowCounts[new Date(d + "T00:00:00").getDay()]++; });
      }

      return { name: h.name, emoji: h.emoji, consistency, streak, doneDays: doneDates.length, dowCounts };
    });

    const avgConsistency = Math.round(
      habitStats.reduce((s, h) => s + h.consistency, 0) / habitStats.length
    );
    const sorted = [...habitStats].sort((a, b) => b.consistency - a.consistency);

    const dowLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const prompt = `You are an insightful personal habit coach writing a ${period} reflection summary.

The user tracked ${habits.length} habit${habits.length > 1 ? "s" : ""} over the past ${days} days:

${habitStats.map((h) => {
  let line = `• ${h.emoji} ${h.name}: ${h.consistency}% completion (${h.doneDays}/${days} days), ${h.streak}-day current streak`;
  if (period === "weekly") {
    const activeDays = h.dowCounts
      .map((c, i) => c > 0 ? dowLabels[i] : null)
      .filter(Boolean).join(", ");
    if (activeDays) line += ` — active on: ${activeDays}`;
  }
  return line;
}).join("\n")}

Overall ${period} consistency: ${avgConsistency}%
Top performer: ${sorted[0].emoji} ${sorted[0].name} (${sorted[0].consistency}%)
${sorted.length > 1 ? `Needs most work: ${sorted[sorted.length - 1].emoji} ${sorted[sorted.length - 1].name} (${sorted[sorted.length - 1].consistency}%)` : ""}

Write a structured ${period} reflection in this exact format:

📊 Overview
[1-2 sentences summarizing the overall ${period}. Be specific with numbers and habit names.]

✅ Wins
[2-3 bullet points highlighting specific achievements. Use real habit names and numbers. Be genuinely impressed if warranted.]

🎯 Focus for next ${period === "weekly" ? "week" : "month"}
[ONE specific habit to improve and ONE concrete, practical tip — not generic advice.]

💬 Coach's note
[One short encouraging sentence to close.]

Keep the total under 180 words. Be data-driven, specific, and genuinely helpful.`;

    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    });

    const content = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";

    await db.from("ai_insights").insert({
      user_id: user.id,
      type: "reflection",
      period,
      content,
      metadata: { period_key: pKey, habitCount: habits.length, avgConsistency },
    });

    return new Response(JSON.stringify({ content, cached: false }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
