import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CACHE_HOURS = 6;

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response("Unauthorized", { status: 401, headers: CORS });

    // Auth client — verifies the user token
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) return new Response("Unauthorized", { status: 401, headers: CORS });

    // Service client — reads/writes data
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Return cached coaching if generated within CACHE_HOURS
    const since = new Date(Date.now() - CACHE_HOURS * 60 * 60 * 1000).toISOString();
    const { data: cached } = await db
      .from("ai_insights")
      .select("content, created_at")
      .eq("user_id", user.id)
      .eq("type", "coaching")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify({ content: cached.content, cached: true }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Fetch habits
    const { data: habits } = await db
      .from("habits")
      .select("id, name, emoji, type, target_count")
      .eq("user_id", user.id);

    if (!habits || habits.length === 0) {
      return new Response(JSON.stringify({ content: null }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Fetch last 30 days of completions
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString().split("T")[0];
    const { data: completions } = await db
      .from("habit_completions")
      .select("habit_id, completed_date, count")
      .eq("user_id", user.id)
      .gte("completed_date", thirtyDaysAgo);

    // Build per-habit stats
    const habitStats = habits.map((h) => {
      const hComp = (completions ?? []).filter((c) => c.habit_id === h.id);
      const doneDates = hComp
        .filter((c) => h.type === "count" ? c.count >= h.target_count : c.count >= 1)
        .map((c) => c.completed_date);
      const consistency = Math.round((doneDates.length / 30) * 100);
      const streak = calcStreak(doneDates);
      return { name: h.name, emoji: h.emoji, streak, consistency, doneDays: doneDates.length };
    });

    const avgConsistency = Math.round(
      habitStats.reduce((s, h) => s + h.consistency, 0) / habitStats.length
    );
    const best = [...habitStats].sort((a, b) => b.consistency - a.consistency)[0];
    const worst = [...habitStats].sort((a, b) => a.consistency - b.consistency)[0];

    const prompt = `You are a concise, encouraging personal habit coach. A user wants a quick personalized nudge based on their last 30 days of habit data.

Their habits:
${habitStats.map((h) => `• ${h.emoji} ${h.name}: ${h.consistency}% consistency, ${h.streak}-day current streak (${h.doneDays}/30 days)`).join("\n")}

Overall average consistency: ${avgConsistency}%
Most consistent: ${best.emoji} ${best.name} (${best.consistency}%)
Needs attention: ${worst.emoji} ${worst.name} (${worst.consistency}%)

Write ONE coaching message of 2-3 sentences that:
- Opens by naming and celebrating something genuinely impressive (use the real habit name and specific number)
- If there's a habit lagging behind, gives a single concrete, practical tip to improve it — be specific, not generic
- Ends with brief encouragement
- Feels personal, warm, direct — not robotic or generic
- Uses plain prose only (no bullet points, no headers, no sign-off)`;

    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });

    const content = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";

    // Cache in DB
    await db.from("ai_insights").insert({
      user_id: user.id,
      type: "coaching",
      period: "daily",
      content,
      metadata: { habitCount: habits.length, avgConsistency },
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
