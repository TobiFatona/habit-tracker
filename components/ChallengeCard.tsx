import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { Challenge } from '../lib/types';

interface Props {
  challenge: Challenge;
}

const MAX_BADGES = 7;

export default function ChallengeCard({ challenge }: Props) {
  if (!challenge.startDate || challenge.completed) return null;

  const totalDays = challenge.durationDays;
  const showDays = Math.min(totalDays, MAX_BADGES);
  const overflow = totalDays - showDays;

  const days = Array.from({ length: showDays }, (_, i) => {
    const d = new Date(challenge.startDate!);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const done = challenge.completedDays.includes(dateStr);
    return { label: `Day ${i + 1}`, done };
  });

  const doneDays = challenge.completedDays.length;
  const progress = doneDays / totalDays;

  return (
    <LinearGradient
      colors={['#221C45', '#1B2E42']}
      style={styles.card}
    >
      <View style={styles.header}>
        <Text style={styles.emoji}>{challenge.emoji}</Text>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{challenge.name}</Text>
          <Text style={styles.sub}>{challenge.description}</Text>
        </View>
      </View>

      <View style={styles.days}>
        {days.map((d, i) => (
          <View key={i} style={[styles.dayBadge, d.done && styles.dayBadgeDone]}>
            <Text style={[styles.dayText, d.done && styles.dayTextDone]}>
              {d.done ? '✓' : d.label}
            </Text>
          </View>
        ))}
        {overflow > 0 && (
          <View style={styles.overflowBadge}>
            <Text style={styles.overflowText}>+{overflow}</Text>
          </View>
        )}
      </View>

      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={styles.progressLabel}>
        {doneDays}/{totalDays} days complete
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#6C63FF66',
    elevation: 2,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  emoji: { fontSize: 32 },
  titleBlock: { flex: 1 },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  sub: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 2,
  },
  days: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
    flexWrap: 'nowrap',
  },
  dayBadge: {
    flex: 1,
    backgroundColor: '#2A2840',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3860',
  },
  dayBadgeDone: {
    backgroundColor: '#1A3A1A',
    borderColor: '#22C55E55',
  },
  dayText: {
    fontSize: 10,
    color: '#888',
    fontWeight: '600',
  },
  dayTextDone: {
    color: '#22C55E',
    fontSize: 14,
  },
  overflowBadge: {
    paddingHorizontal: 8,
    backgroundColor: '#2A2840',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3A3860',
  },
  overflowText: {
    fontSize: 10,
    color: '#777',
    fontWeight: '700',
  },
  progressBg: {
    height: 4,
    backgroundColor: '#2A2840',
    borderRadius: 99,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6C63FF',
    borderRadius: 99,
  },
  progressLabel: {
    fontSize: 11,
    color: '#aaa',
    textAlign: 'right',
  },
});
