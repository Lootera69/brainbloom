# Fix Streak Race Condition — Plan

## Root Cause

Three bugs create a streak data loss race:

1. **`updatedAt: Date.now()`** in initial state (line 270) — On a new device, `s.updatedAt` is the current time, always newer than any Firestore timestamp. The guard `data.updatedAt <= s.updatedAt` returns early, **rejecting cloud data** entirely. Then `syncToFirestore()` overwrites the cloud with empty defaults.

2. **`loadFromFirestore` never called for returning users** — Removed from `AppLayout` in the previous fix. The only remaining call is in `setUser` (fresh login). Returning signed-in users never read cloud data on page load.

3. **`checkStreak` doesn't update `updatedAt`** — Any streak mutation changes persisted state (`streak`, `frozenDays`, `brokenDays`, `_lastEvalDate`) but leaves `updatedAt` stale. The timestamp guard then compares a stale local `updatedAt` against the cloud's timestamp, which may incorrectly allow or deny a merge.

## Fix Outline

### Change 1 — `store/user-store.ts:270`

```diff
- updatedAt: Date.now(),
+ updatedAt: 0,
```

Sets initial `updatedAt` to 0 so cloud data always wins on first load (`0 < T_cloud`).

### Change 2 — `store/user-store.ts:1120-1123`

```diff
- onRehydrateStorage: () => () => {
-   useUserStore.getState().checkStreak(false);
-   useUserStore.getState().checkWeeklyReset();
- },
+ onRehydrateStorage: () => () => {
+   const state = useUserStore.getState();
+   if (!state.userId || state.isGuest) {
+     state.checkStreak(false);
+     state.checkWeeklyReset();
+   } else {
+     state.loadFromFirestore().then(() => {
+       useUserStore.getState().checkStreak(false);
+       useUserStore.getState().checkWeeklyReset();
+     });
+   }
+ },
```

For signed-in users: loads Firestore data **first**, then evaluates streak on the merged data. Guests keep the old synchronous path.

### Change 3 — Add `updatedAt: Date.now()` to every `set()` inside `checkStreak`

Five `set()` calls in `checkStreak` mutate persisted state without updating `updatedAt`:

**a) Line 555 (already active today):**
```diff
- set({ dailyQuests: ..., lastQuestRefresh: ..., questsRewarded: [] });
+ set({ dailyQuests: ..., lastQuestRefresh: ..., questsRewarded: [], updatedAt: Date.now() });
```

**b) Lines 574-578 (new user activation):**
```diff
  set({
    ...
    _lastEvalDate: today,
+   updatedAt: Date.now(),
  });
```

**c) Lines 624-630 (evaluation-only mode):**
```diff
  set({
    ...
    _lastEvalDate: today,
+   updatedAt: Date.now(),
  });
```

**d) Lines 642-653 (full activation, eval already ran):**
```diff
  set({
    ...
    lastPracticeDate: today,
+   updatedAt: Date.now(),
  });
```

**e) Lines 700-715 (full evaluation + activation):**
```diff
  set({
    ...
    _lastEvalDate: today,
+   updatedAt: Date.now(),
  });
```

## Expected Behaviour

| Scenario | Before (broken) | After (fixed) |
|---|---|---|
| New device, first sign-in | `updatedAt=Date.now()` > cloud timestamp → guard skips merge → cloud data lost → sync overwrites with empty state | `updatedAt=0 < T_cloud` → merge proceeds → cloud data wins |
| Returning signed-in user, same device | `loadFromFirestore` never called → operates on stale localStorage | `onRehydrateStorage` calls `loadFromFirestore` → loads cloud data |
| Streak evaluation during rehydration | `checkStreak` mutates state without updating `updatedAt` → timestamp inconsistency | `checkStreak` updates `updatedAt` → timestamp always reflects latest mutation |
| Cross-device: play on B, reopen A | A's local `updatedAt` is stale → may incorrectly skip or allow cloud merge | A's `checkStreak` updates `updatedAt` during rehydration → guard correctly identifies cloud as newer |
