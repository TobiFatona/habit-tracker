import { useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getReflection } from '../lib/ai';

const PURPLE = '#6C63FF';
const GREEN = '#22C55E';

type Period = 'weekly' | 'monthly';

function renderContent(text: string) {
  // Render lines — lines starting with emoji headers get special treatment
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  return lines.map((line, i) => {
    const isHeader = /^[📊✅🎯💬]/.test(line.trim());
    const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
    return (
      <Text
        key={i}
        style={[
          styles.reflectionLine,
          isHeader && styles.reflectionHeader,
          isBullet && styles.reflectionBullet,
          i > 0 && isHeader && { marginTop: 14 },
        ]}
      >
        {line.trim()}
      </Text>
    );
  });
}

export default function ReflectionCard() {
  const [period, setPeriod] = useState<Period>('weekly');
  const [content, setContent] = useState<Record<Period, string | null>>({ weekly: null, monthly: null });
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  async function generate() {
    if (loading) return;
    setLoading(true);
    fadeAnim.setValue(0);
    const result = await getReflection(period);
    if (result) {
      setContent((prev) => ({ ...prev, [period]: result }));
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }
    setLoading(false);
  }

  const current = content[period];

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🤖  AI Reflection</Text>
        <View style={styles.toggle}>
          {(['weekly', 'monthly'] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.toggleBtn, period === p && styles.toggleBtnActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.toggleText, period === p && styles.toggleTextActive]}>
                {p === 'weekly' ? 'Week' : 'Month'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content or generate prompt */}
      {current ? (
        <Animated.View style={{ opacity: fadeAnim }}>
          {renderContent(current)}
          <TouchableOpacity style={styles.regenerateBtn} onPress={generate} disabled={loading}>
            {loading
              ? <ActivityIndicator size="small" color={PURPLE} />
              : <Text style={styles.regenerateText}>↻  Regenerate</Text>
            }
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Get a {period === 'weekly' ? 'weekly' : 'monthly'} AI summary of your habit performance, wins, and what to focus on next.
          </Text>
          <TouchableOpacity
            style={[styles.generateBtn, loading && styles.generateBtnDisabled]}
            onPress={generate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.generateBtnText}>
                Generate {period === 'weekly' ? 'Weekly' : 'Monthly'} Report
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1929',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: PURPLE + '44',
    marginBottom: 16,
    gap: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 13, fontWeight: '700', color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.8 },
  toggle: { flexDirection: 'row', gap: 4 },
  toggleBtn: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1,
    borderColor: '#2A2840', backgroundColor: '#13121F',
  },
  toggleBtnActive: { borderColor: PURPLE, backgroundColor: PURPLE + '22' },
  toggleText: { fontSize: 12, color: '#666', fontWeight: '600' },
  toggleTextActive: { color: PURPLE, fontWeight: '700' },

  empty: { gap: 12 },
  emptyText: { fontSize: 13, color: '#777', lineHeight: 19 },
  generateBtn: {
    backgroundColor: PURPLE,
    borderRadius: 12, paddingVertical: 12,
    alignItems: 'center',
  },
  generateBtnDisabled: { opacity: 0.6 },
  generateBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  reflectionLine: { fontSize: 13, color: '#ccc', lineHeight: 20 },
  reflectionHeader: { fontSize: 14, fontWeight: '700', color: '#fff' },
  reflectionBullet: { paddingLeft: 4, color: '#bbb' },

  regenerateBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 8 },
  regenerateText: { color: '#555', fontSize: 13, fontWeight: '600' },
});
