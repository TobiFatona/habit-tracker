import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ReflectionCard from '../../components/ReflectionCard';
import WeeklyChart from '../../components/WeeklyChart';
import { getConsistency, isHabitDoneToday, loadHabits, saveHabits, today } from '../../lib/storage';
import { fetchHabitsFromSupabase } from '../../lib/sync';
import { Habit } from '../../lib/types';

const PURPLE = '#6C63FF';
const GREEN = '#22C55E';
const ORANGE = '#f97316';

function bestStreak(habits: Habit[]): number {
  return habits.reduce((max, h) => Math.max(max, h.streak), 0);
}

function totalCompletions(habits: Habit[]): number {
  return habits.reduce((sum, h) => sum + h.completedDates.length, 0);
}

function currentMonth(): { date: string; label: string }[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month, i + 1);
    return { date: d.toISOString().split('T')[0], label: String(i + 1) };
  });
}

function allDoneForDay(habits: Habit[], date: string): boolean {
  if (habits.length === 0) return false;
  return habits.every((h) => {
    if (h.type === 'count') return (h.dailyCounts[date] ?? 0) >= h.targetCount;
    return h.completedDates.includes(date);
  });
}

function partialDoneForDay(habits: Habit[], date: string): boolean {
  return habits.some((h) => {
    if (h.type === 'count') return (h.dailyCounts[date] ?? 0) > 0;
    return h.completedDates.includes(date);
  });
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  wide?: boolean;
}

function StatCard({ label, value, sub, accent = PURPLE, wide }: StatCardProps) {
  return (
    <View style={[styles.statCard, wide && styles.statCardWide, { borderColor: accent + '44' }]}>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

export default function AnalyticsScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const initialSyncDone = useRef(false);

  // Reload from local cache every time this tab comes into focus
  useFocusEffect(
    useCallback(() => {
      loadHabits().then(setHabits);
    }, [])
  );

  // One-time Supabase sync on mount, merge so local-only habits are preserved
  useEffect(() => {
    if (initialSyncDone.current) return;
    initialSyncDone.current = true;
    fetchHabitsFromSupabase().then((remote) => {
      if (!remote) return;
      setHabits((local) => {
        const remoteIds = new Set(remote.map((h) => h.id));
        const localOnly = local.filter((h) => !remoteIds.has(h.id));
        const merged = [...remote, ...localOnly];
        saveHabits(merged);
        return merged;
      });
    });
  }, []);

  const days = currentMonth();
  const todayStr = today();
  const sortedByStreak = [...habits].sort((a, b) => b.streak - a.streak);

  const consistency7 = getConsistency(habits, 7);
  const consistency30 = getConsistency(habits, 30);
  const doneToday = habits.filter(isHabitDoneToday).length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Progress</Text>

        {/* Top stats — 2×2 grid */}
        <View style={styles.statsGrid}>
          <StatCard label="Total Done" value={totalCompletions(habits)} sub="all time" />
          <StatCard label="Best Streak" value={`${bestStreak(habits)}d`} sub="any habit" accent={ORANGE} />
          <StatCard label="Today" value={`${doneToday}/${habits.length}`} sub="completed" accent={GREEN} />
          <StatCard label="7-Day %" value={`${consistency7}%`} sub="consistency" accent={PURPLE} />
        </View>

        {/* 30-day consistency bar */}
        <View style={styles.consistencyRow}>
          <View style={styles.consistencyBg}>
            <View style={[styles.consistencyFill, { width: `${consistency30}%` }]} />
          </View>
          <Text style={styles.consistencyLabel}>{consistency30}% this month</Text>
        </View>

        {/* 7-day chart */}
        <WeeklyChart habits={habits} />

        {/* Per-habit streaks */}
        {sortedByStreak.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Habit Streaks</Text>
            {sortedByStreak.map((h) => (
              <View key={h.id} style={styles.streakRow}>
                <Text style={styles.streakEmoji}>{h.emoji}</Text>
                <Text style={styles.streakName} numberOfLines={1}>{h.name}</Text>
                <View style={styles.streakBadge}>
                  <Text style={styles.streakBadgeText}>🔥 {h.streak}d</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Monthly calendar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          <Text style={styles.calLegend}>
            <Text style={{ color: GREEN }}>■</Text> All done{'  '}
            <Text style={{ color: PURPLE }}>■</Text> Partial{'  '}
            <Text style={{ color: '#444' }}>■</Text> None
          </Text>
          <View style={styles.calGrid}>
            {days.map(({ date, label }) => {
              const isFuture = date > todayStr;
              const allDone = !isFuture && allDoneForDay(habits, date);
              const partial = !isFuture && !allDone && partialDoneForDay(habits, date);
              const isToday = date === todayStr;
              return (
                <View
                  key={date}
                  style={[
                    styles.calDay,
                    allDone && styles.calDayDone,
                    partial && styles.calDayPartial,
                    isToday && styles.calDayToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.calDayText,
                      allDone && styles.calDayTextDone,
                      isToday && styles.calDayTextToday,
                      isFuture && styles.calDayTextFuture,
                    ]}
                  >
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* AI Reflection */}
        <ReflectionCard />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0E17' },
  scroll: { padding: 24, paddingBottom: 40 },
  heading: { fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 12, marginBottom: 20 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: {
    width: '47%',
    backgroundColor: '#1A1929',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  statCardWide: { width: '100%' },
  statValue: { fontSize: 26, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#ccc', fontWeight: '600', marginTop: 8, textAlign: 'center' },
  statSub: { fontSize: 11, color: '#888', marginTop: 6, textAlign: 'center' },

  consistencyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  consistencyBg: { flex: 1, height: 6, backgroundColor: '#2A2840', borderRadius: 99, overflow: 'hidden' },
  consistencyFill: { height: '100%', backgroundColor: PURPLE, borderRadius: 99 },
  consistencyLabel: { fontSize: 12, color: '#aaa', fontWeight: '600', minWidth: 100, textAlign: 'right' },

  section: {
    backgroundColor: '#1A1929', borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: '#2A2840', marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12, color: '#aaa', fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
  },
  calLegend: { fontSize: 11, color: '#888', marginBottom: 12 },

  streakRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2A2840',
  },
  streakEmoji: { fontSize: 20 },
  streakName: { flex: 1, fontSize: 14, color: '#fff', fontWeight: '500' },
  streakBadge: { backgroundColor: '#2A1A0A', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  streakBadgeText: { fontSize: 12, color: ORANGE, fontWeight: '700' },

  calGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  calDay: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: '#2A2840', alignItems: 'center', justifyContent: 'center',
  },
  calDayDone: { backgroundColor: GREEN + '33', borderWidth: 1, borderColor: GREEN + '77' },
  calDayPartial: { backgroundColor: PURPLE + '22', borderWidth: 1, borderColor: PURPLE + '55' },
  calDayToday: { borderWidth: 2, borderColor: PURPLE },
  calDayText: { fontSize: 11, color: '#ccc', fontWeight: '600' },
  calDayTextDone: { color: GREEN },
  calDayTextToday: { color: '#fff', fontWeight: '800' },
  calDayTextFuture: { color: '#444' },
});
