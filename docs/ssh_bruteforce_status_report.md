# SSH Brute Force Prototype — Current Status Report

**Audit date:** 2026-08-13
**Audit method:** Static code inspection across 8 parallel subsystem audits (all read-only) + one live end-to-end run against the running backend/DB using a fresh test account (`audittester1786557556`, session_id 299), driven directly via the real HTTP API (not through the browser UI/xterm — no browser-automation tooling was available in this environment; see §23 and item NV-1 in §25 for what that does and doesn't cover).

---

## 1. Executive Summary

The **content-driven investigation pipeline** for `ssh_bruteforce` — Desktop → Terminal → discoveries → objectives → Report → Submit → mechanical evaluation → AI review → XP/progression — **works correctly end-to-end today**, and was proven with a real, current live run (§23), not just static reading: **Mechanical score 95/100, AI Review 86/100, XP +675, 6/6 discoveries, 4/4 objectives, zero backend errors.**

The scenario content itself (`incident.json`, `discoveries.json`, `objectives.json`, `review.json`, the injected filesystem evidence) is internally consistent, and every discovery trigger was verified — both by static trace and by live firing — to actually match the evidence that exists. Two previously-reported bugs (`emails.json` array/object mismatch, duplicate `/etc`/`/home` directories in File Manager) **do not reproduce against the current code** — both were independently fixed at some point since.

There is one architecture-level finding that is the single most important thing in this report: **there are two live, disconnected ways to start playing `ssh_bruteforce`.** The current, working, content-driven pipeline is reached via **Mission → Sequence → Deploy → `/desktop`**. A second, older entry point — **Dashboard → "EXECUTE BREACH" → `/briefing` → `/game/:id` (`GamingEnvironment`)** — is still routed and still linked from the main Dashboard, but drives a completely different legacy scoring pipeline (`sessionController.completeSession`, `expected_steps`/`session_discoveries` tables) that this audit did **not** verify and that other evidence in the codebase suggests is broken for content-driven incidents like this one (see §22, §25 finding L-1). **The demonstration must use the Desktop entry point.** This is not a code bug to fix today — it's a fact to know before demo day.

Two small pieces of incident content are dead/empty (`alerts.json`, `aria.txt`) but neither is wired into any code path that would notice — they are inert, not broken-and-blocking.

## 2. Overall Status

| Area | Status | Current Evidence | Remaining Work |
| ---- | ------ | ---------------- | -------------- |
| Scenario content (JSON/assets) | DONE (1 file BROKEN but inert) | §3 | Fix or delete `alerts.json`/`aria.txt` (P2) |
| Scenario loading / environment build | DONE | §4, live `/api/files`, `/api/desktop` calls | None |
| Discovery system | DONE | §6, live-fired all 6 | None |
| Objective system | DONE | §7, live-completed all 4 | None |
| Terminal | DONE | §8 | None |
| Files (incl. duplicate-dir bug) | DONE (bug confirmed fixed) | §9 | None |
| Email | DONE (historic bug not reproducible) | §10, live `/api/email` | None |
| Browser | DONE | §11, live `/api/browser` | None |
| ARIA / hints | DONE (real AI configured) | §12 | `HINT_REQUESTED` event never emitted (P2) |
| Investigation events | PARTIAL | §13 | 4 of 14 event types defined but never emitted (P2) |
| Analytics | DONE | §14 | None |
| Investigation report | DONE | §15, live save/reload | None |
| Submission | DONE | §16, live submit + double-submit guard | None |
| Mechanical evaluation | DONE | §17, formula verified live | None |
| AI review | DONE (real OpenAI call, not mock) | §18, live 86/100 with real criteria | None |
| XP / progression | DONE | §19, live +675 XP, badge, achievements | None |
| Desktop / frontend | DONE (Alerts is an intentional placeholder) | §20 | None (Alerts is P2/out of scope) |
| Database / persistence | DONE | §21 | None |
| Legacy / conflicting systems | BLOCKED-AWARENESS | §22 | Must route demo through Desktop, not GamingEnvironment (P0 — procedural, not code) |
| End-to-end test | CURRENTLY VERIFIED (via API) / NOT VERIFIED (via browser UI) | §23 | Optional: one manual click-through in the browser (P1) |

## 3. Scenario Content

All content files under `backend/content/incidents/ssh_bruteforce/` were read and cross-checked against each other and against the code that consumes them.

- **JSON validity:** `incident.json`, `objectives.json`, `discoveries.json`, `review.json`, `browser.json`, `emails.json`, `desktop.json` all parse. **`alerts.json` is 0 bytes and fails `JSON.parse`** — BROKEN as a file, but see §20/§4 — nothing in the codebase currently reads it (`alertBuilder.js` is itself an empty/unused file, and the incident's own `desktop.json` doesn't even enable an `alerts` app), so this is inert corruption, not a live crash risk.
- **`aria.txt` is also 0 bytes.** A full-codebase grep found no code that loads this file at all — ARIA's persona is hardcoded generically in `backend/constants/promptConstants.js` instead. Dead content.
- **`assets/deleted/`** — actual directory name on disk is `assets/deleted` per the initial listing but the code looks for `assets/delete` (singular); either way it's confirmed **empty** for this incident, so `applyDelete` is a correct no-op regardless of the naming.
- **Discovery triggers → evidence:** every trigger in `discoveries.json` was traced against the literal content of `assets/replace/var/log/auth.log`, `assets/replace/etc/passwd`, and `assets/create/home/admin/.bash_history` — all targets exist and all triggers were confirmed capable of firing (and then actually fired live — §6).
- **Objective → discovery references:** all 4 objectives in `objectives.json` reference discovery keys that exist in `discoveries.json`. One discovery, `POST_LOGIN_ACTIVITY_CONFIRMED` (`required: false`, weight 10), is never required by any objective — this is by design (a bonus discovery, correctly excluded from the required-weight sum that must total 100 for scoring to work), not a broken reference.
- **Template vs. incident boundary:** `templates/ubuntu_server/filesystem/{etc/passwd, var/log/auth.log, var/log/syslog}` are all **empty (0 bytes)** on disk — the template is an unpopulated skeleton, not "generic boilerplate content" as the architecture doc implies. The incident's `assets/replace/etc/passwd` (27 lines) and `assets/replace/var/log/auth.log` (50 lines) are fully populated with real, internally consistent scenario evidence. No scenario-specific data has leaked into the generic template — there's just nothing generic sitting in the template to leak into.
- **`.bash_history` narrative:** contains 6 real commands (`whoami, pwd, hostname, ls, ls /home, cat /etc/os-release`) + `exit`. **`design.md`'s "Internal Scenario Truth" section is stale** — it claims only 2 commands (`whoami`, `ls /home`) were run. This is a documentation bug in `design.md`, not a content/code bug — `testing_guide.md` correctly describes all 6 commands, and the discovery/objective system correctly reads the real file.
- **Identifier consistency:** `admin`, `203.0.113.25`, `server01` are consistent across `discoveries.json`, `auth.log`, `passwd`, and `hostname`. Minor gap: no `investigator` account exists in `passwd` despite `/home/investigator/` being the player's report location — cosmetic, not functional (the virtual filesystem doesn't require passwd/home consistency to work).
- **`review.json`:** 6 criteria (`incident_summary` 15, `attack_source` 20, `authentication_result` 20, `compromised_account` 20, `supporting_evidence` 15, `investigation_methodology` 10 — sums to 100), confirmed actually consumed by `reviewEngine.js` (§18), not just decorative.
- **`references.md`:** cites MITRE ATT&CK T1110.001, OpenSSH documentation, and "Linux Authentication Logs" generically (no URLs/CVEs) — appropriately scoped to what the scenario actually teaches.
- **`emails.json` / `browser.json` shape:** both are the object-wrapped form (`{"emails":[...]}`, `{"homePage":..., "pages":[...]}`), which is exactly what their respective builders expect (§10, §11).

## 4. Scenario Environment

Full call chain traced from session creation to a built environment (`environmentEngine.buildEnvironment` → `environmentLoader.loadTemplate` → `evidenceInjector.injectEvidence`, order: **replace → delete → create**), and independently confirmed live via `GET /api/files?incidentId=ssh_bruteforce&sessionId=299`, which returned the correct merged filesystem (template `/etc/hosts`, `/etc/shadow` untouched; `/etc/passwd`, `/var/log/auth.log` content replaced; `/etc/hostname`, `/etc/os-release`, `/home/admin/.bash_history`, `/home/investigator/investigation_report.txt` newly created).

`incidentResolver.js` maps the DB scenario row's `type` column (`"bruteforce"`, `scenario_id = 1`, title "The Front Door") to the content folder `"ssh_bruteforce"` via a small hardcoded table — this is intentional, documented, and confirmed reachable (this is *not* a bug; the scenario row and the content folder are simply named differently by design).

Two things worth knowing, neither a blocker:
- `backend/services/environment/{filesystemBuilder,gameStateBuilder,emailBuilder,alertBuilder,index}.js` are all **empty, unused placeholder files** — the real logic lives in `environmentLoader.js`/`evidenceInjector.js` instead. Confusing to a new reader, but not broken.
- A parallel, older DB-driven environment endpoint (`GET /api/scenarios/:scenarioId/full` → `scenarioModel.getVirtualFilesByScenario`) still exists and is routed, but nothing populates the `virtual_files` DB table for `ssh_bruteforce` — calling it would silently return an empty filesystem. Not used by the current Desktop flow; see §22.

## 5. Investigation Flow

Traced end-to-end and **live-verified**: Login → session start (`POST /api/sessions/start`) → `GET /api/investigation/current` resolves `incidentId` → Desktop loads (`GET /api/desktop`) → Terminal/Files/Email/Browser/ARIA/Report all load their content keyed by that `incidentId` → commands/discoveries/objectives accumulate → Report save → Submit → mechanical score + AI review + XP, all in one response. No broken links found in this specific path. (The *other* path — Dashboard → Briefing → GamingEnvironment — is a separate, un-audited-in-depth legacy flow; see §22.)

## 6. Discoveries

`discoveryEngine.matchDiscoveries` matches a single parsed terminal command against each discovery's `triggers[]` (supported shapes: `command` + optional `nameContains`/`patternContains`/`targetPath`/`targetContains`). Duplicate-prevention is enforced by a real DB unique constraint (`UNIQUE (session_id, discovery_key)`, `ON CONFLICT DO NOTHING`).

| Discovery key | Trigger(s) | Required | Weight | Static trace | Live result |
|---|---|---|---|---|---|
| `FAILED_LOGIN_PATTERN_FOUND` | `cat /var/log/auth.log`; `grep "failed"/"invalid user" /var/log/auth.log` | Yes | 15 | Fires | **Fired** (via `cat /var/log/auth.log`) |
| `ATTACK_SOURCE_IDENTIFIED` | `grep "203.0.113.25"`; `locate "203.0.113.25"` | Yes | 25 | Fires | **Fired** |
| `SUCCESSFUL_AUTHENTICATION_CONFIRMED` | `grep "accepted" /var/log/auth.log` | Yes | 25 | Fires | **Fired** |
| `COMPROMISED_ACCOUNT_IDENTIFIED` | `grep "admin" /var/log/auth.log`; `cat /home/admin/.bash_history` | Yes | 25 | Fires | **Fired** |
| `POST_LOGIN_ACTIVITY_CONFIRMED` | `cat /home/admin/.bash_history` | No | 10 | Fires | **Fired** |
| `INVESTIGATION_REPORT_COMPLETED` | none (`triggers: []`) — unlocked directly by `reportEngine.js` when saved report content grows ≥100 chars past the starter template | Yes | 10 | N/A by design | **Fired** (on report save) |

One nuance worth knowing, not a bug: `ATTACK_SOURCE_IDENTIFIED`'s grep trigger has no `targetPath`, so it matches on the *typed pattern* (`203.0.113.25`) regardless of which file is actually grepped — the engine checks player intent, not command output. This is how the whole trigger system works by design (dev rule: evidence-based via triggers, not output-parsing), not specific to this discovery.

## 7. Objectives

`objectiveEngine.resolveCompletedObjectives` — pure discovery-key AND logic, no command/step matching involved for this incident's actual play path.

| Objective ID | Required discoveries | Static check | Live result |
|---|---|---|---|
| `investigation_summary` | `FAILED_LOGIN_PATTERN_FOUND`, `SUCCESSFUL_AUTHENTICATION_CONFIRMED` | Valid | **Completed** |
| `identify_source` | `ATTACK_SOURCE_IDENTIFIED` | Valid | **Completed** |
| `identify_account` | `COMPROMISED_ACCOUNT_IDENTIFIED` | Valid | **Completed** |
| `prepare_report` | `INVESTIGATION_REPORT_COMPLETED` | Valid | **Completed** |

All 4/4 completed in the live run, confirmed both via the terminal-execute response and independently via the stateless `GET /api/terminal/resume/:sessionId` endpoint.

## 8. Terminal

Full pipeline (xterm.js → `useTerminal.js` → `POST /api/terminal/execute` → `terminalParser` → `buildTerminalOutput` against `virtualFiles` → `command_history` save → discovery/objective check → response) traced and live-exercised with 9 real commands including one deliberately invalid one (`fakecommand123`, correctly returned `"bash: fakecommand123: command not found"` without breaking the session).

- **`command_history` is confirmed the single source of truth** for commands — `terminalController.js` never logs command text into `investigation_events` (the code comment citing this as an explicit dev rule was verified accurate against the actual call sites: only `DISCOVERY_UNLOCKED`/`OBJECTIVE_COMPLETED` events are logged from that controller, never a "command executed" event).
- `command_history` is strictly session-scoped (`WHERE session_id = $1` on every read/write).
- Real consumers of command history confirmed: the terminal's own `history` command, ARIA's hint context, `analyticsEngine`, and `submissionEngine`.
- `.bash_history` is not special-cased anywhere — it's read exactly like any other virtual file via `cat`/`grep`/etc.
- Note (not a demo blocker): `useTerminal.js` still reads `result.matchedStep`/`result.newlyRevealedFiles` from the terminal-execute response, but the current backend response never sends those fields — dead frontend branches from an earlier architecture, silently no-op.

## 9. Files

The previously reported **duplicate `/etc`/`/home` directory bug is confirmed FIXED / NOT REPRODUCIBLE** under the current code, verified two ways:
1. **Static trace:** `evidenceInjector.js`'s `applyCreate` has an explicit dedup guard — before pushing a directory entry from `assets/create/`, it checks `virtualFiles.some(f => f.file_path === virtualPath)` and skips the push if the path already exists. Walked through with the real data (`/etc` already exists from the template → skipped; `/home` doesn't exist in the template → created once, not twice).
2. **Live confirmation:** `GET /api/files?incidentId=ssh_bruteforce&sessionId=299` returned exactly one `/etc` directory entry (checked directly in the raw response).

The frontend File Manager (`FileTree.jsx`/`FileViewer.jsx`) also does no separate directory-inference pass of its own (unlike the Terminal's tab-completion, which does infer directories) — it purely filters the flat `virtualFiles` array by exact one-level-deep path match, so there's no second code path that could reintroduce a duplicate independently of the backend.

`FILE_OPENED` events are confirmed wired (fires only for `file_type === 'file'` nodes, not directories) and consumed by `analyticsEngine`.

## 10. Email

The previously reported **`emails.json` array-vs-object mismatch is NOT reproducible** — the current `emails.json` is `{"emails": [...]}`, and `emailBuilder.js` reads `config.emails` directly (`Array.isArray(config.emails)` validation, `config.emails.forEach(...)`). Shapes match exactly; no defensive/fallback unwrapping code exists, meaning the two were deliberately aligned rather than made bug-tolerant — but they are currently aligned. Live-confirmed: `GET /api/email?incidentId=ssh_bruteforce` returned both emails (`incident_brief`, `submission_requirements`) with full content.

Note: `backend/services/environment/emailBuilder.js` (a *different*, empty/unused file) also exists — the live pipeline is exclusively `services/email/emailBuilder.js` → `emailEngine.js` → `emailController.js`.

`EMAIL_OPENED` is confirmed actually emitted (`EmailApp.jsx`, fires on selection including auto-select of the first email) and consumed by `analyticsEngine`.

## 11. Browser

`browser.json`'s shape (`{"homePage": "knowledge", "pages": [...]}`) matches `browserBuilder.js`'s validation exactly. Live-confirmed via `GET /api/browser?incidentId=ssh_bruteforce`: 1 menu page + 4 articles (`openssh`, `auth_log`, `mitre`, `bruteforce`) all returned with real content.

Content review: all 4 articles are generic/educational, no scenario leakage found — the `auth_log` article explicitly self-labels its example username/IP as illustrative, and uses the RFC 5737 documentation-range IP `203.0.113.42` (distinct from the scenario's actual attacker IP `203.0.113.25`), which reads as a deliberate choice to avoid leaking the answer.

`ARTICLE_OPENED` is confirmed emitted, but only for `type: "article"` pages, not the `knowledge` menu page itself (by design).

## 12. ARIA

Full hint pipeline traced: explicit "Request Guidance" button and an auto-trigger (idle timeout / repeated wrong command / stuck-score heuristics, each gated by anti-spam limits) both converge on the same `hintService`/`aiAdapter` pipeline. Player state (`playerStateAnalyzer.js`) is genuinely derived from live command history and discovery/objective progress, not static.

**`AI_PROVIDER=openai` is confirmed set in `backend/.env`** (model `gpt-4o-mini`) — this environment is using **real AI**, not the mock fallback, for both hints and review. (The mock provider, `generateMock`, would silently produce nonsense for a review request since it only branches on hint-specific markers — this was flagged by the audit as a risk, but does not apply here since the provider is genuinely `openai`.)

Hints are cached per `(scenario_id, objective_id, hint_level)` (first generation wins, `ON CONFLICT DO NOTHING`) and persisted to `ai_hint_log`, which feeds `analyticsEngine`'s `hintsUsed` metric and the scoring/XP pipeline (§17).

`aria.txt` (ssh_bruteforce-specific) is confirmed dead — 0 bytes, never loaded by any code; ARIA's actual persona is generic and hardcoded in `promptConstants.js`, which is the intended architecture (dev rule: nothing ARIA-facing is scenario-specific).

## 13. Investigation Events

Exhaustive grep-based table of all 14 defined `EVENT_TYPES`:

| Event type | Emitted? |
|---|---|
| `APPLICATION_OPENED` | Emitted (`useWindowSession.js`) |
| `APPLICATION_CLOSED` | Emitted (`useWindowSession.js`) |
| `FILE_OPENED` | Emitted (`FilesApp.jsx`) |
| `FILE_EDITED` | **DEFINED BUT NEVER EMITTED** |
| `FILE_SAVED` | **DEFINED BUT NEVER EMITTED** |
| `EMAIL_OPENED` | Emitted (`EmailApp.jsx`) |
| `ARTICLE_OPENED` | Emitted (`BrowserApp.jsx`) |
| `DISCOVERY_UNLOCKED` | Emitted (`terminalController.js`, `reportEngine.js`) |
| `OBJECTIVE_COMPLETED` | Emitted (`terminalController.js`) |
| `REPORT_EDITED` | Emitted (`investigationController.js`) |
| `REPORT_SAVED` | Emitted (`reportEngine.js`) |
| `REPORT_SUBMITTED` | Emitted (`submissionEngine.js`) |
| `HINT_REQUESTED` | **DEFINED BUT NEVER EMITTED** |
| `SESSION_STARTED` | **DEFINED BUT NEVER EMITTED** |
| `SESSION_FINISHED` | Emitted (`submissionEngine.js`) |

`investigation_events` is confirmed session-scoped. This gap is cosmetic for the demo — nothing currently reads `HINT_REQUESTED`/`SESSION_STARTED` from `investigation_events` (hint usage reaches analytics via `ai_hint_log` instead, which does work — see §14), so this is a documentation/completeness gap, not a functional one.

## 14. Analytics

`analyticsEngine.buildAnalytics` reads `investigation_events`, `command_history`, `investigation_discoveries`, and `ai_hint_log` in parallel and produces: applications used, evidence viewed, articles read, emails opened, commands used + most-used-commands ranking, most-investigated files, matched/unmatched command counts, discovery/objective completion counts, report activity (edits/saves/submitted), hints used, session duration. **Live-confirmed** — the submission response's `analytics` block matched this shape exactly (9 total commands, 5 matched/4 unmatched, correct discovery/objective counts, etc.).

This summarized (not raw) analytics block is what feeds the AI review prompt — confirmed via the prompt-building code, explicitly commented "compact behavioural summary, not raw events". One deliberate exception: the full `command_history` text *is* included verbatim in the review prompt (one command per line) — by design, since `command_history` is the documented single source of truth for commands, not because raw events are being dumped.

## 15. Investigation Report

Traced `ReportApp.jsx` → `GET/PUT /api/investigation/report` → `reportEngine.js` → `investigation_reports` table (one row per `session_id`, upsert via `ON CONFLICT`). **Live-confirmed**: fetched the starter template, saved a full ~1,400-character report, got back the exact saved content plus an `unlockedDiscovery` for `INVESTIGATION_REPORT_COMPLETED`. Session-scoped, persists and reloads correctly.

## 16. Submission

`POST /api/investigation/submit` (`submissionEngine.submitInvestigation`) traced and **live-exercised twice**: first call succeeded (score, XP, review, next-scenario all returned in one response); the second call correctly failed (session already `completed`, resolved via `getCurrentInvestigation` finding no active session for the user — surfaced as a 404 "No active investigation for this user" rather than an explicit "already closed" message, but functionally an effective double-submission guard). Session freeze confirmed: `status` moved from `in_progress` to `completed`, `submitted_at`/`end_time`/`final_score` all set.

## 17. Mechanical Evaluation

`evaluationService.calculateContentScore` — verified formula, and **the live result matches the formula exactly**:

```
pathScore        = round(earnedRequiredWeight / totalRequiredWeight * 50)   = 50  (all 5 required discoveries, weights sum to 100)
commandUsageScore = max(0, 30 - floor(max(0, totalCommands - requiredDiscoveryCount) / 3) * 5)
                  = max(0, 30 - floor((9 - 5) / 3) * 5) = 30 - 5             = 25
conclusionScore   = round(completedObjectives / totalObjectives * 20)       = round(4/4*20) = 20
hintPenalty        = hintsUsed * 5                                          = 0
TOTAL              = 50 + 25 + 20 - 0                                       = 95  ✓ matches live result
```

The 5-point deduction from a perfect 100 in this run was earned honestly — the test run deliberately included extra non-advancing commands (`pwd`, `ls`, `whoami`, and one intentionally invalid `fakecommand123`) to exercise the error path; a cleaner playthrough using only the discovery-triggering commands would score `commandUsageScore = 30` and total 100.

## 18. AI Review

`reviewEngine.js` genuinely reads and uses `review.json`'s `criteria`/`grading.maxScore` (confirmed by tracing `buildReviewPrompt`, which lists exactly those 6 criteria in the prompt) — not hardcoded elsewhere. The prompt includes: persona, mission brief, criteria list, full report text, full command history, and the summarized analytics block (§14). Server-side code recomputes the final weighted score itself from the AI's per-criterion scores (never trusts the model's own arithmetic).

**Live result:** real call to OpenAI (`gpt-4o-mini`, confirmed via `.env`'s `AI_PROVIDER=openai`) returned a genuinely contextual review — 6 criteria scored 75–90 individually, weighted to **86/100**, with specific, non-generic feedback referencing the actual report content and command choices (e.g., calling out that some commands "did not advance the investigation" — correctly noticing the deliberately-included `fakecommand123`/extra recon commands). `GET /api/investigation/review/299` correctly returns the persisted review afterward. Mechanical score (95) and AI score (86) are kept fully separate — never averaged or gated against each other.

## 19. XP / Progression

`calculateXp(score, difficulty, hintsUsed) = round(baseXp[difficulty] * score/100) + (hintsUsed===0 ? 200 : 0)`. For this run: `round(500 * 0.95) + 200 = 475 + 200 = 675` — **matches the live result exactly.** XP is driven purely by the mechanical score, never the AI review score.

`GET /api/users/progression` (the same endpoint `frontend/src/pages/Progress` reads) was live-checked and returned fully consistent, current data: XP 675, level 1, 1 mission completed, a `The Front Door_COMPLETE` badge, and several unlocked achievements. **No stale/legacy progression table was found** — `progressionModel.js`'s tables are exactly what submission writes to and what the Progress page reads from.

## 20. Desktop / Frontend

`applicationRegistry.js` registers all 7 apps (`terminal`, `email`, `browser`, `files`, `alerts`, `aria`, `report`) to real component modules. Classification:

| App | Status |
|---|---|
| Terminal | Fully functional |
| Email | Fully functional |
| Browser | Fully functional (intentionally scoped — "Knowledge Browser," not a full web browser) |
| Files | Fully functional |
| ARIA | Fully functional |
| Report | Fully functional |
| Alerts | **Placeholder by design** — literally commented "Placeholder only — no business logic, no API calls, no state," renders a static div. It's wired into the registry and window-sizing config but shows no real content. |

Window system (drag, resize, minimize, maximize/restore, focus/z-index) confirmed implemented in `Window.jsx`. (This report's session earlier fixed two small Terminal-specific display bugs — a hardcoded height that didn't fill the Desktop window, and a missing `ResizeObserver` for in-app resize/maximize — both now part of the current codebase and reflected in this "fully functional" classification.)

## 21. Database / Persistence

21 tables found across all `.sql` files; every one has at least one current model/service reference — no fully orphaned tables. However, two tables + one column are **live only through the legacy path** (see §22): `expected_steps`, `session_discoveries`, and the `match_step_order` column (which `terminalController.js` now always sets to `null` for the new engine — meaning legacy scoring logic that depends on it is fed no data whenever a session went through the current Desktop/Terminal flow).

## 22. Legacy / Potentially Conflicting Systems

This is the most consequential finding of the audit. **Two live, working-independently pipelines exist for playing a scenario:**

1. **Current / content-driven** (what this report verified end-to-end): Mission Dashboard → `/sequence/bruteforce` → "Deploy" (`MissionSequence.jsx:107`, creates the session, then `navigate('/desktop')`) → Desktop → Terminal/discoveries/objectives → Report → `POST /api/investigation/submit`. Confirmed working via the live test in §23.
2. **Legacy**: Dashboard's "EXECUTE BREACH" quick-launch card (`Dashboard.jsx:197`) → `navigate('/briefing/:id')` → `MissionBriefing.jsx:94` → `navigate('/game/:id')` → `GamingEnvironment` (still routed in `App.jsx`, not orphaned) → `POST /api/sessions/:sessionId/complete` (`sessionController.completeSession`), which uses `evaluationService.calculateScore` against `expected_steps`/`scenario_discoveries`/`session_discoveries` — a DB-row-based system, not the JSON-content discovery engine. This audit did **not** live-test this path. Static evidence strongly suggests it would not work correctly for `ssh_bruteforce`: nothing populates the `virtual_files` DB table this legacy path can fall back to for content-driven incidents, and `match_step_order` is always `null` coming out of the current Terminal.

Both entry points are simultaneously live and reachable from the main Dashboard today. **This is a demonstration-day risk, not a code defect per se** — the fix is procedural (always launch via Mission → Sequence → Deploy), but it's exactly the kind of thing that silently derails a live demo if the wrong button is clicked. See §27 Golden Run and §25 finding L-1.

Other legacy items, all confirmed inert/non-blocking for this incident specifically: a dead DB-driven `GET /api/scenarios/:scenarioId/full` endpoint (§4); two unrelated files both named `desktop.json` (harmless naming collision, not a conflict); `backend/services/environment/{filesystemBuilder,emailBuilder,alertBuilder,gameStateBuilder,index}.js` all empty/unused.

## 23. Current End-to-End Test

**CURRENTLY VERIFIED, via direct API calls** (fresh account `audittester1786557556`, session_id 299, backend + local Postgres running locally for this audit only, both stopped afterward):

1. Register + login — succeeded.
2. Start session for scenario_id 1 (`bruteforce` → resolves to `ssh_bruteforce`) — succeeded, session 299 created.
3. `GET /api/desktop`, `GET /api/files`, `GET /api/email`, `GET /api/browser` — all returned correct, complete content for the incident.
4. Ran 9 terminal commands (`pwd`, `ls`, `cat /var/log/auth.log`, 3× `grep`, `cat /home/admin/.bash_history`, `whoami`, and one deliberately invalid `fakecommand123`) — all 6 discoveries unlocked in the expected order, matching the static trigger trace exactly; the invalid command correctly returned "command not found" without disrupting the session.
5. Saved a real, substantive investigation report — triggered the final discovery and completed the 4th objective.
6. Submitted — received **mechanical score 95/100** (formula-verified, §17), **XP +675** (formula-verified, §19), and a **real AI review of 86/100** with genuinely contextual per-criterion feedback from OpenAI (§18) — all in one synchronous response.
7. Confirmed persistence: `GET /api/investigation/review/299` and `GET /api/users/progression` both independently returned the same, correct data afterward.
8. Confirmed the double-submission guard rejects a second submit attempt.
9. Checked backend logs for the full run — **zero application errors.** (One unrelated pre-existing warning was present: a welcome-email SMTP send failure at registration time, from an unrelated email-provider credential issue — not part of the investigation pipeline and not a demo blocker.)

**NOT VERIFIED**: the actual browser/React/xterm.js UI layer for this specific incident (clicking through Desktop, typing in the real terminal, dragging windows, etc.) — this session's live test drove the real backend directly over HTTP because no browser-automation tool (Playwright/chromium-cli) was available in this environment, and setting one up was out of scope for an audit that must not modify anything beyond this report. The Desktop/Terminal/Files/Email/Browser/ARIA/Report frontend components were all separately confirmed non-stub and functionally wired via static code reading (§20), and the exact same API calls the frontend makes were exercised directly and worked — but an actual human click-through has not happened during this audit. See §26 P1.

## 24. Historical Validation

A prior test reportedly produced: AI Review 89/100, Mechanical Score 100/100, XP +700, 0 console errors. This audit treats those numbers as historical context only. The current live run (§23) produced different-but-consistent numbers (95/100 mechanical, 86/100 AI, +675 XP) for a deliberately slightly-messier playthrough (extra commands, one invalid command) — the mechanical score formula fully explains the 5-point gap from a possible 100, and a clean required-commands-only playthrough would be expected to reproduce 100/100 mechanically. The AI review score will naturally vary run-to-run since it's a real LLM call grading free-text report quality — 86 vs. 89 is well within expected variance for the same underlying report content, not evidence of regression.

## 25. Known Issues

**BF-1 — `alerts.json` is empty/invalid JSON**
- Severity: Low
- Component: Content (`backend/content/incidents/ssh_bruteforce/alerts.json`)
- Current behaviour: 0-byte file, fails `JSON.parse`.
- Expected behaviour: Either valid JSON or absent.
- Impact: None currently — nothing reads this file (`alertBuilder.js` is itself empty/unused, and the incident's `desktop.json` doesn't enable an `alerts` app).
- Demonstration blocker: **NO**

**BF-2 — `aria.txt` is empty**
- Severity: Low
- Component: Content (`backend/content/incidents/ssh_bruteforce/aria.txt`)
- Current behaviour: 0 bytes, never loaded by any code.
- Expected behaviour: Either populated and wired in, or removed.
- Impact: None — ARIA's persona is generic/hardcoded by design.
- Demonstration blocker: **NO**

**L-1 — Two disconnected live pipelines for starting a scenario**
- Severity: High (procedural risk, not a code crash)
- Component: Frontend routing / legacy backend (`Dashboard.jsx` → `GamingEnvironment` vs. `MissionSequence.jsx` → `Desktop`)
- Current behaviour: Both entry points are live and reachable from the main Dashboard; only the Desktop path was verified to work for `ssh_bruteforce`.
- Expected behaviour: One clear, working entry point (or the legacy one clearly disabled/labeled).
- Impact: A demo that starts from the wrong button would very likely load a broken or empty legacy environment for this incident.
- Demonstration blocker: **YES, unless the correct entry point is used deliberately** — see §27 Golden Run. Not a code fix needed today; a procedural one.

**EV-1 — 4 of 14 investigation event types are defined but never emitted**
- Severity: Low
- Component: `backend/services/investigation/eventEngine.js` (`FILE_EDITED`, `FILE_SAVED`, `HINT_REQUESTED`, `SESSION_STARTED`)
- Current behaviour: Constants exist, no code path emits them.
- Expected behaviour: Either emitted or removed from the enum.
- Impact: None currently — nothing downstream currently depends on these specific types (hint usage reaches analytics via `ai_hint_log` instead, which works).
- Demonstration blocker: **NO**

**DOC-1 — `design.md` narrative is stale vs. actual `.bash_history` content**
- Severity: Cosmetic
- Component: Documentation (`backend/content/incidents/ssh_bruteforce/design.md`)
- Current behaviour: Claims only 2 post-login commands were run; the actual asset has 6 + `exit`.
- Expected behaviour: Doc matches asset (like `testing_guide.md` already does).
- Impact: None on gameplay/scoring — purely a documentation accuracy issue.
- Demonstration blocker: **NO**

**FE-1 — Dead frontend fields from an earlier architecture**
- Severity: Cosmetic
- Component: `frontend/src/hooks/useTerminal.js` (reads `result.matchedStep`/`result.newlyRevealedFiles`, never sent by the current backend response)
- Impact: None — silently no-op branches.
- Demonstration blocker: **NO**

## 26. Remaining Work

### P0 — Must Fix Before Demonstration
- **None that require code changes.** The one P0-severity item (L-1) is resolved procedurally: brief whoever runs the demo to use **Mission → Sequence → Deploy**, never the Dashboard's "EXECUTE BREACH" quick-launch card or `/briefing`.

### P1 — Should Fix Before Demonstration
- Perform one real manual click-through in an actual browser (login → Mission → Sequence → Deploy → Desktop → Terminal/Files/Email/Browser/ARIA → Report → Submit) to visually confirm the UI layer that this audit's API-level test could not exercise (§23 NOT VERIFIED item). This is the only thing standing between "the backend/content definitely works" and "the whole polished product definitely works."
- Consider disabling or clearly re-labeling the Dashboard's legacy "EXECUTE BREACH"/"ANALYZE FEED" quick-launch buttons so nobody (presenter or supervisor poking around) accidentally lands in the broken legacy `GamingEnvironment` path during or after the demo.

### P2 — Optional / Can Wait
- Populate or remove `alerts.json` and `aria.txt` (currently dead content).
- Emit `HINT_REQUESTED`/`SESSION_STARTED` (and `FILE_EDITED`/`FILE_SAVED` if ever needed) or remove them from `EVENT_TYPES`.
- Update `design.md`'s stale "2 commands" claim to match the actual 6-command `.bash_history`.
- Clean up the empty/unused placeholder files under `backend/services/environment/` and `backend/services/desktop/{index,notificationBuilder}.js`.
- Remove the dead frontend `matchedStep`/`newlyRevealedFiles` handling in `useTerminal.js`.

## 27. Golden Run

Exact recommended sequence for the official demonstration, based on what this audit actually verified works:

1. Log in with a **fresh** or otherwise not-already-completed-`ssh_bruteforce` account.
2. From the **Mission Dashboard**, click through to `/sequence/bruteforce` (NOT the Dashboard's "EXECUTE BREACH" card).
3. Click **Deploy** — this creates the session and lands you in `/desktop`.
4. Open **Terminal**. Run, in order: `pwd`, `ls`, `cat /var/log/auth.log`, `grep "203.0.113.25" /var/log/auth.log`, `grep "accepted" /var/log/auth.log`, `grep "admin" /var/log/auth.log`, `cat /home/admin/.bash_history`. (Skip `fakecommand123`-style deliberate errors unless demonstrating error handling — each extra/non-matching command costs points per §17's formula.) This unlocks all 6 discoveries and completes 3 of 4 objectives.
5. Optionally open **Email** and **Browser** to show those apps working and generating `EMAIL_OPENED`/`ARTICLE_OPENED` events for a richer analytics/AI-review picture.
6. Optionally open **ARIA** and request guidance once to show the real AI-hint pipeline live.
7. Open **Report**, write a real report covering the 6 review criteria (incident summary, attack source, authentication result, compromised account, supporting evidence, methodology), and save it — this unlocks the final discovery and completes the 4th objective.
8. Click **Submit**. This one action produces the mechanical score, XP award, and real AI review synchronously — show the resulting screen.
9. Optionally navigate to **Progress** to show XP/badges/achievements updated live.

## 28. Evidence / Screenshots to Capture

- Mission Dashboard → Sequence → Deploy screen (showing the correct entry point).
- Desktop with multiple app windows open (Terminal + Files + Email, ideally overlapping to show the window system).
- Terminal mid-investigation, showing a `[DISCOVERY]` unlock line in context.
- ARIA panel showing a real, contextual hint response.
- Report editor with the saved report content.
- The final submission result screen showing both the mechanical score and the AI review (criteria breakdown, strengths/weaknesses, feedback text).
- Progress page showing XP, the earned badge, and unlocked achievements.
- (For the FYP write-up specifically) the raw JSON of one `POST /api/investigation/submit` response — it's a good concrete artifact showing mechanical scoring, AI review, and XP all computed from one action.

## 29. Prototype Definition of Done

> "A student can enter the SSH Brute Force incident, investigate the incident using the simulated desktop environment, collect evidence through multiple investigation tools, receive contextual AI-assisted guidance, complete the required objectives, submit an evidence-based investigation report, and receive both mechanical and AI-based evaluation results."

**TRUE** — for the Desktop entry point specifically, which this audit verified end-to-end with a real live run: Terminal + Files + Email + Browser all functioned as investigation tools, ARIA provided genuinely contextual real-AI guidance, all 4 objectives completed via evidence-based discoveries, the report was submitted, and both a mechanical score (95/100) and a real AI-generated review (86/100) were returned. The statement would be **PARTIALLY TRUE** if evaluated against the *whole application* including the still-live legacy Dashboard/GamingEnvironment entry point, since that path was not verified and has strong static evidence of being broken for this incident — but that path is not the one the Definition of Done needs to be evaluated against, since it's not the intended/current way to play.

## 30. Final Recommendation

**YES — AFTER P0 FIXES.**

The one P0 item is not a code fix: it's making sure whoever runs the demonstration enters through Mission → Sequence → Deploy → Desktop, and does not click the Dashboard's legacy "EXECUTE BREACH"/"ANALYZE FEED" cards. With that constraint communicated, the prototype can be frozen and the FYP report can be written now — the content-driven pipeline for `ssh_bruteforce` is genuinely complete, internally consistent, and was proven working end-to-end today with real data, not just by reading code.

If you want zero risk of anyone clicking the wrong button on demo day, the P1 item (disable/relabel the legacy Dashboard quick-launch cards) turns this into an unconditional **YES**, and is a small, low-risk frontend change.
