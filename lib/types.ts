export type HabitType = 'simple' | 'count';

export interface HabitReminder {
  enabled: boolean;
  hour: number;   // 0–23
  minute: number; // 0–59
}

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  streak: number;
  completedDates: string[];
  type: HabitType;
  targetCount: number;
  dailyCounts: Record<string, number>;
  createdAt: string;
  reminder?: HabitReminder;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  emoji: string;
  durationDays: number;
  startDate: string | null;
  completedDays: string[];
  completed: boolean;
  rewardClaimed: boolean;
  isCustom?: boolean;
}

export interface AppState {
  onboardingComplete: boolean;
  notificationsEnabled: boolean;
}
