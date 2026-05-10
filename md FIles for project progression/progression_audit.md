# XP & Level Progression System — Full Codebase Audit

---

## 1. FILE-BY-FILE ANALYSIS

### BACKEND

---

#### `backend/services/evaluationService.js`
**Why it matters:** Core XP and score calculation engine.
**What it does:**
- `calculateScore()` — Produces a 0–100 weighted score from: path score (50pts), command usage (30pts), conclusion score (20pts), minus hint penalty (5pts per hint).
- `calculateXp(score, difficulty, hintsUsed)` — Converts score → XP using hardcoded base values:
  - easy: 500 XP base
  - medium: 1250 XP base
  - hard: 5000 XP base
  - Formula: `Math.round(base * (score / 100)) + (hintsUsed === 0 ? 200 : 0)`
- `resolveCompletedObjectives()` — Identifies which objectives are done based on matched step orders.

**Status: ✅ SAFE — fully implemented and connected. XP is derived from live gameplay data.**

**Issue:** XP base values are hardcoded inline with no constants file. If you want to tune them, you must find this function.

---

#### `backend/controllers/sessionController.js`
**Why it matters:** The only place in the codebase that triggers XP award, progress save, and badge grant.
**What it does (lines 317–353):**
1. Calls `evaluationService.calculateXp()` → gets `xpAwarded`
2. Calls `progressionModel.upsertUserProgress()` → writes to `user_progress` table
3. Calls `progressionModel.addXpToUser()` → writes XP + recalculates level in DB
4. Calls `progressionModel.awardBadge()` if score ≥ 60

**Status: ✅ SAFE — the single authority for all progression writes.**

**Issue (lines 93–100):** The progression lock check (`isScenarioUnlocked`) is **commented out**:
```js
// لو عندك نظام progression خليه check فقط
/*
const allowed = await progressionModel.isScenarioUnlocked(userId, scenario_id);
if (!allowed) { return response.error(res, 403, 'Scenario locked'); }
*/
```
Any player can currently play any scenario regardless of progression order. This is deliberately disabled "for testing."

---

#### `backend/models/progressionModel.js`
**Why it matters:** The data layer for all progression operations.
**What it does:**
- `addXpToUser(userId, xpAmount)` — DB-level atomic XP + level update:
  ```sql
  SET xp = xp + $2, level = FLOOR((xp + $2) / 1000) + 1
  ```
  **Level formula: every 1000 XP = 1 level, starting at 1.**
- `upsertUserProgress()` — Writes highest score and completion to `user_progress`. Never downgrades.
- `awardBadge()` — Inserts badge with ON CONFLICT DO NOTHING (idempotent).
- `getUserProgressionData()` — Massive aggregation query used by the Progress page. Reads level and XP from `users.level` and `users.xp`. Also calculates a computed rank (TRAINEE → MASTER_NODE) from XP using `RANK_THRESHOLDS`.
- `getNextScenarioForUser()` — Determines next unlocked scenario via LEFT JOIN on `user_progress`.

**Status: ✅ SAFE — source of truth for all progression reads and writes.**

**Issue:** `RANK_THRESHOLDS` is defined in JavaScript (inside progressionModel.js) but `level` is computed in SQL. These are **two separate systems**:
- `level` in the DB = `FLOOR(xp / 1000) + 1` (linear, simple)
- `rank` in JS = threshold-based (TRAINEE/OPERATIVE/INFILTRATOR/PHANTOM/MASTER_NODE)

Neither system knows about the other. Level and Rank are independently calculated and never synchronized.

---

#### `backend/models/userModel.js`
**Why it matters:** Profile endpoint reads `level` from DB.
**What it does:**
- `getUserProfileData()` — Selects `u.level` from users. Does **not** select `xp`.
- Profile page shows `level` but NOT `xp`, `rank`, or XP progress bar.

**Status: ⚠️ INCOMPLETE — profile shows level but is missing XP and rank fields.**

---

#### `backend/controllers/userController.js`
**Why it matters:** Exposes profile and progression to frontend.
**What it does:**
- `getProfile()` — Returns `level`, `badgeCount`, `totalScore` (sum of highest_scores), `accountAgeDays`. Does NOT return `xp`.
- `getProgression()` — Returns full `getUserProgressionData()` result, which includes `identity.xp`, `identity.level`, `identity.rank`, `identity.xpPercent`.

**Status: ⚠️ INCONSISTENT — two endpoints expose overlapping progression data with different fields.**
- `/api/users/profile` → has `level` but no `xp`, no `rank`
- `/api/users/progression` → has all of the above

---

### DATABASE

---

#### `database/database.sql` — `users` table
**Why it matters:** Root storage of XP and level.
**Schema:**
```sql
level INT DEFAULT 1,
xp    INT DEFAULT 0;   -- Note: semicolon is inside CREATE TABLE (syntax error in file, but likely correct in actual DB)
```
**Status: ✅ SAFE — both columns exist and are initialized correctly.**

**Issue:** There are **no CHECK constraints** on `xp` or `level`. A bug could set them to negative values. No DB trigger recalculates level when xp changes — this is done in application code only.

---

#### `database/database.sql` — `user_progress` table
**Why it matters:** Tracks per-scenario completion and highest score.
**Schema:** `user_id`, `scenario_id`, `highest_score`, `completed`
**Status: ✅ SAFE — correctly structured, upsert prevents duplicates.**

**Issue:** No `xp_awarded` or `xp_earned` column here. XP is tracked only in aggregate on the `users` table, making it impossible to know how much XP came from which scenario without recalculating.

---

#### `database/database.sql` — `badges` table
**Why it matters:** Badge award is tied to session completion.
**Schema:** `user_id`, `scenario_id`, `badge_name`, `badge_type`, `awarded_at`
**Status: ✅ SAFE — duplicate badge prevention via unique constraint.**

**Issue:** `badge_type` is always `'completion'`. There is no design for different badge types (e.g., speed, no-hints, evidence-hunter). The achievements in `progressionModel.js` are computed dynamically from session data on each request — they are NOT stored as badges.

---

### FRONTEND

---

#### `frontend/src/components/layout/Header.jsx`
**Why it matters:** Shows level and XP to the user in every page.
**What it does:** Displays hardcoded static values:
```jsx
<span>LVL 42</span>
<span>88%</span>   {/* XP_YIELD - hardcoded */}
<span>00:14:59</span>  {/* fake timer - hardcoded */}
```
**Status: 🔴 BROKEN — completely static placeholder. Not connected to any backend data.**

---

#### `frontend/src/components/layout/Sidebar.jsx`
**Why it matters:** Shows operative identity (rank, username) persistently.
**What it does:** Displays hardcoded static values:
```jsx
<p>RANK: PHANTOM</p>
<p>OPERATIVE_01</p>
```
**Status: 🔴 BROKEN — completely static placeholder. Not connected to any backend data.**

---

#### `frontend/src/pages/Dashboard/Dashboard.jsx`
**Why it matters:** Hero section shows level and XP bar prominently.
**What it does:** All progression values are hardcoded:
```jsx
<h2>42</h2>                          {/* level */}
<span>14,200 / 16,000 XP</span>     {/* XP values */}
<div style={{ width: '88%' }}>      {/* XP bar width */}
```
**Status: 🔴 BROKEN — completely static mockup. Not connected to backend.**

---

#### `frontend/src/pages/Profile/Profile.jsx`
**Why it matters:** Shows level badge on the profile card.
**What it does:**
- Fetches from `/api/users/profile` (authenticated)
- Displays real `profile.level` from backend
- Does NOT display XP, rank, or XP progress

**Status: ✅ PARTIALLY CONNECTED — level is real, but XP and rank are missing.**

---

#### `frontend/src/pages/Progress/Progress.jsx`
**Why it matters:** Full progression dashboard.
**What it does:**
- Fetches from `/api/users/progression`
- Displays real: `identity.level`, `identity.xp`, `identity.xpPercent`, `identity.rank`, `identity.clearanceTier`
- Shows animated XP progress bar, rank, achievements, mission archive

**Status: ✅ FULLY CONNECTED — the only place in the frontend where real XP/level/rank is live.**

---

#### `frontend/src/pages/GamingEnvironment/GamingEnvironment.jsx`
**Why it matters:** Shows XP awarded after mission completion.
**What it does:**
- `CompletionOverlay` reads `evaluation.xpAwarded` (returned from backend `completeSession`)
- Shows score and XP on the end-screen before navigating away

**Status: ✅ SAFE — displays real XP from the backend response.**

---

#### `frontend/src/hooks/useSession.js`
**Why it matters:** Triggers the complete/abandon flow.
**What it does:**
- `complete()` → calls `completeSession()` service → backend awards XP
- `evaluation` state receives the full backend response including `xpAwarded`, `updatedUser`
- Passes `evaluation` to `CompletionOverlay`

**Status: ✅ SAFE — correctly wires gameplay end to backend progression.**

---

#### `frontend/src/services/sessionService.js`
**Why it matters:** API layer for session operations.
**What it does:** Passes through backend data correctly; documents that `xpAwarded`, `updatedUser`, `nextScenario` are returned from `completeSession`.

**Status: ✅ SAFE — thin service layer, no logic.**

---

## 2. DEAD CODE / DUPLICATE LOGIC

| Item | Location | Type |
|---|---|---|
| `oldGamingEnviroments.jsx` | `GamingEnvironment/` | Dead code — old file left in directory |
| `isScenarioUnlocked` check | `sessionController.js` L93-100 | Commented-out code (disabled progression lock) |
| `getUserProgressOverview()` | `progressionModel.js` L208-226 | Exported but never called anywhere in the backend or frontend |
| Header LVL 42 / XP 88% / Timer 00:14:59 | `Header.jsx` | Hardcoded placeholder — disconnected from auth or data |
| Sidebar RANK: PHANTOM / OPERATIVE_01 | `Sidebar.jsx` | Hardcoded placeholder — never reads from API |
| Dashboard level=42, XP=14200/16000 | `Dashboard.jsx` Hero section | Hardcoded placeholder — disconnected from API |
| `RANK_THRESHOLDS` in JS | `progressionModel.js` L233-239 | Rank system duplicates level concept but is separate — never saved to DB |

---

## 3. DETECTED PROBLEMS

### 🔴 Critical (Broken UX)

1. **Header, Sidebar, Dashboard hero** — All show fake hardcoded XP/level/rank data. A player can level up and see no change in the most visible UI elements.

2. **Profile page does not show XP** — `getUserProfileData()` in userModel.js doesn't query `xp`, so the profile endpoint omits it. The profile page is missing the XP progress bar.

### 🟡 Moderate (Architecture Risk)

3. **Two separate level systems** — `level` in DB is `FLOOR(xp/1000)+1` (simple integer). `rank` in JS is threshold-based named tiers. These are computed independently and shown in different places. No single source of truth for "how advanced is this player."

4. **Progression lock is disabled** — Any player can play any scenario in any order. The unlock check in `sessionController.js` is commented out. This means `user_progress` drives the display (which missions are "done") but has no enforcement role in access control.

5. **XP-per-scenario is not stored** — `user_progress` has `highest_score` but no `xp_earned`. Impossible to audit "how much XP did this scenario give me."

6. **Achievements are ephemeral** — The 10 achievement badges in `progressionModel.js` (FIRST_CONTACT, SILENT_OPERATOR, etc.) are recalculated from raw session data on every API call. They are never persisted to the `badges` table. The `badges` table only contains `{scenarioTitle}_COMPLETE` entries from `sessionController`.

### 🟢 Minor (Code Quality)

7. `getUserProgressOverview()` is exported but never called — dead function.

8. XP base values (500/1250/5000) are magic numbers in `evaluationService.js` with no named constants.

9. The `xp` column in the `users` table schema file has a syntactically incorrect semicolon inside the CREATE TABLE block (line 14 of database.sql). This is a documentation bug — the actual running DB is likely correct.

---

## 4. ARCHITECTURE MAP

```
GAMEPLAY EVENT (terminal command)
         │
         ▼
  terminalController.js
  → Matches command against expected_steps
  → Saves to command_history
  → Fires discovery check (autoTriggerService)
         │
         ▼ (player clicks FINALIZE / timer expires)
  sessionController.completeSession()
         │
         ├── evaluationService.calculateScore()     → score (0-100)
         │        └── discoveryService.calculateDiscoveryPathScore()
         │
         ├── evaluationService.calculateXp()        → xpAwarded
         │        └── base[difficulty] × (score/100) + noHintBonus
         │
         ├── terminalModel.saveEvaluationResult()   → evaluation_results table
         │
         ├── sessionModel.closeSession()            → sessions.status = 'completed'
         │
         ├── progressionModel.upsertUserProgress()  → user_progress table
         │        └── highest_score, completed
         │
         ├── progressionModel.addXpToUser()         → users.xp += xpAwarded
         │        └── users.level = FLOOR(xp/1000)+1   [DB-level recalculation]
         │
         └── progressionModel.awardBadge()          → badges table (if score ≥ 60)

FRONTEND READS
         │
         ├── /api/users/progression  (Progress.jsx)
         │        └── getUserProgressionData() → live xp, level, rank, archive
         │
         ├── /api/users/profile      (Profile.jsx)
         │        └── getUserProfileData() → live level only (xp missing)
         │
         ├── Header.jsx              → HARDCODED (not connected)
         ├── Sidebar.jsx             → HARDCODED (not connected)
         └── Dashboard.jsx hero      → HARDCODED (not connected)
```

---

## 5. KEY ANSWERS TO INVESTIGATION QUESTIONS

| Question | Answer |
|---|---|
| Is there an actual level-up system? | ✅ Yes — `FLOOR(xp/1000)+1` in DB on every XP write |
| Is XP truly connected to gameplay? | ✅ Yes — XP is calculated from score+difficulty+hints at session completion |
| Is level derived from XP or manually stored? | Level is BOTH stored in `users.level` AND derived from XP — they are kept in sync by the `addXpToUser` SQL update |
| Are discoveries/objectives awarding XP? | ✅ Indirectly — discoveries raise the path score, which raises XP. Not directly. |
| Is progression based on scenarios, sessions, or objectives? | Sessions: completion of a session triggers all progression writes |
| Which system is the real source of truth? | **Backend: `progressionModel.addXpToUser()` + `users` table.** The Progress page is the only place that reads it accurately. |

---

## 6. RECOMMENDED SINGLE SOURCE OF TRUTH

**Backend:** `users.xp` + `users.level` are the ground truth, updated atomically in `addXpToUser()`.

**Frontend:** The data from `/api/users/progression` (`identity.xp`, `identity.level`, `identity.xpPercent`, `identity.rank`) is the correct shape to use everywhere.

**Recommended fix plan (when ready):**
1. Connect Header and Sidebar to a shared context that fetches from `/api/users/profile` or stores the `updatedUser` returned from session completion.
2. Connect the Dashboard hero section to the same context instead of the hardcoded values.
3. Add `xp` field to the `/api/users/profile` response.
4. Decide whether `rank` (threshold-based) or `level` (linear) is the player-facing progression label — currently both exist but are shown in different places.
5. Re-enable the `isScenarioUnlocked` check in `sessionController.js` when testing is complete.
