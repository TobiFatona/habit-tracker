import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

const BG = '#0F0E17';
const SURFACE = '#1A1929';
const PURPLE = '#6C63FF';
const GREEN = '#22C55E';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleReset() {
    if (!password || password.length < 6) {
      Alert.alert('Too short', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center', gap: 16 }]}>
        <Text style={{ fontSize: 48 }}>✅</Text>
        <Text style={styles.title}>Password updated!</Text>
        <Text style={styles.sub}>You can now sign in with your new password.</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.replace('/auth')}>
          <Text style={styles.btnText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>🔑</Text>
        <Text style={styles.title}>Set new password</Text>
        <Text style={styles.sub}>Choose a strong password for your account.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>New Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            placeholderTextColor="#555"
            secureTextEntry
            autoFocus
          />

          <Text style={[styles.label, { marginTop: 16 }]}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Repeat your password"
            placeholderTextColor="#555"
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleReset}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Update Password</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  logo: { fontSize: 40, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', textAlign: 'center' },
  sub: { fontSize: 14, color: '#888', textAlign: 'center', marginTop: 6, marginBottom: 32 },
  card: { backgroundColor: SURFACE, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#2A2840' },
  label: { fontSize: 13, fontWeight: '600', color: '#ccc', marginBottom: 8 },
  input: {
    backgroundColor: '#13121F', borderRadius: 12, borderWidth: 1, borderColor: '#3A3860',
    color: '#fff', fontSize: 15, paddingHorizontal: 16, paddingVertical: 12,
  },
  btn: { backgroundColor: PURPLE, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
