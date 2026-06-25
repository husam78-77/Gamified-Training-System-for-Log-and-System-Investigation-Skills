# Flowchart Blueprint — Chapter 4.3 Detailed Design
### KINETIC BREACH: A Gamified Training System for Log and System Investigation Skills

This document is a diagram **design plan**, not Mermaid output. Every node, decision, DB interaction and external call below is taken directly from the live implementation (file:line references preserved from source inspection). Use each section to generate the actual diagram later with a prompt like "Generate Mermaid code for Diagram 3."

---

## System 1: Terminal Command Processing Pipeline

### Diagram Information
- **Diagram Name:** Terminal Command Execution Pipeline
- **Diagram Type:** Flowchart
- **Purpose:** Show the full backend lifecycle of one terminal command, from HTTP receipt to JSON response, including the dual-evaluation branch.
- **Why academically valuable:** Demonstrates orchestration of multiple parallel data loads, a two-strategy evaluation merge, and a declarative state-recomputation model (no server-side "unlock" mutation) — a non-trivial control-flow design.
- **Belongs to:** 4.3.1 Terminal Command Processing Pipeline
- **Source:** `backend/controllers/terminalController.js:59-321` (`executeCommand`), `backend/utils/terminalParser.js:24-71` (`parseCommand`)

### Diagram Steps

Node 1: Receive `POST /api/terminal/execute` — body `{session_id, command, current_path}`

Node 2: Load session — `sessionModel.getSessionById(sessionId, userId)`

Node 3: Decision — Session exists and belongs to requesting user?

Node 4: Decision — `session.status === 'in_progress'`?

Node 5: Parse command — `parseCommand(command)` → tokenize (quote-aware state machine) → extract command/flags/positional/target

Node 6: Decision — `parsed.valid`?

Node 7 (invalid branch): `terminalModel.saveCommand()` with `match_expected=false`, `match_type=null`

Node 8 (invalid branch): `buildErrorOutput(parsed)` → return response, **pipeline ends here**

Node 9 (valid branch): Load scenario data in parallel — `scenarioModel.getExpectedStepsByScenario`, `scenarioModel.getVirtualFilesByScenario`, `scenarioModel.getObjectivesByScenario`, `discoveryModel.getDiscoveriesWithTriggers`

Node 10: Load progress data in parallel — `terminalModel.getMatchedCommands(sessionId)` → `completedStepOrders`; `discoveryModel.getSessionDiscoveryIds(sessionId)` → `completedDiscoveryIds`

Node 11: Run Direct Step Match — `evaluationService.matchCommand(parsed, expectedSteps, completedStepOrders, current_path)` → `{matched, step}`

Node 12: Run Discovery Match — `discoveryService.matchDiscoveries(parsed, discoveries, completedDiscoveryIds, current_path)` → `newDiscoveries[]` (see System 2 for internal detail)

Node 13: Decision — `directMatch` true?

Node 14 (direct branch): Set `saveMatchType='direct'`, `saveStepOrder=matchedStep.step_order`

Node 15 (no direct match branch): Decision — does any item in `newDiscoveries` have `maps_to_step_order` not already in `completedStepOrders`?

Node 16 (discovery-credits branch): Set `saveMatchType='discovery'`, `saveStepOrder=discovery.maps_to_step_order`, `resolvedStep = expectedSteps.find(step_order===saveStepOrder)`

Node 17 (neither branch): `saveMatchExpected=false`, `saveStepOrder=null`, `saveMatchType=null`

Node 18: `terminalModel.saveCommand({sessionId, commandEntered, matchExpected, matchStepOrder, matchType})` — INSERT into `command_history`

Node 19: Loop — for each discovery in `newDiscoveries`: `discoveryModel.saveDiscovery({sessionId, discoveryId, discoveryKey, triggeredByCommand})` — INSERT INTO `session_discoveries` (idempotent)

Node 20: Compute `updatedStepOrders` = `completedStepOrders` ∪ (`saveStepOrder` if matched) ∪ (all `maps_to_step_order` from `newDiscoveries`)

Node 21: Compute `allDiscoveryKeys` = previously-unlocked discovery keys ∪ `newDiscoveries` keys

Node 22: Compute `visibleFiles` — filter `virtualFiles` by visibility rule (full detail in System 13)

Node 23: `buildTerminalOutput(parsed, visibleFiles, current_path, commandHistory)` → dispatch to command handler

Node 24: Decision — which command? (`ls / cd / cat / grep / find / ps / locate / strings / history / clear / help / pwd / whoami / unknown`) → each handler validates its own target against `visibleFiles` and returns either output text or an error string

Node 25: `evaluationService.resolveCompletedObjectives(objectives, updatedStepOrders)` → `completedObjectiveIds[]`

Node 26: Fire-and-forget (non-blocking) — `autoTriggerService.evaluateAutoTrigger(...)` then conditionally `generateAutoHint(...)` (see System 6 and System 7)

Node 27: Assemble response `{output, matched, matchedStep, newlyRevealedFiles, completedObjectiveIds, newDiscoveries, auto_hint}`

Node 28: Return HTTP 200 response

### Decision Nodes

- **Session exists & owned by user?** NO → 404/error, pipeline ends. YES → continue.
- **Session status = `in_progress`?** NO → error response, pipeline ends. YES → continue.
- **`parsed.valid`?** NO → save unmatched command, return error output (exit path). YES → continue.
- **Direct step match found?** YES → `match_type='direct'`. NO → check discovery credit.
- **Discovery credits an uncompleted step?** YES → `match_type='discovery'`. NO → `match_expected=false`.
- **Command dispatch (multi-branch):** 13 possible branches (12 supported commands + unknown/not-found fallback). `clear` has a special exit value `'__CLEAR__'` consumed client-side.
- **Loop:** newDiscoveries iteration — 0 to N iterations, each an independent INSERT.
- **Exit paths:** (a) invalid command early-exit (Node 8), (b) normal full-pipeline completion (Node 28). No other early exits in this controller method.

### Database Interactions

- **Reads:** `sessions` (validate), `expected_steps`, `virtual_files`, `objectives`, `scenario_discoveries` + `discovery_triggers` (joined/embedded), `command_history` (matched-only, for `completedStepOrders`), `session_discoveries` (ids only, for `completedDiscoveryIds`)
- **Writes:** `command_history` (1 INSERT per command, always), `session_discoveries` (0..N INSERTs, one per newly unlocked discovery, idempotent via `ON CONFLICT DO NOTHING`)
- **Related Tables:** `sessions`, `command_history`, `expected_steps`, `virtual_files`, `objectives`, `scenario_discoveries`, `discovery_triggers`, `session_discoveries`

### External Service Interactions

- None synchronously. Node 26 asynchronously fires the Auto-Trigger Hint System (System 6), which may in turn call the AI Guidance Service (System 7) and ultimately the OpenAI API — but this does not block the response built at Node 27/28.

---

## System 2: Discovery Trigger System

### Diagram Information
- **Diagram Name:** Discovery Trigger Matching Algorithm
- **Diagram Type:** Decision Tree (per-trigger evaluation) wrapped in a Flowchart (per-discovery loop)
- **Purpose:** Show how a single typed command is tested against every trigger of every not-yet-found discovery, and how the first matching trigger unlocks evidence.
- **Why academically valuable:** This is the project's core original algorithmic contribution — a rule-based, multi-strategy pattern matcher that lets functionally equivalent commands (`ls`, `find`, `grep`, `locate`) all satisfy the same forensic objective. Strong candidate for a worked example with real trigger data.
- **Belongs to:** 4.3.3 Discovery Trigger System
- **Source:** `backend/services/discoveryService.js:54-72` (`matchDiscoveries`), `:92-114` (`matchesTrigger`), `:128-153` (`resolveCommandTarget`), `:187-199` (`matchPattern`)

### Diagram Steps — Outer Loop (`matchDiscoveries`)

Node 1: Receive `parsed` command, `discoveries[]` (with embedded `triggers[]`), `completedDiscoveryIds[]`, `currentPath`

Node 2: Initialize `newlyUnlocked = []`

Node 3: Loop start — for each `discovery` in `discoveries`

Node 4: Decision — `completedDiscoveryIds.includes(discovery.discovery_id)`?

Node 5 (already found): Skip to next discovery (continue outer loop)

Node 6 (not yet found): Inner loop start — for each `trigger` in `discovery.triggers`

Node 7: Call `matchesTrigger(parsed, trigger, currentPath)` (see decision tree below)

Node 8: Decision — trigger matched?

Node 9 (matched): Push `discovery` to `newlyUnlocked`, **break inner loop** (first matching trigger wins, no double-counting)

Node 10 (not matched): Continue inner loop to next trigger

Node 11: Inner loop end

Node 12: Outer loop end

Node 13: Return `newlyUnlocked[]`

### Diagram Steps — Per-Trigger Decision Tree (`matchesTrigger`)

Node A1: Receive `parsed`, `trigger`, `currentPath`

Node A2: Decision — `parsed.command === trigger.trigger_command`?

Node A3 (no): Return `false`

Node A4 (yes): Decision — `trigger.name_filter_pattern` is set? (i.e. this is a `find -name` style trigger)

Node A5 (yes): Extract `-name` argument via `extractNameFilterArg(parsed)`

Node A6: Decision — name argument exists?

Node A7 (no): Return `false`

Node A8 (yes): Strip wildcards/quotes from arg → case-insensitive `includes()` test against `trigger.name_filter_pattern` → return boolean result

Node A9 (no name filter): Decision — `trigger.target_pattern` is set?

Node A10 (yes): `resolveCommandTarget(parsed, currentPath)` — special-case `locate` (keyword as-is, no path resolution), `~`/`~/` expansion, absolute/relative resolution via `resolveAbsPath`

Node A11: Decision — resolved target exists (non-null)?

Node A12 (no): Return `false`

Node A13 (yes): `matchPattern(resolvedTarget, trigger.target_pattern, trigger.match_type)` → branch on `match_type`: `exact` (`===`), `prefix` (`startsWith`), `contains` (`includes`), `wildcard` (`*`-splitter chain) → return boolean result

Node A14 (no target pattern, no name filter): Return `true` (bare command match — command name alone is sufficient)

### Decision Nodes

- **Discovery already completed?** YES → skip (loop continue). NO → test its triggers.
- **Command name matches `trigger_command`?** NO → trigger fails immediately. YES → continue.
- **`name_filter_pattern` set?** YES → branch to find-name matching. NO → branch to target-pattern check.
- **Name arg exists?** NO → fail. YES → case-insensitive substring test.
- **`target_pattern` set?** YES → resolve + pattern-match. NO → bare command match succeeds (return true).
- **Resolved target exists?** NO → fail. YES → apply `match_type` strategy.
- **`match_type` branch (4-way):** `exact` / `prefix` / `contains` / `wildcard` — each returns a different boolean test.
- **Inner loop exit:** breaks on first matching trigger (no further triggers checked for that discovery).
- **Outer loop exit:** completes after all discoveries checked; returns whatever accumulated in `newlyUnlocked`.

### Database Interactions

- **Reads:** `scenario_discoveries` + `discovery_triggers` (already joined/embedded as JSON before this algorithm runs — see System 1, Node 9), `session_discoveries` (ids, for `completedDiscoveryIds`, loaded by caller)
- **Writes:** None inside this algorithm itself — persistence (`INSERT INTO session_discoveries`) happens in the caller (System 1, Node 19)
- **Related Tables:** `scenario_discoveries`, `discovery_triggers`, `session_discoveries`

### External Service Interactions

None. Pure in-memory pattern matching.

---

## System 3: Scoring Algorithm

### Diagram Information
- **Diagram Name:** Mission Score & XP Calculation
- **Diagram Type:** Flowchart
- **Purpose:** Show the 4-component score computation (0–100) and the downstream XP formula, including the auto-switch between discovery-weighted and step-weighted path scoring.
- **Why academically valuable:** Self-contained, fully numeric, weighted multi-component formula with a mode switch and a worked-example opportunity — ideal for demonstrating algorithmic design with concrete numbers in the report body.
- **Belongs to:** 4.3.4 Scoring Algorithm
- **Source:** `backend/services/evaluationService.js:139-205` (`calculateScore`), `:210-222` (`calculateXp`)

### Diagram Steps

Node 1: Receive `{expectedSteps, matchedCommands, totalCommandsCount, objectives, completedObjectiveIds, hintsUsed, discoveries, completedDiscoveryIds}`

Node 2: Decision — `discoveries.length > 0` (`hasDiscoveries`)?

Node 3 (discovery mode): `pathScore = calculateDiscoveryPathScore(discoveries, completedDiscoveryIds)` = `round(earnedWeight/totalWeight * 50)` over **critical** discoveries only

Node 4 (legacy mode): `totalWeight = Σ expectedSteps.weight_percent`; `earnedWeight = Σ weight_percent of matched steps`; `pathScore = round(earnedWeight/totalWeight * 50)` (0 if `totalWeight===0`)

Node 5: `referenceCount = hasDiscoveries ? criticalDiscoveries.length : expectedSteps.length`

Node 6: `extraCommands = max(0, totalCommandsCount - referenceCount)`

Node 7: `commandPenalty = floor(extraCommands / 3) * 5`

Node 8: `commandUsageScore = max(0, 30 - commandPenalty)`

Node 9: `requiredObjectives = objectives.filter(o => !o.is_secret)`

Node 10: Decision — `requiredObjectives.length > 0`?

Node 11 (yes): `conclusionScore = round(completedRequired.length / requiredObjectives.length * 20)`

Node 12 (no): `conclusionScore = 0`

Node 13: `hintPenalty = hintsUsed * 5`

Node 14: `raw = pathScore + commandUsageScore + conclusionScore`

Node 15: `totalWeightedScore = max(0, raw - hintPenalty)`

Node 16: Decision — partial credit? (`hasDiscoveries` ? `0 < completedDiscoveryIds.length < criticalCount` : `0 < matchedStepOrders.length < expectedSteps.length`)

Node 17: Return `{pathScore, commandUsageScore, conclusionScore, totalWeightedScore, partialCredit}`

Node 18 (downstream — `calculateXp`): Receive `score`, `difficulty`, `hintsUsed`

Node 19: Lookup `base = baseXp[difficulty?.toLowerCase()] || 500` where `baseXp = {easy:500, medium:1250, hard:5000}`

Node 20: `modifier = score / 100`

Node 21: Decision — `hintsUsed === 0`?

Node 22 (yes): `noHintBonus = 200`

Node 23 (no): `noHintBonus = 0`

Node 24: `xpAwarded = round(base * modifier) + noHintBonus`

Node 25: Return `xpAwarded`

### Decision Nodes

- **Discovery mode vs legacy mode?** `discoveries.length>0` → discovery-weighted Path Score. Else → step-weighted Path Score. This is the single switch that keeps the system backward-compatible with scenarios that predate the discovery refactor.
- **`requiredObjectives.length > 0`?** YES → compute ratio-based Conclusion Score. NO → Conclusion Score = 0 (guards against divide-by-zero).
- **Partial credit?** A boolean flag, not a branch that changes the score — set true only if progress is non-zero but incomplete.
- **`hintsUsed === 0`?** YES → +200 XP bonus. NO → no bonus.
- **No loops** in this algorithm — it is a single linear pass with one early branch (mode switch) and one late branch (XP bonus).
- **No early exits** — always computes and returns a result object; floors (via `max(0, ...)`) prevent negative scores rather than short-circuiting.

### Database Interactions

- **Reads:** None directly — operates entirely on data already loaded by the caller (System 14): `expected_steps`, `objectives`, `scenario_discoveries`, aggregated `command_history` counts.
- **Writes:** None directly — the caller persists the result (`evaluation_results` table, see System 14).
- **Related Tables (indirect, via caller):** `expected_steps`, `objectives`, `scenario_discoveries`, `command_history`

### External Service Interactions

None. Pure computation.

---

## System 4: Mission Completion Logic

### Diagram Information
- **Diagram Name:** Mission Completion Determination
- **Diagram Type:** Decision Tree
- **Purpose:** Show the boolean logic that decides whether a session counts as a successfully completed mission, including the discovery-aware vs legacy branch.
- **Why academically valuable:** A compact but consequential business-rule decision — demonstrates the "both axes must pass" design (evidence completeness AND objective completeness) that prevents false-positive completions.
- **Belongs to:** 4.3.4 Scoring Algorithm (paired with System 3) or 4.3.8 Session Completion Pipeline
- **Source:** `backend/controllers/sessionController.js:287-303`

### Diagram Steps

Node 1: Receive `objectives[]`, `completedObjectiveIds[]`, `discoveries[]`, `completedDiscoveryIds[]`

Node 2: `requiredObjectives = objectives.filter(o => !o.is_secret)`

Node 3: Decision — `requiredObjectives.length > 0` AND every required objective id is in `completedObjectiveIds`?

Node 4: Set `allRequiredObjectivesDone` = result of Node 3

Node 5: Decision — `discoveries.length > 0`?

Node 6 (yes branch): `criticalDiscoveries = discoveries.filter(d => d.is_critical)`

Node 7: Decision — `criticalDiscoveries.length === 0` OR every critical discovery id is in `completedDiscoveryIds`?

Node 8: Set `allCriticalDiscoveriesDone` = result of Node 7

Node 9: `missionCompleted = allCriticalDiscoveriesDone AND allRequiredObjectivesDone`

Node 10 (no branch — legacy scenario, no discoveries defined): `missionCompleted = allRequiredObjectivesDone`

Node 11: Return `missionCompleted` (boolean)

### Decision Nodes

- **`requiredObjectives.length === 0`?** Acts as a safety guard — if a scenario somehow has zero required objectives, `allRequiredObjectivesDone` evaluates false rather than vacuously true, so `missionCompleted` can never become true by omission.
- **`discoveries.length > 0`?** YES → discovery-aware completion (both critical discoveries AND required objectives must be 100%). NO → legacy completion (required objectives only).
- **`criticalDiscoveries.length === 0`?** Guards a scenario that has discoveries defined but none marked critical — treated as automatically satisfied so it falls back to objective-only completion.
- **No loops.** Two sequential AND-conditions resolved into one boolean. No exit paths other than the final return — this is a pure decision function with no side effects.

### Database Interactions

- **Reads:** None directly — consumes `objectives`, `discoveries`, `completedObjectiveIds`, `completedDiscoveryIds` already loaded by the caller (System 14, which reads `objectives`, `scenario_discoveries`, `session_discoveries`, and derives `completedObjectiveIds` from `command_history`).
- **Writes:** None — the resulting boolean is used downstream by System 14 to decide badge award and progress upsert.
- **Related Tables (indirect):** `objectives`, `scenario_discoveries`, `session_discoveries`, `command_history`

### External Service Interactions

None.

---

## System 5: Player State Analyzer

### Diagram Information
- **Diagram Name:** Player Behavioral State Analysis
- **Diagram Type:** Flowchart (main `analyzePlayerState`) with an embedded Decision Tree (`classifyBehavior`) and a sub-flow (`computeStuckScore`)
- **Purpose:** Show how raw command timing/content history is converted into a behavioral classification and a composite 0–100 "stuck score" that drives the hint system.
- **Why academically valuable:** A weighted multi-signal heuristic combining time-based, repetition-based, and edit-distance (Levenshtein) signals into one score — strong example of applied algorithm design beyond simple CRUD.
- **Belongs to:** 4.3.5 Player State Analyzer & Auto-Trigger Hint System
- **Source:** `backend/services/playerStateAnalyzer.js:60-136` (`analyzePlayerState`), `:147` (`detectRepetition`), `:192-218` (`classifyBehavior`), `:234` (`detectProximity`), `:279-308` (`computeStuckScore`), `:382` (`levenshtein`)

### Diagram Steps — Main Flow (`analyzePlayerState`)

Node 1: Receive `commandHistory`, `nextStep`, `completedStepOrders`, `totalSteps`, `sessionStartTime`

Node 2: Compute `wrongSinceMatch` (count of wrong commands since the last correct match)

Node 3: Compute `timeSinceLastCommandMs`, `sessionAgeMs`

Node 4: Decision — `timeSinceLastCommandMs > LONG_IDLE_THRESHOLD_MS (5 min)`? → `isLongIdle`

Node 5: Decision — `timeSinceLastCommandMs > STALL_THRESHOLD_MS (3 min)`? → `isStalled`

Node 6: Call `detectRepetition(recentHistory)` → `{isRepeating, repeatedCommand, repetitionCount}` (ratio ≥ `REPETITION_RATIO_THRESHOLD=0.5` over the last `ANALYSIS_WINDOW=8` commands)

Node 7: Call `classifyBehavior(recentHistory, wrongHistory)` → `behaviorType` (decision tree below)

Node 8: Call `detectProximity(commandHistory, nextStep)` → `{isClose, distance, closestCommand}` via Levenshtein distance ≤ `PROXIMITY_DISTANCE_THRESHOLD=4`

Node 9: Call `computeStuckScore({...})` (sub-flow below) → `stuckScore`, `stuckLabel`

Node 10: Assemble and return `PlayerState` object (raw counts + time signals + behavior signals + proximity signals + composite score)

### Diagram Steps — Decision Tree (`classifyBehavior`)

Node B1: Decision — `recentHistory.length === 0`? → YES: return `'idle'`

Node B2: Decision — `correctRatio = correctCount/recentHistory.length >= 0.5`? → YES: return `'progressing'`

Node B3: Decision — `wrongHistory.length === 0`? → YES: return `'progressing'`

Node B4: Decision — `isRepeating` (from `detectRepetition`)? → YES: return `'repeating'`

Node B5: Decision — `uniqueWrongCmds.size >= EXPLORATION_MIN_UNIQUE (3)`? → YES: return `'exploring'`

Node B6: Default (no condition matched): return `'thrashing'`

### Diagram Steps — Sub-Flow (`computeStuckScore`)

Node C1: Initialize `score = 0`

Node C2: `score += min(wrongSinceMatch, 10) * 4` (up to 40 pts)

Node C3: Decision — `isLongIdle`? YES: `score += 25`. ELIF `isStalled`: `score += 12`. ELSE: `+0` (up to 25 pts)

Node C4: Decision — `isRepeating`? YES: `score += 20` (up to 20 pts)

Node C5: Decision — `behaviorType`? `thrashing → +15`, `exploring → +8`, `idle → +5`, else `+0` (up to 15 pts)

Node C6: Decision — `proximityResult.isClose`? YES: `score = max(0, score - 10)` (proximity discount)

Node C7: `clamp(score, 0, 100)` → return final `stuckScore`

Node C8: Map score to label — `≥70` "critically stuck", `≥45` "significantly stuck", `≥20` "somewhat stuck", else "exploring"

### Decision Nodes

- **`isLongIdle`?** (5 min threshold) and **`isStalled`?** (3 min threshold) — independent boolean flags, both feed `computeStuckScore` (Node C3 treats them as mutually-exclusive priority: long-idle takes precedence over stalled).
- **`classifyBehavior` 5-way decision chain:** evaluated top-to-bottom, first match wins — `idle → progressing (high correct ratio) → progressing (no wrong attempts) → repeating → exploring → thrashing (default)`.
- **`isClose`?** (Levenshtein ≤4 to expected next command) — discounts stuck score by 10 and (downstream, in System 7) triggers a different prompt tone ("confirm direction" instead of "redirect").
- **No loops** in the main flow; `detectRepetition`/`classifyBehavior` internally iterate over the last 8 commands but this is a bounded, fixed-window scan, not a decision-relevant loop for diagramming purposes.
- **No early exits** — always produces a full `PlayerState` object.

### Database Interactions

- **Reads:** None directly — operates on `commandHistory` already loaded by the caller (System 1's `getMatchedCommands`/full history, or System 6's auto-trigger context).
- **Writes:** None — pure computation, returns an in-memory object.
- **Related Tables (indirect, via caller):** `command_history`

### External Service Interactions

None.

---

## System 6: Auto-Trigger Hint System

### Diagram Information
- **Diagram Name:** Auto-Trigger Hint Decision Logic
- **Diagram Type:** Decision Tree (guard chain + OR'd trigger conditions)
- **Purpose:** Show the guard sequence and three independent trigger conditions that decide whether to proactively push an AI hint without the player requesting one.
- **Why academically valuable:** Clean example of a guard-chain pattern (4 sequential early-exit checks) followed by an OR-combination of 3 independent heuristic conditions — good flowchart/decision-tree pairing.
- **Belongs to:** 4.3.5 Player State Analyzer & Auto-Trigger Hint System
- **Source:** `backend/services/autoTriggerService.js:81-158` (`evaluateAutoTrigger`), `:182+` (`generateAutoHint`)
- **Constants:** `AUTO_TRIGGER_IDLE_MS=4min`, `REPEAT_THRESHOLD=4`, `CRITICAL_STUCK_THRESHOLD=65`, `MIN_GAP_MS=3min`, `MAX_HINTS_PER_SESSION=5`

### Diagram Steps — Guard Chain + Trigger Evaluation (`evaluateAutoTrigger`)

Node 1: Receive `sessionId`, `scenarioId`, `commandHistory`, `expectedSteps`, `completedStepOrders`, `sessionStartTime`

Node 2: Query total hints used this session (via `ai_hint_log` count)

Node 3: Decision (Guard 1) — `totalHintsUsed >= MAX_HINTS_PER_SESSION (5)`? → YES: return `{shouldTrigger:false}`, **exit**

Node 4: Find `nextStep` = first `expectedStep` not in `completedStepOrders`

Node 5: Decision (Guard 2) — `nextStep` exists? → NO: return `{shouldTrigger:false}`, **exit**

Node 6: Decision (Guard 3) — hint already auto-triggered for this step? → YES: return `{shouldTrigger:false}`, **exit**

Node 7: Query last hint timestamp (`ai_hint_log`, most recent for session)

Node 8: Decision (Guard 4) — time since last hint `< MIN_GAP_MS (3 min)`? → YES: return `{shouldTrigger:false}`, **exit**

Node 9: Compute `playerState` via `playerStateAnalyzer.analyzePlayerState(...)` (System 5)

Node 10: Decision (Trigger A) — `playerState.isLongIdle AND wrongCommandCount >= 2`? → YES: return `{shouldTrigger:true, reason:'long_idle_with_wrong_attempts', stepOrder:nextStep.step_order}`, **exit**

Node 11: Decision (Trigger B) — `playerState.isRepeating AND repetitionCount >= 4`? → YES: return `{shouldTrigger:true, reason:'command_repetition_threshold', stepOrder:nextStep.step_order}`, **exit**

Node 12: Decision (Trigger C) — `playerState.stuckScore >= 65`?

Node 13 (Trigger C continued): Query `hintLevelService.getStepProgress(sessionId, nextStep.step_order)`

Node 14: Decision — no prior hint progress row for this step? → YES: return `{shouldTrigger:true, reason:'critical_stuck_no_hint_for_step', stepOrder:nextStep.step_order}`, **exit**

Node 15: Default (no trigger condition matched): return `{shouldTrigger:false}`, **exit**

### Diagram Steps — Hint Generation (`generateAutoHint`, called only if `shouldTrigger=true`)

Node G1: Receive trigger reason + session/scenario context

Node G2: Resolve hint level via `hintLevelService.resolveNextHintLevel(...)` (System 8)

Node G3: Call `hintCacheService.resolveHint(...)` (System 9, which may call System 7 / OpenAI on cache miss)

Node G4: Save hint to `ai_hint_log` with `auto_triggered=true` flag

Node G5: Upsert `session_player_state`

Node G6: Return `{hint, hintLevel}` to caller (System 1, Node 26), embedded in the command response as `auto_hint`

### Decision Nodes

- **Guard 1 — hint cap reached?** YES → exit false. (Hard ceiling shared with manual hints.)
- **Guard 2 — next step exists?** NO → exit false. (Nothing left to hint about.)
- **Guard 3 — already auto-hinted this step?** YES → exit false. (Prevents repeat nagging for the same step.)
- **Guard 4 — cooldown active (<3 min since last hint)?** YES → exit false. (Rate limiting.)
- **Trigger A — long idle (≥5min) AND ≥2 wrong commands?** OR'd with B and C; first true condition wins.
- **Trigger B — same wrong command repeated ≥4 times?**
- **Trigger C — composite stuck score ≥65 AND no hint yet for this step?** Note: this is the only trigger with a *nested* guard (re-checks step progress even though Guard 3 already checked "auto-hinted" — Guard 3 checks for auto-triggered hints specifically, while this checks for *any* hint on the step, including manually requested ones).
- **5 total exit paths**, all but one (`shouldTrigger:true` via A/B/C) returning `false`.

### Database Interactions

- **Reads:** `ai_hint_log` (count for cap check, timestamp for cooldown check), `user_hint_progress` (step progress check)
- **Writes (only in `generateAutoHint`, conditional on trigger firing):** `ai_hint_log` (insert, via System 7's `hintModel.saveHint`), `session_player_state` (upsert), `hint_cache` (conditional insert, via System 9)
- **Related Tables:** `ai_hint_log`, `user_hint_progress`, `session_player_state`, `hint_cache`

### External Service Interactions

- Indirectly triggers the **AI Guidance Service** (System 7) and potentially the **OpenAI Chat Completions API** when `generateAutoHint` is invoked and the hint cache misses.

---

## System 7: AI Guidance Service (ARIA)

### Diagram Information
- **Diagram Name:** ARIA Hint Generation Pipeline
- **Diagram Type:** Sequence Diagram (cross-component interaction), with an embedded Flowchart for the cache-miss internal steps
- **Purpose:** Show every participant and message in a hint request: controller → level service → cache service → (on miss) hint service → player analyzer → prompt builder → AI adapter → OpenAI → sanitizer → cache write → audit log.
- **Why academically valuable:** The flagship feature of the project — demonstrates provider abstraction (OpenAI/Ollama/Mock), prompt engineering with a system/user role split, defense-in-depth leak prevention (prompt instruction + post-hoc regex sanitization), and cache economics. The richest sequence diagram candidate in the system.
- **Belongs to:** 4.3.6 AI Guidance Service (ARIA)
- **Source:** `backend/controllers/hintController.js:46-167` (`requestHint`), `backend/services/hintService.js:29-79` (`generateHint`), `:82-102` (`sanitizeHint`), `backend/services/aiAdapter.js:48-71` (`generate`), `:119-151` (`generateOpenAI`), `:164-177` (`splitPrompt`), `:186-207` (leak detection), `backend/constants/promptConstants.js:234-304` (`buildPrompt`)

### Diagram Steps — Sequence (participants: Frontend, hintController, sessionModel, hintModel, hintLevelService, hintCacheService, hintService, playerStateAnalyzer, promptConstants, aiAdapter, OpenAI API, hintCacheModel)

Node 1: Frontend → hintController: `POST /api/hints/request {session_id}`

Node 2: hintController → sessionModel: `getSessionById` (validate ownership + `status='in_progress'`)

Node 3: hintController → hintModel: `countHintsUsed(sessionId)`

Node 4: Decision — `hintsUsed >= 5`? → YES: return HTTP 429, **exit**

Node 5: hintController → [parallel] terminalModel/scenarioModel/hintModel: load `commandHistory`, `expectedSteps`, `previousHints`, `scenario`

Node 6: hintController → terminalModel: `getMatchedCommands` → derive `nextStep` (first incomplete step)

Node 7: Decision — all steps already complete (no `nextStep`)? → YES: return HTTP 400, **exit**

Node 8: hintController → hintLevelService: `resolveNextHintLevel({sessionId, scenarioId, stepOrder})` (System 8) → `{hintLevel, hintCount, stepLevelCapped}`

Node 9: hintController → hintCacheService: `resolveHint({...})` (System 9)

Node 10: hintCacheService → hintCacheModel: `getCachedHint({scenarioId, stepOrder, hintLevel})`

Node 11: Decision — cache row found?

Node 12 (HIT branch): hintCacheModel: async `incrementCacheHitCount(cacheId)` (fire-and-forget) → hintCacheService still runs `playerStateAnalyzer.analyzePlayerState` for logging purposes only → return cached `hint_text`, `prompt='[CACHE HIT — no prompt sent]'`, `cacheHit=true`

Node 13 (MISS branch): hintCacheService → hintService: `generateHint(...)`

Node 14: hintService → playerStateAnalyzer: `analyzePlayerState(...)` (System 5)

Node 15: hintService: extract last 5 commands, join as string

Node 16: hintService → promptConstants: `buildPrompt({scenarioTitle, missionBrief, recentCommands, playerState, nextStep, completedCount, totalSteps, previousHints, hintLevel, isAutoTriggered})`

Node 17: promptConstants: assemble persona (`buildPersona(completionRatio)`, 3 tone bands) + `HARD_RULES` (6 absolute anti-leak rules) + `LEVEL_INSTRUCTIONS[hintLevel]` + `BEHAVIOR_TONE[behaviorType]` + `STUCK_SCORE_TONE(stuckScore)` + conditional `PROXIMITY_CONFIRMATION` (if `isClose`) + conditional `AUTO_TRIGGER_INTRO` (if auto-triggered) + previous-hints block + directive, joined around literal split marker `'━━━ ACTIVE INCIDENT ━━━'`

Node 18: hintService → aiAdapter: `generate(prompt, {maxTokens:200, temperature:0.4})`

Node 19: aiAdapter: read `process.env.AI_PROVIDER` → Decision — which provider?

Node 20a (OpenAI branch): `splitPrompt(prompt)` → `{systemPart, userPart}` on the split marker → `POST https://api.openai.com/v1/chat/completions` with `model: gpt-4o-mini (env OPENAI_MODEL)`, `messages:[{role:'system',content:systemPart},{role:'user',content:userPart}]`, `max_tokens`, `temperature`

Node 20b (Ollama branch): `POST http://localhost:11434/api/chat`, `model: llama3 (env OLLAMA_MODEL)`, `stream:false`, `options:{temperature, num_predict:maxTokens, stop:['\n\n\n','---']}`

Node 20c (Mock branch): scan prompt for level marker (`RESTRICTED`→2, `SENSITIVE`→3, else 1) → return random hint from a 3-option pool for that level

Node 21: OpenAI/Ollama API --> aiAdapter: response JSON

Node 22: aiAdapter: extract `data.choices[0].message.content` (OpenAI) or `data.message.content` (Ollama), trim

Node 23: aiAdapter: run leak-detection regex scan (`LEAK_PATTERNS`: `ls /`, `cat /`, `grep`, `--flag`, `-flag`, `/dir/file`) — **logs warning only, does not modify response**

Node 24: aiAdapter --> hintService: return raw hint text

Node 25: hintService: `sanitizeHint(hintText, nextStep)` — regex-redact any verbatim occurrence of `nextStep.command_expected` and `nextStep.target_path`, replace with `[REDACTED]`, log warning if redaction occurred

Node 26: hintService --> hintCacheService: return `{prompt, hint, triggerCommands, playerState}`

Node 27: hintCacheService → hintCacheModel: async `storeCachedHint({scenarioId, stepOrder, hintLevel, hintText, promptUsed})` — `INSERT ... ON CONFLICT (scenario_id, step_order, hint_level) DO NOTHING` (fire-and-forget; race-loser re-fetches winner's row)

Node 28: hintCacheService --> hintController: return `{hint, prompt, triggerCommands, playerState, cacheHit:false, cacheId:null}`

Node 29 (both branches rejoin): hintController → hintModel: `saveHint({...})` — INSERT into `ai_hint_log` including `cache_hit` flag and player-state columns

Node 30: hintController → hintModel: `upsertSessionPlayerState(...)`

Node 31: hintController --> Frontend: `{hint, hintsRemaining, hintLevel, hintsRemainingForStep, cacheHit}`

### Decision Nodes

- **Session hint cap reached (≥5)?** YES → HTTP 429, exit. NO → continue.
- **All steps complete (no next step)?** YES → HTTP 400, exit. NO → continue.
- **Cache hit or miss?** HIT → skip AI call entirely, return cached text (with async hit-counter bump). MISS → full generation pipeline, then async cache write.
- **Provider selection (3-way):** `OpenAI` / `Ollama` / `Mock`, controlled by `process.env.AI_PROVIDER` — only one branch executes per call.
- **Leak detected in raw AI output?** Logged only — **does not branch the flow**; the actual safety net is the unconditional `sanitizeHint` regex-redaction step that always runs regardless of whether a leak was detected.
- **`isClose` (proximity)?** Conditionally injects an extra prompt block — not a control-flow branch but a content branch worth showing in the prompt-assembly sub-flow.
- **`isAutoTriggered`?** Same — conditionally injects `AUTO_TRIGGER_INTRO` block into the prompt.

### Database Interactions

- **Reads:** `sessions`, `command_history`, `expected_steps`, `ai_hint_log` (previous hints for this session), `scenarios`, `hint_cache` (cache lookup), `user_hint_progress` (via System 8)
- **Writes:** `ai_hint_log` (INSERT, always — one row per request regardless of cache hit/miss), `hint_cache` (INSERT, only on cache miss, `ON CONFLICT DO NOTHING`), `session_player_state` (UPSERT), `user_hint_progress` (UPSERT, via System 8, happens before this pipeline starts)
- **Related Tables:** `sessions`, `command_history`, `expected_steps`, `ai_hint_log`, `scenarios`, `hint_cache`, `user_hint_progress`, `session_player_state`

### External Service Interactions

- **OpenAI Chat Completions API** (`https://api.openai.com/v1/chat/completions`, model `gpt-4o-mini` default) — primary provider
- **Ollama local API** (`http://localhost:11434/api/chat`, model `llama3` default) — alternate self-hosted provider
- **Mock provider** — offline/dev fallback, no external call
- **AI Adapter** — the abstraction layer that routes to one of the three above based on `AI_PROVIDER` env var
- **Cache Layer** — `hint_cache` table acting as a shared, scenario/step/level-keyed cache across all students (reduces OpenAI API call volume)

---

## System 8: Hint Escalation System

### Diagram Information
- **Diagram Name:** Hint Level Escalation
- **Diagram Type:** State Diagram (level progression) + Flowchart (`resolveNextHintLevel` resolution logic)
- **Purpose:** Show the per-(session, step) escalation from no-hint through Level 1 (Vague) → Level 2 (Directional) → Level 3 (Explicit, capped).
- **Why academically valuable:** Small, clean, independently-keyed state machine — straightforward to diagram and good evidence of deliberate pedagogical design (escalating disclosure rather than all-or-nothing hints).
- **Belongs to:** 4.3.6 AI Guidance Service (ARIA) — subsection
- **Source:** `backend/services/hintLevelService.js:68-97` (`resolveNextHintLevel`), `:107-116` (`getStepProgress`), `:143-167` (`upsertStepProgress`), `:184-217` (`getHintLevelMeta`)

### Diagram Steps — State Diagram

State 0: No hint requested for this step (no `user_hint_progress` row)

State 1: Level 1 — "CLASSIFIED / Minimal Disclosure" (general domain only, no command/tool/path)

State 2: Level 2 — "RESTRICTED / Directional Disclosure" (command function type + general filesystem area)

State 3: Level 3 — "SENSITIVE / Maximum Authorized Disclosure" (specific file category + exact action type, but never exact syntax) — **capped, terminal state**

Transition: State 0 → State 1 on first hint request for the step

Transition: State 1 → State 2 on second hint request

Transition: State 2 → State 3 on third hint request

Transition: State 3 → State 3 (self-loop) on fourth+ request — `stepLevelCapped=true` returned, but Level 3 content is re-served

### Diagram Steps — Flowchart (`resolveNextHintLevel`)

Node 1: Receive `{sessionId, scenarioId, stepOrder}`

Node 2: Query `getStepProgress(sessionId, stepOrder)` — `SELECT ... FROM user_hint_progress WHERE session_id=$1 AND step_order=$2`

Node 3: Decision — row exists?

Node 4 (no row): `currentLevel=0`, `currentCount=0`, `isFirstForStep=true`

Node 5 (row exists): `currentLevel=row.current_level`, `currentCount=row.hint_count`, `isFirstForStep=false`

Node 6: `rawNextLevel = currentLevel + 1`

Node 7: `hintLevel = min(rawNextLevel, MAX_HINT_LEVEL=3)`

Node 8: `newCount = currentCount + 1`

Node 9: Decision — `currentLevel >= 3` (i.e., was already capped *before* this request)? → `stepLevelCapped = true/false`

Node 10: `upsertStepProgress({sessionId, scenarioId, stepOrder, newLevel:hintLevel, newCount, isFirst:isFirstForStep})` — `INSERT ... ON CONFLICT (session_id, step_order) DO UPDATE SET hint_count=EXCLUDED.hint_count, current_level=EXCLUDED.current_level, last_hint_at=CURRENT_TIMESTAMP`

Node 11: Return `{hintLevel, hintCount:newCount, stepLevelCapped, isFirstForStep}`

### Decision Nodes

- **Step progress row exists?** NO → treat as first request (level 0 baseline). YES → read existing level/count.
- **`currentLevel >= 3` before this request?** YES → `stepLevelCapped=true` (signals to the prompt layer that this is a repeat-at-max-level request, not a fresh escalation). NO → normal escalation.
- **No loops.** Single linear resolution per call; the "loop" is conceptual across multiple separate hint requests over time, not within one function execution.
- **Single exit path** — always returns a resolved level object; no error branches in this function (errors would surface from the DB layer, not from logic here).

### Database Interactions

- **Reads:** `user_hint_progress` (by `session_id` + `step_order`, the composite key)
- **Writes:** `user_hint_progress` (UPSERT — INSERT on first hint for a step, sets both `first_hint_at` and `last_hint_at`; UPDATE on subsequent hints, only `last_hint_at` changes)
- **Related Tables:** `user_hint_progress`

### External Service Interactions

None — purely a DB-backed counter/state resolver, called as a step inside System 7's pipeline (before the cache/AI call).

---

## System 9: Hint Cache System

### Diagram Information
- **Diagram Name:** Cache-First Hint Resolution
- **Diagram Type:** Flowchart
- **Purpose:** Show the cache lookup → hit/miss branch → (on miss) generation + async store, including the concurrency-safety design (`ON CONFLICT DO NOTHING`, first-writer-wins).
- **Why academically valuable:** A textbook cache-aside pattern applied to LLM output — worth documenting both for cost-reduction reasoning (shared cache across students hitting the same scenario/step/level) and the race-condition handling.
- **Belongs to:** 4.3.6 AI Guidance Service (ARIA) — subsection
- **Source:** `backend/services/hintCacheService.js:53-135` (`resolveHint`)

### Diagram Steps

Node 1: Receive `{scenarioId, stepOrder, hintLevel, commandHistory, expectedSteps, completedStepOrders, previousHints, scenarioTitle, missionBrief, sessionStartTime, isAutoTriggered}`

Node 2: Query `hintCacheModel.getCachedHint({scenarioId, stepOrder, hintLevel})` — composite-key lookup on `(scenario_id, step_order, hint_level)`

Node 3: Decision — cache row found?

Node 4 (HIT branch): Async (fire-and-forget) `hintCacheModel.incrementCacheHitCount(cacheId)` — `UPDATE hint_cache SET generated_count=generated_count+1, last_served_at=CURRENT_TIMESTAMP`

Node 5 (HIT branch, continued): Still run `playerStateAnalyzer.analyzePlayerState(...)` — for audit-log completeness even though the hint itself isn't regenerated

Node 6 (HIT branch): Extract last 5 commands (for logging consistency with the miss path)

Node 7 (HIT branch): Log cache hit event (scenario, step, level, current hit count)

Node 8 (HIT branch): Return `{hint: cached.hint_text, prompt:'[CACHE HIT — no prompt sent]', triggerCommands, playerState, cacheHit:true, cacheId}`, **exit**

Node 9 (MISS branch): Log cache miss event

Node 10 (MISS branch): Call `hintService.generateHint(...)` with full context including `isAutoTriggered` (System 7, Nodes 14–25)

Node 11 (MISS branch): Receive `{prompt, hint, triggerCommands, playerState}`

Node 12 (MISS branch): Async (fire-and-forget) `hintCacheModel.storeCachedHint({scenarioId, stepOrder, hintLevel, hintText, promptUsed})` — `INSERT ... ON CONFLICT (scenario_id, step_order, hint_level) DO NOTHING`

Node 13 (MISS branch): Return `{hint, prompt, triggerCommands, playerState, cacheHit:false, cacheId:null}`, **exit**

### Decision Nodes

- **Cache hit or miss?** The single governing branch of this diagram. HIT → skip the entire AI generation pipeline (System 7 Nodes 14–25 not executed). MISS → run full generation, then write-through to cache.
- **Race condition on concurrent cache writes:** not a visible branch in this flow, but worth annotating — `storeCachedHint` uses `ON CONFLICT DO NOTHING`, so if two students trigger the same (scenario, step, level) simultaneously on a miss, both generate independently via AI but only the first INSERT wins; the second's generated text is discarded (not re-fetched in this function — note this is fire-and-forget, errors are caught/logged only).
- **Note on cache key design:** the key deliberately excludes `isAutoTriggered` — manual and auto-triggered hints for the same (scenario, step, level) share one cached entry, since hint *content* doesn't depend on trigger source (only the prompt-level intro phrase differs, and that's not cached).
- **No loops, single entry/two exits** (HIT exit at Node 8, MISS exit at Node 13).

### Database Interactions

- **Reads:** `hint_cache` (lookup by composite key)
- **Writes:** `hint_cache` (UPDATE hit counter on HIT; INSERT on MISS, conditional via `ON CONFLICT DO NOTHING`)
- **Related Tables:** `hint_cache`

### External Service Interactions

- Indirectly calls the **AI Guidance Service generation pipeline** (System 7, OpenAI/Ollama/Mock) — but **only on cache miss**; this is the component that decides whether the external AI call happens at all.

---

## System 10: XP and Progression Engine

### Diagram Information
- **Diagram Name:** XP Award, Level Calculation & Rank Resolution
- **Diagram Type:** Flowchart (three linked sub-flows: XP award, rank-from-XP lookup, rank timeline build)
- **Purpose:** Show the atomic XP+level update and the separate read-time rank/clearance/timeline derivation used by the progression page.
- **Why academically valuable:** Demonstrates an atomicity-conscious design (single UPDATE recomputes both `xp` and `level` together, avoiding a race window) plus a tiered-threshold lookup pattern reused three times (rank, clearance, timeline).
- **Belongs to:** 4.3.7 XP, Rank & Achievement Engine
- **Source:** `backend/models/progressionModel.js:175-188` (`addXpToUser`), `_computeRankFromXp` (rank lookup), `:253-260` (`_computeClearanceTier`), `:312-321` (`_buildRankTimeline`)

### Diagram Steps — XP Award (`addXpToUser`, called from Session Completion Pipeline)

Node 1: Receive `userId`, `xpAmount`

Node 2: Single atomic query — `UPDATE users SET xp = xp + $2, level = FLOOR((xp + $2) / 1000) + 1 WHERE user_id = $1 RETURNING user_id, username, xp, level`

Node 3: Return updated `{user_id, username, xp, level}`

### Diagram Steps — Rank Resolution (`_computeRankFromXp`, called when building the progression page)

Node 4: Receive `xp`

Node 5: Initialize `current = RANK_THRESHOLDS[0]` (TRAINEE)

Node 6: Loop — for each `tier` in `RANK_THRESHOLDS` (5 tiers: TRAINEE 0, OPERATIVE 2000, INFILTRATOR 5000, PHANTOM 10000, MASTER_NODE 20000)

Node 7: Decision — `xp >= tier.xpBase`?

Node 8 (yes): `current = tier`, continue loop

Node 9 (no): **break loop** (tiers are ordered ascending, so the first failure means the previous `current` is correct)

Node 10: `range = current.xpTarget - current.xpBase`

Node 11: `progress = max(0, xp - current.xpBase)`

Node 12: `xpPercent = min(100, round(progress/range * 100))`

Node 13: Return `{rank: current.rank, xpBase, xpTarget, xpPercent}`

### Diagram Steps — Clearance Tier (`_computeClearanceTier`)

Node 14: Receive `avgScore`, `missionsCompleted`

Node 15: Decision — `missionsCompleted === 0`? → YES: return `'CLEARANCE_PENDING'`

Node 16: Decision — `avgScore >= 90`? → YES: return `'OMEGA_CLEARANCE'`

Node 17: Decision — `avgScore >= 75`? → YES: return `'ELITE_CLEARANCE'`

Node 18: Decision — `avgScore >= 60`? → YES: return `'SENIOR_CLEARANCE'`

Node 19: Decision — `avgScore >= 40`? → YES: return `'FIELD_CLEARANCE'`

Node 20: Default → return `'RESTRICTED_ACCESS'`

### Diagram Steps — Rank Timeline (`_buildRankTimeline`)

Node 21: Receive `xp`

Node 22: Loop — for each `tier` (with index `i`) in `RANK_THRESHOLDS`

Node 23: `nextXp = RANK_THRESHOLDS[i+1]?.xpBase ?? Infinity`

Node 24: Decision — `xp >= tier.xpBase AND xp < nextXp`? → `status = 'active'`

Node 25: Decision (elif) — `xp >= nextXp`? → `status = 'completed'`

Node 26: Default → `status = 'locked'`

Node 27: Collect `{rank, xpRequired:tier.xpBase, description, status}` into output array

Node 28: Return 5-element timeline array

### Decision Nodes

- **XP award:** no branch — single atomic SQL statement, no conditional logic at all (intentional, to avoid a read-modify-write race).
- **Rank lookup loop:** ascending threshold scan with an early `break` on first tier the player's XP doesn't reach — classic "find the last satisfied tier" pattern.
- **Clearance tier:** 5-way sequential threshold decision (`0 missions → 90+ → 75+ → 60+ → 40+ → else`), first match wins, evaluated top-to-bottom.
- **Rank timeline loop:** 5 iterations, each independently classified into one of 3 states (`locked`/`active`/`completed`) by comparing `xp` against the tier's own range — no shared mutable state between iterations other than the loop index.

### Database Interactions

- **Reads:** `users` (current `xp`, for rank/clearance/timeline derivation when the progression page is requested — distinct call from the XP-award write)
- **Writes:** `users` (`xp`, `level` — single UPDATE, called once per completed session from System 14)
- **Related Tables:** `users`

### External Service Interactions

None.

---

## System 11: Achievement Evaluation Engine

### Diagram Information
- **Diagram Name:** Achievement Evaluation (10-Achievement Table-Driven Check)
- **Diagram Type:** Flowchart (data-gathering phase) + table-driven Decision List (evaluation phase)
- **Purpose:** Show the 9 parallel queries that gather raw statistics, the derived aggregates computed from them, and the 10 independent boolean checks that determine achievement unlock state.
- **Why academically valuable:** Good example of a read-time (not write-time/event-driven) achievement system — nothing is persisted as "unlocked"; every page load recomputes all 10 booleans fresh from session history. Worth contrasting with a typical event-driven achievement-unlock design.
- **Belongs to:** 4.3.7 XP, Rank & Achievement Engine
- **Source:** `backend/models/progressionModel.js:327-521` (`getUserProgressionData`), achievement array construction ~lines 450-461

### Diagram Steps

Node 1: Receive `userId` (triggered by `GET /api/users/progression`)

Node 2: Fire 9 queries in parallel via `Promise.all`:
- Q1: user identity (`username, level, xp` from `users`)
- Q2: mission history — last 20 completed sessions, joined with `scenarios`, `user_progress`, and 4 correlated subqueries per row (`hints_used`, `evidence_found`, `total_critical_evidence`, `command_count`)
- Q3: total active scenarios count
- Q4: total commands executed across all sessions (joined `command_history`+`sessions`)
- Q5: distinct hidden-evidence (discoveries) found, across all sessions
- Q6: total critical evidence count across all active scenarios
- Q7: badges awarded (joined with `scenarios` for title)
- Q8: grep-hunter check — `EXISTS` query: any `session_discoveries` row where `triggered_by_command ILIKE 'grep%'`
- Q9: payload-hunter check — `EXISTS` query: any discovery whose `evidence_tags && ARRAY['payload','malicious','backdoor','exploit','trojan']`

Node 3: Await all 9 results

Node 4: Derive aggregates — `completedSessions` (filter `mission_completed`), `missionsCompleted`, `avgScore`, `totalHintsUsed`, `noHintSessionCount`, `evidenceRecoveryRate`, `fullDiscoverySessions` (sessions where `evidence_found >= total_critical_evidence`), `discoveryCompletionRate`

Node 5: Loop — evaluate each of 10 achievements as an independent boolean (table below); no early exit, all 10 always evaluated

Node 6: Assemble `achievements[]` array, each `{id, name, description, icon, unlocked}`

Node 7: Return as part of the full progression payload (alongside identity, metrics, missionArchive, investigationStyle, rankTimeline)

### Decision Nodes (the 10 achievement checks — each independent, no shared branching)

| Achievement | Condition |
|---|---|
| FIRST_CONTACT | `missionsCompleted >= 1` |
| SILENT_OPERATOR | any completed session with `hints_used === 0` |
| TRACE_WALKER | `fullDiscoverySessions.length > 0` |
| GREP_HUNTER | Q8 result has rows |
| MINIMALIST | any completed session with `1 <= command_count <= 15` |
| ORACLE_DENIED | any completed session with `hints_used===0 AND final_score>=80` |
| PAYLOAD_HUNTER | Q9 result has rows |
| IRON_TRAIL | `missionsCompleted >= 3` |
| DEEP_RECON | `hiddenEvidenceFound >= 5` |
| EFFICIENCY_EXPERT | any session with `final_score >= 90` |

- **No loops with early exit** — unlike System 6's guard-chain, all 10 conditions are evaluated independently and unconditionally every time the page loads (this is a read-time recomputation, not a stateful unlock).
- **No persistence of unlock state** — there is no "achievement unlocked" row written anywhere; this is the key architectural distinction worth calling out in the diagram's annotation.

### Database Interactions

- **Reads:** `users`, `sessions`, `scenarios`, `user_progress`, `command_history`, `session_discoveries`, `scenario_discoveries`, `badges` (9 parallel queries total)
- **Writes:** None — achievements are computed, not stored
- **Related Tables:** `users`, `sessions`, `scenarios`, `user_progress`, `command_history`, `session_discoveries`, `scenario_discoveries`, `badges`

### External Service Interactions

None.

---

## System 12: Investigation Style Classification

### Diagram Information
- **Diagram Name:** Investigation Style Archetype Decision Tree
- **Diagram Type:** Decision Tree
- **Purpose:** Show the ordered, first-match-wins classification of a player into one of 5 narrative archetypes based on aggregate behavioral statistics.
- **Why academically valuable:** Clean, compact decision tree with clear behavioral-to-narrative mapping — good example of using simple aggregate thresholds to drive a gamified personalization feature.
- **Belongs to:** 4.3.7 XP, Rank & Achievement Engine
- **Source:** `backend/models/progressionModel.js:262-310` (`_computeInvestigationStyle`)

### Diagram Steps

Node 1: Receive `{sessions, noHintSessionCount, avgScore, discoveryRate, avgCommandsPerSession, avgHintsPerSession}` (all pre-aggregated from the same 9 queries used by System 11)

Node 2: Decision — `sessions.length === 0`?

Node 3 (yes): Return default — `classification:'Field Operative'`, `archetype:'FIELD_TRACE'`, description "career just beginning", traits `['Awaiting Data','Profile Generating','Baseline Establishing']`, **exit**

Node 4 (no): Compute `noHintRate = noHintSessionCount / sessions.length`

Node 5: Decision — `noHintRate >= 0.6 AND avgScore >= 65`?

Node 6 (yes): Return `GHOST_TRACE` — "Silent Operator", traits `['Hint-Independent','High Precision','Self-Reliant']`, **exit**

Node 7 (no): Decision — `discoveryRate >= 0.7`?

Node 8 (yes): Return `DEEP_EVIDENCE_SEEKER` — "Evidence Hunter", traits `['Evidence Focused','Thorough Analysis','Discovery Specialist']`, **exit**

Node 9 (no): Decision — `avgCommandsPerSession > 0 AND avgCommandsPerSession <= 15 AND sessions.length >= 2`?

Node 10 (yes): Return `PRECISION_TRACE` — "Precision Analyst", traits `['Minimal Commands','Surgical Efficiency','Tactical Approach']`, **exit**

Node 11 (no): Decision — `avgHintsPerSession >= 2`?

Node 12 (yes): Return `ASSISTED_TRACE` — "Guided Operative", traits `['Resource Aware','Systematic Approach','Intelligence-Driven']`, **exit**

Node 13 (no, default): Return `SYSTEMATIC_TRACE` — "Methodical Analyst", traits `['Balanced Approach','Adaptive Tactics','Field Ready']`, **exit**

### Decision Nodes

- **Zero sessions?** YES → immediate default exit, skips all behavioral checks (guards against divide-by-zero in `noHintRate` calculation).
- **5-way ordered decision chain**, strictly first-match-wins, evaluated top-to-bottom: `GHOST_TRACE → DEEP_EVIDENCE_SEEKER → PRECISION_TRACE → ASSISTED_TRACE → SYSTEMATIC_TRACE (default)`. A player satisfying multiple conditions (e.g., both high no-hint-rate AND high discovery-rate) is always classified by whichever condition appears first in the chain — worth noting as a design choice (no weighted/multi-archetype blending).
- **6 total exit paths** (1 default-empty-data + 5 archetypes), each terminal — no loops.

### Database Interactions

- **Reads:** None directly — consumes pre-aggregated values computed from the same queries as System 11 (`sessions`, `command_history`, `session_discoveries`, `ai_hint_log` indirectly via hint counts).
- **Writes:** None — computed fresh on every progression page load, not persisted.
- **Related Tables (indirect):** `sessions`, `command_history`, `session_discoveries`, `ai_hint_log`

### External Service Interactions

None.

---

## System 13: Virtual Filesystem Visibility Engine

### Diagram Information
- **Diagram Name:** Declarative File Visibility Computation
- **Diagram Type:** Flowchart
- **Purpose:** Show how a virtual file's visibility is recomputed from scratch on every command, with no server-side "unlock" mutation — the visibility is a pure function of session history.
- **Why academically valuable:** A genuinely original design decision (stateless, append-only-log-derived visibility instead of a mutable per-file "revealed" flag) — strong candidate for explaining the system's overall statelessness property, which also underwrites the frontend's session-restoration design (System 17).
- **Belongs to:** 4.3.2 Virtual Filesystem Engine (subsection of, or paired with, 4.3.1)
- **Source:** `backend/controllers/terminalController.js:198-245` (visibility computation inside `executeCommand`), `backend/controllers/scenarioController.js:118-158` (`getFullScenarioData`, initial-load variant), `backend/models/scenarioModel.js:82-101` (`getVirtualFilesByScenario`)

### Diagram Steps — Per-Command Visibility (inside `executeCommand`)

Node 1: Receive `virtualFiles[]` (full table for scenario, including hidden), `completedStepOrders[]`, this turn's `saveStepOrder` (if matched), `newDiscoveries[]`, `completedDiscoveryIds[]`, `discoveries[]`

Node 2: Compute `updatedStepOrders` = `completedStepOrders` ∪ (`[saveStepOrder]` if `saveMatchExpected` true) ∪ (all non-null `maps_to_step_order` from `newDiscoveries`)

Node 3: Compute `allDiscoveryKeys` = (discovery keys where `discovery_id ∈ completedDiscoveryIds`) ∪ (`newDiscoveries` keys)

Node 4: Loop start — for each `file` in `virtualFiles`

Node 5: Decision — `!file.is_hidden`? → YES: `visible = true`, continue to next file

Node 6: Decision — `file.reveal_at_step` set AND `file.reveal_at_step ∈ updatedStepOrders`? → YES: `visible = true`, continue to next file

Node 7: Decision — `file.reveal_at_discovery_key` set AND `file.reveal_at_discovery_key ∈ allDiscoveryKeys`? → YES: `visible = true`, continue to next file

Node 8: Decision — `file.virtual_file_id` already present in `newlyRevealedFiles` (computed earlier this same turn)? → YES: `visible = true`, continue to next file

Node 9: Default (no condition matched): `visible = false` (file remains hidden)

Node 10: Loop end — collect `visibleFiles[]`

Node 11: Pass `visibleFiles` to `buildTerminalOutput` for `ls`/`cat`/`find`/`grep` rendering (System 1, Node 23)

### Diagram Steps — Initial Scenario Load Variant (`getFullScenarioData`)

Node A1: Receive `scenarioId`

Node A2: Query `virtual_files` for scenario (full rows)

Node A3: Loop — partition each file by `is_hidden`

Node A4: Decision — `is_hidden === false`? → YES: include in `virtualFiles[]` as a **full object** (content, path, metadata, evidence_tags included)

Node A5 (`is_hidden === true`): include in `hiddenFilesMeta[]` as a **stub only** — `{virtual_file_id, reveal_at_step}` (no content, no file_path — a content-leak prevention measure, since the client never receives hidden file contents until a server round-trip reveals them)

Node A6: Return `{virtualFiles, hiddenFilesMeta, scenario, expectedSteps, objectives}`

### Decision Nodes

- **4-condition OR chain per file** (not-hidden / step-revealed / discovery-revealed / just-revealed-this-turn) — first true condition makes the file visible; if none are true, it stays hidden. This is evaluated independently for every file on every single command (no caching of prior visibility decisions server-side).
- **Initial load partition:** `is_hidden` boolean splits files into two differently-shaped payloads — full objects vs metadata stubs — a deliberate content-exposure boundary.
- **No loops with early exit** in the per-file visibility check — each file's 4 conditions are checked independently regardless of outcome for other files.

### Database Interactions

- **Reads:** `virtual_files` (full table per scenario, fetched once per command per System 1 Node 9, and once at scenario load via `getFullScenarioData`)
- **Writes:** None — visibility is never persisted; it is recomputed every time from `command_history` + `session_discoveries` state
- **Related Tables:** `virtual_files`, (indirectly) `command_history`, `session_discoveries`

### External Service Interactions

None.

---

## System 14: Session Completion Pipeline

### Diagram Information
- **Diagram Name:** Mission/Session Completion Orchestration
- **Diagram Type:** Sequence Diagram
- **Purpose:** Show the full cross-module orchestration triggered by a player finalizing a mission — the single largest "fan-out" of calls in the codebase (1 controller method touching 4+ services/models).
- **Why academically valuable:** Best example of orchestration-layer design in the system — ties together Systems 3, 4, 10, and 11/12 in one transaction-like (though not DB-transactional) sequence, including the badge-award conditional and progress non-regression rule.
- **Belongs to:** 4.3.8 Session Completion Pipeline
- **Source:** `backend/controllers/sessionController.js:247-384` (`completeSession`)

### Diagram Steps — Sequence (participants: Frontend, sessionController, sessionModel, scenarioModel, terminalModel, hintModel, discoveryModel, evaluationService, progressionModel)

Node 1: Frontend → sessionController: `POST /api/sessions/:sessionId/complete`

Node 2: sessionController → sessionModel: `getSessionById` (validate ownership AND `status==='in_progress'`)

Node 3: Decision — invalid/not-found/wrong-status? → YES: return error, **exit**

Node 4: sessionController → [parallel, `Promise.all`]: `scenarioModel.getExpectedStepsByScenario`, `scenarioModel.getObjectivesByScenario`, `terminalModel.getMatchedCommands`, `terminalModel.countTotalCommands`, `hintModel.countHintsUsed`, `scenarioModel.getScenarioById`, `discoveryModel.getDiscoveriesWithTriggers`

Node 5: sessionController → discoveryModel: `getSessionDiscoveryIds(sessionId)`

Node 6: sessionController → evaluationService: `resolveCompletedObjectives(objectives, matchedStepOrders)` → `completedObjectiveIds[]`

Node 7: sessionController: compute `missionCompleted` (System 4 — discovery-aware vs legacy branch)

Node 8: sessionController → evaluationService: `calculateScore({expectedSteps, matchedCommands, totalCommandsCount, objectives, completedObjectiveIds, hintsUsed, discoveries, completedDiscoveryIds})` (System 3) → `{pathScore, commandUsageScore, conclusionScore, totalWeightedScore, partialCredit}`

Node 9: sessionController → evaluationService: `calculateXp(totalWeightedScore, scenario.difficulty, hintsUsed)` (System 3) → `xpAwarded`

Node 10: sessionController → terminalModel: `saveEvaluationResult(...)` — `INSERT INTO evaluation_results ... ON CONFLICT (session_id) DO UPDATE`

Node 11: sessionController → sessionModel: `closeSession({sessionId, finalScore:totalWeightedScore, status:'completed'})` — `UPDATE sessions SET end_time=NOW(), final_score=$2, status=$3`

Node 12: sessionController → progressionModel: `upsertUserProgress({userId, scenarioId, score, completed:missionCompleted})` — `INSERT ... ON CONFLICT (user_id, scenario_id) DO UPDATE SET highest_score=GREATEST(...), completed=(completed OR EXCLUDED.completed)`

Node 13: sessionController → progressionModel: `addXpToUser(userId, xpAwarded)` (System 10) — atomic `UPDATE users SET xp=xp+$2, level=FLOOR(...)`

Node 14: Decision — `totalWeightedScore >= 60`?

Node 15 (yes): sessionController → progressionModel: `awardBadge({userId, scenarioId, badgeName:'${scenario.title}_COMPLETE', badgeType:'completion'})` — `INSERT INTO badges ... ON CONFLICT (user_id, scenario_id, badge_name) DO NOTHING`

Node 16 (no): skip badge award

Node 17: sessionController → progressionModel: `getNextScenarioForUser(userId)`

Node 18: sessionController --> Frontend: `{evaluation, session, missionCompleted, xpAwarded, updatedUser, completedObjectiveIds, nextScenario, discoveries}`

### Decision Nodes

- **Session valid / owned / in_progress?** NO → error exit. YES → continue full pipeline.
- **Mission completed?** (System 4's output) — used as an input to `upsertUserProgress`, not a branch in this sequence itself, but worth annotating where it's consumed.
- **`totalWeightedScore >= 60`?** YES → award completion badge. NO → no badge — this is **decoupled** from `missionCompleted`: a high score without 100% mission completion can still earn a badge, and vice versa a 100%-complete mission with many hint penalties might score under 60 and earn no badge.
- **No loops.** Single linear orchestration with one conditional step (badge award). No rollback/compensation logic on partial failure — writes (Nodes 10–13, 15) are sequential, not wrapped in a DB transaction; a failure partway through is a noted architectural assumption (DB writes are trusted to succeed) rather than a designed error-recovery path.

### Database Interactions

- **Reads:** `sessions`, `expected_steps`, `objectives`, `command_history` (matched + total count), `ai_hint_log` (count), `scenarios`, `scenario_discoveries`+`discovery_triggers`, `session_discoveries`
- **Writes:** `evaluation_results` (upsert), `sessions` (update status/end_time/final_score), `user_progress` (upsert, non-regressing), `users` (xp/level update), `badges` (conditional insert)
- **Related Tables:** `sessions`, `expected_steps`, `objectives`, `command_history`, `ai_hint_log`, `scenarios`, `scenario_discoveries`, `discovery_triggers`, `session_discoveries`, `evaluation_results`, `user_progress`, `users`, `badges`

### External Service Interactions

None directly — this is a pure orchestration layer over internal services (Systems 3, 4, 10) and models.

---

# Additional Systems Identified Beyond the Requested 14

The following were discovered during source inspection and are significant enough to warrant diagram consideration, though most are supporting material rather than primary algorithm sections.

---

## System 15: Session Lifecycle (Start / Resume / Abandon)

### Diagram Information
- **Diagram Name:** Session Start/Resume State Diagram
- **Diagram Type:** State Diagram
- **Purpose:** Show the `sessions.status` state machine and the race-condition-safe resume logic on concurrent session creation.
- **Why academically valuable:** Demonstrates handling of a real concurrency hazard (two simultaneous "start mission" clicks) via a DB-level constraint rather than application-level locking.
- **Belongs to:** 4.3.8 Session Completion Pipeline (paired with System 14, as the "other end" of the session lifecycle)
- **Source:** `backend/controllers/sessionController.js:58-136` (`startSession`), `:202-226` (`abandonSession`), `backend/models/sessionModel.js`

### Diagram Steps

Node 1: Frontend → sessionController: `POST /api/sessions/start {mode, scenario_id}`

Node 2: Decision — `mode ∈ {'timed','free'}`? → NO: 400 error, exit

Node 3: sessionController → sessionModel: `getActiveSession(userId, scenarioId)` — check for existing `in_progress` session

Node 4: Decision — active session found?

Node 5 (yes): Return existing session, `resumed:true`, HTTP 200, **exit**

Node 6 (no): sessionController → scenarioModel: `getScenarioById` (validate scenario exists)

Node 7: sessionController → sessionModel: `createSession({userId, scenarioId, mode})` — `INSERT INTO sessions (..., status='in_progress')`

Node 8: Decision — INSERT succeeded?

Node 9 (success): Return new session, `resumed:false`, HTTP 201, **exit**

Node 10 (DB error code `23505`, unique-violation — race condition): another concurrent request already created the `in_progress` session for this `(user_id, scenario_id)` pair

Node 11: Re-query `getActiveSession(userId, scenarioId)` (should now find the winning row)

Node 12: Return found session, `resumed:true`, HTTP 200, **exit**

Node 13 (separate flow): sessionController → sessionModel: `abandonSession(sessionId)` — `UPDATE sessions SET end_time=NOW(), status='abandoned'` (timed-mode-only UI path; no score/XP recorded)

### Decision Nodes

- **Mode valid?** NO → 400, exit.
- **Existing in-progress session found?** YES → resume immediately, skip creation entirely. NO → attempt creation.
- **INSERT race condition (`23505`)?** This is the standout decision — rather than treating a unique-constraint violation as a hard error, the handler interprets it as "someone else won the race" and gracefully resumes the winner's session instead of failing the request.
- **State diagram states:** `(none) → in_progress → completed` (System 14) or `in_progress → abandoned` (Node 13). No transition exists from `completed`/`abandoned` back to `in_progress` for the same row — a new row is always created for a retry.

### Database Interactions
- **Reads:** `sessions` (active-session lookup), `scenarios` (existence validation)
- **Writes:** `sessions` (INSERT on create, UPDATE on abandon)
- **Related Tables:** `sessions`, `scenarios`
- **Constraint exploited:** unique partial index `(user_id, scenario_id) WHERE status='in_progress'`

### External Service Interactions
None.

---

## System 16: OAuth Exchange-Code Authentication Flow

### Diagram Information
- **Diagram Name:** Google OAuth Login via Single-Use Exchange Code
- **Diagram Type:** Sequence Diagram
- **Purpose:** Show why the JWT is never placed directly in a redirect URL — a deliberate two-hop handoff using a short-lived, single-use code.
- **Why academically valuable:** A genuine security design decision (avoiding JWT exposure via browser history/referrer headers) worth a dedicated sequence diagram, distinct from a generic "OAuth happens" treatment.
- **Belongs to:** 4.3.9 Authentication Service (supporting section)
- **Source:** `backend/routes/authRoutes.js:13-38`, `backend/controllers/authController.js:14-21` (`createOAuthExchangeCode`), `:72-94` (`exchangeOAuthCode`), `backend/config/passport.js:11-30` (verify callback)

### Diagram Steps

Node 1: Frontend → Backend: `GET /api/auth/google` (user clicks "Sign in with Google")

Node 2: Backend (Passport) → Google: redirect to OAuth consent screen (`scope: profile email`)

Node 3: User authenticates with Google, grants consent

Node 4: Google → Backend: `GET /api/auth/google/callback?code=...`

Node 5: Backend (Passport) → Google: exchange authorization code for profile (`accessToken`, `profile.emails[0].value`)

Node 6: Passport verify callback → Backend DB: `SELECT * FROM users WHERE email=$1`

Node 7: Decision — user exists?

Node 8 (yes): `done(null, {exists:true, user})`

Node 9 (no): `done(null, {exists:false, email})`

Node 10: Decision (route handler) — `exists === true`?

Node 11 (yes branch): Mint JWT `jwt.sign({user_id, email, role}, JWT_SECRET, {expiresIn:'7d'})`

Node 12: `createOAuthExchangeCode({token, user})` — generate 32-byte random hex code, store in in-memory `Map` with `expiresAt = now + 60s`

Node 13: Redirect → `${FRONTEND_URL}/auth/callback?code=...`

Node 14 (no branch): Redirect → `${FRONTEND_URL}/register?email=...` (pre-fill email, user must set username+password)

Node 15: Frontend (`AuthCallback` component) → Backend: `POST /api/auth/google/exchange {code}`

Node 16: Backend: look up code in `oauthExchangeStore`

Node 17: Backend: **delete code immediately** (single-use enforcement, regardless of outcome)

Node 18: Decision — `!entry` OR `entry.expiresAt < now`?

Node 19 (yes): Return HTTP 401 "OAuth exchange code invalid or expired", **exit**

Node 20 (no): Return `{token, user}`, HTTP 200

Node 21: Frontend → `AuthContext.login(user, token)` — persist to `localStorage`, navigate to `/dashboard`

### Decision Nodes
- **User exists in DB (by email)?** YES → treat as login, mint JWT immediately. NO → redirect to registration with email pre-filled (account-linking-by-email design).
- **Exchange code valid and not expired?** NO → 401, exit. YES → return the real JWT.
- **Single-use enforcement:** the code is deleted from the in-memory store **before** the expiry check — meaning even a still-valid code cannot be exchanged twice (deletion happens unconditionally on first lookup, not conditionally on success).

### Database Interactions
- **Reads:** `users` (by email, in Passport verify callback)
- **Writes:** None during OAuth login itself (no DB row for existing users); new users go through the standard registration write path (separate flow)
- **Related Tables:** `users`

### External Service Interactions
- **Google OAuth 2.0** (`accounts.google.com` consent screen, token exchange, profile fetch via Passport `passport-google-oauth20` strategy)
- **In-memory exchange-code store** (not a DB table — a `Map` with a 60-second TTL, process-local, not persisted)

---

## System 17: Frontend Session Restoration (Command History Replay)

### Diagram Information
- **Diagram Name:** Stateless Session Restoration via History Replay
- **Diagram Type:** Flowchart
- **Purpose:** Show how the frontend reconstructs `currentPath` and `discoveredPaths` purely by replaying the `command_history` table client-side, with no dedicated backend "session state" endpoint beyond the raw history.
- **Why academically valuable:** Directly demonstrates the payoff of System 13's statelessness — because file visibility and step progress are derivable from the append-only history, a page refresh needs no special server-side session snapshot.
- **Belongs to:** 4.3.1 Terminal Command Processing Pipeline (supporting subsection) or 4.3.2 Virtual Filesystem Engine
- **Source:** `frontend/src/hooks/useTerminal.js:634-743` (`restore`)

### Diagram Steps

Node 1: On mount, with `sessionId`/`token`/`initialFiles`/`isReady` all available

Node 2: Fetch in parallel — `fetchCommandHistory(sessionId, token)`, `fetchResumeState(sessionId, token)` (→ `completedObjectiveIds`, `revealedFiles`)

Node 3: Merge `revealedFiles` (hidden files already unlocked server-side) into local `virtualFiles` state

Node 4: Trigger `onObjectivesUpdated(completedObjectiveIds)` callback

Node 5: Initialize `replayPath = '/'`, `pathsToDiscover = []`

Node 6: Loop — for each `entry` in fetched command history (chronological order)

Node 7: Parse `command`, `tokens`, extract first non-flag argument

Node 8: Decision — `command === 'cd'`?

Node 9 (yes): resolve target against `replayPath` → decision: resolves to a valid directory in `virtualFiles`? → YES: update `replayPath`, push path+parent to `pathsToDiscover`

Node 10: Decision — `command === 'ls'`?

Node 11 (yes): resolve listed path, push path + all its children to `pathsToDiscover`

Node 12: Decision — `command ∈ {'cat','grep'}`?

Node 13 (yes): resolve file path, push file + parent to `pathsToDiscover`

Node 14: Decision — `command === 'find'`?

Node 15 (yes): push search root + all matched files/parents to `pathsToDiscover`

Node 16: Loop end

Node 17: `discoverPaths(pathsToDiscover)` — add all to `discoveredPaths` Set (used for FileTree rendering)

Node 18: `setCurrentPath(replayPath)`

Node 19: Display "-- Restoring previous session --" banner, replay commands in dimmed text, restore prompt at `replayPath`

### Decision Nodes
- **Command type during replay (4-way + default):** `cd` / `ls` / `cat`+`grep` / `find` each have different path-discovery side effects; any other command (e.g., `ps`, `locate`, `history`) is replayed for display but does not affect `discoveredPaths`.
- **`cd` target valid?** Only updates `replayPath` if the resolved target actually exists as a directory in the (already-filtered, visible-only) `virtualFiles` — an invalid replayed `cd` simply doesn't move the reconstructed path forward.
- **No loop early-exit** — every history entry is replayed in order; this is O(n) in command count, not optimized for very long sessions, which is a reasonable but worth-noting scalability note.

### Database Interactions
- **Reads (via API calls, not direct DB access from frontend):** `command_history` (full session history), resume-state endpoint (derived `completedObjectiveIds` + `revealedFiles` from `virtual_files`/`session_discoveries`/`command_history` server-side)
- **Writes:** None — purely a read-and-replay reconstruction
- **Related Tables (indirect, via backend endpoints):** `command_history`, `virtual_files`, `session_discoveries`

### External Service Interactions
- `GET /api/terminal/history/:sessionId`, `GET /api/terminal/resume/:sessionId` (both backend endpoints, no external 3rd-party services)

---

## System 18: Objective Tracking State Machine

### Diagram Information
- **Diagram Name:** Objective Lifecycle (Incomplete → In Progress → Completed)
- **Diagram Type:** State Diagram
- **Purpose:** Show the 3-state objective lifecycle and the secret-objective visibility toggle, split across backend resolution and frontend anticipatory UI state.
- **Why academically valuable:** Small but clean state diagram showing a backend/frontend split — backend only ever reports *completed* objective IDs, while the *in-progress* anticipatory state is a frontend-only UX enhancement with no backend equivalent.
- **Belongs to:** 4.3.1 Terminal Command Processing Pipeline (supporting subsection)
- **Source:** `backend/services/evaluationService.js:229-233` (`resolveCompletedObjectives`), `frontend/src/hooks/useObjectives.js` (`markObjectivesCompleted`, `markStepProgress`)

### Diagram Steps

Node 1: Initial state — objective loaded with `status:'INCOMPLETE'`, `visible: !is_secret` (secret objectives start hidden)

Node 2: On each command response, IF `matchedStep` present → frontend `markStepProgress(matchedStep)`

Node 3: Loop — for each objective currently `INCOMPLETE` with `trigger_step > matchedStep.step_order`

Node 4: Transition — `status: INCOMPLETE → IN_PROGRESS` (frontend-only anticipatory signal; backend has no `IN_PROGRESS` concept)

Node 5: Backend (System 1, Node 25): `resolveCompletedObjectives(objectives, updatedStepOrders)` — `objective.trigger_step ∈ updatedStepOrders` → include `objective_id`

Node 6: Frontend receives `completedObjectiveIds[]` → `markObjectivesCompleted(completedIds)`

Node 7: Loop — for each objective whose id is in `completedObjectiveIds`

Node 8: Transition — `status: (IN_PROGRESS or INCOMPLETE) → COMPLETED`, `visible: true` (this is also the moment secret objectives become visible — they only ever become visible by completing, never by mere proximity)

### Decision Nodes
- **`trigger_step > matchedStep.step_order`?** Governs the `INCOMPLETE → IN_PROGRESS` anticipatory transition — purely a frontend prediction, not authoritative.
- **`objective_id ∈ completedObjectiveIds`?** The only authoritative transition — always backend-sourced.
- **Secret objective visibility:** never toggled independently — `visible` only flips to `true` as a side effect of `status → COMPLETED`, meaning a secret objective is never shown "in progress," only suddenly revealed-and-completed simultaneously.

### Database Interactions
- **Reads (backend):** `objectives` (full list incl. secret), consumes `updatedStepOrders` already computed in System 1
- **Writes:** None — objective completion is derived, not stored as a separate row (no `objective_completions` table observed)
- **Related Tables:** `objectives` (indirectly, `expected_steps` via `trigger_step` correlation)

### External Service Interactions
None.

---

# Prioritization

## Essential Diagrams

These must appear in Chapter 4.3 — each demonstrates original algorithmic or architectural decision-making central to the project's value proposition.

1. **System 1 — Terminal Command Execution Pipeline** (Flowchart)
2. **System 2 — Discovery Trigger Matching Algorithm** (Decision Tree)
3. **System 3 — Mission Score & XP Calculation** (Flowchart)
4. **System 4 — Mission Completion Determination** (Decision Tree)
5. **System 6 — Auto-Trigger Hint Decision Logic** (Decision Tree)
6. **System 7 — ARIA Hint Generation Pipeline** (Sequence Diagram)
7. **System 14 — Mission/Session Completion Orchestration** (Sequence Diagram)

## Recommended Diagrams

Strengthen the chapter and show breadth, but the report remains coherent without all of them — include if space/time allows.

8. **System 5 — Player Behavioral State Analysis** (Flowchart + Decision Tree) — pairs naturally with System 6, could be merged into one combined figure to save space
9. **System 8 — Hint Level Escalation** (State Diagram) — small, quick to produce, reinforces the pedagogical design narrative
10. **System 9 — Cache-First Hint Resolution** (Flowchart) — good if the report discusses cost/performance engineering
11. **System 10 — XP Award, Level & Rank Resolution** (Flowchart) — at minimum include the XP-award sub-flow; the rank/clearance/timeline sub-flows could be condensed into a single threshold table instead of a full diagram
12. **System 11 — Achievement Evaluation** (table-driven list) — the table itself may suffice in the report body; a full flowchart is optional
13. **System 12 — Investigation Style Archetype Decision Tree** — short, visually clean, good if the report emphasizes gamification/personalization design
14. **System 13 — Declarative File Visibility Computation** (Flowchart) — valuable if the report discusses the project's statelessness as a design principle; otherwise can be summarized in prose under System 1
15. **System 16 — Google OAuth Exchange-Code Flow** (Sequence Diagram) — worth including if Chapter 4.3 covers authentication at all; otherwise authentication can be summarized briefly in prose

## Overkill Diagrams

Technically correct and traceable to source, but not worth a dedicated figure in a Final Year Project report — better referenced in prose or a single combined table.

16. **System 15 — Session Start/Resume State Diagram** — the race-condition handling is a nice detail but is a small enough mechanism to describe in 2–3 sentences of prose rather than a full diagram
17. **System 17 — Frontend Session Restoration / History Replay** — interesting engineering but frontend-only and somewhat tangential to the core pedagogical/AI narrative; a single paragraph suffices
18. **System 18 — Objective Tracking State Machine** — genuinely simple (3 states, 2 transitions); fold into System 1's narrative rather than a standalone figure
19. **Per-command-handler internals** (`ls`/`cd`/`cat`/`grep`/`find`/`ps`/`locate`/`strings` individual logic, referenced inside System 1 Node 24) — each handler has its own small decision logic, but 8 additional micro-flowcharts would bloat the chapter without adding new algorithmic insight beyond what System 1's single dispatch decision already conveys
20. **Path Resolution algorithm** (`resolvePath`/`resolveAbsPath`, used inside Systems 1, 2, and 17) — worth one sentence + a code/pseudocode snippet rather than its own flowchart, since it's a small utility reused across multiple diagrams rather than a standalone subsystem
21. **Command Tokenization** (`tokenize`, quote-aware state machine in `terminalParser.js`) — too granular for a report-level diagram; a one-line description ("quote-aware whitespace tokenizer") is sufficient
22. **Rank Timeline build loop** (part of System 10) — trivial 5-iteration classification loop; a table of the 5 tiers communicates the same information more efficiently than a flowchart
