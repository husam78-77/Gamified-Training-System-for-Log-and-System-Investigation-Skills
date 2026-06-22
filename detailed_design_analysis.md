# Chapter 4.3 Candidate Components — Detailed Design Analysis
### KINETIC BREACH: A Gamified Training System for Log and System Investigation Skills

This document is a research artifact, not report prose. It inventories every significant backend/frontend module discovered in the live codebase (verified against `backend/` and `frontend/src/` as of 2026‑06‑21) and recommends what belongs in Chapter 4.3 Detailed Design, with what diagram type, and what pseudocode is worth writing. All function names, file paths, SQL, and formulas below were extracted directly from source — no invented behavior.

---

## Priority Components

These are the components with the highest combination of academic value, technical complexity, and centrality to KINETIC BREACH's value proposition. Full justification and ranking is at the end of this document.

1. **Terminal Command Processing Pipeline** (`terminalController.js` + `terminalParser.js`)
2. **Discovery Trigger System** (`discoveryService.js` + `discoveryModel.js`)
3. **Scoring Algorithm** (`evaluationService.js`)
4. **Player State Analyzer / Auto-Trigger Hint System** (`playerStateAnalyzer.js` + `autoTriggerService.js`)
5. **AI Guidance Service (ARIA)** (`hintService.js` + `aiAdapter.js` + `promptConstants.js` + `hintLevelService.js` + `hintCacheService.js`)
6. **XP / Rank / Achievement Engine** (`progressionModel.js`)
7. **Virtual Filesystem Engine** (declarative file-revelation model inside `terminalController.js` / `scenarioModel.js`)
8. **Session Manager & Mission Completion Logic** (`sessionController.js` + `sessionModel.js`)

---

## Component Analysis

### 1. Terminal Command Processing Pipeline

**Basic Information**
- Module: Terminal Controller / Parser
- Files: `backend/controllers/terminalController.js` (executeCommand, lines 59–321; getHistory 328–349; getResumeState 370–420; buildTerminalOutput 437–456; handleLs/handleCd/handleCat/handleGrep/handleFind/handlePs/handleLocate/handleStrings/handleHistory 458–770), `backend/utils/terminalParser.js` (parseCommand 24–71, tokenize 77–112, normalizeForEvaluation 121–128, buildErrorOutput 186–195), `backend/models/terminalModel.js`, `frontend/src/hooks/useTerminal.js` (985 lines), `frontend/src/services/terminalService.js`, `frontend/src/components/TerminalPanel.jsx`
- Responsibility: Convert raw terminal text into validated commands, execute them against a per-scenario virtual filesystem, run dual evaluation (legacy + discovery), and stream output back through xterm.js
- Dependencies: `evaluationService`, `discoveryService`, `discoveryModel`, `scenarioModel`, `terminalModel`, `autoTriggerService` (non-blocking)
- Related DB Tables: `command_history`, `virtual_files`, `expected_steps`, `objectives`, `scenario_discoveries`, `discovery_triggers`, `session_discoveries`, `evaluation_results`

**Inputs / Outputs**
- Input: `POST /api/terminal/execute` body `{ session_id, command, current_path }`
- Output: `{ output, matched, matchedStep, newlyRevealedFiles, completedObjectiveIds, newDiscoveries, auto_hint }`
- DB Reads: `sessions`, `expected_steps`, `virtual_files`, `objectives`, `scenario_discoveries`+`discovery_triggers` (joined), `command_history` (matched only), `session_discoveries`
- DB Writes: `command_history` (INSERT every command), `session_discoveries` (INSERT per newly unlocked discovery, idempotent via `ON CONFLICT DO NOTHING`)
- External API Calls: none directly (hint generation is delegated, non-blocking)

**Internal Logic**
- Processing Flow (executeCommand, 14 steps): validate session ownership/status → `parseCommand()` → load 4 scenario datasets in parallel → load progress (`getMatchedCommands`, `getSessionDiscoveryIds`) → run **dual evaluation** (direct step match + discovery match) in parallel → resolve effective match priority (direct wins, else first discovery crediting an uncompleted step) → `saveCommand()` → persist newly unlocked discoveries → compute `updatedStepOrders` (union of direct + discovery-credited) → compute file visibility → `buildTerminalOutput()` dispatches to one of 12 command handlers → `resolveCompletedObjectives()` → fire-and-forget auto-trigger hint evaluation → return JSON.
- Decision Logic: command dispatch table (`ls/cd/cat/grep/find/ps/locate/strings/history/clear/help/pwd/whoami` vs `command not found`); `clear` returns special token `'__CLEAR__'` consumed client-side.
- Validation Logic: command must be in `SUPPORTED_COMMANDS` whitelist (13 commands); unknown commands return Levenshtein-distance-≤2 typo suggestions; empty input is silently ignored.
- State Changes: every command writes one `command_history` row; matched discoveries write `session_discoveries` rows; nothing is mutated in `sessions`.
- Calculations: none scoring-related here (delegated to evaluationService) — this module only computes *step-order/discovery-key unions* for file visibility.
- Rule Enforcement: dual-evaluation priority rule ("direct match wins over discovery match for the *same* step_order"); idempotent discovery unlocking.

**Notable Algorithm — Path Resolution** (`terminalController.js:772–810`, mirrored client-side in `useTerminal.js:26–54`)
```
normalizePath(path)      → collapse //, strip trailing /, lowercase, default '/'
resolveAbsPath(absPath)  → split on '/', drop '.', pop stack on '..'
resolvePath(target, cwd) → expand ~ → '/', ~/x → /x; if absolute, resolveAbsPath; else cwd+target then resolveAbsPath
```
This same algorithm is independently re-implemented on the frontend for tab-completion, history replay and prompt display — a reuse/consistency risk worth flagging in Chapter 5 (limitations) but a legitimate architecture decision worth documenting in 4.3 (client/server must agree on path semantics without a shared package).

---

### 2. Virtual Filesystem Engine (Declarative File Revelation)

**Basic Information**
- Files: `backend/models/scenarioModel.js` (getVirtualFilesByScenario, 82–101), `backend/controllers/terminalController.js` (visibility computation, 198–245), `backend/controllers/scenarioController.js` (getFullScenarioData, 118–158)
- Responsibility: Decide, on every command, which virtual files are visible to the player, without any server-side "unlock" mutation — visibility is a pure function of session history.
- Related DB Tables: `virtual_files` (file_path, content, file_type, is_hidden, reveal_at_step, reveal_at_discovery_key, evidence_tags, metadata)

**Internal Logic**
- A file is visible iff: `!is_hidden` OR `reveal_at_step ∈ updatedStepOrders` OR `reveal_at_discovery_key ∈ allDiscoveryKeys`.
- `updatedStepOrders` = previously completed steps ∪ this turn's direct match ∪ all `maps_to_step_order` values from discoveries unlocked this session.
- `allDiscoveryKeys` = previously unlocked discovery keys ∪ keys unlocked this turn.
- Initial scenario load (`getFullScenarioData`) sends visible files in full and hidden files as **metadata only** (`{virtual_file_id, reveal_at_step}`, no content/path) — a content-leak prevention measure worth noting as a security/design decision.
- Directory inference: any file whose path has more path segments than a queried prefix is treated as living inside an *inferred* directory; no explicit directory rows are required except where `file_type='directory'` is set.

**Why this is a strong Detailed Design candidate:** it's a genuinely novel design decision (no client-trusted "hidden" flag, no server-side per-file unlock writes — visibility is recomputed from the append-only `command_history` + `session_discoveries` tables every request). This statelessness directly supports the "Session Restoration is Stateless" property documented in §10.3 of the terminal-engine research (full command-history replay reconstructs `currentPath` and `discoveredPaths` client-side with no backend re-evaluation).

---

### 3. Discovery Trigger System

**Basic Information**
- Files: `backend/services/discoveryService.js` (matchDiscoveries 54–72, matchesTrigger 92–114, resolveCommandTarget 128–153, matchPattern 187–199, calculateDiscoveryPathScore 232–242, resolveDiscoveryObjectives 253–264), `backend/models/discoveryModel.js`
- Responsibility: Allow a single forensic finding to be reachable via multiple, functionally-equivalent commands (`ls /etc/cron.d`, `find / -name "*cron*"`, `grep -r /etc`, `locate cron`) instead of one rigid expected command.
- Related DB Tables: `scenario_discoveries`, `discovery_triggers`, `session_discoveries`

**Internal Logic — Trigger Matching Algorithm** (first match wins, evaluated per discovery → per trigger)
1. Command name must equal `trigger.trigger_command` exactly.
2. If `trigger.name_filter_pattern` set (for `find -name`): extract `-name` arg, strip wildcards/quotes, case-insensitive `includes()` match.
3. Else if `trigger.target_pattern` set: resolve the player's target against `currentPath` (same resolver as the terminal engine, with `locate` treated specially — keyword used as-is, no path resolution), then match using `trigger.match_type` ∈ {`exact`, `prefix`, `contains`, `wildcard`}.
4. Else: bare command name alone is sufficient.

**Calculation — Discovery Path Score** (0–50 of the 100-point scoring rubric)
```
critical = discoveries.filter(d => d.is_critical)
totalWeight = Σ critical.weight_percent
earnedWeight = Σ weight_percent of completed critical discoveries
pathScore = round((earnedWeight / totalWeight) * 50)
```

**Rule Enforcement:** discoveries are idempotent (`session_discoveries` has `UNIQUE(session_id, discovery_id)` + `ON CONFLICT DO NOTHING`) — re-triggering an already-found discovery is a no-op, preventing score inflation from repeated commands.

**Why strong for 4.3:** this is the most original algorithmic contribution of the project — it directly replaces a previous rigid `expected_steps` exact-matcher (see memory: "Discovery-Based Progression Refactor") and is a clean example of a rule-based pattern-matching engine suitable for a flowchart + pseudocode pair.

---

### 4. Scoring Algorithm (Evaluation Service)

**Basic Information**
- File: `backend/services/evaluationService.js` (matchCommand 43–74, calculateScore 139–205, calculateXp 210–222, resolveCompletedObjectives 229–233)
- Responsibility: Produce a deterministic 0–100 performance score and XP award from raw session telemetry.

**Calculations (exact formulas, verified against source)**

| Component | Range | Formula |
|---|---|---|
| Path Score | 0–50 | Discovery mode: `round(earnedWeight/totalWeight * 50)` over critical discoveries. Legacy mode: same formula over `expected_steps.weight_percent`. |
| Command Usage Score | 0–30 | `referenceCount = critical discoveries OR expected steps count`; `extra = max(0, totalCommands - referenceCount)`; `penalty = floor(extra/3)*5`; `score = max(0, 30 - penalty)` |
| Conclusion Score | 0–20 | `round(completedRequiredObjectives / requiredObjectives * 20)` (secret objectives excluded from denominator) |
| Hint Penalty | −5/hint | `totalWeightedScore = max(0, pathScore + commandUsageScore + conclusionScore − hintsUsed*5)` |
| XP Award | — | `round(baseXp[difficulty] * (score/100)) + (hintsUsed===0 ? 200 : 0)`, `baseXp = {easy:500, medium:1250, hard:5000}` |

**Decision Logic:** scoring **auto-selects** discovery-weighted or step-weighted Path Score depending on whether `discoveries.length > 0` for the scenario — this is the single switch that makes the dual-evaluation architecture backward compatible.

**Rule Enforcement (Mission Completion, computed in `sessionController.completeSession`)**
```
IF discoveries.length > 0:
    missionCompleted = (all critical discoveries found) AND (all required objectives done)
ELSE:
    missionCompleted = all required objectives done
```
Badge awarded independently if `totalWeightedScore >= 60` (decoupled from `missionCompleted`).

**Why strong for 4.3:** self-contained, fully numeric, ideal for a worked pseudocode + example walkthrough (the inventory above includes concrete worked examples with real numbers — directly reusable for the report's algorithm illustration).

---

### 5. Player State Analyzer

**Basic Information**
- File: `backend/services/playerStateAnalyzer.js` (analyzePlayerState 60–136, detectRepetition 147, detectProximity 234, classifyBehavior 192–218, computeStuckScore 279–308, levenshtein 382)
- Responsibility: Convert raw command timing/content history into a behavioral classification used to drive the hint system.

**Internal Logic**
- **Behavior classification** (5 states): `progressing` (≥50% correct ratio, or zero wrong commands), `repeating` (≥50%-ratio repeated wrong command), `exploring` (≥3 unique wrong commands), `thrashing` (default fallback), `idle` (no recent commands).
- **Stuck Score** (0–100 composite):
```
score  = min(wrongSinceMatch,10)*4        # up to 40
       + (isLongIdle?25 : isStalled?12:0) # up to 25  (5min / 3min thresholds)
       + (isRepeating?20:0)               # 20
       + behaviorType bonus (thrashing15/exploring8/idle5/else0)
       − (isClose?10:0)                   # proximity discount
clamp(score, 0, 100)
```
- **Proximity Detection:** Levenshtein edit distance ≤4 between the player's most recent wrong command and the expected next command marks them as "close" — used both to discount the stuck score and to trigger an encouraging prompt variant (`PROXIMITY_CONFIRMATION`) in the AI hint.

**Why strong for 4.3:** the stuck-score formula is a clean weighted heuristic worth a dedicated pseudocode block and a state diagram (behaviorType transitions: idle → exploring/repeating/thrashing → progressing).

---

### 6. Auto-Trigger Hint System

**Basic Information**
- File: `backend/services/autoTriggerService.js` (evaluateAutoTrigger 81–158, generateAutoHint 182+)
- Responsibility: Proactively push an AI hint without the player requesting one, based on `playerStateAnalyzer` output.
- Constants: `AUTO_TRIGGER_IDLE_MS=4min`, `REPEAT_THRESHOLD=4`, `CRITICAL_STUCK_THRESHOLD=65`, `MIN_GAP_MS=3min`, `MAX_HINTS_PER_SESSION=5`

**Decision Logic (guards, then OR'd trigger conditions)**
- Guards (all must pass): hint cap not reached, an incomplete next step exists, no auto-hint already issued for this step, ≥3 min since last hint.
- Triggers (any fires): (a) long idle (≥5min) AND ≥2 wrong commands; (b) same wrong command repeated ≥4 times; (c) composite stuck score ≥65 AND no hint yet issued for this step.

**Why a Flowchart candidate:** clean guard-then-branch structure, ideal for a decision-flowchart with 4 guard diamonds and 3 trigger-condition diamonds.

---

### 7. AI Guidance Service ("ARIA")

**Basic Information**
- Files: `backend/services/hintService.js` (generateHint 29–79, sanitizeHint 82–102), `backend/services/aiAdapter.js` (generate 48–71, generateOpenAI 119–151, generateOllama 79–111, splitPrompt 164–177, leak detection 186–207, generateMock 233–242), `backend/constants/promptConstants.js` (buildPersona 37–69, HARD_RULES 75–96, LEVEL_INSTRUCTIONS 102–130, BEHAVIOR_TONE 136–161, STUCK_SCORE_TONE 167–186, buildPrompt 234–304), `backend/controllers/hintController.js`, `backend/services/hintLevelService.js`, `backend/services/hintCacheService.js`, `backend/models/hintModel.js`, `backend/models/hintCacheModel.js`
- Responsibility: Generate a redacted, in-character, level-appropriate hint, cached per (scenario, step, level), constrained by hard anti-leak rules, calling the configured LLM provider.
- External API: `POST https://api.openai.com/v1/chat/completions`, model `gpt-4o-mini` (env-overridable), `max_tokens=200`, `temperature=0.4`. Alternate Ollama provider (`/api/chat`, model `llama3`). Mock provider for offline dev/testing.

**Internal Logic — Pipeline**
```
hintController.requestHint
  → validate session + 5-hint session cap
  → hintLevelService.resolveNextHintLevel()   (per-step level 1→2→3, capped)
  → hintCacheService.resolveHint()            (cache-first, key=(scenario_id,step_order,hint_level))
        cache HIT  → return cached hint_text, async increment hit counter
        cache MISS → hintService.generateHint()
              → playerStateAnalyzer.analyzePlayerState()
              → promptConstants.buildPrompt()  (persona+rules+level+behavior+stuck tone+history)
              → aiAdapter.generate(prompt)     (OpenAI/Ollama/Mock)
              → sanitizeHint()                 (regex-redact command_expected & target_path)
              → async hintCacheModel.storeCachedHint() (ON CONFLICT DO NOTHING — first-writer-wins)
  → hintModel.saveHint()         (full audit row incl. stuck_score, behavior_type, cache_hit)
  → hintModel.upsertSessionPlayerState()
```
- **Prompt structure** uses a literal split marker `'━━━ ACTIVE INCIDENT ━━━'` to separate system role (persona + immutable HARD_RULES) from user role (situational state + directive) — this is a deliberate prompt-engineering technique to strengthen instruction adherence, and is itself worth a diagram.
- **Hard anti-leak rules** (6 absolute rules: never output exact command, never output exact path, never output flags, never repeat a hint, no filler, ≤3 sentences) enforced via prompt instruction AND a post-hoc regex sanitizer as defense-in-depth (prompt compliance is not trusted alone).
- **3-level escalation**: Level 1 (category only) → Level 2 (command type + general area) → Level 3 (specific file category + exact action, but never exact syntax). Capped at 3; further requests re-serve level 3.
- **Dynamic persona** (`buildPersona`) shifts ARIA's tone across 3 completion bands (0–33% cold/clinical, 34–66% cautiously engaged, 67–100% urgent) — a narrative-design feature with measurable input (completionRatio) worth documenting as a state-driven text generator.

**Why strong for 4.3:** this is the most "AI-system-design" component of the report — prompt template, leak-prevention defense-in-depth, and cache economics (shared hint cache across all students hitting the same scenario/step/level) are genuinely novel engineering decisions distinct from a naive "call OpenAI and show the text" implementation.

---

### 8. Hint Level Service & Hint Cache Service

**Basic Information**
- Files: `backend/services/hintLevelService.js` (resolveNextHintLevel 68–97, getStepProgress 107–116, upsertStepProgress 143–167, getHintLevelMeta 184–217), `backend/services/hintCacheService.js` (resolveHint 53–135)
- Related DB Tables: `user_hint_progress` (PK `(session_id, step_order)`), `hint_cache` (unique `(scenario_id, step_order, hint_level)`)

**Internal Logic**
- Level escalation is strictly per-(session, step) — not global — so two different objectives in the same session can independently be at hint level 1 and level 3.
- Cache key deliberately excludes `is_auto_triggered` — both manual and automatic hint requests for the same (scenario, step, level) share one cached text, since the *content* doesn't depend on how it was triggered (only the intro phrase, which is templated separately, does).
- Cache write race safety: `INSERT … ON CONFLICT (scenario_id, step_order, hint_level) DO NOTHING`; loser of the race re-fetches the winner's row.

**Why a candidate:** small, self-contained state machine (hint level 0→1→2→3 capped) — good for a short pseudocode block, not large enough alone to warrant a full diagram unless merged with the AI Guidance Service section.

---

### 9. XP / Rank / Achievement Engine (Progression Model)

**Basic Information**
- File: `backend/models/progressionModel.js` (upsertUserProgress 156–168, addXpToUser 175–188, awardBadge 193–202, getUserProgressionData 327–521, `_computeRankFromXp`, `_computeClearanceTier` 253–260, `_computeInvestigationStyle` 262–310, `_buildRankTimeline` 312–321)
- Responsibility: Single authority for all XP, level, rank, clearance tier, behavioral achievement, and "investigation style" archetype computation, surfaced via `GET /api/users/progression`.
- Related DB Tables: `users` (xp, level), `user_progress`, `badges`, `sessions`, `command_history`, `session_discoveries`, `scenario_discoveries`, `ai_hint_log`

**Calculations**
- Level: `level = floor((xp_total) / 1000) + 1` (recomputed atomically in the same `UPDATE` that adds XP — no race window).
- Rank thresholds (5 tiers): TRAINEE 0–1999, OPERATIVE 2000–4999, INFILTRATOR 5000–9999, PHANTOM 10000–19999, MASTER_NODE 20000+; per-tier progress % = `(xp - tierBase)/(tierTarget-tierBase) * 100`.
- Clearance tier (derived from `avgScore` + `missionsCompleted`, 6 bands from `CLEARANCE_PENDING` to `OMEGA_CLEARANCE`).

**Achievement Engine — 10 server-evaluated achievements**, each a pure boolean over 9 parallel SQL queries run in `Promise.all`:

| Achievement | Condition |
|---|---|
| FIRST_CONTACT | `missionsCompleted >= 1` |
| SILENT_OPERATOR | any completed session with `hints_used = 0` |
| TRACE_WALKER | any session where `evidence_found >= total_critical_evidence` |
| GREP_HUNTER | exists a discovery where `triggered_by_command ILIKE 'grep%'` |
| MINIMALIST | any completed session with `1 <= command_count <= 15` |
| ORACLE_DENIED | any session with `hints_used=0 AND final_score>=80` |
| PAYLOAD_HUNTER | discovery whose `evidence_tags && ARRAY['payload','malicious','backdoor','exploit','trojan']` |
| IRON_TRAIL | `missionsCompleted >= 3` |
| DEEP_RECON | `hiddenEvidenceFound >= 5` (cumulative across all sessions) |
| EFFICIENCY_EXPERT | any session with `final_score >= 90` |

**Investigation Style Archetype — decision tree (`_computeInvestigationStyle`, first match wins)**
```
IF noHintRate>=0.6 AND avgScore>=65        → GHOST_TRACE       (Silent Operator)
ELIF discoveryRate>=0.7                    → DEEP_EVIDENCE_SEEKER (Evidence Hunter)
ELIF avgCommands<=15 AND sessions>=2       → PRECISION_TRACE   (Precision Analyst)
ELIF avgHintsPerSession>=2                 → ASSISTED_TRACE    (Guided Operative)
ELSE                                       → SYSTEMATIC_TRACE  (Methodical Analyst, default)
```

**Why strong for 4.3:** this is the most "gamification-design" component — a clean decision tree + a points/leveling formula + a behaviorally-driven achievement system, ideal for a flowchart (archetype decision tree) and a pseudocode block (achievement evaluation loop).

---

### 10. Session Manager & Mission Completion

**Basic Information**
- Files: `backend/controllers/sessionController.js` (startSession 58–136, completeSession 247–384, abandonSession 202–226), `backend/models/sessionModel.js`
- Responsibility: Own the `sessions` row lifecycle (`in_progress → completed/abandoned`), orchestrate the full completion pipeline (score → XP → progress upsert → badge → next scenario).

**State Diagram (textual)**
```
idle → [POST /sessions/start] → in_progress
in_progress → [POST /sessions/:id/complete] → completed  (score, XP, badge, progress upsert, next-scenario lookup)
in_progress → [POST /sessions/:id/abandon]  → abandoned   (timed mode only; no score/XP)
```
- **Race condition protection:** DB-level unique partial index `(user_id, scenario_id) WHERE status='in_progress'`; on `23505` violation, `startSession` re-queries and resumes rather than erroring.
- **Progress non-regression:** `user_progress` upsert uses `GREATEST(highest_score, new_score)` and `completed = completed OR new_completed` — a completed/high-score flag is never downgraded.
- Calls into evaluationService (score 4-component sum), progressionModel (XP, badge, next scenario), discoveryModel/scenarioModel (objective + discovery resolution) — this module is the **orchestration layer** that ties together components 3, 4, and 9.

**Why strong for 4.3:** good Sequence Diagram candidate — shows clean cross-module orchestration (controller → 3 services → 3 models) in one user action.

---

### 11. Authentication Service

**Basic Information**
- Files: `backend/controllers/authController.js`, `backend/services/authService.js`, `backend/middleware/authMiddleware.js`, `backend/middleware/validateRequest.js`, `backend/config/passport.js`, `backend/utils/emailSender.js`
- Responsibility: Local email/password auth (bcrypt, 12 rounds) + Google OAuth 2.0 via Passport, stateless JWT (7-day expiry), forgot/temp-password flow, account-linking by email.

**Internal Logic highlights**
- JWT payload: `{user_id, email, role}`, `HS256`, secret from `process.env.JWT_SECRET`.
- **OAuth exchange-code pattern** (security-significant, worth documenting): Google callback never puts the JWT directly in the redirect URL. Instead it mints a 32-byte random single-use code with a 60-second in-memory TTL (`oauthExchangeStore` Map), redirects with `?code=...`, and the frontend immediately exchanges it server-side for the real JWT via `POST /api/auth/google/exchange`. This avoids JWT leakage via browser history/referrer headers — a legitimate security design decision suitable for a sequence diagram.
- Forgot-password: always returns HTTP 200 regardless of whether the email exists (enumeration protection); generates a 10-hex-char temp password (`crypto.randomBytes(5)`), bcrypt-hashed, 1-hour expiry, used as a fallback credential in `loginUser`/`changePassword` password comparison.
- Identified gaps (useful for Ch.5 limitations, not 4.3): no rate limiting, no CSRF token, no email verification flow, no MFA.

**Why a candidate but lower priority:** auth flows are largely standard (bcrypt+JWT+OAuth) — valuable for a sequence diagram (esp. the OAuth exchange-code flow) but lower technical novelty than the discovery/scoring/AI subsystems above.

---

### 12. Scenario Execution / Mission Flow

**Basic Information**
- Files: `backend/controllers/scenarioController.js` (getAllScenarios, getScenariosByType, getScenarioById, getFullScenarioData), `backend/models/scenarioModel.js`, frontend `MissionDashboard.jsx` → `MissionSequence.jsx` → `MissionBriefing.jsx` → `GamingEnvironment.jsx`
- Responsibility: Drive the 4-phase player journey (type selection → scenario sequence → briefing → live terminal), and shape the payload differently per phase (list view → briefing view with visible objectives only → full payload with hidden-file metadata stubs).
- Related DB Tables: `scenarios`, `virtual_files`, `expected_steps`, `objectives`

**Why a candidate:** good Activity/Sequence Diagram material for "mission lifecycle from menu to terminal," but the controller logic itself (simple filtered SELECTs + grouping) is low algorithmic complexity — supporting material rather than a primary algorithm section.

---

### 13. Objective Tracking Logic

**Basic Information**
- Files: `backend/services/evaluationService.js` (resolveCompletedObjectives 229–233), `frontend/src/hooks/useObjectives.js` (markObjectivesCompleted, markStepProgress)
- Responsibility: Maintain a 3-state objective lifecycle (`INCOMPLETE → IN_PROGRESS → COMPLETED`), reveal secret objectives only on completion.
- Logic: backend computes `objective.trigger_step ∈ matchedStepOrders` → objective_id list; frontend marks `IN_PROGRESS` pre-emptively when `trigger_step > matchedStep.step_order` (anticipatory UI feedback), then `COMPLETED` + `visible:true` when the ID arrives from backend.

**Why a candidate:** small state diagram, good supporting material, not large enough for a standalone deep section — recommend folding into the Terminal Pipeline or Session Manager section.

---

## Flowchart Candidates

| # | Diagram Title | Purpose | Type | Key Steps |
|---|---|---|---|---|
| 1 | Terminal Command Execution Pipeline | Show full request lifecycle from keystroke to response | Flowchart | Receive command → tokenize/parse → validate session → load scenario data → dual evaluation (direct + discovery) → resolve match priority → persist → compute file visibility → build output → resolve objectives → auto-trigger hint (async) → respond |
| 2 | Discovery Trigger Matching Algorithm | Show how one command is tested against a discovery's trigger set | Flowchart | For each discovery not yet found → for each trigger → match command name → match name-filter (if `find -name`) → resolve + match target pattern (if set) → else bare-command match → unlock discovery |
| 3 | Path Resolution Algorithm | Show `resolvePath`/`resolveAbsPath` logic shared client/server | Flowchart | Receive target+cwd → expand `~` → branch absolute vs relative → tokenize segments → drop `.` → pop on `..` → rejoin |
| 4 | Scoring Algorithm | Show the 4-component score computation | Flowchart | Compute Path Score (branch: discovery-weighted vs step-weighted) → Compute Command Usage Score (penalty per 3 excess commands) → Compute Conclusion Score → Apply Hint Penalty → Clamp to [0,100] |
| 5 | Auto-Trigger Hint Decision Logic | Show guard-then-OR trigger structure | Flowchart / Decision Tree | Hint cap reached? → next step exists? → already hinted this step? → cooldown elapsed? → (long idle+wrong) OR (repeat≥4) OR (stuck≥65 & no hint yet) → trigger |
| 6 | AI Hint Generation Pipeline (Cache-First) | Show cache hit/miss branching and sanitization | Flowchart | Resolve hint level → cache lookup → HIT: increment+return; MISS: analyze player state → build prompt → call provider → sanitize → async cache store → log → return |
| 7 | Mission Completion Determination | Show the discovery-aware vs legacy completion branch | Flowchart | Has discoveries? → check all critical discoveries found AND all required objectives done; else → check all required objectives done → close session → upsert progress → award XP → badge if score≥60 |
| 8 | OAuth Exchange-Code Flow | Show the security-motivated 2-step token handoff | Sequence Diagram | Frontend → /auth/google → Google consent → callback → Passport verify (exists?) → mint JWT → store exchange code (60s TTL) → redirect with code → frontend exchanges code → JWT delivered |

## Activity / Sequence / State Diagram Candidates (beyond the table above)

- **Sequence Diagram — `completeSession` orchestration**: Controller → evaluationService.calculateScore → evaluationService.calculateXp → sessionModel.closeSession → progressionModel.upsertUserProgress → progressionModel.addXpToUser → progressionModel.awardBadge → progressionModel.getNextScenarioForUser. Demonstrates cross-service orchestration well.
- **State Diagram — Session Lifecycle**: `in_progress → completed`, `in_progress → abandoned`, with the race-condition resume branch (`23505` → re-query → resume) shown as a self-loop guard.
- **State Diagram — Objective Lifecycle**: `INCOMPLETE → IN_PROGRESS → COMPLETED` (+ secret objective visibility toggle on completion).
- **State Diagram — Hint Level Escalation**: `Level 0(none) → 1 → 2 → 3(capped)` per (session, step_order).
- **State Diagram — Player Behavior Classification**: `idle / exploring / repeating / thrashing / progressing`, transitions driven by `classifyBehavior()` thresholds.
- **Activity Diagram — Mission Player Journey**: MissionDashboard (type select) → MissionSequence (scenario+mode select) → MissionBriefing (objectives preview) → GamingEnvironment (terminal loop) → CompletionOverlay → back to MissionDashboard.

---

## Pseudocode Candidates

| Algorithm | Purpose | Main Variables | High-Level Logic |
|---|---|---|---|
| `matchesTrigger` (discovery) | Decide if one command satisfies one discovery trigger | `parsed`, `trigger`, `currentPath`, `resolvedTarget` | Sequential guard checks: command-name → name-filter → target-pattern (with match_type strategy) → bare-command fallback |
| `calculateScore` | Produce the 4-component 0–100 score | `pathScore`, `commandUsageScore`, `conclusionScore`, `hintPenalty`, `hasDiscoveries` | Branch on discovery-mode, sum weighted components, subtract hint penalty, clamp at 0 |
| `calculateXp` | Convert score+difficulty+hints into XP | `baseXp[difficulty]`, `modifier=score/100`, `noHintBonus` | `round(base*modifier) + (hints===0?200:0)` |
| `computeStuckScore` | Composite 0–100 "how stuck is the player" metric | `wrongSinceMatch`, `isLongIdle`, `isRepeating`, `behaviorType`, `isClose` | Weighted sum of 4 signal categories, proximity discount, clamp |
| `evaluateAutoTrigger` | Decide whether to push an unsolicited hint | `playerState`, 5 threshold constants | Guard chain (cap/next-step/already-hinted/cooldown) then OR of 3 trigger conditions |
| `resolveNextHintLevel` | Per-step hint level escalation with cap | `currentLevel`, `currentCount`, `MAX_HINT_LEVEL=3` | `min(currentLevel+1, 3)`, upsert progress row, return capped flag |
| `_computeInvestigationStyle` | Classify player archetype from aggregate stats | `noHintRate`, `discoveryRate`, `avgCommandsPerSession`, `avgHintsPerSession` | Ordered if/elif decision tree, 5 branches, last is default |
| `resolvePath` / `resolveAbsPath` | Normalize and resolve filesystem paths (client+server) | `target`, `currentPath`, segment stack | Expand `~`, branch absolute/relative, stack-based `.`/`..` resolution |
| `matchCommand` (legacy step matcher) | 3-strategy fallback command matcher | `normalizedInput`, `normalizedExpected`, `resolvedInput` | Try exact key match → try path-resolved match → try bare-command match, skip completed steps |
| `buildPrompt` (AI) | Assemble the full ARIA prompt from 7+ contextual blocks | `completionRatio`, `hintLevel`, `playerState`, `isClose`, `isAutoTriggered` | Concatenate persona+rules+level-instructions+behavior-tone+stuck-tone+(conditional blocks)+hint-history+directive, with a literal split marker for system/user role separation |

---

## Business Logic Candidates

- **Dual-evaluation priority rule**: a command can satisfy both the legacy direct-step matcher and the new discovery matcher; direct match always wins for history/hint-tracking purposes, but discovery-matched steps still count toward objective/file-reveal unions.
- **Idempotent discovery unlock**: `ON CONFLICT (session_id, discovery_id) DO NOTHING` — replaying or re-triggering a discovery is a safe no-op.
- **Progress non-regression**: a session's `highest_score`/`completed` flags in `user_progress` can only increase/stay-true, never regress.
- **Hint budget shared across manual+auto**: `MAX_HINTS_PER_SESSION=5` is consumed by both player-requested and AI-pushed hints from the same counter.
- **Cache key excludes trigger source**: manual and auto-triggered hints for the same (scenario, step, level) share one cached hint text — an explicit design tradeoff (documented in source comments) to avoid doubling cache population cost.
- **Badge award decoupled from mission completion**: badge fires at `score≥60` regardless of whether `missionCompleted` is true — a partial-credit-friendly reward rule.
- **Mission completion requires both axes for discovery scenarios**: 100% critical discoveries AND 100% required objectives — prevents "high score, incomplete evidence chain" false completions.
- **Email enumeration protection**: forgot-password endpoint always returns 200, regardless of account existence.
- **OAuth single-use, time-boxed exchange code** (60s TTL) instead of embedding JWT in a redirect URL.

---

## Recommended Detailed Design Structure (Suggested Chapter 4.3 Outline)

1. **4.3.1 Terminal Command Processing Pipeline** — flowchart #1 + pseudocode (`matchCommand`) + path-resolution flowchart #3
2. **4.3.2 Virtual Filesystem Engine & Declarative File Revelation** — schema diagram + visibility-rule pseudocode
3. **4.3.3 Discovery Trigger System** — flowchart #2 + pseudocode (`matchesTrigger`) + worked example (cron-job discovery via 4 different commands)
4. **4.3.4 Scoring Algorithm** — flowchart #4 + pseudocode (`calculateScore`, `calculateXp`) + worked numeric example
5. **4.3.5 Player State Analyzer & Auto-Trigger Hint System** — state diagram (behavior classification) + flowchart #5 + pseudocode (`computeStuckScore`, `evaluateAutoTrigger`)
6. **4.3.6 AI Guidance Service (ARIA)** — flowchart #6 + sequence diagram (cache-first pipeline) + prompt-template structure diagram + pseudocode (`buildPrompt`)
7. **4.3.7 XP, Rank & Achievement Engine** — formula tables + decision-tree diagram (`_computeInvestigationStyle`) + pseudocode (achievement evaluation loop)
8. **4.3.8 Session Manager & Mission Completion** — state diagram (session lifecycle) + sequence diagram (`completeSession` orchestration) + flowchart #7
9. **4.3.9 Authentication Service** *(supporting section)* — sequence diagram #8 (OAuth exchange-code flow) + local-auth flow summary
10. **4.3.10 Scenario Execution & Mission Flow** *(supporting section)* — activity diagram (4-phase player journey)

---

## Final Ranking — Recommended 5–8 Components for Chapter 4.3

Ranked by (1) Academic Value — demonstrates non-trivial algorithm/design-pattern knowledge; (2) Technical Complexity — genuine branching/state logic, not CRUD; (3) Importance to KINETIC BREACH — central to the product's pedagogical and gamification value proposition.

| Rank | Component | Academic Value | Technical Complexity | Project Importance | Verdict |
|---|---|---|---|---|---|
| 1 | **Discovery Trigger System** | High — original rule-based pattern-matching engine, 4 match strategies | High — multi-stage trigger resolution, path/keyword normalization | Critical — core differentiator over rigid step-matchers | **Include** |
| 2 | **Scoring Algorithm** | High — clean weighted multi-component formula, auto-mode-switching | Medium-High — 4 components + 2 modes + clamping | Critical — drives XP, badges, completion | **Include** |
| 3 | **AI Guidance Service (ARIA)** | Very High — prompt engineering, provider abstraction, defense-in-depth leak prevention, caching economics | High — multi-stage pipeline, 3 providers, cache concurrency | Critical — flagship feature distinguishing this from a plain terminal sim | **Include** |
| 4 | **Player State Analyzer / Auto-Trigger System** | High — composite heuristic scoring, behavioral classification | Medium-High — multi-signal weighted formula + guard-chain trigger logic | High — powers adaptive difficulty/intervention | **Include** |
| 5 | **Terminal Command Processing Pipeline** | Medium-High — parser + dual-evaluation orchestration + declarative visibility | High — largest single module (817 lines), many responsibilities | Critical — every player interaction flows through this | **Include** |
| 6 | **XP / Rank / Achievement Engine** | Medium-High — decision-tree archetype classifier, threshold tables | Medium — mostly aggregation + branching, less "algorithmic" than 1–4 | High — core gamification loop, 9-query aggregation is notable | **Include** |
| 7 | **Virtual Filesystem Engine (file revelation)** | Medium — interesting statelessness property | Medium — declarative rule, simple once understood | High — underlies both discovery and step systems | **Include (can fold into #5)** |
| 8 | **Session Manager & Mission Completion** | Medium — good orchestration example, race-condition handling | Medium — mostly sequencing of calls into 1–4 | High — ties everything together at session boundary | **Include if space allows, else fold into #1–4's "where it's called from"** |

**Recommended final 6 for the report body** (to keep Chapter 4.3 focused): **#1 Discovery Trigger System, #2 Scoring Algorithm, #3 AI Guidance Service, #4 Player State Analyzer & Auto-Trigger System, #5 Terminal Command Processing Pipeline (incorporating Virtual Filesystem visibility as a subsection), #6 XP/Rank/Achievement Engine.** Authentication and Scenario Execution are best treated as shorter supporting subsections (sequence/activity diagrams only, no deep pseudocode) since their logic is comparatively standard CRUD/OAuth boilerplate rather than original algorithmic contribution.
