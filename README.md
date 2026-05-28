# Habit Tracker

A premium mobile habit tracking app built with Expo (SDK 54) and React Native. Dark-themed, gesture-driven, and built around a rewarding daily habit loop.

## Features

- **Daily habit tracking** — simple (once/day) and count-based (N times/day) habits
- **Streaks** — consecutive-day tracking with fire badge display
- **Challenges** — preset and custom multi-day challenges (3-day, 7-day, 21-day, or any duration)
- **Progress analytics** — 7-day bar chart, monthly calendar heatmap, per-habit streak leaderboard
- **Celebration overlay** — full-screen animation when all habits are completed for the day
- **Per-habit reminders** — custom daily notification time per habit
- **Onboarding** — 4-slide intro with optional 3-Day Kickstart challenge opt-in
- **Hidden dev panel** — tap the footer 7 times to access a testing panel for simulating challenge progress

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Expo SDK 54 (React Native) |
| Navigation | expo-router v3 (file-based) |
| Storage | AsyncStorage (`habits_v2`, `challenges_v1`) |
| Animations | React Native `Animated` API |
| Haptics | expo-haptics |
| Notifications | expo-notifications |
| Gradients | expo-linear-gradient |
| UI | Custom StyleSheet — no UI library |

## Project Structure

```
app/
  _layout.tsx          Root stack — onboarding gate
  onboarding.tsx       4-slide welcome flow
  add.tsx              Add / edit habit modal
  create-challenge.tsx Create custom challenge modal
  dev.tsx              Developer testing panel (hidden)
  (tabs)/
    _layout.tsx        Bottom tab navigator
    index.tsx          Today — habit list + challenge card
    analytics.tsx      Progress — charts, streaks, calendar
    challenges.tsx     Challenges — active, completed, available

components/
  HabitRow.tsx         Animated habit row (simple + count types)
  ChallengeCard.tsx    Active challenge progress card
  CelebrationOverlay.tsx  Full-screen all-done animation
  WeeklyChart.tsx      7-day bar chart

lib/
  types.ts             Shared TypeScript interfaces
  storage.ts           AsyncStorage helpers + migration
  haptics.ts           Platform-safe haptic wrappers
  notifications.ts     Daily reminder scheduling
```

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server (scan QR with Expo Go)
npx expo start

# Tunnel mode (phone on different network)
npx expo start --tunnel
```

Requires the **Expo Go** app on iOS or Android.

## Data Model

**Habit** — stored in `habits_v2`:
- Supports `simple` (once/day) and `count` (N times/day) types
- Tracks `completedDates[]`, `dailyCounts`, `streak`, and an optional `reminder` time

**Challenge** — stored in `challenges_v1`:
- `startDate` activates the challenge; `completedDays[]` tracks all-habits-done days
- `completed` triggers when `completedDays.length >= durationDays`

## Design

Dark palette: `#0F0E17` background · `#6C63FF` purple · `#22C55E` green · `#f97316` orange streaks

All animations use the built-in React Native `Animated` API for full Expo Go compatibility.
