import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { Habit, Challenge } from './types';
import { calcStreak, loadHabits, loadChallenges } from './storage';

const MIGRATION_KEY = 'migration_done_v1';

// ─── Fetch (Supabase → local type) ──────────────────────────────────────────

export async function fetchHabitsFromSupabase(): Promise<Habit[] | null> {
  try {
    const { data: habitsData, error: habitsError } = await supabase
      .from('habits')
      .select('*')
      .order('sort_order', { ascending: true });
    if (habitsError || !habitsData) return null;

    const { data: completions, error: compError } = await supabase
      .from('habit_completions')
      .select('*');
    if (compError) return null;

    return habitsData.map((h) => {
      const habitCompletions = completions.filter((c) => c.habit_id === h.id);
      const completedDates: string[] = [];
      const dailyCounts: Record<string, number> = {};

      for (const c of habitCompletions) {
        dailyCounts[c.completed_date] = c.count;
        if (h.type === 'count' ? c.count >= h.target_count : c.count >= 1) {
          completedDates.push(c.completed_date);
        }
      }

      return {
        id: h.id,
        name: h.name,
        emoji: h.emoji,
        type: h.type,
        targetCount: h.target_count,
        completedDates,
        dailyCounts,
        streak: calcStreak(completedDates),
        createdAt: h.created_at,
        reminder: h.reminder_enabled
          ? { enabled: true, hour: h.reminder_hour, minute: h.reminder_minute }
          : undefined,
      } satisfies Habit;
    });
  } catch {
    return null;
  }
}

export async function fetchChallengesFromSupabase(): Promise<Challenge[] | null> {
  try {
    const { data: challengesData, error } = await supabase
      .from('challenges')
      .select('*');
    if (error || !challengesData) return null;

    const { data: completions, error: compError } = await supabase
      .from('challenge_completions')
      .select('*');
    if (compError) return null;

    return challengesData.map((c) => {
      const completedDays = completions
        .filter((cc) => cc.challenge_id === c.id)
        .map((cc) => cc.completed_date as string);

      return {
        id: c.id,
        name: c.name,
        description: c.description,
        emoji: c.emoji,
        durationDays: c.duration_days,
        startDate: c.start_date ?? null,
        completedDays,
        completed: c.completed,
        rewardClaimed: c.reward_claimed,
        isCustom: c.is_custom,
      } satisfies Challenge;
    });
  } catch {
    return null;
  }
}

// ─── Push (local → Supabase) ─────────────────────────────────────────────────

export async function pushHabitToggle(
  habitId: string,
  date: string,
  isDone: boolean
): Promise<void> {
  try {
    if (isDone) {
      await supabase
        .from('habit_completions')
        .upsert({ habit_id: habitId, completed_date: date, count: 1 }, { onConflict: 'habit_id,completed_date' });
    } else {
      await supabase
        .from('habit_completions')
        .delete()
        .eq('habit_id', habitId)
        .eq('completed_date', date);
    }
  } catch {}
}

export async function pushCountIncrement(
  habitId: string,
  date: string,
  newCount: number
): Promise<void> {
  try {
    if (newCount <= 0) {
      await supabase
        .from('habit_completions')
        .delete()
        .eq('habit_id', habitId)
        .eq('completed_date', date);
    } else {
      await supabase
        .from('habit_completions')
        .upsert(
          { habit_id: habitId, completed_date: date, count: newCount },
          { onConflict: 'habit_id,completed_date' }
        );
    }
  } catch {}
}

export async function pushHabitUpsert(habit: Habit, userId: string): Promise<void> {
  try {
    await supabase.from('habits').upsert({
      id: habit.id,
      user_id: userId,
      name: habit.name,
      emoji: habit.emoji,
      type: habit.type,
      target_count: habit.targetCount,
      created_at: habit.createdAt,
      reminder_enabled: habit.reminder?.enabled ?? false,
      reminder_hour: habit.reminder?.hour ?? 8,
      reminder_minute: habit.reminder?.minute ?? 0,
    });
  } catch {}
}

export async function pushHabitDelete(habitId: string): Promise<void> {
  try {
    await supabase.from('habits').delete().eq('id', habitId);
  } catch {}
}

export async function pushChallengeUpdate(challenge: Challenge, userId: string): Promise<void> {
  try {
    await supabase.from('challenges').upsert({
      id: challenge.id,
      user_id: userId,
      name: challenge.name,
      description: challenge.description,
      emoji: challenge.emoji,
      duration_days: challenge.durationDays,
      start_date: challenge.startDate,
      completed: challenge.completed,
      reward_claimed: challenge.rewardClaimed,
      is_custom: challenge.isCustom ?? false,
    });

    if (challenge.completedDays.length > 0) {
      const rows = challenge.completedDays.map((d) => ({
        challenge_id: challenge.id,
        user_id: userId,
        completed_date: d,
      }));
      await supabase
        .from('challenge_completions')
        .upsert(rows, { onConflict: 'challenge_id,completed_date' });
    }
  } catch {}
}

export async function pushProfileUpdate(
  userId: string,
  patch: Partial<{ onboarding_complete: boolean; notifications_enabled: boolean }>
): Promise<void> {
  try {
    await supabase.from('profiles').update(patch).eq('id', userId);
  } catch {}
}

// ─── One-time migration (local AsyncStorage → Supabase) ─────────────────────

export async function migrateLocalDataToSupabase(userId: string): Promise<void> {
  try {
    const done = await AsyncStorage.getItem(MIGRATION_KEY);
    if (done) return;

    const [habits, challenges] = await Promise.all([loadHabits(), loadChallenges()]);

    // Push habits (without existing completions — upsert by id)
    for (const habit of habits) {
      await pushHabitUpsert(habit, userId);

      // Push completions
      const completionRows: { habit_id: string; user_id: string; completed_date: string; count: number }[] = [];
      for (const date of habit.completedDates) {
        const count = habit.type === 'count' ? (habit.dailyCounts[date] ?? habit.targetCount) : 1;
        completionRows.push({ habit_id: habit.id, user_id: userId, completed_date: date, count });
      }
      // Also push any count entries not in completedDates
      for (const [date, count] of Object.entries(habit.dailyCounts)) {
        if (!habit.completedDates.includes(date)) {
          completionRows.push({ habit_id: habit.id, user_id: userId, completed_date: date, count });
        }
      }
      if (completionRows.length > 0) {
        await supabase
          .from('habit_completions')
          .upsert(completionRows, { onConflict: 'habit_id,completed_date' });
      }
    }

    for (const challenge of challenges) {
      if (challenge.startDate) {
        await pushChallengeUpdate(challenge, userId);
      }
    }

    await AsyncStorage.setItem(MIGRATION_KEY, 'true');
  } catch {}
}
