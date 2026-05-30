import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';

const BG = '#0F0E17';
const SURFACE = '#1A1929';
const PURPLE = '#6C63FF';
const GREEN = '#22C55E';

type Mode = 'login' | 'signup' | 'forgot';

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot() {
    if (!email.trim()) {
      Alert.alert('Enter your email', 'Type your email address above first.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'my-app://reset-password',
    });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    setResetSent(true);
  }

  function switchMode(next: Mode) {
    setMode(next);
    setResetSent(false);
    setPassword('');
  }

  // ─── Forgot password view ───────────────────────────────────────────────────
  if (mode === 'forgot') {
    return (
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inner}>
          <Text style={styles.logo}>✦</Text>
          <Text style={styles.title}>Reset password</Text>
          <Text style={styles.sub}>
            {resetSent
              ? 'Check your inbox for a reset link.'
              : "Enter your email and we'll send a reset link."}
          </Text>

          {resetSent ? (
            <View style={styles.card}>
              <Text style={styles.sentIcon}>📬</Text>
              <Text style={styles.sentTitle}>Email sent!</Text>
              <Text style={styles.sentBody}>
                Open the link in your email to set a new password. It may take a minute to arrive.
              </Text>
              <TouchableOpacity style={[styles.btn, { marginTop: 20 }]} onPress={() => switchMode('login')}>
                <Text style={styles.btnText}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#555"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleForgot}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>Send Reset Link</Text>
                }
              </TouchableOpacity>
            </View>
          )}

          {!resetSent && (
            <TouchableOpacity style={styles.toggle} onPress={() => switchMode('login')}>
              <Text style={styles.toggleText}>
                ← <Text style={styles.toggleLink}>Back to Sign In</Text>
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ─── Login / Sign up view ───────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>✦</Text>
        <Text style={styles.title}>Habit Tracker</Text>
        <Text style={styles.sub}>
          {mode === 'login' ? 'Sign in to continue' : 'Create your account'}
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#555"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#555"
            secureTextEntry
          />

          {mode === 'login' && (
            <TouchableOpacity style={styles.forgotBtn} onPress={() => switchMode('forgot')}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.toggle}
          onPress={() => switchMode(mode === 'login' ? 'signup' : 'login')}
        >
          <Text style={styles.toggleText}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <Text style={styles.toggleLink}>
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  logo: { fontSize: 40, textAlign: 'center', color: PURPLE, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', textAlign: 'center' },
  sub: { fontSize: 14, color: '#888', textAlign: 'center', marginTop: 6, marginBottom: 32 },
  card: { backgroundColor: SURFACE, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#2A2840' },
  label: { fontSize: 13, fontWeight: '600', color: '#ccc', marginBottom: 8 },
  input: {
    backgroundColor: '#13121F', borderRadius: 12, borderWidth: 1, borderColor: '#3A3860',
    color: '#fff', fontSize: 15, paddingHorizontal: 16, paddingVertical: 12,
  },
  forgotBtn: { alignSelf: 'flex-end', marginTop: 10 },
  forgotText: { fontSize: 13, color: PURPLE, fontWeight: '600' },
  btn: { backgroundColor: PURPLE, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  toggle: { marginTop: 24, alignItems: 'center' },
  toggleText: { color: '#888', fontSize: 14 },
  toggleLink: { color: PURPLE, fontWeight: '700' },
  sentIcon: { fontSize: 40, textAlign: 'center', marginBottom: 12 },
  sentTitle: { fontSize: 18, fontWeight: '800', color: '#fff', textAlign: 'center' },
  sentBody: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 21, marginTop: 8 },
});
