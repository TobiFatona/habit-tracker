import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Habit } from './types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDailyReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time to track your habits! 💪',
      body: 'A few minutes now builds the life you want.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
    },
  });

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Don't break your streak! 🔥",
      body: "You're so close — finish today's habits.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 21,
      minute: 0,
    },
  });
}

export async function scheduleHabitReminders(habits: Habit[]): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();

  const habitsWithReminders = habits.filter((h) => h.reminder?.enabled);

  if (habitsWithReminders.length === 0) {
    await scheduleDailyReminder();
    return;
  }

  for (const habit of habitsWithReminders) {
    const { hour, minute } = habit.reminder!;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${habit.emoji} Time for: ${habit.name}`,
        body: "Keep your streak alive — check it off!",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  }
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function sendChallengeNudge(daysLeft: number): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${daysLeft} day${daysLeft === 1 ? '' : 's'} left in your challenge! 🏆`,
      body: "You're almost there — keep going!",
    },
    trigger: null,
  });
}

export function formatTime(hour: number, minute: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const m = minute.toString().padStart(2, '0');
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}:${m} ${ampm}`;
}
