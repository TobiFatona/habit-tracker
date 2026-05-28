# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: Expo docs

Expo APIs change frequently between SDK versions. Before writing any Expo-specific code, check the versioned docs at https://docs.expo.dev/versions/v54.0.0/ — do not rely on training data for API shapes.

## Commands

```bash
npx expo start            # start dev server (scan QR with Expo Go)
npx expo start --tunnel   # tunnel mode — required when phone and PC are on different networks
npx expo start --web      # run in browser
```

Expo Go on the test device uses **SDK 54**. The project must stay on SDK 54; do not upgrade. Use `npx expo install <package>` (not `npm install`) when adding new native packages — it picks the SDK-compatible version automatically. If npm throws peer-dependency errors, add `--legacy-peer-deps`.

## Architecture

This is a multi-screen Expo Router app. Entry point is `expo-router/entry` (set in `package.json`).

### Navigation structure

```
app/
  _layout.tsx            Root stack — gates on onboarding complete, shows (tabs) or onboarding
  onboarding.tsx         Full-screen welcome + 3-day challenge opt-in (shown on first launch)
  add.tsx                Add/Edit Habit modal (presented over tabs)
  (tabs)/
    _layout.tsx          Bottom tab navigator (Today | Progress | Challenges)
    index.tsx            Home — today's habits list, challenge card, celebration overlay
    analytics.tsx        Progress — weekly chart, streaks, monthly calendar
    challenges.tsx       Challenges — active, completed, and available challenges
```

### Shared code

```
lib/
  types.ts               Habit, Challenge, AppState interfaces
  storage.ts             AsyncStorage helpers: loadHabits, saveHabits, loadChallenges, saveChallenges, loadAppState, saveAppState
  haptics.ts             Haptic wrappers: lightTap, mediumTap, heavyTap, successBurst, errorBurst
  notifications.ts       Push notification helpers: requestPermission, scheduleDailyReminder, cancelAllNotifications

components/
  HabitRow.tsx           Habit list item — supports simple + count types, Reanimated spring animation
  ChallengeCard.tsx      Challenge progress card shown on Home screen
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

**`Challenge`** (stored in `challenges_v1`):
- `startDate` — null until user opts in; once set, challenge is active
- `completedDays` — dates where ALL habits were done
- `completed` — true when `completedDays.length >= durationDays`

**`AppState`** (stored in `app_state_v1`):
- `onboardingComplete` — gates the onboarding screen
- `notificationsEnabled` — tracks if daily reminders are scheduled

### Migration

On first load, `storage.ts` checks for old `habits_v1` key, migrates to `habits_v2` (adds missing fields with defaults), then deletes `habits_v1`.

### Key behaviors

- All habits reset at midnight (checked by comparing `completedDates` to today's ISO date)
- Count habits are "done" when `dailyCounts[today] >= targetCount`; tapping toggles reset (un-completes)
- All-done detection in Home fires `CelebrationOverlay` and updates active challenge's `completedDays`
- Notifications: daily 8pm reminder + 9pm streak-protection nudge, scheduled after onboarding
