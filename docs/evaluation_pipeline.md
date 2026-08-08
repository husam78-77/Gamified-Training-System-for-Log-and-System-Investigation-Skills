# Evaluation Pipeline

Written for PHASE 0 (`execution_plan.md`). Describes the actual, current
implementation of the submission → score → AI review flow, after the
Phase 0 refactor. This is documentation, not source of truth — if this
drifts from the code, trust the code and fix this file.

------------------------------------------------------------

## 1. Flow

```
POST /api/investigation/submit
        │
        ▼
submissionEngine.submitInvestigation(sessionId, userId)
        │
        ├─ 1. Load session, scenario, review.json, report,
        │      command_history, discoveries, objectives
        ├─ 2. Validate submission requirements (review.json.submission)
        ├─ 3. MECHANICAL SCORE — evaluationService.calculateContentScore()
        │      (pathScore + commandUsageScore + conclusionScore − hintPenalty)
        ├─ 4. Freeze session (sessions.status = 'completed', submitted_at set)
        ├─ 5. XP / BADGES — progressionModel, driven only by the mechanical
        │      score above. The AI Review score never affects XP (dev rule
        │      #17 — AI never controls gameplay).
        ├─ 6. ANALYTICS — analyticsEngine.buildAnalytics()
        │      (compact behavioural summary, built from investigation_events
        │      + command_history + discoveries + objectives — never sent
        │      to the AI as raw event rows)
        └─ 7. AI REVIEW — reviewEngine.reviewSubmission()
               (report + command_history + analytics → LLM → parsed,
               server-recomputed weighted score → investigation_reviews)
```

Note: this differs slightly from the box diagram in `execution_plan.md`
("Submission → Mechanical Score → AI Review → XP") — XP is actually
awarded *before* the AI Review call, not after. This ordering doesn't
change what data reaches the AI (XP computation never reads the review),
so it was left as-is rather than reordered for its own sake; call this out
if a future change makes the order load-bearing.

------------------------------------------------------------

## 2. Inputs, by stage

### Mechanical Score (`evaluationService.calculateContentScore`)
Data-driven, no AI involved (dev rules #16, #17).

| Input | Source |
|---|---|
| `discoveries` | `discoveries.json` (per incident) |
| `unlockedKeys` | `investigation_discoveries` table |
| `objectives` | `objectives.json` (per incident) |
| `completedObjectiveIds` | derived: `objectiveEngine.resolveCompletedObjectives` |
| `totalCommandsCount` | `command_history` row count |
| `hintsUsed` | `ai_hint_log` count via `hintModel.countHintsUsed` |

### Investigation Analytics (`analyticsEngine.buildAnalytics`)
Derived summary only — no AI logic (dev rule #16). Built from three
sources, never handed to the AI as raw rows:

| Source | Used for |
|---|---|
| `investigation_events` | applications opened, files/articles/emails opened, most-investigated files, report edit/save/submit counts |
| `command_history` | total/matched/unmatched command counts, distinct commands used, most-used commands |
| `investigation_discoveries` / objectives / hints | discovery + objective completion counts, hints used |
| `sessions.start_time` / `end_time` | session duration |

Output shape (all fields the AI Review prompt and any future consumer can
rely on):

```
applicationsUsed, evidenceViewed, articlesRead, emailsOpened, commandsUsed,
totalCommands, matchedCommandCount, unmatchedCommandCount,
mostUsedCommands: [{ command, count }],
mostInvestigatedFiles: [{ path, count }],
discoveriesFound, discoveriesFoundCount, totalDiscoveries,
objectivesCompleted, objectivesCompletedCount, totalObjectives,
reportActivity: { edits, saves, submitted },
hintsUsed, sessionDurationMs, sessionDurationMinutes
```

### AI Review (`reviewEngine.reviewSubmission` → `promptConstants.buildReviewPrompt`)
Per dev rule #30, the AI never grades the report alone. Exactly three
inputs reach the prompt:

| Input | What it lets the AI judge |
|---|---|
| **Investigation Report** (`investigation_reports.content`) | Report Quality — accuracy, completeness, evidence citation |
| **Command History** (`command_history`, full ordered command text) | Investigation Methodology — was the process logical and evidence-driven? |
| **Investigation Analytics** (compact summary above) | Investigation Efficiency — was the process focused or scattershot? Cross-app usage the raw command list can't show (Files/Browser/Email) |

Grading **criteria, weights, and required flags** come entirely from the
incident's `review.json` (dev rule #18) — the prompt template above is
generic across every incident. `investigation_events` rows are never sent
to the AI directly; only their `analyticsEngine` summary is.

------------------------------------------------------------

## 3. `command_history` vs `investigation_events`

Per dev rules #28/#29, these are two disjoint tables with one writer each:

- **`command_history`** — the only store of terminal command text. Written
  once per command by `terminalModel.saveCommand` inside
  `terminalController.executeCommand`.
- **`investigation_events`** — behavioural telemetry for everything that
  is *not* a terminal command (app open/close, file/email/article opens,
  discovery unlocks, objective completions, report edits/saves/submits,
  hint requests, session start/finish).

Before this refactor, `terminalController.executeCommand` also logged a
`COMMAND_EXECUTED` investigation event on every command — a second,
unused copy of data `command_history` already owned. That call (and the
`COMMAND_EXECUTED` event type itself) has been removed; nothing consumed
it, and its presence violated dev rule #29 directly. Both tables are
still analyzed together at submission time (`submissionEngine` loads both,
`analyticsEngine` reads both) — "reuse `command_history`, don't duplicate
it" means one store per fact, not one store total.

------------------------------------------------------------

## 4. Validation (Task 6)

Verified against the real backend (local Postgres, real Express routes,
live `gpt-4o-mini` calls via `AI_PROVIDER=openai`) under a disposable QA
user (`phase0_qa@test.local`, deleted after the run — cascades cleaned up
every session/report/review/event/command row it created), driving the
`ssh_bruteforce` incident through four real submissions:

| Run | Investigation | Report | Mech. score | AI score | Commands (matched/unmatched) |
|---|---|---|---|---|---|
| A | Focused (7 targeted commands) | Good (testing_guide.md sample) | 100 | 89 | 5/2 |
| B | Thrashing (20 commands, same evidence eventually found) | **Same text as A, byte-for-byte** | 70 | 85 | 5/15 |
| C | Focused (same commands as A) | Weak/vague, no citations | 100 | 48 | 5/2 |
| D | Minimal (1 command) | Overclaiming (confident, unsupported) | 48 | 57 | 1/0 |

What this confirms:

- **A vs B — same report, different process → different AI score/feedback.**
  Report text was identical; only the command history differed. The AI's
  `investigation_methodology` criterion dropped 80→70 and weaknesses
  explicitly named "inefficient command usage with many irrelevant
  commands" — the AI is reading the process data, not just re-grading the
  same prose twice.
- **A vs C — same process, different report → very different AI score**
  (89 vs 48), confirming report content still drives the bulk of the
  score, as it should — process alone can't inflate a weak report.
- **D — confidence outrunning process.** A report that confidently states
  specific conclusions backed by only one command scored 30/100 on
  `investigation_methodology` specifically, with the comment calling out
  reliance on "a single command without exploring other log files" — the
  exact failure mode dimension 2 of the prompt directive targets.
- Cross-app analytics (`FILE_OPENED`/`EMAIL_OPENED`/`ARTICLE_OPENED`/
  `APPLICATION_OPENED`, simulated for run A via the generic event
  endpoint) flowed through to the AI prompt correctly alongside command
  history — the Files-app wiring fix in §4 below is confirmed reachable
  end-to-end, not just theoretically wired.

This satisfies the PHASE 0 Definition of Done: the AI distinguishes
investigation styles, not only report text.

------------------------------------------------------------

## 5. Known instrumentation gap closed in this pass

`FILE_OPENED` was defined in `eventEngine.EVENT_TYPES` and already
consumed by `analyticsEngine` (`evidenceViewed`, `mostInvestigatedFiles`),
but nothing in the Files app ever fired it — File Manager usage was
invisible to the AI Review despite being explicitly listed as an
Investigation Process signal (dev rule #27). `FilesApp.jsx` now logs
`FILE_OPENED` when the player opens a file node (not on directory
navigation), matching the existing `EMAIL_OPENED`/`ARTICLE_OPENED` pattern
in `EmailApp.jsx`/`BrowserApp.jsx`.
