import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth-context';
import { mediumTap } from '../../lib/haptics';
import { loadChallenges, saveChallenges, today } from '../../lib/storage';
import { fetchChallengesFromSupabase, pushChallengeUpdate } from '../../lib/sync';
import { Challenge } from '../../lib/types';

const PURPLE = '#6C63FF';
const GREEN = '#22C55E';

const PRESET_CHALLENGES: Omit<Challenge, 'startDate' | 'completedDays' | 'completed' | 'rewardClaimed'>[] = [
  { id: 'kickstart-3', name: '3-Day Kickstart', description: 'Complete all habits for 3 days in a row', emoji: '🚀', durationDays: 3 },
  { id: 'week-warrior', name: 'Week Warrior', description: 'Complete all habits for 7 days in a row', emoji: '⚔️', durationDays: 7 },
  { id: 'habit-master', name: 'Habit Master', description: '21 days of consistent habit tracking', emoji: '🏅', durationDays: 21 },
];

function DayGrid({ challenge }: { challenge: Challenge }) {
  if (!challenge.startDate) return null;
  const days = Array.from({ length: Math.min(challenge.durationDays, 30) }, (_, i) => {
    const d = new Date(challenge.startDate!);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const done = challenge.completedDays.includes(dateStr);
    const isFuture = dateStr > today();
    return { done, isFuture, n: i + 1 };
  });
  return (
    <View style={styles.dayGrid}>
      {days.map(({ done, isFuture, n }) => (
        <View key={n} style={[styles.dayDot, done && styles.dayDotDone, isFuture && styles.dayDotFuture]}>
          <Text style={[styles.dayDotText, done && styles.dayDotTextDone, isFuture && styles.dayDotTextFuture]}>
            {done ? '✓' : String(n)}
          </Text>
        </View>
      ))}
      {challenge.durationDays > 30 && (
        <View style={styles.dayDotMore}>
          <Text style={styles.dayDotMoreText}>+{challenge.durationDays - 30}</Text>
        </View>
      )}
    </View>
  );
}

export default function ChallengesScreen() {
  const { userId } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  useEffect(() => {
    loadChallenges().then((local) => {
      setChallenges(local);
      fetchChallengesFromSupabase().then((remote) => {
        if (remote) { setChallenges(remote); saveChallenges(remote); }
      });
    });
  }, []);

  async function startChallenge(id: string) {
    mediumTap();
    const updated = challenges.map((c) =>
      c.id !== id ? c : { ...c, startDate: today(), completedDays: [], completed: false, rewardClaimed: false }
    );
    setChallenges(updated);
    await saveChallenges(updated);
    const started = updated.find((c) => c.id === id);
    if (userId && started) pushChallengeUpdate(started, userId);
  }

  const active = challenges.filter((c) => c.startDate && !c.completed);
  const completed = challenges.filter((c) => c.completed);
  const available = PRESET_CHALLENGES.filter(
    (p) => !challenges.find((c) => c.id === p.id && (c.startDate || c.completed))
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={styles.heading}>Challenges</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/create-challenge')}>
            <Text style={styles.createBtnText}>+ Custom</Text>
          </TouchableOpacity>
        </View>

        {/* Active */}
        {active.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active</Text>
            {active.map((c) => (
              <LinearGradient key={c.id} colors={['#1E1A3A', '#1A2030']} style={styles.challengeCard}>
                <View style={styles.challengeHeader}>
                  <Text style={styles.challengeEmoji}>{c.emoji}</Text>
                  <View style={styles.challengeInfo}>
                    <Text style={styles.challengeName}>{c.name}</Text>
                    <Text style={styles.challengeDesc}>{c.description}</Text>
                  </View>
                  <View style={styles.progressBadge}>
                    <Text style={styles.progressBadgeText}>{c.completedDays.length}/{c.durationDays}</Text>
                    <Text style={styles.progressBadgeSub}>days</Text>
                  </View>
                </View>
                <DayGrid challenge={c} />
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${(c.completedDays.length / c.durationDays) * 100}%` }]} />
                </View>
                <Text style={styles.progressPct}>
                  {Math.round((c.completedDays.length / c.durationDays) * 100)}% complete
                </Text>
              </LinearGradient>
            ))}
          </View>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completed 🏆</Text>
            {completed.map((c) => (
              <View key={c.id} style={styles.completedCard}>
                <Text style={styles.challengeEmoji}>{c.emoji}</Text>
                <View style={styles.challengeInfo}>
                  <Text style={styles.challengeName}>{c.name}</Text>
                  <Text style={styles.completedLabel}>Completed! {c.durationDays} days</Text>
                </View>
                <Text style={styles.trophy}>🏆</Text>
              </View>
            ))}
          </View>
        )}

        {/* Available presets */}
        {available.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Start a Challenge</Text>
            {available.map((p) => (
              <View key={p.id} style={styles.availableCard}>
                <Text style={styles.challengeEmoji}>{p.emoji}</Text>
                <View style={styles.challengeInfo}>
                  <Text style={styles.challengeName}>{p.name}</Text>
                  <Text style={styles.challengeDesc}>{p.description}</Text>
                  <Text style={styles.challengeDuration}>{p.durationDays} days</Text>
                </View>
                <TouchableOpacity style={styles.startBtn} onPress={() => startChallenge(p.id)}>
                  <Text style={styles.startBtnText}>Start</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Custom challenges that haven't started */}
        {challenges.filter((c) => c.isCustom && !c.startDate && !c.completed).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Custom Challenges</Text>
            {challenges.filter((c) => c.isCustom && !c.startDate && !c.completed).map((c) => (
              <View key={c.id} style={styles.availableCard}>
                <Text style={styles.challengeEmoji}>{c.emoji}</Text>
                <View style={styles.challengeInfo}>
                  <Text style={styles.challengeName}>{c.name}</Text>
                  <Text style={styles.challengeDesc}>{c.description}</Text>
                  <Text style={styles.challengeDuration}>{c.durationDays} days</Text>
                </View>
                <TouchableOpacity style={styles.startBtn} onPress={() => startChallenge(c.id)}>
                  <Text style={styles.startBtnText}>Start</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {active.length === 0 && available.length === 0 && completed.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🏆</Text>
            <Text style={styles.emptyTitle}>No challenges yet</Text>
            <Text style={styles.emptyBody}>Tap "+ Custom" to create your own, or start a preset above.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0E17' },
  scroll: { padding: 24, paddingBottom: 40 },
  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 20 },
  heading: { fontSize: 28, fontWeight: '800', color: '#fff' },
  createBtn: { backgroundColor: PURPLE, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  createBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 12, color: '#aaa', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  challengeCard: { borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#6C63FF44', gap: 12 },
  challengeHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  challengeEmoji: { fontSize: 28 },
  challengeInfo: { flex: 1 },
  challengeName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  challengeDesc: { fontSize: 12, color: '#aaa', marginTop: 2 },
  challengeDuration: { fontSize: 12, color: PURPLE, marginTop: 4, fontWeight: '600' },
  progressBadge: { alignItems: 'center' },
  progressBadgeText: { fontSize: 18, fontWeight: '800', color: PURPLE },
  progressBadgeSub: { fontSize: 10, color: '#888', fontWeight: '600' },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  dayDot: { width: 28, height: 28, borderRadius: 7, backgroundColor: '#2A2840', alignItems: 'center', justifyContent: 'center' },
  dayDotDone: { backgroundColor: '#1A3A1A', borderWidth: 1, borderColor: GREEN + '66' },
  dayDotFuture: { backgroundColor: '#181826' },
  dayDotText: { fontSize: 10, color: '#ccc', fontWeight: '700' },
  dayDotTextDone: { color: GREEN },
  dayDotTextFuture: { color: '#444' },
  dayDotMore: { width: 28, height: 28, borderRadius: 7, backgroundColor: '#2A2840', alignItems: 'center', justifyContent: 'center' },
  dayDotMoreText: { fontSize: 9, color: '#888', fontWeight: '700' },
  progressBg: { height: 5, backgroundColor: '#2A2840', borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: PURPLE, borderRadius: 99 },
  progressPct: { fontSize: 11, color: '#aaa', textAlign: 'right', fontWeight: '600' },
  completedCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A2A1A',
    borderRadius: 14, padding: 14, borderWidth: 1, borderColor: GREEN + '33', gap: 12, marginBottom: 8,
  },
  completedLabel: { fontSize: 12, color: GREEN, marginTop: 2, fontWeight: '600' },
  trophy: { fontSize: 22 },
  availableCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1929',
    borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#2A2840', gap: 12, marginBottom: 8,
  },
  startBtn: { backgroundColor: PURPLE, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  emptyState: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  emptyBody: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },
});
