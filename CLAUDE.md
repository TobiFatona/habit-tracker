# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: Expo docs

Expo APIs change frequently between SDK versions. Before writing any Expo-specific code, check the versioned docs at https://docs.expo.dev/versions/v54.0.0/ — do not rely on training data for API shapes.

## Commands

```bash
npx expo start --lan      # start dev server (LAN mode — phone and PC on same WiFi)
npx expo start --tunnel   # tunnel mode — required when phone and PC are on different networks
npx expo start --web      # run in browser
```

Expo Go on the test device uses **SDK 54**. The project must stay on SDK 54; do not upgrade. Use `npx expo install <package>` (not `npm install`) when adding new native packages — it picks the SDK-compatible version automatically. If npm throws peer-dependency errors, add `--legacy-peer-deps`.

**Do not use `react-native-reanimated`.** Expo Go has a fixed native Reanimated version that conflicts with the JS version installed by npm. All animations use React Native's built-in `Animated` API instead (`useNativeDriver: false` for layout/width animations).

## Architecture

This is a multi-screen Expo Router app. Entry point is `expo-router/entry` (set in `package.json`).

### Navigation structure

```
app/
  _layout.tsx              Root stack — gates on onboarding complete, shows (tabs) or onboarding
  onboarding.tsx           4-slide welcome flow + 3-day challenge opt-in (shown on first launch)
  add.tsx                  Add/Edit Habit modal (presented over tabs)
  create-challenge.tsx     Create custom challenge modal
  dev.tsx                  Hidden developer testing panel (tap footer 7× on Home to open)
  (tabs)/
    _layout.tsx            Bottom tab navigator (Today | Progress | Challenges)
    index.tsx              Home — today's habits list, challenge card, celebration overlay
    analytics.tsx          Progress — weekly chart, streaks, monthly calendar heatmap
    challenges.tsx         Challenges — active, completed, preset, and custom challenges
```

### Shared code

```
lib/
  types.ts               Habit, Challenge, AppState, HabitReminder interfaces
  storage.ts             AsyncStorage helpers: loadHabits, saveHabits, loadChallenges, saveChallenges,
                         loadAppState, saveAppState, getConsistency, calcStreak, dateNDaysAgo
  haptics.ts             Haptic wrappers: lightTap, mediumTap, heavyTap, successBurst, errorBurst
  notifications.ts       Push notification helpers: requestPermission, scheduleDailyReminder,
                         scheduleHabitReminders, cancelAllNotifications, formatTime

components/
  HabitRow.tsx           Habit list item — simple + count types, Animated spring; long-press to edit
  ChallengeCard.tsx      Active challenge progress card on Home (caps badges at 7, +N overflow)
  CelebrationOverlay.tsx Full-screen animated overlay on all-done and challenge complete
  WeeklyChart.tsx        7-day bar chart built with native Views
```

### Data model

**`Habit`** (stored in AsyncStorage key `habits_v2`):
- `type: 'simple' | 'count'` — simple = once/day; count = N times/day
- `completedDates: string[]` — ISO dates when habit was fully completed
- `dailyCounts: Record<string, number>` — date → count (count habits only)
- `targetCount: number` — 1 for simple, N for count
- `streak` — recalculated on every toggle via `calcStreak(completedDates)`
- `reminder?: HabitReminder` — optional `{ enabled, hour, minute }` for per-habit daily notifications

**`Challenge`** (stored in `challenges_v1`):
- `startDate` — null until user opts in; once set, challenge is active
- `completedDays` — dates where ALL habits were done
- `completed` — true when `completedDays.length >= durationDays`
- `isCustom?: boolean` — true for user-created challenges

**`AppState`** (stored in `app_state_v1`):
- `onboardingComplete` — gates the onboarding screen
- `notificationsEnabled` — tracks if daily reminders are scheduled

### Migration

On first load, `storage.ts` checks for old `habits_v1` key, migrates to `habits_v2` (adds missing fields with defaults), then deletes `habits_v1`.

### Key behaviors

- All habits reset at midnight (checked by comparing `completedDates` to today's ISO date)
- Count habits are "done" when `dailyCounts[today] >= targetCount`; tapping when done resets (un-completes)
- Long-pressing a HabitRow navigates to `add.tsx?id=<id>` for editing
- All-done detection in Home fires `CelebrationOverlay` and updates active challenge's `completedDays`
- Notifications: if any habits have `reminder.enabled`, per-habit reminders are scheduled via `scheduleHabitReminders`; otherwise falls back to a single daily 8pm reminder
- Secret dev panel: tap the footer text on Home 7 times within 1.5s to open `/dev`

### Design tokens

- Background: `#0F0E17`
- Surface: `#1A1929`
- Purple accent: `#6C63FF`
- Green success: `#22C55E`
- Orange streaks: `#f97316`
- All animations: React Native `Animated` API (NOT Reanimated)
