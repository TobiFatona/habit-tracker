import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTap, mediumTap } from '../lib/haptics';
import { formatTime } from '../lib/notifications';
import { loadHabits, saveHabits, today } from '../lib/storage';
import { Habit, HabitReminder, HabitType } from '../lib/types';

const EMOJI_OPTIONS = [
  '💧','🏃','📚','🧘','😴','🥗','💊','🚴','🎯','✍️',
  '🏋️','🧹','💻','🎨','🎵','🌿','☀️','🧠','💬','🙏',
  '🏃‍♂️','🧪','🎸','🤸','🌅',
];

const PURPLE = '#6C63FF';
const GREEN = '#22C55E';

export default function AddHabitScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = Boolean(id);

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [type, setType] = useState<HabitType>('simple');
  const [targetCount, setTargetCount] = useState(4);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderHour, setReminderHour] = useState(8);
  const [reminderMinute, setReminderMinute] = useState(0);
  const [reminderApplied, setReminderApplied] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadHabits().then((habits) => {
      const h = habits.find((x) => x.id === id);
      if (h) {
        setName(h.name);
        setEmoji(h.emoji);
        setType(h.type);
        setTargetCount(h.targetCount);
        if (h.reminder) {
          setReminderEnabled(h.reminder.enabled);
          setReminderHour(h.reminder.hour);
          setReminderMinute(h.reminder.minute);
        }
      }
    });
  }, [id]);

  async function save() {
    if (!name.trim()) return;
    mediumTap();
    const habits = await loadHabits();

    const reminder: HabitReminder = {
      enabled: reminderEnabled,
      hour: reminderHour,
      minute: reminderMinute,
    };

    if (isEditing) {
      const updated = habits.map((h) =>
        h.id === id ? { ...h, name: name.trim(), emoji, type, targetCount, reminder } : h
      );
      await saveHabits(updated);
    } else {
      const newHabit: Habit = {
        id: Date.now().toString(),
        name: name.trim(),
        emoji,
        streak: 0,
        completedDates: [],
        type,
        targetCount: type === 'simple' ? 1 : targetCount,
        dailyCounts: {},
        createdAt: today(),
        reminder,
      };
      await saveHabits([...habits, newHabit]);
    }
    router.back();
  }

  async function deleteHabit() {
    if (!id) return;
    lightTap();
    const habits = await loadHabits();
    await saveHabits(habits.filter((h) => h.id !== id));
    router.back();
  }

  function adjustHour(delta: number) {
    lightTap();
    setReminderHour((h) => (h + delta + 24) % 24);
  }

  function adjustMinute(delta: number) {
    lightTap();
    setReminderMinute((m) => (m + delta + 60) % 60);
  }

  function handleApplyReminder() {
    lightTap();
    setReminderApplied(true);
    setTimeout(() => setReminderApplied(false), 1500);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{isEditing ? 'Edit Habit' : 'New Habit'}</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Emoji preview */}
          <View style={styles.emojiPreview}>
            <Text style={styles.emojiPreviewText}>{emoji}</Text>
          </View>

          {/* Name */}
          <Text style={styles.label}>Habit name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Morning Run"
            placeholderTextColor="#666"
            value={name}
            onChangeText={setName}
            maxLength={40}
            autoFocus
            returnKeyType="done"
          />

          {/* Emoji picker */}
          <Text style={styles.label}>Choose an emoji</Text>
          <View style={styles.emojiGrid}>
            {EMOJI_OPTIONS.map((e) => (
              <TouchableOpacity
                key={e}
                style={[styles.emojiOption, emoji === e && styles.emojiOptionSelected]}
                onPress={() => { lightTap(); setEmoji(e); }}
              >
                <Text style={styles.emojiOptionText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Type selector */}
          <Text style={styles.label}>Habit type</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeBtn, type === 'simple' && styles.typeBtnActive]}
              onPress={() => { lightTap(); setType('simple'); }}
            >
              <Text style={[styles.typeBtnTitle, type === 'simple' && styles.typeBtnTitleActive]}>
                Simple
              </Text>
              <Text style={[styles.typeBtnSub, type === 'simple' && styles.typeBtnSubActive]}>
                Once per day
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, type === 'count' && styles.typeBtnActive]}
              onPress={() => { lightTap(); setType('count'); }}
            >
              <Text style={[styles.typeBtnTitle, type === 'count' && styles.typeBtnTitleActive]}>
                Count
              </Text>
              <Text style={[styles.typeBtnSub, type === 'count' && styles.typeBtnSubActive]}>
                N times per day
              </Text>
            </TouchableOpacity>
          </View>

          {/* Count stepper */}
          {type === 'count' && (
            <>
              <Text style={styles.label}>Daily target</Text>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => { lightTap(); setTargetCount(Math.max(2, targetCount - 1)); }}
                >
                  <Text style={styles.stepBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepValue}>{targetCount}</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => { lightTap(); setTargetCount(Math.min(20, targetCount + 1)); }}
                >
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Reminder */}
          <Text style={styles.label}>Daily Reminder</Text>
          <View style={styles.reminderCard}>
            <View style={styles.reminderToggleRow}>
              <View>
                <Text style={styles.reminderTitle}>Enable reminder</Text>
                <Text style={styles.reminderSub}>Get notified at a set time each day</Text>
              </View>
              <Switch
                value={reminderEnabled}
                onValueChange={(v) => { lightTap(); setReminderEnabled(v); }}
                trackColor={{ false: '#2A2840', true: PURPLE + '88' }}
                thumbColor={reminderEnabled ? PURPLE : '#555'}
              />
            </View>

            {reminderEnabled && (
              <>
                <View style={styles.reminderDivider} />
                <View style={styles.timePicker}>
                  <Text style={styles.timePreview}>{formatTime(reminderHour, reminderMinute)}</Text>
                  <View style={styles.timeControls}>
                    <View style={styles.timeUnit}>
                      <TouchableOpacity style={styles.timeArrow} onPress={() => adjustHour(1)}>
                        <Text style={styles.timeArrowText}>▲</Text>
                      </TouchableOpacity>
                      <Text style={styles.timeValue}>{reminderHour.toString().padStart(2, '0')}</Text>
                      <TouchableOpacity style={styles.timeArrow} onPress={() => adjustHour(-1)}>
                        <Text style={styles.timeArrowText}>▼</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.timeColon}>:</Text>
                    <View style={styles.timeUnit}>
                      <TouchableOpacity style={styles.timeArrow} onPress={() => adjustMinute(15)}>
                        <Text style={styles.timeArrowText}>▲</Text>
                      </TouchableOpacity>
                      <Text style={styles.timeValue}>{reminderMinute.toString().padStart(2, '0')}</Text>
                      <TouchableOpacity style={styles.timeArrow} onPress={() => adjustMinute(-15)}>
                        <Text style={styles.timeArrowText}>▼</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      style={[styles.ampmBtn, reminderHour < 12 && styles.ampmBtnActive]}
                      onPress={() => { lightTap(); if (reminderHour >= 12) setReminderHour(reminderHour - 12); }}
                    >
                      <Text style={[styles.ampmText, reminderHour < 12 && styles.ampmTextActive]}>AM</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.ampmBtn, reminderHour >= 12 && styles.ampmBtnActive]}
                      onPress={() => { lightTap(); if (reminderHour < 12) setReminderHour(reminderHour + 12); }}
                    >
                      <Text style={[styles.ampmText, reminderHour >= 12 && styles.ampmTextActive]}>PM</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={[styles.applyBtn, reminderApplied && styles.applyBtnSaved]}
                    onPress={handleApplyReminder}
                  >
                    <Text style={[styles.applyBtnText, reminderApplied && styles.applyBtnTextSaved]}>
                      {reminderApplied ? '✓ Time set' : 'Confirm time'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* Save */}
          <TouchableOpacity
            style={[styles.saveBtn, !name.trim() && styles.saveBtnDisabled]}
            onPress={save}
            disabled={!name.trim()}
          >
            <Text style={styles.saveBtnText}>{isEditing ? 'Save Changes' : 'Add Habit'}</Text>
          </TouchableOpacity>

          {isEditing && (
            <TouchableOpacity style={styles.deleteBtn} onPress={deleteHabit}>
              <Text style={styles.deleteBtnText}>Delete Habit</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0E17' },
  scroll: { padding: 24, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  closeBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1A1929', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { color: '#ccc', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700', color: '#fff' },
  emojiPreview: {
    alignSelf: 'center', width: 80, height: 80, borderRadius: 24,
    backgroundColor: '#1A1929', alignItems: 'center', justifyContent: 'center',
    marginBottom: 24, borderWidth: 1, borderColor: '#2A2840',
  },
  emojiPreviewText: { fontSize: 40 },
  label: {
    fontSize: 12, color: '#aaa', fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 10, marginTop: 20,
  },
  input: {
    backgroundColor: '#1A1929', borderRadius: 14, padding: 16,
    fontSize: 16, color: '#fff', borderWidth: 1, borderColor: '#3A3860',
  },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiOption: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: '#1A1929',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2A2840',
  },
  emojiOptionSelected: { borderColor: PURPLE, backgroundColor: PURPLE + '22' },
  emojiOptionText: { fontSize: 22 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1, backgroundColor: '#1A1929', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#2A2840', gap: 4,
  },
  typeBtnActive: { borderColor: PURPLE, backgroundColor: '#1A1640' },
  typeBtnTitle: { fontSize: 15, fontWeight: '700', color: '#ccc' },
  typeBtnTitleActive: { color: '#fff' },
  typeBtnSub: { fontSize: 11, color: '#777' },
  typeBtnSubActive: { color: '#aaa' },
  stepper: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#1A1929', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#2A2840',
  },
  stepBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#2A2840', alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { color: '#fff', fontSize: 20, fontWeight: '300' },
  stepValue: { flex: 1, textAlign: 'center', fontSize: 22, fontWeight: '800', color: '#fff' },
  reminderCard: {
    backgroundColor: '#1A1929', borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: '#2A2840',
  },
  reminderDivider: { height: 1, backgroundColor: '#2A2840' },
  reminderToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  reminderTitle: { fontSize: 15, color: '#fff', fontWeight: '600' },
  reminderSub: { fontSize: 12, color: '#888', marginTop: 2 },
  timePicker: { alignItems: 'center', gap: 12, padding: 16 },
  applyBtn: { backgroundColor: '#1E1D2E', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 24, borderWidth: 1, borderColor: '#3A3860', marginTop: 4 },
  applyBtnSaved: { borderColor: '#22C55E66', backgroundColor: '#1A2A1A' },
  applyBtnText: { fontSize: 13, color: '#aaa', fontWeight: '600' },
  applyBtnTextSaved: { color: '#22C55E', fontWeight: '700' },
  timePreview: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: 2 },
  timeControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeUnit: { alignItems: 'center', gap: 6 },
  timeArrow: { padding: 6 },
  timeArrowText: { fontSize: 14, color: '#aaa', fontWeight: '700' },
  timeValue: { fontSize: 28, fontWeight: '800', color: '#fff', minWidth: 44, textAlign: 'center' },
  timeColon: { fontSize: 28, color: '#555', fontWeight: '300', marginBottom: 4 },
  ampmBtn: { backgroundColor: '#2A2840', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  ampmBtnActive: { backgroundColor: PURPLE },
  ampmText: { fontSize: 13, color: '#888', fontWeight: '700' },
  ampmTextActive: { color: '#fff' },
  saveBtn: { backgroundColor: PURPLE, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 32 },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  deleteBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: '#FF444433' },
  deleteBtnText: { color: '#FF6666', fontWeight: '600', fontSize: 15 },
});
