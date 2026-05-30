import { Stack, router } from 'expo-router';
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { AuthProvider, useAuth } from '../lib/auth-context';
import { supabase } from '../lib/supabase';

function handleResetUrl(url: string) {
  // Supabase puts tokens in the fragment: my-app://reset-password#access_token=...&type=recovery
  const fragment = url.split('#')[1];
  if (!fragment) return;
  const params = new URLSearchParams(fragment);
  if (params.get('type') !== 'recovery') return;
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token') ?? '';
  if (!accessToken) return;
  supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(() => {
    router.replace('/reset-password');
  });
}

function RootNavigator() {
  const { session, loading } = useAuth();

  // Handle deep links (password reset)
  useEffect(() => {
    Linking.getInitialURL().then((url) => { if (url) handleResetUrl(url); });
    const sub = Linking.addEventListener('url', ({ url }) => handleResetUrl(url));
    return () => sub.remove();
  }, []);

  // Handle Supabase PASSWORD_RECOVERY event (fires when session is set from reset link)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        router.replace('/reset-password');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;

    if (!session) {
      router.replace('/auth');
      return;
    }

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
      <Stack.Screen name="reset-password" options={{ presentation: 'fullScreenModal' }} />
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
