import { Stack, router } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../lib/auth-context';
import { supabase } from '../lib/supabase';

function RootNavigator() {
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!session) {
      router.replace('/auth');
      return;
    }

    // Check onboarding status from profiles table
    supabase
      .from('profiles')
      .select('onboarding_complete')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (!data?.onboarding_complete) {
          router.replace('/onboarding');
        } else {
          router.replace('/(tabs)');
        }
      });
  }, [session, loading]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0F0E17' } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="onboarding" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="add" options={{ presentation: 'modal', contentStyle: { backgroundColor: '#0F0E17' } }} />
      <Stack.Screen name="create-challenge" options={{ presentation: 'modal', contentStyle: { backgroundColor: '#0F0E17' } }} />
      <Stack.Screen name="dev" options={{ presentation: 'modal', contentStyle: { backgroundColor: '#0F0E17' } }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
