import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTap, mediumTap } from '../lib/haptics';
import { loadChallenges, saveChallenges, today } from '../lib/storage';

const PURPLE = '#6C63FF';
const GREEN = '#22C55E';

const EMOJI_OPTIONS = [
  '🏆','🚀','⚔️','🏅','💪','🎯','🔥','⚡','🌟','🦁',
  '🧗','🎪','🏋️','🧘','🌿','🎨','📚','💡','🛡️','🌙',
];

export default function CreateChallengeScreen() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('🏆');
  const [durationDays, setDurationDays] = useState(7);
  const [startNow, setStartNow] = useState(true);

  async function save() {
    if (!name.trim()) return;
    mediumTap();
    const challenges = await loadChallenges();
    const newChallenge = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || `Complete your habits for ${durationDays} days`,
      emoji,
      durationDays,
      startDate: startNow ? today() : null,
      completedDays: [],
      completed: false,
      rewardClaimed: false,
      isCustom: true,
    };
    await saveChallenges([...challenges, newChallenge]);
    router.back();
  }

  function adjustDuration(delta: number) {
    lightTap();
    setDurationDays((d) => Math.min(365, Math.max(1, d + delta)));
  }

  const presets = [3, 7, 14, 21, 30, 66, 100];

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Create Challenge</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Emoji preview */}
          <View style={styles.emojiPreview}>
            <Text style={styles.emojiPreviewText}>{emoji}</Text>
          </View>

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

          {/* Name */}
          <Text style={styles.label}>Challenge name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 30-Day Focus Sprint"
            placeholderTextColor="#777"
            value={name}
            onChangeText={setName}
            maxLength={40}
          />

          {/* Description */}
          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="What does it take to win?"
            placeholderTextColor="#777"
            value={description}
            onChangeText={setDescription}
            maxLength={100}
            multiline
            numberOfLines={2}
          />

          {/* Duration */}
          <Text style={styles.label}>Duration</Text>
          <View style={styles.stepper}>
            <TouchableOpacity style={styles.stepBtn} onPress={() => adjustDuration(-1)}>
              <Text style={styles.stepBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.stepValue}>{durationDays} days</Text>
            <TouchableOpacity style={styles.stepBtn} onPress={() => adjustDuration(1)}>
              <Text style={styles.stepBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Preset durations */}
          <View style={styles.presetRow}>
            {presets.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.presetChip, durationDays === d && styles.presetChipActive]}
                onPress={() => { lightTap(); setDurationDays(d); }}
              >
                <Text style={[styles.presetChipText, durationDays === d && styles.presetChipTextActive]}>
                  {d}d
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Start now toggle */}
          <Text style={styles.label}>When to start</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, startNow && styles.toggleBtnActive]}
              onPress={() => { lightTap(); setStartNow(true); }}
            >
              <View style={styles.toggleBtnInner}>
                {startNow && <Text style={styles.toggleCheck}>✓</Text>}
                <Text style={[styles.toggleBtnText, startNow && styles.toggleBtnTextActive]}>Start today</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, !startNow && styles.toggleBtnActive]}
              onPress={() => { lightTap(); setStartNow(false); }}
            >
              <View style={styles.toggleBtnInner}>
                {!startNow && <Text style={styles.toggleCheck}>✓</Text>}
                <Text style={[styles.toggleBtnText, !startNow && styles.toggleBtnTextActive]}>Start manually</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Save */}
          <TouchableOpacity
            style={[styles.saveBtn, !name.trim() && styles.saveBtnDisabled]}
            onPress={save}
            disabled={!name.trim()}
          >
            <Text style={styles.saveBtnText}>Create Challenge</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0E17' },
  scroll: { padding: 24, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  closeBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1A1929', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { color: '#ccc', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700', color: '#fff' },
  emojiPreview: {
    alignSelf: 'center', width: 80, height: 80, borderRadius: 24,
    backgroundColor: '#1A1929', alignItems: 'center', justifyContent: 'center',
    marginBottom: 24, borderWidth: 1, borderColor: '#2A2840',
  },
  emojiPreviewText: { fontSize: 40 },
  label: { fontSize: 12, color: '#aaa', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 20 },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiOption: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#1A1929', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2A2840' },
  emojiOptionSelected: { borderColor: PURPLE, backgroundColor: PURPLE + '22' },
  emojiOptionText: { fontSize: 22 },
  input: { backgroundColor: '#1A1929', borderRadius: 14, padding: 16, fontSize: 15, color: '#fff', borderWidth: 1, borderColor: '#3A3860' },
  inputMultiline: { minHeight: 64, textAlignVertical: 'top' },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1929', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#2A2840' },
  stepBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#2A2840', alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { color: '#fff', fontSize: 20, fontWeight: '300' },
  stepValue: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '800', color: '#fff' },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  presetChip: { backgroundColor: '#1A1929', borderRadius: 99, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: '#2A2840' },
  presetChipActive: { backgroundColor: PURPLE + '22', borderColor: PURPLE },
  presetChipText: { fontSize: 12, color: '#888', fontWeight: '700' },
  presetChipTextActive: { color: PURPLE },
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: { flex: 1, backgroundColor: '#1E1D2E', borderRadius: 12, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: '#3A3860' },
  toggleBtnActive: { borderColor: GREEN, backgroundColor: GREEN + '18' },
  toggleBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toggleCheck: { fontSize: 13, color: GREEN, fontWeight: '800' },
  toggleBtnText: { fontSize: 14, color: '#ccc', fontWeight: '600' },
  toggleBtnTextActive: { color: GREEN },
  saveBtn: { backgroundColor: PURPLE, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 32 },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 17 },
});
