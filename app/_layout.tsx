import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { loadAppState } from '../lib/storage';

export default function RootLayout() {
  const [checked, setChecked] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(true);

  useEffect(() => {
    loadAppState().then((state) => {
      setOnboardingDone(state.onboardingComplete);
      setChecked(true);
    });
  }, []);

  useEffect(() => {
    if (!checked) return;
    if (!onboardingDone) {
      router.replace('/onboarding');
    }
  }, [checked, onboardingDone]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0F0E17' } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="add" options={{ presentation: 'modal', contentStyle: { backgroundColor: '#0F0E17' } }} />
      <Stack.Screen name="create-challenge" options={{ presentation: 'modal', contentStyle: { backgroundColor: '#0F0E17' } }} />
      <Stack.Screen name="dev" options={{ presentation: 'modal', contentStyle: { backgroundColor: '#0F0E17' } }} />
    </Stack>
  );
}
