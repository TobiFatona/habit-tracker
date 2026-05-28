import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const isNative = Platform.OS !== 'web';

export async function lightTap() {
  if (!isNative) return;
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export async function mediumTap() {
  if (!isNative) return;
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export async function heavyTap() {
  if (!isNative) return;
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

export async function successBurst() {
  if (!isNative) return;
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export async function errorBurst() {
  if (!isNative) return;
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}
