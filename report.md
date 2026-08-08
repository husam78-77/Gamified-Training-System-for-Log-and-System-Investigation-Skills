=KINETIC BREACH — Session Technical Handover
Scope of this session: Implementation of Phases 2–9 of docs/execution_plan.md for the SSH Brute Force investigation scenario — Discovery Engine, Objective Engine, Investigation Report, Investigation Events, Event Analytics, ARIA/hint refactor, Submission workflow, and AI Review — plus the frontend surfaces needed to play through them. No files were modified while producing this report; all statements below reflect the state of the repo as of the last edit made in this session.

1. Executive Summary
At the start of this session, the SSH Brute Force incident had a large body of unused, correctly-authored content (discoveries.json, objectives.json, review.json, evidence assets) sitting next to a live gameplay backend that was still 100% wired to a legacy PostgreSQL schema (expected_steps, scenario_discoveries, discovery_triggers, session_discoveries) predating the project's "Environment Engine" refactor. The Environment Engine (services/environment/*) already assembled the virtual filesystem from backend/content/incidents/<id>/ for Terminal and Files, but discovery matching, objective completion, hint generation, scoring, and session completion all still queried the old DB tables — and there was no report, no event log, no analytics, no submission flow, and no AI review at all.

This session built the missing engines as pure, incident-agnostic modules that read only from backend/content/incidents/<incidentId>/*.json, added four new generic (non-content-specific) Postgres tables to hold session-scoped runtime state, rewired the Terminal and Hint/ARIA controllers onto this new system, and implemented Submission and AI Review end-to-end, including a real prompt/response pipeline against OpenAI. On the frontend, the Report and ARIA windows were built out from nothing/placeholder to functioning apps, and the Terminal/Files apps were corrected to source the filesystem from the same endpoint (they had silently been reading from a legacy, stale DB endpoint before).

The legacy DB-driven system was not deleted. It remains intact and is still used by sessionController.js's original POST /api/sessions/:id/complete route, which was left untouched. This was a deliberate, additive migration strategy, not a redesign — see Section 3.

Everything described below was validated against the real local PostgreSQL database and the real configured OpenAI API (not mocks), via direct-invocation integration scripts (written, run, and deleted during the session — not left in the repo). A full playthrough (5 terminal commands → 5 discoveries → report save → 6th discovery → submission → AI review) executed successfully and produced a coherent, correctly-scored result. Full details are in Section 11.

2. Files Modified
This list was generated from git status --porcelain at the end of the session, cross-referenced against the actual work performed. Two files (backend/content/incidents/ssh_bruteforce/incident.json and review.json) show as modified in git but were not touched by me — they were already modified/uncommitted before this session began (visible in the initial git status at session start). I read both but never wrote to either.

2.1 Database Migrations (new)
File	Why
database/investigation_content_layer.sql	Creates the four new generic tables that hold session-scoped content-driven state: investigation_discoveries, investigation_events, investigation_reports, investigation_reviews, plus sessions.submitted_at. None of these reference scenario content by ID — everything is keyed by string (discovery_key, event_type) so the schema needs zero changes for future incidents. Run against the local dev DB (db_fyp) during this session.
database/hint_system_objective_keys.sql	Converts ai_hint_log.step_order, user_hint_progress.step_order, hint_cache.step_order from INT to VARCHAR(100). Required because hint progression is now keyed by objective id (a string from objectives.json, e.g. "identify_source") instead of an expected_steps.step_order integer. Column names were deliberately left as step_order to avoid a wide rename across the hint subsystem — only the semantics changed. Run against the local dev DB during this session.
2.2 Discovery Engine (Phase 2) — new
File	Why
backend/services/investigation/discoveryEngine.js	New. Loads discoveries.json, matches parsed terminal commands against each discovery's triggers[] array, computes the 0–50 path score from weight/required fields, and derives candidateCommands (the set of commands that would currently earn progress) for ARIA's proximity detection. Zero incident-specific logic.
backend/models/investigationDiscoveryModel.js	New. Persistence for session-scoped discovery unlocks. Table: investigation_discoveries (session_id, discovery_key string, triggered_by_command). Replaces the old discoveryModel.js (still present, untouched, still used by legacy sessionController.js) for the new system.
backend/content/incidents/ssh_bruteforce/discoveries.json	Modified. Every discovery's "trigger": {} placeholder was replaced with a real "triggers": [...] array (see Section 7 for the full trigger design). Weights were rebalanced so required: true discoveries sum to 100 (previously summed to 85).
2.3 Objective Engine (Phase 3) — new
File	Why
backend/services/investigation/objectiveEngine.js	New. Loads objectives.json, resolves which objectives are complete as a pure function of requiredDiscoveries ⊆ unlockedKeys — never touches a command or filename.
2.4 Terminal rewiring — modified
File	Why
backend/controllers/terminalController.js	Fully rewritten. Removed all references to discoveryModel, discoveryService (old, DB-based), scenarioModel.getExpectedStepsByScenario, scenarioModel.getObjectivesByScenario, scenarioModel.getVirtualFilesByScenario (used previously in getResumeState), and evaluationService.matchCommand/resolveCompletedObjectives. Replaced with discoveryEngine, objectiveEngine, investigationDiscoveryModel, eventEngine, reportEngine. The command-simulation logic (buildTerminalOutput, handleLs, handleCat, handleGrep, handleFind, handlePs, handleLocate, handleStrings, handleHistory, buildHelp, path-resolution helpers) is unchanged — it was already generic and content-agnostic. The hidden-file/reveal machinery (is_hidden, reveal_at_step, reveal_at_discovery_key, newlyRevealedFiles in the response) was removed entirely — the new Environment Engine has no hidden-file concept; every evidence file is visible from session start (confirmed against design.md: "the scenario intentionally avoids hidden information").
backend/services/environment/environmentEngine.js	Modified. Added loadIncidentContent(incidentId, fileName), a generic JSON content loader exported alongside the existing buildEnvironment. Used by discoveryEngine, objectiveEngine, and reviewEngine to avoid duplicating the "read a JSON file from an incident folder" logic that previously only existed (as readJson/loadIncident) privately inside this file.
2.5 Investigation Events (Phase 5) — new
File	Why
backend/models/investigationEventModel.js	New. Persistence for investigation_events (session_id, event_type, event_data JSONB).
backend/services/investigation/eventEngine.js	New. Thin wrapper over the model, exports EVENT_TYPES (a documentation/light-validation constant, not a hard enum) and logEvent() that never throws into the caller's request path — a logging failure must never break gameplay.
2.6 Investigation Report (Phase 4) — new + modified
File	Why
backend/models/investigationReportModel.js	New. Persistence for investigation_reports (session_id PK, content, updated_at).
backend/services/investigation/reportEngine.js	New. getReport() resolves saved content or falls back to the incident's starter template; applyReportOverlay() mutates a virtualFiles array in place so Terminal and File Manager render identical content; saveReport() persists content and unlocks INVESTIGATION_REPORT_COMPLETED (if the incident defines that discovery key) once the report grows ≥100 chars beyond the template.
backend/services/files/filesEngine.js	Modified. getFiles(incidentId, sessionId) now accepts an optional sessionId and calls reportEngine.applyReportOverlay when present.
backend/services/files/controllers/filesController.js	Modified. GET /api/files now reads an optional sessionId query param and passes it through.
backend/services/investigation/controllers/investigationController.js	Modified (see 2.9) — added getReport/saveReport handlers.
2.7 Event Analytics (Phase 6) — new
File	Why
backend/services/investigation/analyticsEngine.js	New. buildAnalytics() derives applications used, evidence viewed, articles read, emails opened, distinct commands, discoveries found, objectives completed, report activity, hints used, and session duration — entirely from investigation_events, investigation_discoveries, and command_history. No AI logic lives here; it's pure derived data consumed by reviewEngine.
2.8 ARIA / Hint System refactor (Phase 7) — modified
File	Why
backend/services/playerStateAnalyzer.js	Modified. analyzePlayerState() signature changed from {commandHistory, nextStep, completedStepOrders, totalSteps, sessionStartTime} to {commandHistory, candidateCommands, completedCount, totalCount, sessionStartTime}. detectProximity() rewritten: instead of Levenshtein distance to one hardcoded nextStep.command_expected, it now measures distance to the nearest of N candidateCommands derived live from Discoveries. Repetition/stall/idle/thrashing detection logic is untouched — it never depended on expected-step data.
backend/constants/promptConstants.js	Modified. buildPrompt() param nextStep → nextObjective, totalSteps → totalCount (both are drop-in renames; nextObjective.description already existed in objectives.json). Added REVIEW_INSTRUCTOR_PERSONA and buildReviewPrompt() for Phase 9 (a separate persona/prompt path from ARIA's hint persona). All ARIA persona/tone/hard-rule content (buildPersona, HARD_RULES, LEVEL_INSTRUCTIONS, BEHAVIOR_TONE, STUCK_SCORE_TONE, PROXIMITY_CONFIRMATION, AUTO_TRIGGER_INTRO) is unchanged — it was already generic.
backend/services/hintService.js	Rewritten. generateHint() now takes nextObjective/candidateCommands/completedCount/totalCount instead of expectedSteps/completedStepOrders. sanitizeHint() rewritten: previously redacted the exact nextStep.command_expected/target_path string; now redacts any absolute-path-shaped token and any flag-shaped token (--foo, -r) as a generic backstop, since there is no longer a single canonical "correct answer" to redact (a discovery can have multiple valid trigger commands).
backend/services/hintLevelService.js	Rewritten. Renamed the JS-level parameter stepOrder → objectiveId throughout (resolveNextHintLevel, getStepProgress, getAllStepProgress). The underlying SQL column is still named step_order (see 2.1) but now holds an objective id string. Removed getHintLevelMeta (confirmed unused elsewhere via grep).
backend/services/hintCacheService.js	Rewritten. resolveHint() cache key is now (scenario_id, objectiveId, hint_level) instead of (scenario_id, step_order, hint_level). Same cache-first strategy, same shared-across-players caching behavior.
backend/models/hintCacheModel.js	Modified. All stepOrder parameter names renamed to objectiveId (mechanical sed-style replace across getCachedHint, storeCachedHint, invalidateCachedHint). SQL column references (step_order) unchanged — only the JS-level naming changed.
backend/controllers/hintController.js	Rewritten. requestHint() no longer loads scenarioModel.getExpectedStepsByScenario; it loads discoveryEngine.getDiscoveries, objectiveEngine.getObjectives, investigationDiscoveryModel.getUnlockedKeys, derives nextObjective and candidateCommands, and drives the rest of the pipeline (hintLevelService, hintCacheService, hintModel.saveHint) with those instead.
backend/services/autoTriggerService.js	Rewritten. evaluateAutoTrigger()/generateAutoHint() now accept discoveries/objectives/unlockedKeys instead of expectedSteps/completedStepOrders, and derive nextObjective/candidateCommands internally via objectiveEngine/discoveryEngine (required with require() calls inside the functions rather than top-level imports — see Section 10 for why this is flagged as debt).
2.9 Submission (Phase 8) + AI Review (Phase 9) — new + modified
File	Why
backend/models/investigationReviewModel.js	New. Persistence for investigation_reviews (session_id PK, score, criteria_scores JSONB, strengths JSONB, weaknesses JSONB, feedback).
backend/services/investigation/reviewEngine.js	New. getReviewConfig() loads review.json; reviewSubmission() builds the grading prompt, calls aiAdapter.generate() with a larger token budget (900) and lower temperature (0.3) than hints, parses the JSON response defensively (strips markdown fences, falls back to a neutral zero-scored review with a logged warning on parse failure — never crashes a submission), computes the weighted total score server-side (never trusts the model's own arithmetic), and persists it.
backend/services/investigation/submissionEngine.js	New. submitInvestigation() orchestrates the full submit flow: validates review.json's submission requirements against the saved report/terminal history, logs REPORT_SUBMITTED, computes the mechanical score via evaluationService.calculateContentScore, freezes the session via sessionModel.submitSession, upserts progression/XP/badges via the existing progressionModel (unchanged — reused, not duplicated), builds analytics, and finally calls reviewEngine.reviewSubmission. Returns one combined payload.
backend/services/evaluationService.js	Modified — added calculateContentScore() alongside the existing (untouched) matchCommand/calculateScore/resolveCompletedObjectives/calculateXp. New function mirrors the old 100-point breakdown (50 path / 30 command-usage / 20 conclusion, −5×hints) but sources pathScore from discoveryEngine.calculatePathScore and conclusionScore from objective completion ratio instead of expected_steps. Added require('./investigation/discoveryEngine') at the top of the file.
backend/models/sessionModel.js	Modified — added submitSession({sessionId, finalScore}), a single UPDATE that sets submitted_at, end_time, final_score, status='completed'. Kept separate from the existing closeSession (used by the legacy sessionController.completeSession) rather than merging them, to avoid touching a function another live code path depends on.
backend/services/investigation/controllers/investigationController.js	Modified — added getReport, saveReport, submit, getReview, logEvent handlers alongside the pre-existing getCurrent. All resolve the session via the existing getCurrentInvestigation(userId) helper from investigationEngine.js (unchanged), except getReview which takes an explicit sessionId param (because after submission the session is no longer "current"/in-progress, so getCurrentInvestigation can't be used to look it up again).
backend/services/investigation/routes/investigationRoutes.js	Modified — added GET/PUT /report, POST /submit, GET /review/:sessionId, POST /event.
backend/constants/messages.js	Modified — added REPORT_FETCHED, REPORT_SAVED, SUBMISSION_INCOMPLETE, INVESTIGATION_SUBMITTED, REVIEW_FETCHED, REVIEW_NOT_FOUND, EVENT_LOGGED.
backend/content/incidents/ssh_bruteforce/review.json	Not modified by me (pre-existing uncommitted change). Contents were read and used as-is: submission.requiresReport/requiresTerminalHistory, grading.maxScore: 100, and 6 weighted criteria (incident_summary 15, attack_source 20, authentication_result 20, compromised_account 20, supporting_evidence 15, investigation_methodology 10 — sums to 100).
2.10 Desktop app catalog — modified
File	Why
backend/content/desktop/applications.json	Modified. Added { "id": "report", "name": "Report" } to the global app catalog.
backend/content/incidents/ssh_bruteforce/desktop.json	Modified. enabledApplications changed from ["terminal","email","browser","files","alerts","aria"] to ["terminal","email","browser","files","aria","report"] — alerts was removed (its frontend component is a bare, non-functional placeholder — see Section 10), and report was added.
2.11 Frontend — Report app (new)
File	Why
frontend/src/applications/report/ReportApp.jsx	New. Fetches the report on mount (getReport), textarea editor with a save button (saveReport, shows a "Saved ✓" transient state and a discovery-unlock banner), a submit flow gated behind an explicit confirmation step (submission is irreversible), and — on success — swaps to an inline ReviewResult sub-component showing AI score, mechanical evaluation score, XP, per-criterion comments, strengths/weaknesses, feedback, and a "Return to Mission Dashboard" button.
frontend/src/applications/report/index.js	New. Barrel export, matching the convention every other applications/* folder uses.
frontend/src/applications/report/styles/report-app.css	New. Styled to match the existing dark/monospace desktop aesthetic (files.css/terminal-app.css conventions: #0d0d0d backgrounds, Fira Code font stack, #00ebf7/#ff003c accent colors).
2.12 Frontend — ARIA app (rewritten from placeholder)
File	Why
frontend/src/applications/aria/AriaApp.jsx	Rewritten. Was <div>ARIA Application</div> with zero logic. Now: fetches hint log on mount (fetchHintLog), renders a scrolling message log, a "Request Guidance" button (requestHint), remaining-hint counter, and 429/limit-reached handling. Uses the pre-existing, unmodified frontend/src/services/hintService.js — its response shape (hint, hintsRemaining, hintLevel, hintsRemainingForStep, cacheHit) already matched the new backend exactly, so no frontend service changes were needed for hints.
frontend/src/applications/aria/styles/aria-app.css	New. Purple-accented (#b200ff) chat-log styling distinct from the terminal's cyan/red theme.
2.13 Frontend — Terminal/Files single-source-of-truth fix
File	Why
frontend/src/applications/terminal/TerminalApp.jsx	Modified. Was calling fetchFullScenarioData(investigation.scenarioId, token) — a legacy scenario-table endpoint — to seed initialFiles for tab-completion and local file-tree state. This was silently reading stale/wrong data (the old virtual_files DB rows for scenario_id 1, from a completely different test scenario, "The Front Door") even though actual command execution already went through the new Environment Engine. Replaced with getFiles(investigation.incidentId, investigation.sessionId) from the same fileService.js the File Manager uses — now both apps provably read identical data (dev rule #11).
frontend/src/applications/files/services/fileService.js	Modified. getFiles(incidentId, sessionId) now accepts an optional sessionId and appends it as a query param, so the File Manager also sees live report edits via the backend overlay.
frontend/src/applications/files/hooks/useFiles.js	Modified. Accepts and forwards sessionId, included in the effect's dependency array.
frontend/src/applications/files/components/FilesApp.jsx	Modified. Passes investigation?.sessionId into useFiles.
2.14 Frontend — app registration
File	Why
frontend/src/applications/applicationRegistry.js	Modified. Registered report: ReportApp.
frontend/src/desktop/utils/appIcons.js	Modified. Added report: FileText (lucide-react icon) to APP_ICONS.
2.15 Frontend — Investigation Events wiring
File	Why
frontend/src/services/investigationService.js	Modified. Added getReport, saveReport, submitInvestigation, getReview, and logEvent (fire-and-forget, swallows errors — event logging must never block gameplay) API functions, following the existing per-file fetch-boilerplate convention (no shared axios/client exists in this codebase).
frontend/src/applications/email/EmailApp.jsx	Modified. setSelectedId calls wrapped in a handleSelect that also fires logEvent('EMAIL_OPENED', {emailId}, token).
frontend/src/applications/browser/components/BrowserApp.jsx	Modified. setCurrentPageId calls wrapped in handleNavigate, which fires logEvent('ARTICLE_OPENED', {articleId}, token) only when the navigated-to page's type === 'article' (not for menu pages).
frontend/src/desktop/components/Desktop.jsx	Modified. openApplication fires APPLICATION_OPENED; closeApplication fires APPLICATION_CLOSED.
3. Architecture Changes
3.1 Additive coexistence, not a rip-and-replace
What changed: A parallel, fully content-driven investigation system was built under backend/services/investigation/ and backend/models/investigation*Model.js. The legacy DB-driven system (scenarios, expected_steps, scenario_discoveries, discovery_triggers, session_discoveries, objectives tables, and the code that reads them — discoveryModel.js, discoveryService.js, most of evaluationService.js) was left completely intact, including the original POST /api/sessions/:sessionId/complete route in sessionController.js.

Why: development_rules.md explicitly forbids "never redesign the architecture unless required" and mandates reuse. A full rip-and-replace would have (a) risked breaking whatever still depends on the old schema, and (b) been unnecessary — only the SSH Brute Force incident needed to become fully playable this session.

What problem it solves: Zero regression risk to anything not touched. The two systems don't share write paths; the only shared reads are generic infrastructure (sessions, command_history, progressionModel, hintModel's XP/badge functions are not duplicated — progressionModel was confirmed as the single authority and reused directly).

Future incidents: Any new incident that ships discoveries.json/objectives.json/review.json gets the new engines automatically — nothing in services/investigation/* references ssh_bruteforce by name. suspicious_script and ssh_forensics (which have empty content folders — confirmed via directory listing) will simply throw a clear "Failed to load incident" error if played, exactly as they already did before this session (see 3.2).

3.2 Terminal execution: full cutover, not dual-path
What changed: Unlike the old discoveryService.js's explicit design ("runs in parallel with the existing step-matching engine and does not replace it"), the new terminalController.js does not run both systems side by side. It calls discoveryEngine/objectiveEngine exclusively.

Why: Before this session, terminalController.js already unconditionally called buildEnvironment(incidentId) for every scenario type, including suspicious_script and ssh_forensics — and those incidents' content folders are empty (no incident.json). This means Terminal command execution was already broken for those two scenario types regardless of any change made this session; the DB-based expected_steps/scenario_discoveries data for them was unreachable dead weight sitting behind a buildEnvironment call that would throw first. Given that, keeping a dual-path in the one incident that does work (ssh_bruteforce) would have added meaningful complexity for zero benefit and violated "no duplicate logic."

What problem it solves: discoveries.json/objectives.json already existed with real, hand-authored content (weights, categories, requiredDiscoveries) that no backend code read. This was a clear signal of intended-but-unfinished architecture, not a hypothetical.

How future incidents benefit: A new incident needs only discoveries.json + objectives.json (+ optionally review.json for Phase 9) — no expected_steps DB rows, no scenario_discoveries DB rows, no engine code changes, satisfying dev rule #26 (the platform's stated final goal).

3.3 Generic, string-keyed session state instead of DB-content-FK'd state
What changed: New tables (investigation_discoveries, investigation_events, investigation_reports, investigation_reviews) key everything by plain strings (discovery_key, event_type) and session_id, never by a foreign key into a DB-owned content table.

Why: The old session_discoveries table has discovery_id INT REFERENCES scenario_discoveries(discovery_id) — a hard dependency on discovery definitions living in Postgres. Since discovery definitions now live in discoveries.json files, that FK relationship is structurally impossible to reuse without also duplicating the JSON content back into DB rows (which would violate dev rule #3: "do not hardcode values inside services" / rule #5: "everything required for an incident belongs inside the content folder").

What problem it solves: An incident's discovery/objective/event vocabulary is defined once, in one file, in one place. The DB layer has no opinion about what a "valid" discovery key is — it just records what happened.

Future incidents: Adding, renaming, or removing a discovery key requires editing exactly one JSON file. No migration, no DB seed script.

3.4 No hidden-file/reveal mechanic in the new system
What changed: The old virtual_files.is_hidden/reveal_at_step/reveal_at_discovery_key columns and the entire visibility-filtering logic in the old terminalController.js (visibleFiles = virtualFiles.filter(...)) were dropped from the new response entirely — not reimplemented, not migrated.

Why: Verified two ways: (1) services/environment/evidenceInjector.js and environmentLoader.js (the code that actually builds virtualFiles for the new system) have no concept of hidden files at all — everything under a template + assets/create/assets/replace is always present. (2) design.md for ssh_bruteforce states explicitly: "The scenario intentionally avoids hidden information... If the learner cannot prove a conclusion using available evidence, the conclusion should not be accepted."

What problem it solves: Removes an entire category of state-synchronization bugs (stale hidden-file lists on refresh, "revealed" files not matching between Terminal and Files) that the old system needed a dedicated getResumeState reveal-replay mechanism to paper over.

Future incidents: If a future incident does want gated evidence, that would need to be reintroduced as a new, explicit mechanic — it is not currently supported by the Environment Engine at all (this is a gap, not a design choice against it; see Section 9).

3.5 ARIA re-keyed to objectives, proximity re-derived from Discoveries
What changed: The entire hint pipeline (hintLevelService, hintCacheService, hintCacheModel, playerStateAnalyzer, hintService, hintController, autoTriggerService) was re-keyed from step_order (int) to objectiveId (string), via a targeted 3-column type migration rather than new tables.

Why: Dev rule #14 is explicit: "ARIA should use Discoveries, Objectives, Investigation Events, Opened Evidence... ARIA should not rely on hardcoded commands." The old system's sanitizeHint() redacted one specific nextStep.command_expected string — a hardcoded answer key baked directly into the hint pipeline, a direct violation. The old detectProximity() compared the player's last command via Levenshtein distance to that same single hardcoded command.

What problem it solves: ARIA now has no hardcoded answer anywhere in its pipeline. "Is the player close?" is now computed from discoveryEngine.getCandidateCommands(discoveries, nextObjective, unlockedKeys) — the live set of trigger commands belonging to whichever discoveries the next objective still needs — so it's correct even when a discovery has multiple valid solving techniques.

Why migrate columns instead of new tables: Preserves 100% of the existing, non-trivial infrastructure (cross-player hint-text caching in hint_cache, per-objective level-capping in user_hint_progress, full analytics history in ai_hint_log) with a minimal, safe, additive schema change (ALTER COLUMN ... TYPE VARCHAR(100) USING ...::text) rather than re-implementing it.

3.6 Report persistence via overlay, not virtual_files row
What changed: The Investigation Report is not stored as a row anywhere in the Environment Engine's data (there is no DB virtual_files equivalent in the new system at all — files are re-derived from disk on every request). It's stored in investigation_reports (session_id → content) and merged onto the freshly-built virtualFiles array by reportEngine.applyReportOverlay(), called by both terminalController.executeCommand and filesEngine.getFiles.

Why: buildEnvironment(incidentId) is stateless and rebuilds the filesystem from disk every call — there was nowhere to persist a player edit inside it. Session-scoped mutable state (a report edit) is not "scenario content" (dev rule #3/#5 — that belongs in the incident folder as read-only source material) — it's runtime data, so it belongs in Postgres, keyed by session.

What problem it solves: Satisfies dev rule #11 ("File Manager must display exactly the same virtual filesystem used by Terminal... one source of truth") for a genuinely mutable file, which the original architecture (stateless, disk-sourced) had no mechanism for at all.

Future incidents: Any file path can become "the report" — reportEngine.getReportPath(incident) reads an optional incident.json field reportPath, defaulting to /home/investigator/investigation_report.txt if absent. No engine change needed for an incident that wants its report somewhere else.

3.7 Two distinct scores: mechanical vs. AI-graded
What changed: evaluationService.calculateContentScore() (mechanical: evidence found, command efficiency, objectives completed, hint penalty — 0–100) and reviewEngine.reviewSubmission() (AI-graded: written report quality against review.json's 6 weighted criteria — 0–100) are two separate scores, computed independently, stored in two separate places (sessions.final_score vs investigation_reviews.score).

Why: design.md states: "The learner successfully completes the investigation after submitting... The quality of the investigation is evaluated separately by the AI review system." These are explicitly two different questions — "did you do the mechanics of an investigation" vs "is your written conclusion any good" — and conflating them would mean a well-typed but empty report could score identically to a well-reasoned one, or vice versa.

What problem it solves: XP/badge/progression (which existed before this session and needed to keep working) is driven by the mechanical score, which is deterministic and doesn't depend on an external API being available. The AI Review is a richer, qualitative artifact shown to the player but not gating their platform progression.

4. Backend Changes
4.1 Execution flow — Terminal command

POST /api/terminal/execute { session_id, command, current_path }
  → terminalController.executeCommand
      1. sessionModel.getSessionById(sessionId, userId)      — validate ownership + in_progress
      2. terminalParser.parseCommand(command)                — pure parse, no I/O
      3. scenarioModel.getScenarioById(session.scenario_id)  — only to get `type` for incidentResolver
      4. incidentResolver.resolveIncidentId(scenario.type)   — 'bruteforce' → 'ssh_bruteforce'
      5. IN PARALLEL:
           environmentEngine.buildEnvironment(incidentId)     — template + evidence pack → virtualFiles
           discoveryEngine.getDiscoveries(incidentId)         — reads discoveries.json
           objectiveEngine.getObjectives(incidentId)          — reads objectives.json
           investigationDiscoveryModel.getUnlockedKeys(sid)   — this session's progress so far
      6. reportEngine.applyReportOverlay(virtualFiles, incident, sessionId)
                                                                — mutate virtualFiles in place with saved report
      7. discoveryEngine.matchDiscoveries(parsed, discoveries, unlockedKeysBefore, current_path)
                                                                — 0..N newly unlocked discoveries
      8. FOR EACH new discovery:
           investigationDiscoveryModel.saveDiscovery(...)      — INSERT ... ON CONFLICT DO NOTHING
           eventEngine.logEvent(sessionId, 'DISCOVERY_UNLOCKED', {...})
      9. objectiveEngine.resolveCompletedObjectives(objectives, unlockedKeysBefore)  → completedBefore
         objectiveEngine.resolveCompletedObjectives(objectives, unlockedKeysAfter)   → completedObjectiveIds
         diff → newlyCompletedObjectiveIds → eventEngine.logEvent('OBJECTIVE_COMPLETED', ...) per id
     10. terminalModel.saveCommand(...)                        — command_history row, matchExpected = (newDiscoveries.length>0)
         eventEngine.logEvent('COMMAND_EXECUTED', {command, matched})
     11. buildTerminalOutput(parsed, environment.virtualFiles, current_path, history)
                                                                — pure simulation, unchanged logic
     12. evaluateAutoTrigger(...) / generateAutoHint(...)       — non-blocking, try/catch-suppressed
     13. response: { output, matched, completedObjectiveIds, newlyCompletedObjectiveIds, newDiscoveries, auto_hint }
Note the response shape dropped matchedStep and newlyRevealedFiles (no longer meaningful) and renamed discovery fields from the old {discovery_key, is_critical, reveal_hint, severity_level} to {key, title, description, category, weight, required} — matching discoveries.json's actual field names instead of the old DB column names.

4.2 Execution flow — Hint request

POST /api/hints/request { session_id }
  → hintController.requestHint
      1. sessionModel.getSessionById + status check
      2. hintModel.countHintsUsed(sessionId) — session-wide cap of 5, unchanged
      3. scenarioModel.getScenarioById → incidentResolver.resolveIncidentId
      4. IN PARALLEL: discoveryEngine.getDiscoveries, objectiveEngine.getObjectives,
                       investigationDiscoveryModel.getUnlockedKeys,
                       terminalModel.getCommandHistory, hintModel.getHintsBySession
      5. completedObjectiveIds = objectiveEngine.resolveCompletedObjectives(...)
         nextObjective = objectives.find(o => not in completedObjectiveIds)
         → if none: 400 "All objectives are already completed."
      6. candidateCommands = discoveryEngine.getCandidateCommands(discoveries, nextObjective, unlockedKeys)
      7. hintLevelService.resolveNextHintLevel({sessionId, scenarioId, objectiveId: nextObjective.id})
                                                    — increments/caps the 1-3 level for THIS objective
      8. hintCacheService.resolveHint({scenarioId, objectiveId, hintLevel, commandHistory,
                                        candidateCommands, nextObjective, completedCount, totalCount,
                                        previousHints, scenarioTitle, missionBrief, sessionStartTime})
           → cache hit: return cached hint_text, still runs analyzePlayerState for logging
           → cache miss: hintService.generateHint(...) → aiAdapter.generate(prompt) → OpenAI call
                          → sanitizeHint() generic redaction → hintCacheModel.storeCachedHint (fire-and-forget)
      9. hintModel.saveHint(...) — ai_hint_log row, step_order column now holds nextObjective.id (string)
     10. hintModel.upsertSessionPlayerState(...) — unchanged
     11. response: { hint, hintsRemaining, hintLevel, hintsRemainingForStep, cacheHit }
4.3 Execution flow — Submission + AI Review

POST /api/investigation/submit  (no body — resolves session via req.user + getCurrentInvestigation)
  → investigationController.submit
      → submissionEngine.submitInvestigation({sessionId, userId})
          1. sessionModel.getSessionById + status='in_progress' check
          2. scenarioModel.getScenarioById → incidentResolver.resolveIncidentId
          3. IN PARALLEL: reviewEngine.getReviewConfig(incidentId)   — review.json
                           reportEngine.getReport(sessionId, incidentId)
                           terminalModel.getCommandHistory(sessionId)
                           discoveryEngine.getDiscoveries / objectiveEngine.getObjectives
          4. Validate review.json.submission.{requiresReport, requiresTerminalHistory}
                → report content must be ≥50 trimmed chars, history must be non-empty
                → else throw SubmissionError (caught by controller → 400 SUBMISSION_INCOMPLETE)
          5. eventEngine.logEvent('REPORT_SUBMITTED', {})
          6. evaluationService.calculateContentScore({discoveries, unlockedKeys, objectives,
                                                        completedObjectiveIds, totalCommandsCount, hintsUsed})
                → { pathScore(0-50), commandUsageScore(0-30), conclusionScore(0-20), totalWeightedScore, partialCredit }
          7. sessionModel.submitSession({sessionId, finalScore}) — freezes: submitted_at, end_time, status='completed'
          8. progressionModel.upsertUserProgress / addXpToUser / awardBadge (score >= 60)
                                                        — SAME authority the legacy completeSession used, reused not duplicated
          9. eventEngine.logEvent('SESSION_FINISHED', {})
         10. analyticsEngine.buildAnalytics({sessionId, session: closedSession, discoveries, objectives})
         11. reviewEngine.reviewSubmission({sessionId, incidentId, scenarioTitle, missionBrief,
                                             reportContent, terminalCommands, analytics})
                → promptConstants.buildReviewPrompt(...) → aiAdapter.generate(prompt, {maxTokens:900, temp:0.3})
                → parseReviewResponse() — strips markdown fences, JSON.parse, defensive fallback on failure
                → weightedScore = Σ (criterion.score/100 × criterion.weight) / totalWeight × maxScore  [server-computed]
                → investigationReviewModel.saveReview(...)
         12. progressionModel.getNextScenarioForUser(userId)
         13. return { session, evaluation, xpAwarded, updatedUser, analytics, review, nextScenario }
4.4 Environment / Context layer (unchanged, reused)
environmentEngine.buildEnvironment(incidentId) remains the single entry point for filesystem assembly: loadIncident → loadTemplateMetadata → environmentLoader.loadTemplate (walks content/templates/<name>/filesystem/ into a flat array) → evidenceInjector.injectEvidence (applies assets/replace, assets/delete, assets/create in that order). This session added exactly one new export to this file (loadIncidentContent) and changed nothing else about it — it was already correct and generic.

incidentResolver.resolveIncidentId(scenarioType) — unchanged — maps a scenario's DB type column ('bruteforce') to a content folder name ('ssh_bruteforce') via a hardcoded object. This is the one place in the codebase that still hardcodes a scenario↔incident mapping; every new engine built this session takes incidentId as an opaque string parameter and never calls this resolver itself — only terminalController, hintController, and submissionEngine call it, exactly once each, at the top of their handler.

5. Frontend Changes
5.1 Application shell (unchanged mechanism, new entries)
Desktop.jsx owns openedApplications local state and delegates rendering to WindowManager, which looks up applicationRegistry[app.id] — this pattern was not changed, only extended: report was added to applicationRegistry.js and appIcons.js. No window-sizing/type config exists anywhere (Window.jsx is fully generic) — the Report window uses the same generic chrome as every other app.

InvestigationContext.jsx (unchanged) fetches GET /api/investigation/current once per token and provides {sessionId, scenarioId, incidentId, category, difficulty} via useInvestigation(). Every app that needs session/incident identity — Terminal, Files, Report, ARIA, Email (indirectly via investigationService), Browser — reads from this context; none of them fetch or hardcode an ID themselves.

5.2 Terminal (useTerminal.js — unchanged; TerminalApp.jsx — modified)
useTerminal.js, the xterm.js-driving hook, was not modified. It already had full support for rendering discovery-unlock feedback (writeDiscoveryFeedback), auto-hint notifications (writeAutoHintFeedback), and objective-completion/file-reveal callbacks (onObjectivesUpdated, onFilesRevealed, onDiscovery) — these write directly into the terminal output stream unconditionally, independent of whether the parent component wires the optional callbacks. This meant the new backend's newDiscoveries/auto_hint fields render correctly with zero hook changes. Fields the hook checks but that no longer exist in the response (matchedStep, newlyRevealedFiles) are read via optional chaining (result.matchedStep, result.newlyRevealedFiles?.length) and simply evaluate to falsy/undefined — no crash, silent graceful degradation confirmed by code reading (not yet confirmed by a live browser session — see Section 11).

The one real fix: TerminalApp.jsx was pulling its local virtualFiles seed (initialFiles) from a legacy, DB-backed endpoint (fetchFullScenarioData) that returned stale content unrelated to the actual content-driven filesystem the backend now serves for command execution. This has been corrected to use getFiles(incidentId, sessionId) — the same call FilesApp.jsx makes.

5.3 Files (FilesApp.jsx, useFiles.js, fileService.js — modified)
Unchanged structurally: FilesApp → useFiles(incidentId, sessionId) → fileService.getFiles → GET /api/files?incidentId=...&sessionId=.... FileViewer.jsx remains read-only (renders <pre>{content}</pre>) — it was not given editing capability; editing lives exclusively in the new Report app. The only change: sessionId is now threaded through so the File Manager can display live report edits, matching what Terminal shows.

5.4 Email / Browser (both modified — event logging only)
Neither app's core logic changed. EmailApp.jsx's selection handler and BrowserApp.jsx's navigation handler were each wrapped to additionally call investigationService.logEvent(...) — a fire-and-forget POST that never blocks or affects the existing UI behavior.

5.5 ARIA (rewritten)
Previously a two-line placeholder. Now a self-contained component: fetches GET /api/hints/:sessionId on mount to restore prior hints (existing, unmodified backend endpoint and unmodified frontend hintService.js), renders them as a scrollable log, and a "Request Guidance" button that calls POST /api/hints/request. Handles the existing 429 limitReached error path (already implemented in hintService.js before this session) by disabling the button and showing a message.

5.6 Report (new)
ReportApp.jsx is the newest and largest piece of frontend work: fetch-on-mount, controlled textarea, explicit save action (not autosave/debounced — a deliberate choice for a first pass, see Section 9), a two-step submit flow (click "Submit Investigation" → confirmation panel → "Confirm Submission"), and a post-submission ReviewResult view rendered in place of the editor (the component switches entirely based on whether result state is populated) showing both scores, the AI's per-criterion breakdown, strengths/weaknesses, feedback text, and updated XP/level, with a button to navigate back to /mission.

5.7 How everything communicates
There is no shared HTTP client in this codebase — every *Service.js file independently repeats the same fetch + Authorization: Bearer + if (!response.ok) throw boilerplate. This was confirmed as the established convention (not an oversight) and followed exactly for every new service function added this session (getReport, saveReport, submitInvestigation, getReview, logEvent in investigationService.js).

6. Data Flow
6.1 Full mission flow (target end-to-end path this session enables)

Mission Dashboard (existing, unmodified)
  ↓ selects scenario
POST /api/sessions/start { mode, scenario_id }        (existing, unmodified sessionController.startSession)
  ↓ session created/resumed
Desktop.jsx mounts
  ↓ GET /api/investigation/current                     (existing investigationEngine — resolves session→scenario→incidentId)
  ↓ GET /api/desktop?incidentId=...                     (existing desktopEngine/applicationBuilder — enabledApplications list)
Desktop renders icons: terminal, email, browser, files, aria, report
  ↓ player opens Email
GET /api/email?incidentId=...                           (existing emailEngine — reads emails.json)
  ↓ player opens Browser
GET /api/browser?incidentId=...                         (existing browserEngine — reads browser.json)
  ↓ player opens Files / Terminal
GET /api/files?incidentId=...&sessionId=...              (filesEngine → buildEnvironment + reportEngine overlay)  [NEW: sessionId param]
  ↓ player runs commands in Terminal
POST /api/terminal/execute                               (see 4.1 — discoveryEngine/objectiveEngine/eventEngine)  [REWIRED]
  ↓ discoveries unlock, objectives complete, events logged
  ↓ player opens ARIA if stuck
POST /api/hints/request                                  (see 4.2 — objective/discovery-driven)  [REWIRED]
  ↓ player opens Report
GET /api/investigation/report                            (reportEngine.getReport)  [NEW]
  ↓ player writes findings, saves
PUT /api/investigation/report                             (reportEngine.saveReport → may unlock INVESTIGATION_REPORT_COMPLETED)  [NEW]
  ↓ player submits
POST /api/investigation/submit                            (see 4.3 — submissionEngine → reviewEngine → AI)  [NEW]
  ↓ session frozen, XP/badge awarded, AI review generated
ReportApp renders ReviewResult
  ↓ player clicks "Return to Mission Dashboard"
navigate('/mission')
6.2 Discovery unlock flow (fine-grained)

Player types command in Terminal (xterm.js, useTerminal.js)
  ↓ submitCommand(cmd, term)
POST /api/terminal/execute {session_id, command, current_path}
  ↓ terminalParser.parseCommand → {command, target, positional, flags}
  ↓ discoveryEngine.matchDiscoveries(parsed, discoveries[], unlockedKeys[], currentPath)
      for each undiscovered discovery:
        for each trigger in discovery.triggers:
          matchesTrigger(parsed, trigger, currentPath)
            - command name must match
            - optional nameContains (find -name filter)
            - optional patternContains (grep/locate search term) [+ optional targetPath/targetContains combined]
            - optional targetPath (exact resolved path match) / targetContains (substring)
            - none of the above → bare command match
  ↓ newly unlocked discoveries[] returned
  ↓ investigationDiscoveryModel.saveDiscovery per discovery (idempotent, ON CONFLICT DO NOTHING)
  ↓ eventEngine.logEvent('DISCOVERY_UNLOCKED', {key, title, source:'command'})
  ↓ objectiveEngine.resolveCompletedObjectives — before/after diff → newlyCompletedObjectiveIds
  ↓ response.newDiscoveries[] returned to frontend
useTerminal.js:
  ↓ writeDiscoveryFeedback(term, discovery) — writes "[DISCOVERY] <title>" line into xterm
  ↓ onDiscoveryRef.current?.(newDiscoveries) — optional callback (not wired in desktop TerminalApp currently)
6.3 Report → Discovery → Objective chain

ReportApp: textarea onChange → local state only (not saved until Save clicked)
  ↓ "Save Report" clicked
PUT /api/investigation/report {content}
  ↓ investigationController.saveReport
  ↓ eventEngine.logEvent('REPORT_EDITED', {})
  ↓ reportEngine.saveReport({sessionId, incidentId, content})
      ↓ investigationReportModel.saveReport (UPSERT)
      ↓ eventEngine.logEvent('REPORT_SAVED', {length})
      ↓ isSubstantive(content, templateContent) — trimmed length ≥ template length + 100 chars
          if true AND discoveries.json defines 'INVESTIGATION_REPORT_COMPLETED':
            investigationDiscoveryModel.saveDiscovery(..., triggeredByCommand:'report_saved')
            eventEngine.logEvent('DISCOVERY_UNLOCKED', {key, source:'report'})
  ↓ response: {content, updatedAt, unlockedDiscovery}
ReportApp: shows "[DISCOVERY] <title>" banner if unlockedDiscovery is present
This is the one discovery in ssh_bruteforce/discoveries.json with an empty triggers: [] array — it is intentionally never matched by discoveryEngine.matchDiscoveries (which only evaluates commands); it can only be unlocked via this report-save path, since "wrote a report" is an authoring action, not an investigative command.

7. Scenario Content
Full inventory of backend/content/incidents/ssh_bruteforce/:

incident.json (not modified this session)

{ "id": "ssh_bruteforce", "title": "SSH Brute Force Investigation", "category": "Authentication",
  "difficulty": "Beginner", "template": "ubuntu_server", "estimated_time": 20, "xp": 250, "version": "1.0.0", "status": "active" }
Read by environmentEngine.loadIncident() to resolve which template (ubuntu_server) to load. xp/estimated_time are currently not consumed anywhere in the code I read (XP is instead computed dynamically by evaluationService.calculateXp from score+difficulty+hints) — likely display-only metadata for a mission-selection card. No reportPath field is present, so reportEngine falls back to its default /home/investigator/investigation_report.txt.

discoveries.json (modified this session — see 2.2)
6 discoveries, each with key, title, description, category, weight, required, triggers[]. Read exclusively by discoveryEngine.getDiscoveries(). Trigger schema designed this session (richer than the old DB schema):


{ command: string, targetPath?: string, targetContains?: string, patternContains?: string, nameContains?: string }
FAILED_LOGIN_PATTERN_FOUND (weight 15, required) — cat /var/log/auth.log, or grep with pattern containing "failed"/"invalid user" against that file.
ATTACK_SOURCE_IDENTIFIED (weight 25, required) — grep/locate with pattern containing the attacker IP 203.0.113.25, no target constraint (fires even via grep -r from a broader path).
SUCCESSFUL_AUTHENTICATION_CONFIRMED (weight 25, required) — grep pattern containing "accepted" against auth.log.
COMPROMISED_ACCOUNT_IDENTIFIED (weight 25, required) — grep pattern containing "admin" against auth.log, OR cat /home/admin/.bash_history.
POST_LOGIN_ACTIVITY_CONFIRMED (weight 10, not required — bonus) — cat /home/admin/.bash_history.
INVESTIGATION_REPORT_COMPLETED (weight 10, required) — triggers: [], unlocked only via the report-save path (Section 6.3).
Required weights sum to exactly 100 (15+25+25+25+10), consumed by discoveryEngine.calculatePathScore which self-normalizes regardless (earnedWeight/totalWeight*50), but kept at 100 for the documented convention.

objectives.json (not modified this session)
4 objectives (investigation_summary, identify_source, identify_account, prepare_report), each {id, title, description, requiredDiscoveries[]}. Read exclusively by objectiveEngine.getObjectives(). prepare_report requires INVESTIGATION_REPORT_COMPLETED, making it the objective that only completes after a report save.

review.json (not modified this session, but is the primary content consumer of Phase 9)
{submission: {requiresReport, requiresTerminalHistory}, grading: {maxScore:100}, criteria: [6 entries with id/title/weight/required]}. Read exclusively by reviewEngine.getReviewConfig(), consumed by submissionEngine (for the submit-gate) and promptConstants.buildReviewPrompt (for the grading criteria list sent to the LLM).

emails.json (not modified)
2 emails (incident_brief, submission_requirements) establishing the narrative and explicitly telling the player the report path and submission requirements in-fiction. Read by emailEngine.buildEmails(), unrelated to this session's backend work except that the frontend now fires EMAIL_OPENED events when they're read.

browser.json (not modified)
A menu page (knowledge) plus 4 long-form educational articles (openssh, auth_log, mitre, bruteforce) — genuinely well-written, no spoilers, teaches concepts (SSH auth mechanics, how to read auth.log, MITRE T1110.001, general investigative methodology) without ever naming the specific IP/account in this incident. Read by browserEngine.buildBrowser(); the frontend now fires ARTICLE_OPENED when any type:"article" page is opened.

desktop.json (modified this session)
{"enabledApplications": ["terminal","email","browser","files","aria","report"]} — alerts removed (non-functional placeholder), report added.

design.md (not modified — read extensively, used as the primary source of truth for scope decisions)
The scenario's design document: learning objectives, the "internal scenario truth" (attacker IP 203.0.113.25, compromised account admin, two post-login commands whoami/ls /home), success criteria (submit report + terminal history, AI-graded separately), evidence philosophy ("no hidden information"), and the report's expected sections (Source IP, Compromised Account, Authentication Result, Supporting Evidence, Additional Notes). This document directly justified three architecture decisions in Section 3 (no hidden-file mechanic, two separate scores, report path convention).

references.md (not modified)
Short pointer list: MITRE T1110.001, OpenSSH docs, Linux auth logs, and a note on the educational simplifications made (reduced attack duration, simplified evidence, limited attacker activity). Not consumed by any code — documentation only.

assets/replace/etc/passwd, assets/replace/var/log/auth.log (not modified)
Overwrite the corresponding files from the ubuntu_server template. auth.log contains the full narrative: legitimate noise (developer SSH via publickey, sudo/cron entries), then the attack sequence — Invalid user test/Invalid user guest probes, Failed password for root ×2, Failed password for admin ×8, then Accepted password for admin from 203.0.113.25, session open/close, disconnect. passwd lists three real accounts (developer, admin, ubuntu) alongside standard system accounts.

assets/create/home/admin/.bash_history (not modified)
whoami / pwd / hostname / ls / ls /home / cat /etc/os-release / exit — matches design.md's internal truth of minimal, non-persistent post-login reconnaissance.

assets/create/home/investigator/investigation_report.txt (not modified)
The starter template (================\n\nInvestigation Report\n\n================) — this is the file reportEngine treats as the baseline for the "has the player written ≥100 chars beyond this" completeness check, and what a fresh session's GET /api/investigation/report returns before any save.

assets/create/etc/hostname, assets/create/etc/os-release (not modified)
Flavor/realism files (server01, Ubuntu 22.04.4 LTS) matching one of the .bash_history commands (cat /etc/os-release) — not tied to any discovery trigger, purely atmospheric/optional evidence per design.md's "Optional Evidence" list.

alerts.json, aria.txt (not modified — confirmed empty/unused)
Both are 0-byte files. alertBuilder.js (the presumed consumer of alerts.json) is also a 0-byte file and is never required anywhere in the backend (confirmed via grep). aria.txt has zero references anywhere in the codebase. These were not deleted this session (out of scope — see Section 9) but the alerts app was removed from desktop.json's enabled list specifically because its frontend component is a bare placeholder that would have rendered a broken/empty window.

8. Current Architecture

┌─────────────────────────────────────────────────────────────────────┐
│                         backend/content/                             │
│  incidents/ssh_bruteforce/          templates/ubuntu_server/         │
│    incident.json                      metadata.json                 │
│    discoveries.json  ◄──┐             filesystem/ (base FS tree)    │
│    objectives.json   ◄──┤                                           │
│    review.json       ◄──┤   read-only source-of-truth content       │
│    emails.json       ◄──┤                                           │
│    browser.json      ◄──┤                                           │
│    desktop.json      ◄──┤                                           │
│    assets/{create,replace,delete}/  ◄── overlaid onto template       │
└───────────┬─────────────┴────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────┐
│  environmentEngine.js          │  buildEnvironment(incidentId)
│   ├─ loadIncident               │  → { incident, template, virtualFiles }
│   ├─ loadTemplateMetadata       │  loadIncidentContent(incidentId, file) — NEW generic loader
│   ├─ environmentLoader.loadTemplate
│   └─ evidenceInjector.injectEvidence (replace/delete/create)
└───────────┬─────────────────────┘
            │  virtualFiles[]                incident{}
            ▼                                    │
┌─────────────────────┐         ┌────────────────┴──────────────┐
│  filesEngine.js       │         │  discoveryEngine.js  (NEW)     │
│  (Files, GET-only)     │         │  objectiveEngine.js  (NEW)     │
│  + reportEngine overlay│         │  reviewEngine.js     (NEW)     │
└─────────────────────┘         └─────────────────────────────────┘
            ▲                                    ▲
            │                                    │
┌───────────┴────────────────────────────────────┴──────────────────┐
│                        terminalController.js  (REWIRED)             │
│  parseCommand → discoveryEngine.matchDiscoveries →                  │
│  investigationDiscoveryModel (persist) → objectiveEngine (derive) → │
│  eventEngine (log) → reportEngine (overlay) → buildTerminalOutput   │
└───────────┬──────────────────────────────────────────────────────┬─┘
            │                                                      │
            ▼                                                      ▼
┌───────────────────────┐                            ┌──────────────────────┐
│ hintController.js       │                            │ investigationController│
│ (REWIRED — objective-    │                            │  getReport/saveReport  │
│  keyed, discovery-derived│                            │  submit → submissionEngine
│  candidateCommands)      │                            │  getReview             │
│ → hintCacheService →     │                            │  logEvent               │
│   hintService →          │                            └──────────┬─────────────┘
│   aiAdapter → OpenAI      │                                       │
└───────────────────────┘                                       ▼
                                                       ┌──────────────────────┐
                                                       │ submissionEngine.js    │
                                                       │  (NEW)                 │
                                                       │ → evaluationService     │
                                                       │   .calculateContentScore│
                                                       │ → progressionModel      │
                                                       │   (XP/badge — REUSED)   │
                                                       │ → analyticsEngine       │
                                                       │ → reviewEngine → OpenAI │
                                                       └──────────────────────┘

Postgres — session-scoped state (all NEW this session, string-keyed, incident-agnostic):
  investigation_discoveries(session_id, discovery_key, triggered_by_command)
  investigation_events(session_id, event_type, event_data JSONB)
  investigation_reports(session_id PK, content)
  investigation_reviews(session_id PK, score, criteria_scores, strengths, weaknesses, feedback)
  sessions.submitted_at  (added column)

Postgres — legacy, UNTOUCHED, still live for sessionController.js's old /complete route:
  scenarios, virtual_files, expected_steps, scenario_discoveries, discovery_triggers,
  session_discoveries, objectives, evaluation_results, user_progress, badges,
  ai_hint_log / user_hint_progress / hint_cache  (step_order column TYPE changed INT→VARCHAR, still shared infra)
Desktop ↔ Application relationship: desktop.json (per-incident) lists enabledApplications by id; content/desktop/applications.json (global) is the catalog of valid ids+names; applicationBuilder.js cross-references the two and throws if an incident enables an id the catalog doesn't know. The frontend's applicationRegistry.js maps the same ids to React components — these three lists (global catalog, per-incident enable list, frontend registry) must all agree for an app to appear and function; this session added report to all three and removed alerts from the per-incident list only (it remains in the global catalog and frontend registry, just unused by this incident).

Terminal ↔ Files relationship: both now call the identical chain — buildEnvironment(incidentId) → reportEngine.applyReportOverlay(virtualFiles, incident, sessionId) — independently (not through a shared cached instance; each request rebuilds from disk + one extra DB read). This is correct-but-not-optimized; see Section 10.

Discoveries ↔ Objectives ↔ Review relationship: strictly one-directional. Objectives depend on Discoveries (requiredDiscoveries[]); nothing depends on Objectives. Review criteria are independent of both — review.json grades the written report text, not the discovery/objective completion state (analytics about discovery/objective progress are included in the AI's prompt as context, but the score is the AI's judgment of the report content itself).

9. Remaining Work
Ordered by priority.

9.1 Authenticated browser validation (High)
Why needed: Everything was validated via direct function invocation against real DB/AI (bypassing Express routing, JWT auth, and the actual React rendering/click path) or via Vite's dev-transform endpoint (proves the files compile, not that they render/behave correctly in-browser). No one has visually confirmed the Report/ARIA windows render correctly, that the submit confirmation flow works when clicked, or that useTerminal.js's optional-chaining fallbacks for the now-missing matchedStep/newlyRevealedFiles fields behave as expected in a live session.
Depends on: test user credentials, or a decision to create one for this purpose.
Suggested implementation: Log in as a real user, start an ssh_bruteforce session from Mission Dashboard, and walk the full flow from Section 6.1 manually, watching the browser console for errors at each step.

9.2 Legacy GamingEnvironment.jsx compatibility (Medium)
Why needed: frontend/src/pages/GamingEnvironment/GamingEnvironment.jsx is a full-page legacy Terminal experience (distinct from the new Desktop-based one) that also calls POST /api/terminal/execute and reads matchedStep/newlyRevealedFiles/integer completedObjectiveIds from the response for its SystemLogEntry UI and MissionReport component. This session's response shape changes (dropped fields, string-typed objective ids) were not verified against this page's rendering code.
Depends on: a decision on whether this page is still a supported entry point, or fully superseded by the Desktop flow (Phase 12's validation flow in execution_plan.md explicitly describes the Desktop flow, suggesting it is superseded).
Suggested implementation: Either retire the route pointing to GamingEnvironment.jsx, or audit/patch its consumption of the terminal response and its own POST /api/sessions/:id/complete call (which still uses the fully-legacy DB-scoring path) to also work with content-driven sessions.

9.3 Progress page analytics re-pointing (Medium)
Why needed: progressionModel.getUserProgressionData() (feeds /progress page) computes hiddenEvidenceFound, evidenceRecoveryRate, discoveryCompletionRate, and 4 of the 10 achievements (TRACE_WALKER, GREP_HUNTER, PAYLOAD_HUNTER, DEEP_RECON) via SQL joins against session_discoveries/scenario_discoveries — the legacy tables. Since this session's Terminal now writes to investigation_discoveries instead, any ssh_bruteforce session played through the new system will show evidenceFound: 0 / totalEvidence: 0 on the Progress page and never unlock those 4 achievements, even though the player genuinely found evidence.
Depends on: nothing blocking — purely additive query rewrite.
Suggested implementation: Add parallel queries against investigation_discoveries (joined through sessions) alongside the existing legacy ones in getUserProgressionData, and sum both sources, OR fully repoint to the new table (cleaner, but changes historical-data semantics for anyone who played before this migration — needs a decision, not just a code change).

9.4 Autosave / debounce for the Report editor (Low-Medium)
Why needed: Currently the report only saves on explicit button click. A player who writes a long report and closes the window/tab without clicking Save loses their work (their next GET /api/investigation/report returns the last saved state, or the template if never saved).
Depends on: nothing.
Suggested implementation: Debounced auto-save on textarea change (e.g. 3s after last keystroke), reusing the existing saveReport endpoint — no backend change needed.

9.5 Re-implement discovery-based hidden files, if desired for future incidents (Low, incident-driven)
Why needed: The Environment Engine has no gated-evidence mechanic at all now. This is fine for ssh_bruteforce (explicitly not wanted per design.md) but a future harder incident might want it.
Depends on: product decision on whether future incidents need this.
Suggested implementation: Would need a new field on assets/create/* files (or a manifest) plus a revealedFiles per-session table and a re-introduction of a filtering step in terminalController/filesEngine — deliberately not built speculatively this session per the "don't design for hypothetical future requirements" principle.

9.6 alerts.json/aria.txt/alertBuilder.js — decide fate (Low)
Why needed: Dead, empty files. Either flesh out the Alerts app as a real feature (a desktop notification stream driven by events?) or delete them to reduce clutter (rule #25 — "leave the project cleaner than before" — was intentionally not fully applied here to avoid unrequested deletions in a report-and-continue session).
Depends on: product decision.

10. Technical Debt
autoTriggerService.js uses inline require() calls for objectiveEngine/discoveryEngine inside its two exported functions rather than top-level imports (stylistically inconsistent with every other file written this session). This was a deliberate but slightly lazy choice to sidestep reasoning about require-cycle ordering under time pressure; it works correctly (Node caches modules) but should be hoisted to top-level imports for consistency.
MIN_SUBSTANTIVE_GROWTH = 100 chars (in reportEngine.js) and the duplicate MIN_REPORT_LENGTH = 50 chars (in submissionEngine.js, used against the raw content, not growth-over-template) are both untuned heuristics, not validated against real player writing samples. A player could write 100 characters of gibberish and unlock INVESTIGATION_REPORT_COMPLETED; the AI Review would still (correctly) score it low, but the discovery-based "did they attempt a report" signal is gameable. Low risk given the AI Review is the real quality gate, but worth flagging.
sanitizeHint()'s generic path/flag regex (hintService.js) is a blunt instrument: it will redact any /word/word looking token or -flag looking token in ARIA's response, even ones that are legitimate prose (unlikely but possible with certain LLM phrasing). The old system's regex was narrower (targeted one specific known string) but also strictly weaker (no protection against any command/path the model wasn't told to avoid). This trade-off was made deliberately but not load-tested against many hint generations.
No formal migration runner. database/investigation_content_layer.sql and database/hint_system_objective_keys.sql were executed against the local dev DB via ad-hoc node -e scripts during this session. There is no tracking of "which migrations have been applied to which environment" anywhere in the repo (this predates this session — the existing database/*.sql files show the same ad-hoc pattern) — these two new SQL files have NOT been applied to any environment other than the local db_fyp database. Before deploying, someone must run both against staging/production Postgres (and against the Supabase instance referenced in .env, if that's used) manually.
.env has DATABASE_UL instead of DATABASE_URL (pre-existing, not introduced this session, but directly relevant to the point above) — config/db.js checks process.env.DATABASE_URL, which will never match, so the app always falls through to the local-DB branch regardless of environment. This is a latent production-config bug unrelated to this session's work but worth flagging since it affects where the new migrations need to be run.
Cache sharing is global, not per-content-version. hint_cache keys on (scenario_id, objectiveId, hint_level) — if discoveries.json/objectives.json content is edited after players have already generated cached hints, stale hint text tied to the old objective wording will keep being served until manually invalidated (hintCacheModel.invalidateCacheForScenario exists but nothing calls it automatically on content change). This behavior is unchanged from before this session — not a regression, but worth noting since content editing is now much easier (just edit a JSON file) and thus more likely to happen.
No automated test suite exists in this codebase (confirmed — no __tests__, no .test.js files found during exploration) for either the new engines or the legacy ones. All validation this session was manual/ad-hoc scripts written and deleted, not committed regression tests.
evaluationService.js now has two scoring code paths (calculateScore for legacy, calculateContentScore for new) with duplicated arithmetic shape (50/30/20 point split, same hint penalty formula). This was a deliberate reuse-vs-duplication trade-off (see Section 3.7/3.1) — acceptable but should eventually be unified once the legacy path is fully retired.
Report path is per-incident-configurable but only exercised with the default. reportEngine.getReportPath() reads incident.reportPath with a hardcoded fallback — this was written generically but never tested with a non-default value since ssh_bruteforce/incident.json doesn't set one.
11. Validation
11.1 What was actually tested (real infrastructure, no mocks)
Discovery/Objective engine unit-style test — direct node -e script importing discoveryEngine/objectiveEngine and calling them with real discoveries.json/objectives.json content and a sequence of parsed commands. Confirmed: correct discoveries fire on the intended commands, path score computes to 45/50 with 5 of 6 discoveries unlocked, objective completion percentage computed correctly before/after the report discovery.
Full Terminal execution flow — a temporary script (scratch_test_terminal.js, written and deleted this session) called terminalController.executeCommand directly with mock req/res objects (bypassing Express and JWT, exercising all internal logic including real Postgres writes), against a real session on scenario_id=1. Verified: 5 sequential commands correctly unlocked 5 discoveries, investigation_events received 13 rows across COMMAND_EXECUTED/DISCOVERY_UNLOCKED/OBJECTIVE_COMPLETED types, getResumeState correctly rehydrated completed objectives and unlocked discoveries, and a subsequent hint request made a real OpenAI API call and returned a well-formed, correctly-redacted hint.
Full Submission + AI Review flow — a second temporary script (scratch_test_submission.js, written and deleted this session) ran 4 commands, saved a realistic report (triggering the 6th discovery), and called investigationController.submit directly. Verified: session correctly froze (status:'completed', submitted_at set), mechanical evaluation computed {pathScore:50, commandUsageScore:30, conclusionScore:20, totalWeightedScore:100}, XP awarded (700) and applied to the real user row (confirmed level-up to level 8, 7030 total XP via a real UPDATE users write), and the real OpenAI-generated AI Review returned a coherent 87/100 score with 6 correctly-shaped per-criterion entries (matching review.json's ids exactly), non-empty strengths/weaknesses arrays, and readable feedback text — parsed and persisted without hitting the defensive fallback path.
Generic event endpoint — POST /api/investigation/event tested via a direct controller-invocation script; confirmed a row lands in investigation_events with the correct event_type/event_data.
Backend server boot — node server.js started cleanly; GET /api/health returned {server:"online", database:"connected", db_name:"db_fyp"}, confirming no import/require errors across all new and modified backend files.
Frontend compile check — npm run dev (Vite) started with no errors in the console output. Individually forced Vite's dev-transform for every new/modified .jsx/.js file (13 files: ReportApp.jsx, AriaApp.jsx, TerminalApp.jsx, FilesApp.jsx, applicationRegistry.js, appIcons.js, investigationService.js, fileService.js, useFiles.js, EmailApp.jsx, BrowserApp.jsx, Desktop.jsx, plus the two new CSS-adjacent modules) via direct curl requests to Vite's dev server — all returned HTTP 200 with valid transformed JS output, confirming no syntax errors, no unresolved imports, no build-time failures.
11.2 What was explicitly NOT tested
No authenticated browser session was driven. No login flow, no click-through of the actual rendered UI, no screenshots taken. Everything frontend-related was validated at the "does it compile and does the code read correctly" level, not "does it work when a human clicks it."
GamingEnvironment.jsx (the legacy full-page Terminal experience) was not exercised at all — its compatibility with the new terminal response shape is inferred from reading its code, not confirmed by running it.
suspicious_script and ssh_forensics scenario types were not touched, tested, or re-verified — they were already non-functional before this session (empty content folders) and remain so.
Concurrent/multi-user behavior was not tested (e.g., two players triggering hint_cache's ON CONFLICT race path simultaneously).
The /progress page was not loaded or checked against a session played through the new system (see Section 9.3 — expected to show degraded evidence stats).
No load/performance testing of any kind.
12. Risks
Deploying the new backend code to any environment without first running both new SQL migration files will crash every Terminal/Hint/Report/Submit request for ssh_bruteforce (and any future content-driven incident) with a Postgres "relation does not exist" or "column type mismatch" error — the code has hard dependencies on investigation_discoveries, investigation_events, investigation_reports, investigation_reviews, sessions.submitted_at, and the VARCHAR type of the three step_order columns.
Anyone still relying on the legacy POST /api/sessions/:id/complete route for ssh_bruteforce will get a response computed from empty/stale scenario_discoveries/expected_steps data (since nothing seeds those tables for content-driven incidents), producing a nonsensical or zero score. This route was intentionally left alive for other scenario types but is now actively wrong if called for ssh_bruteforce — nothing currently prevents the frontend from calling it (the legacy GamingEnvironment.jsx page still would, if reachable).
If review.json's criteria list is ever edited (ids renamed/added/removed) without also checking reviewEngine.parseReviewResponse's expectations, malformed AI responses become more likely (the prompt tells the model to echo back the exact ids) — not a code bug, but a content/prompt coupling worth knowing about.
The AI Review depends on a live, correctly-configured OPENAI_API_KEY at submission time — if the key is invalid/rate-limited/OpenAI is down, aiAdapter.generate() will throw, and submissionEngine.submitInvestigation has no try/catch around the reviewEngine.reviewSubmission call — meaning a submission could freeze the session, award XP/badges, and then fail with a 500 on the AI Review step, leaving the player with a completed-but-unreviewed session and no investigation_reviews row. getReview would then correctly return 404, but there's currently no retry/resubmit-review path exposed anywhere.
hintCacheModel's shared cache means the first player to reach a given objective+level "writes" the hint text for every future player at that exact key — if that first hint happens to be low-quality or (despite the sanitizer) leaks something, every subsequent player at that key sees the same flawed hint until someone manually calls invalidateCachedHint/invalidateCacheForScenario (no admin UI for this exists).
String discovery_key/objective id typos are a silent-failure class. If objectives.json's requiredDiscoveries references a key that doesn't exist in discoveries.json (typo), that objective simply never completes — no validation step checks cross-references between the two files at load time or at incident-authoring time.
13. Recommendations
If continuing this project tomorrow, in priority order:

Do the authenticated browser walkthrough (9.1) before anything else. Everything built this session is logically sound and validated at the API/DB layer, but zero human has looked at the rendered Report/ARIA windows. This is the highest-value, lowest-effort next step and will surface any React-level issues (prop mismatches, missing loading states, CSS problems) immediately.
Wrap reviewEngine.reviewSubmission in submissionEngine with error handling that still returns a usable response if the AI call fails (Section 12's second-to-last risk) — either retry logic, or a "review pending" state with a separate POST /api/investigation/review/:sessionId/retry endpoint, so a flaky OpenAI call doesn't strand a graded-but-unreviewed session.
Re-point (or dual-write for) the Progress page's evidence metrics (9.3) — this is a visible, player-facing regression for anyone who plays ssh_bruteforce after this session and then checks their Progress page.
Decide the fate of GamingEnvironment.jsx (9.2) — either formally deprecate the route or fix its compatibility. Leaving an ambiguous half-working legacy page reachable is worse than either committing to it or removing it.
Only after the above: consider a second incident (reusing the exact same engines with zero code changes) as the real proof that the "no engine modifications for new incidents" goal (dev rule #26) actually holds — this session validated it by reasoning and by the engines' design, but a second real incident is the only test that actually proves it.
I would not prioritize the hidden-evidence mechanic (9.5) or the Alerts app (9.6) unless a specific future incident's design calls for them — building either speculatively now would be exactly the kind of premature abstraction the project's own development rules warn against.

14. Final State
What works (validated against real backend/DB/AI, not just read): Starting a session on the SSH Brute Force scenario, running investigative Terminal commands that unlock discoveries through any of several valid techniques (not one fixed command sequence), completing objectives derived purely from those discoveries, requesting contextual ARIA hints that never leak a hardcoded answer, saving an Investigation Report that's visible identically through both Terminal and File Manager, and submitting that report to freeze the session, award XP/level/badges, and receive a real, criterion-by-criterion AI-graded review — this entire chain executes correctly end-to-end against the live database and a live LLM.

What is playable: The backend supports the full Phase-12 validation flow described in execution_plan.md (Mission Dashboard → Desktop → Emails → Browser → Files → Terminal → Report → Submission → AI Review) for the ssh_bruteforce incident specifically. The frontend has all the necessary windows built and wired to the correct endpoints. Whether it is smoothly playable by a human clicking through a browser is unconfirmed (Section 11.2) — the code is believed correct but has not been visually verified.

What is still missing: A confirmed browser walkthrough; Progress-page parity for the new discovery-tracking table; a decision on the legacy full-page Terminal experience; error handling around a failed AI Review call after a session has already been frozen; and, outside this session's scope entirely, any content at all for the suspicious_script and ssh_forensics incidents (their folders are empty — they were non-functional before this session and remain so, untouched).