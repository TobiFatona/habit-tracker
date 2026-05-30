import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getCoachingNudge } from '../lib/ai';
import { scheduleCoachingNotification } from '../lib/notifications';

const PURPLE = '#6C63FF';
const SURFACE = '#1A1929';
const CACHE_KEY = 'coaching_cache_v1';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

interface CacheEntry {
  date: string;
  content: string;
}

async function loadCache(): Promise<CacheEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

async function saveCache(content: string) {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ date: todayStr(), content }));
}

export default function CoachingCard() {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const fetchedToday = useRef(false);

  function fadeIn() {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }

  async function fetchFresh(silent = false) {
    if (!silent) setLoading(true);
    const result = await getCoachingNudge();
    if (result?.content) {
      await saveCache(result.content);
      // Schedule 3 PM push notification with fresh content
      scheduleCoachingNotification(result.content).catch(() => {});
      setContent(result.content);
      if (!silent) fadeIn();
    }
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    async function init() {
      const cache = await loadCache();
      if (cache) {
        // Show cached content immediately — no skeleton
        setContent(cache.content);
        setLoading(false);
        fadeAnim.setValue(1);

        // Fetch fresh in background if it's a new day
        if (cache.date !== todayStr() && !fetchedToday.current) {
          fetchedToday.current = true;
          fetchFresh(true); // silent — updates content when done
        }
      } else {
        // First ever load — show skeleton, fetch
        await fetchFresh(false);
      }
    }
    init();
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchFresh(false);
  }

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
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn} disabled={refreshing}>
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { fontSize: 16 },
  title: { flex: 1, fontSize: 13, fontWeight: '700', color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.8 },
  refreshBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  refreshIcon: { fontSize: 18, color: '#555', fontWeight: '600' },
  body: { fontSize: 14, color: '#e0e0e0', lineHeight: 21 },
  skeleton: { gap: 0 },
  skeletonLine: { height: 12, backgroundColor: '#2A2840', borderRadius: 6 },
});
