import { StyleSheet, Text, View } from 'react-native';
import { Habit } from '../lib/types';

const PURPLE = '#6C63FF';
const GREEN = '#22C55E';

interface Props {
  habits: Habit[];
}

function getLast7Days(): { date: string; label: string }[] {
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    result.push({
      date: d.toISOString().split('T')[0],
      label: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1),
    });
  }
  return result;
}

function completionRateForDay(habits: Habit[], date: string): number {
  if (habits.length === 0) return 0;
  let done = 0;
  for (const h of habits) {
    if (h.type === 'count') {
      const count = h.dailyCounts[date] ?? 0;
      if (count >= h.targetCount) done++;
    } else {
      if (h.completedDates.includes(date)) done++;
    }
  }
  return done / habits.length;
}

export default function WeeklyChart({ habits }: Props) {
  const days = getLast7Days();
  const today = new Date().toISOString().split('T')[0];
  const maxBarHeight = 80;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Last 7 Days</Text>
      <View style={styles.bars}>
        {days.map(({ date, label }) => {
          const rate = completionRateForDay(habits, date);
          const isToday = date === today;
          const barHeight = Math.max(4, rate * maxBarHeight);
          const color = rate >= 1 ? GREEN : rate > 0 ? PURPLE : '#2A2840';
          return (
            <View key={date} style={styles.barCol}>
              <View style={[styles.barBg, { height: maxBarHeight }]}>
                <View style={[styles.barFill, { height: barHeight, backgroundColor: color }]} />
              </View>
              <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>{label}</Text>
              {isToday && <View style={styles.todayDot} />}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1929',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2A2840',
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: '#888',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  barBg: {
    width: '100%',
    backgroundColor: '#2A2840',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  dayLabel: {
    fontSize: 11,
    color: '#777',
    fontWeight: '600',
  },
  dayLabelToday: {
    color: PURPLE,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: PURPLE,
  },
});
