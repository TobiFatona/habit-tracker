import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Challenge, Habit } from './types';

const HABITS_KEY = 'habits_v2';
const CHALLENGES_KEY = 'challenges_v1';
const APP_STATE_KEY = 'app_state_v1';

export function today(): string {
  return new Date().toISOString().split('T')[0];
}

export function dateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

export function calcStreak(completedDates: string[]): number {
  const sorted = [...completedDates].sort().reverse();
  let streak = 0;
  const cursor = new Date();
  for (const d of sorted) {
    const expected = cursor.toISOString().split('T')[0];
    if (d === expected) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export const DEFAULT_HABITS: Habit[] = [
  { id: '1', name: 'Drink 8 glasses of water', emoji: '💧', streak: 0, completedDates: [], type: 'count', targetCount: 8, dailyCounts: {}, createdAt: today() },
  { id: '2', name: 'Exercise 30 minutes', emoji: '🏃', streak: 0, completedDates: [], type: 'simple', targetCount: 1, dailyCounts: {}, createdAt: today() },
  { id: '3', name: 'Read for 20 minutes', emoji: '📚', streak: 0, completedDates: [], type: 'simple', targetCount: 1, dailyCounts: {}, createdAt: today() },
  { id: '4', name: 'Meditate', emoji: '🧘', streak: 0, completedDates: [], type: 'simple', targetCount: 1, dailyCounts: {}, createdAt: today() },
  { id: '5', name: 'Sleep by 11pm', emoji: '😴', streak: 0, completedDates: [], type: 'simple', targetCount: 1, dailyCounts: {}, createdAt: today() },
];

export const DEFAULT_CHALLENGE: Challenge = {
  id: 'kickstart-3',
  name: '3-Day Kickstart',
  description: 'Complete all your habits for 3 days in a row',
  emoji: '🚀',
  durationDays: 3,
  startDate: null,
  completedDays: [],
  completed: false,
  rewardClaimed: false,
};

export async function loadHabits(): Promise<Habit[]> {
  try {
    const v1Raw = await AsyncStorage.getItem('habits_v1');
    if (v1Raw) {
      const v1: any[] = JSON.parse(v1Raw);
      const migrated: Habit[] = v1.map((h) => ({
        ...h,
        type: h.type ?? 'simple',
        targetCount: h.targetCount ?? 1,
        dailyCounts: h.dailyCounts ?? {},
        createdAt: h.createdAt ?? today(),
        reminder: h.reminder ?? undefined,
      }));
      await AsyncStorage.setItem(HABITS_KEY, JSON.stringify(migrated));
      await AsyncStorage.removeItem('habits_v1');
      return migrated;
    }
    const raw = await AsyncStorage.getItem(HABITS_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_HABITS;
  } catch {
    return DEFAULT_HABITS;
  }
}

export async function saveHabits(habits: Habit[]): Promise<void> {
  await AsyncStorage.setItem(HABITS_KEY, JSON.stringify(habits));
}

export async function loadChallenges(): Promise<Challenge[]> {
  try {
    const raw = await AsyncStorage.getItem(CHALLENGES_KEY);
    return raw ? JSON.parse(raw) : [DEFAULT_CHALLENGE];
  } catch {
    return [DEFAULT_CHALLENGE];
  }
}

export async function saveChallenges(challenges: Challenge[]): Promise<void> {
  await AsyncStorage.setItem(CHALLENGES_KEY, JSON.stringify(challenges));
}

export async function loadAppState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(APP_STATE_KEY);
    return raw ? JSON.parse(raw) : { onboardingComplete: false, notificationsEnabled: false };
  } catch {
    return { onboardingComplete: false, notificationsEnabled: false };
  }
}

export async function saveAppState(state: AppState): Promise<void> {
  await AsyncStorage.setItem(APP_STATE_KEY, JSON.stringify(state));
}

export function isHabitDoneToday(habit: Habit): boolean {
  const t = today();
  if (habit.type === 'count') {
    return (habit.dailyCounts[t] ?? 0) >= habit.targetCount;
  }
  return habit.completedDates.includes(t);
}

export function getTodayCount(habit: Habit): number {
  if (habit.type !== 'count') return 0;
  return habit.dailyCounts[today()] ?? 0;
}

export function getConsistency(habits: Habit[], days: number): number {
  if (habits.length === 0) return 0;
  let doneDays = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const allDone = habits.every((h) => {
      if (h.type === 'count') return (h.dailyCounts[dateStr] ?? 0) >= h.targetCount;
      return h.completedDates.includes(dateStr);
    });
    if (allDone) doneDays++;
  }
  return Math.round((doneDays / days) * 100);
}
