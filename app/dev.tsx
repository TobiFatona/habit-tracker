import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { successBurst } from '../lib/haptics';
import { dateNDaysAgo, loadChallenges, saveChallenges, today } from '../lib/storage';
import { Challenge } from '../lib/types';

const PURPLE = '#6C63FF';
const GREEN = '#22C55E';
const RED = '#FF4444';
const ORANGE = '#f97316';

export default function DevPanel() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  useEffect(() => {
    loadChallenges().then(setChallenges);
  }, []);

  async function save(updated: Challenge[]) {
    setChallenges(updated);
    await saveChallenges(updated);
  }

  function updateChallenge(id: string, patch: Partial<Challenge>) {
    return challenges.map((c) => (c.id === id ? { ...c, ...patch } : c));
  }

  // Add today as a completed day
  async function addTodayDone(id: string) {
    const todayStr = today();
    const updated = updateChallenge(id, {});
    const c = updated.find((x) => x.id === id)!;
    if (c.completedDays.includes(todayStr)) {
      Alert.alert('Already done', 'Today is already marked complete for this challenge.');
      return;
    }
    const newDays = [...c.completedDays, todayStr];
    const isCompleted = newDays.length >= c.durationDays;
    const patched = updateChallenge(id, { completedDays: newDays, completed: isCompleted });
    await save(patched);
    if (isCompleted) successBurst();
  }

  // Simulate N days completed (fills past N days)
  async function simulateDays(id: string, n: number) {
    const c = challenges.find((x) => x.id === id)!;
    const startDate = c.startDate ?? today();
    const days: string[] = [];
    for (let i = 0; i < n; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }
    const isCompleted = days.length >= c.durationDays;
    const patched = updateChallenge(id, { completedDays: days, completed: isCompleted });
    await save(patched);
    if (isCompleted) successBurst();
  }

  // Set challenge start date to N days ago so we can test day-by-day
  async function setStartNDaysAgo(id: string, n: number) {
    const newStart = dateNDaysAgo(n);
    const patched = updateChallenge(id, { startDate: newStart, completedDays: [], completed: false });
    await save(patched);
  }

  // Immediately complete the challenge
  async function completeNow(id: string) {
    const c = challenges.find((x) => x.id === id)!;
    if (!c.startDate) {
      Alert.alert('Not started', 'Start the challenge first.');
      return;
    }
    const days: string[] = [];
    for (let i = 0; i < c.durationDays; i++) {
      const d = new Date(c.startDate);
      d.setDate(d.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }
    const patched = updateChallenge(id, { completedDays: days, completed: true });
    await save(patched);
    successBurst();
  }

  // Reset challenge to fresh state
  async function resetChallenge(id: string) {
    const c = challenges.find((x) => x.id === id)!;
    const isPreset = !c.isCustom;
    if (isPreset) {
      const patched = updateChallenge(id, { startDate: null, completedDays: [], completed: false, rewardClaimed: false });
      await save(patched);
    } else {
      // Remove custom challenges entirely
      await save(challenges.filter((x) => x.id !== id));
    }
  }

  // Start kickstart challenge with start set 2 days ago → one tap completes it
  async function quickKickstart() {
    const existing = challenges.find((c) => c.id === 'kickstart-3');
    if (!existing) return;
    const newStart = dateNDaysAgo(2);
    const days: string[] = [];
    for (let i = 0; i < 2; i++) {
      const d = new Date(newStart);
      d.setDate(d.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }
    const patched = updateChallenge('kickstart-3', {
      startDate: newStart,
      completedDays: days,
      completed: false,
    });
    await save(patched);
    Alert.alert('Ready!', "Kickstart is on Day 3. Add today as done to complete it.");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.heading}>🔧 Dev Panel</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>⚠️ Dev-only — not visible in production</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: ORANGE }]} onPress={quickKickstart}>
            <Text style={styles.actionBtnText}>🚀 Set Kickstart to Day 3 (1 tap to complete)</Text>
          </TouchableOpacity>
        </View>

        {/* Per-challenge controls */}
        {challenges.map((c) => (
          <View key={c.id} style={styles.challengeBlock}>
            <View style={styles.challengeHeaderRow}>
              <Text style={styles.challengeEmoji}>{c.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.challengeName}>{c.name}</Text>
                <Text style={styles.challengeMeta}>
                  {c.startDate ? `Started: ${c.startDate}` : 'Not started'} · {c.completedDays.length}/{c.durationDays} days
                  {c.completed ? ' ✅ COMPLETED' : ''}
                </Text>
              </View>
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.smallBtn, { backgroundColor: '#2A2840' }]}
                onPress={() => setStartNDaysAgo(c.id, 0)}
              >
                <Text style={styles.smallBtnText}>Start Today</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smallBtn, { backgroundColor: '#2A2840' }]}
                onPress={() => setStartNDaysAgo(c.id, 2)}
              >
                <Text style={styles.smallBtnText}>Start 2d Ago</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smallBtn, { backgroundColor: '#2A2840' }]}
                onPress={() => setStartNDaysAgo(c.id, c.durationDays - 1)}
              >
                <Text style={styles.smallBtnText}>Start {c.durationDays - 1}d Ago</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.smallBtn, { backgroundColor: PURPLE }]}
                onPress={() => addTodayDone(c.id)}
              >
                <Text style={styles.smallBtnText}>+ Today Done</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smallBtn, { backgroundColor: PURPLE }]}
                onPress={() => simulateDays(c.id, Math.min(c.durationDays - 1, 2))}
              >
                <Text style={styles.smallBtnText}>Sim {Math.min(c.durationDays - 1, 2)} Days</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smallBtn, { backgroundColor: GREEN }]}
                onPress={() => completeNow(c.id)}
              >
                <Text style={styles.smallBtnText}>Complete!</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.resetBtn]}
              onPress={() => resetChallenge(c.id)}
            >
              <Text style={styles.resetBtnText}>↺ Reset challenge</Text>
            </TouchableOpacity>
          </View>
        ))}

        {challenges.length === 0 && (
          <Text style={styles.empty}>No challenges found. Start one in the Challenges tab first.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0E17' },
  scroll: { padding: 20, paddingBottom: 48 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn: { paddingVertical: 6, paddingHorizontal: 10 },
  backBtnText: { color: PURPLE, fontSize: 15, fontWeight: '600' },
  heading: { fontSize: 20, fontWeight: '800', color: '#fff' },
  warningBanner: {
    backgroundColor: '#2A1A00',
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: ORANGE + '55',
  },
  warningText: { color: ORANGE, fontSize: 13, textAlign: 'center', fontWeight: '600' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 12, color: '#888', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  actionBtn: { borderRadius: 12, padding: 14, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  challengeBlock: {
    backgroundColor: '#1A1929',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2A2840',
    gap: 10,
  },
  challengeHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  challengeEmoji: { fontSize: 24 },
  challengeName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  challengeMeta: { fontSize: 11, color: '#888', marginTop: 2 },
  btnRow: { flexDirection: 'row', gap: 8 },
  smallBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  smallBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  resetBtn: {
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: RED + '44',
  },
  resetBtnText: { color: RED, fontSize: 12, fontWeight: '600' },
  empty: { color: '#555', textAlign: 'center', marginTop: 40, fontSize: 15 },
});
