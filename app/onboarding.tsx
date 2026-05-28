import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mediumTap, successBurst } from '../lib/haptics';
import { cancelAllNotifications, requestPermission, scheduleDailyReminder } from '../lib/notifications';
import { DEFAULT_CHALLENGE, loadChallenges, saveAppState, saveChallenges, today } from '../lib/storage';

const { width } = Dimensions.get('window');

const HOW_IT_WORKS = [
  { icon: '📝', text: 'Create your habits' },
  { icon: '✅', text: 'Track them daily' },
  { icon: '🔥', text: 'Build your streaks' },
  { icon: '🏆', text: 'Complete challenges' },
  { icon: '📊', text: 'Watch your progress' },
];

const SLIDES = [
  {
    emoji: '✨',
    title: 'Build habits that stick',
    body: 'Track daily habits, build streaks, and watch small actions create big change over time.',
    gradient: ['#1A1060', '#0F0E17'] as const,
  },
  {
    emoji: '📖',
    title: 'Here\'s how it works',
    body: 'Five simple steps to a better you.',
    gradient: ['#0A1A2A', '#0F0E17'] as const,
    isHowItWorks: true,
  },
  {
    emoji: '🔥',
    title: 'Streaks keep you going',
    body: 'Every day you complete your habits grows your streak. Miss a day and it resets — so stay consistent!',
    gradient: ['#1A200A', '#0F0E17'] as const,
  },
  {
    emoji: '🚀',
    title: '3-Day Kickstart Challenge',
    body: 'Start strong. Complete all your habits for 3 days in a row and earn your first achievement.',
    gradient: ['#1A0A2A', '#0F0E17'] as const,
    isChallengeSlide: true,
  },
];

export default function Onboarding() {
  const [slide, setSlide] = useState(0);
  const [acceptedChallenge, setAcceptedChallenge] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  function goNext() {
    mediumTap();
    if (slide < SLIDES.length - 1) {
      const next = slide + 1;
      setSlide(next);
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
    } else {
      finish();
    }
  }

  async function finish() {
    successBurst();
    if (acceptedChallenge) {
      const challenges = await loadChallenges();
      const updated = challenges.map((c) =>
        c.id === 'kickstart-3' ? { ...c, startDate: today() } : c
      );
      if (!updated.find((c) => c.id === 'kickstart-3')) {
        updated.push({ ...DEFAULT_CHALLENGE, startDate: today() });
      }
      await saveChallenges(updated);
    }
    const notifGranted = await requestPermission();
    if (notifGranted) await scheduleDailyReminder();
    else await cancelAllNotifications();
    await saveAppState({ onboardingComplete: true, notificationsEnabled: notifGranted });
    router.replace('/(tabs)/');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        {SLIDES.map((s, i) => (
          <LinearGradient key={i} colors={s.gradient} style={[styles.slide, { width }]}>
            <Text style={styles.bigEmoji}>{s.emoji}</Text>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.body}>{s.body}</Text>

            {s.isHowItWorks && (
              <View style={styles.howItWorksCard}>
                {HOW_IT_WORKS.map((item, idx) => (
                  <View key={idx} style={styles.howRow}>
                    <View style={styles.howIconWrap}>
                      <Text style={styles.howIcon}>{item.icon}</Text>
                    </View>
                    <Text style={styles.howText}>{item.text}</Text>
                    {idx < HOW_IT_WORKS.length - 1 && <View style={styles.howConnector} />}
                  </View>
                ))}
              </View>
            )}

            {s.isChallengeSlide && (
              <TouchableOpacity
                style={[styles.challengeToggle, acceptedChallenge && styles.challengeToggleOn]}
                onPress={() => { mediumTap(); setAcceptedChallenge(!acceptedChallenge); }}
              >
                <Text style={styles.challengeToggleText}>
                  {acceptedChallenge ? '✓ Challenge accepted!' : 'Accept the 3-Day Challenge'}
                </Text>
              </TouchableOpacity>
            )}
          </LinearGradient>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === slide && styles.dotActive]} />
          ))}
        </View>

        <TouchableOpacity style={styles.btn} onPress={goNext}>
          <Text style={styles.btnText}>
            {slide === SLIDES.length - 1 ? "Let's go 🚀" : 'Continue'}
          </Text>
        </TouchableOpacity>

        {slide < SLIDES.length - 1 && (
          <TouchableOpacity onPress={finish} style={styles.skip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0E17' },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  bigEmoji: { fontSize: 72, marginBottom: 4 },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', textAlign: 'center' },
  body: { fontSize: 15, color: '#ccc', textAlign: 'center', lineHeight: 22 },
  howItWorksCard: {
    width: '100%',
    backgroundColor: '#1A1929',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#2A2840',
    gap: 0,
  },
  howRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  howIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#2A2840', alignItems: 'center', justifyContent: 'center',
  },
  howIcon: { fontSize: 18 },
  howText: { fontSize: 14, color: '#fff', fontWeight: '600', flex: 1 },
  howConnector: { position: 'absolute', left: 17, bottom: -4, width: 2, height: 8, backgroundColor: '#3A3860' },
  challengeToggle: {
    marginTop: 8,
    backgroundColor: '#2A2840',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#6C63FF44',
    width: '100%',
    alignItems: 'center',
  },
  challengeToggleOn: { backgroundColor: '#1A2A1A', borderColor: '#22C55E66' },
  challengeToggleText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  footer: { padding: 24, gap: 12, backgroundColor: '#0F0E17' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#333' },
  dotActive: { backgroundColor: '#6C63FF', width: 20 },
  btn: { backgroundColor: '#6C63FF', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  skip: { alignItems: 'center', paddingVertical: 4 },
  skipText: { color: '#777', fontSize: 14 },
});
