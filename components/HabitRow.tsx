import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { heavyTap, lightTap } from '../lib/haptics';
import { getTodayCount, isHabitDoneToday } from '../lib/storage';
import { Habit } from '../lib/types';

const PURPLE = '#6C63FF';
const GREEN = '#22C55E';

interface Props {
  habit: Habit;
  onToggle: (id: string) => void;
  onIncrement?: (id: string) => void;
  onEdit?: (id: string) => void;
}

export default function HabitRow({ habit, onToggle, onIncrement, onEdit }: Props) {
  const done = isHabitDoneToday(habit);
  const scale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(done ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(glowOpacity, {
      toValue: done ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [done]);

  function handlePress() {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.9, duration: 60, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1.12, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1.0, duration: 80, useNativeDriver: true }),
    ]).start();

    if (habit.type === 'count') {
      const current = getTodayCount(habit);
      if (current >= habit.targetCount) {
        onToggle(habit.id);
        lightTap();
      } else {
        onIncrement?.(habit.id);
        heavyTap();
      }
    } else {
      onToggle(habit.id);
      if (!done) heavyTap();
      else lightTap();
    }
  }

  const countToday = habit.type === 'count' ? getTodayCount(habit) : 0;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[styles.row, done && styles.rowDone]}
        onPress={handlePress}
        onLongPress={() => onEdit?.(habit.id)}
        activeOpacity={0.85}
      >
        <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />
        <Text style={styles.emoji}>{habit.emoji}</Text>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, done && styles.nameDone]} numberOfLines={1}>{habit.name}</Text>
            {habit.streak > 0 && (
              <Text style={styles.streak}>🔥 {habit.streak}d</Text>
            )}
          </View>
        </View>

        {/* Right side: check circle for simple/done, count pill for count-not-done */}
        {done || habit.type === 'simple' ? (
          <View style={[styles.check, done && styles.checkDone]}>
            {done && <Text style={styles.checkMark}>✓</Text>}
          </View>
        ) : (
          <View style={[styles.countPill, countToday > 0 && styles.countPillProgress]}>
            <Text style={[styles.countText, countToday > 0 && styles.countTextProgress]}>
              {countToday}/{habit.targetCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1929',
    borderRadius: 16,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: '#2A2840',
    overflow: 'hidden',
  },
  rowDone: {
    backgroundColor: '#1A2A1A',
    borderColor: '#22C55E44',
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: GREEN,
    opacity: 0,
  },
  emoji: { fontSize: 28 },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 16, fontWeight: '600', color: '#fff', flexShrink: 1 },
  nameDone: { color: '#aaa', textDecorationLine: 'line-through' },
  streak: { fontSize: 12, color: '#f97316', fontWeight: '500', flexShrink: 0 },
  check: {
    width: 28, height: 28, borderRadius: 99,
    borderWidth: 2, borderColor: '#444',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  checkDone: { backgroundColor: GREEN, borderColor: GREEN },
  checkMark: { color: '#fff', fontWeight: '800', fontSize: 14 },
  countPill: {
    backgroundColor: '#2A2840',
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 5,
    flexShrink: 0,
    borderWidth: 1,
    borderColor: '#3A3860',
  },
  countPillProgress: {
    backgroundColor: PURPLE + '22',
    borderColor: PURPLE + '66',
  },
  countText: { fontSize: 13, color: '#888', fontWeight: '700' },
  countTextProgress: { color: PURPLE },
});
