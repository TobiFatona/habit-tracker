import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getCoachingNudge } from '../lib/ai';

const PURPLE = '#6C63FF';
const SURFACE = '#1A1929';

function timeAgo(isoOrNow: 'now' | null): string {
  // We don't know exact time, so just show 'Just now' vs nothing
  return '';
}

export default function CoachingCard() {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const result = await getCoachingNudge();
    if (result?.content) {
      setContent(result.content);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.icon}>✨</Text>
          <Text style={styles.title}>Your Daily Insight</Text>
        </View>
        <View style={styles.skeleton}>
          <View style={[styles.skeletonLine, { width: '95%' }]} />
          <View style={[styles.skeletonLine, { width: '80%', marginTop: 6 }]} />
          <View style={[styles.skeletonLine, { width: '60%', marginTop: 6 }]} />
        </View>
      </View>
    );
  }

  if (!content) return null;

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.icon}>✨</Text>
        <Text style={styles.title}>Your Daily Insight</Text>
        <TouchableOpacity onPress={() => load(true)} style={styles.refreshBtn} disabled={refreshing}>
          {refreshing
            ? <ActivityIndicator size="small" color={PURPLE} />
            : <Text style={styles.refreshIcon}>↻</Text>
          }
        </TouchableOpacity>
      </View>
      <Text style={styles.body}>{content}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: PURPLE + '44',
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: { fontSize: 16 },
  title: { flex: 1, fontSize: 13, fontWeight: '700', color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.8 },
  refreshBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  refreshIcon: { fontSize: 18, color: '#555', fontWeight: '600' },
  body: { fontSize: 14, color: '#e0e0e0', lineHeight: 21 },
  skeleton: { gap: 0 },
  skeletonLine: { height: 12, backgroundColor: '#2A2840', borderRadius: 6 },
});
