import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState as RNAppState, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CelebrationOverlay from '../../components/CelebrationOverlay';
import ChallengeCard from '../../components/ChallengeCard';
import HabitRow from '../../components/HabitRow';
import { successBurst } from '../../lib/haptics';
import {
  calcStreak,
  isHabitDoneToday,
  loadChallenges,
  loadHabits,
  saveChallenges,
  saveHabits,
  today,
} from '../../lib/storage';
import { Challenge, Habit } from '../../lib/types';

function getDayName() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' });
}
function getDateLabel() {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

export default function HomeScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMsg, setCelebrationMsg] = useState<{ msg: string; sub?: string } | null>(null);
  const prevAllDone = useRef(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const footerTapCount = useRef(0);
  const footerTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function load() {
      const [h, c] = await Promise.all([loadHabits(), loadChallenges()]);
      setHabits(h);
      setChallenges(c);
      setLoaded(true);
    }
    load();
    const sub = RNAppState.addEventListener('change', (s) => { if (s === 'active') load(); });
    return () => sub.remove();
  }, []);

  const doneCount = habits.filter(isHabitDoneToday).length;
  const total = habits.length;
  const progress = total > 0 ? doneCount / total : 0;
  const allDone = total > 0 && doneCount === total;

  useEffect(() => {
    Animated.timing(progressAnim, { toValue: progress, duration: 500, useNativeDriver: false }).start();
  }, [progress]);

  useEffect(() => { if (loaded) saveHabits(habits); }, [habits, loaded]);
  useEffect(() => { if (loaded) saveChallenges(challenges); }, [challenges, loaded]);

  useEffect(() => {
    if (!loaded) return;
    if (allDone && !prevAllDone.current) {
      prevAllDone.current = true;
      const todayStr = today();
      const updatedChallenges = challenges.map((c) => {
        if (c.completed || !c.startDate) return c;
        if (c.completedDays.includes(todayStr)) return c;
        const newDays = [...c.completedDays, todayStr];
        const isCompleted = newDays.length >= c.durationDays;
        return { ...c, completedDays: newDays, completed: isCompleted };
      });
      const justCompleted = updatedChallenges.find(
        (c) => c.completed && !challenges.find((old) => old.id === c.id)?.completed
      );
      setChallenges(updatedChallenges);
      if (justCompleted) {
        successBurst();
        setCelebrationMsg({ msg: 'Challenge Complete! 🏆', sub: `You finished the ${justCompleted.name}!` });
      } else {
        setCelebrationMsg({ msg: 'All done! 🎉', sub: 'Amazing work today.' });
      }
      setShowCelebration(true);
    } else if (!allDone) {
      prevAllDone.current = false;
    }
  }, [allDone, loaded]);

  const toggle = useCallback((id: string) => {
    const todayStr = today();
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        if (h.type === 'count') {
          const dailyCounts = { ...h.dailyCounts, [todayStr]: 0 };
          const completedDates = h.completedDates.filter((d) => d !== todayStr);
          return { ...h, dailyCounts, completedDates, streak: calcStreak(completedDates) };
        }
        const already = h.completedDates.includes(todayStr);
        const completedDates = already
          ? h.completedDates.filter((d) => d !== todayStr)
          : [...h.completedDates, todayStr];
        return { ...h, completedDates, streak: calcStreak(completedDates) };
      })
    );
  }, []);

  const increment = useCallback((id: string) => {
    const todayStr = today();
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id || h.type !== 'count') return h;
        const current = h.dailyCounts[todayStr] ?? 0;
        const next = current + 1;
        const dailyCounts = { ...h.dailyCounts, [todayStr]: next };
        const completedDates =
          next >= h.targetCount && !h.completedDates.includes(todayStr)
            ? [...h.completedDates, todayStr]
            : h.completedDates;
        return { ...h, dailyCounts, completedDates, streak: calcStreak(completedDates) };
      })
    );
  }, []);

  const editHabit = useCallback((id: string) => {
    router.push(`/add?id=${id}`);
  }, []);

  function handleFooterTap() {
    footerTapCount.current += 1;
    if (footerTapTimer.current) clearTimeout(footerTapTimer.current);
    footerTapTimer.current = setTimeout(() => { footerTapCount.current = 0; }, 1500);
    if (footerTapCount.current >= 7) {
      footerTapCount.current = 0;
      router.push('/dev');
    }
  }

  const barWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const activeChallenge = challenges.find((c) => c.startDate && !c.completed) ?? null;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.dayLabel}>{getDayName()}</Text>
            <Text style={styles.dateLabel}>{getDateLabel()}</Text>
            <Text style={styles.subtitle}>
              {allDone ? '🎉 All done — great work!' : `${doneCount} of ${total} completed`}
            </Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/add')}>
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.progressWrap}>
          <View style={styles.progressBg}>
            <Animated.View style={[styles.progressFill, { width: barWidth }]} />
          </View>
          <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
        </View>

        {activeChallenge && <ChallengeCard challenge={activeChallenge} />}

        <View style={styles.list}>
          {habits.map((h) => (
            <HabitRow key={h.id} habit={h} onToggle={toggle} onIncrement={increment} onEdit={editHabit} />
          ))}
        </View>

        <TouchableOpacity onPress={handleFooterTap} activeOpacity={1}>
          <Text style={styles.footer}>Habits reset at midnight · streaks saved locally</Text>
        </TouchableOpacity>
      </ScrollView>

      <CelebrationOverlay
        visible={showCelebration}
        message={celebrationMsg?.msg}
        subMessage={celebrationMsg?.sub}
        onDismiss={() => setShowCelebration(false)}
      />
    </SafeAreaView>
  );
}

const PURPLE = '#6C63FF';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0E17' },
  scroll: { padding: 24, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 12, marginBottom: 28 },
  dayLabel: { fontSize: 14, color: '#888', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.5 },
  dateLabel: { fontSize: 32, fontWeight: '800', color: '#fff', marginTop: 4 },
  subtitle: { fontSize: 15, color: '#ccc', marginTop: 6 },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  addBtnText: { color: '#fff', fontSize: 24, fontWeight: '300', lineHeight: 28 },
  progressWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 },
  progressBg: { flex: 1, height: 8, backgroundColor: '#1E1D2E', borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: PURPLE, borderRadius: 99 },
  progressPct: { color: PURPLE, fontWeight: '700', fontSize: 14, minWidth: 36, textAlign: 'right' },
  list: { gap: 12 },
  footer: { textAlign: 'center', color: '#555', fontSize: 12, marginTop: 36, paddingVertical: 8 },
});
