# SSH Brute Force — Internal Testing Guide

**Audience:** Developers and QA only. This document is never served to players — it is not read by any backend engine, it exists purely as a reference for verifying the scenario end-to-end and for diagnosing regressions after future changes.

**Scope:** This guide describes the *current, actual* implementation of `discoveries.json`, `objectives.json`, and `review.json` for this incident, cross-checked against the real trigger-matching logic in `backend/services/investigation/discoveryEngine.js`. Where the simulated Terminal's capabilities are more limited than a real Linux shell, that is called out explicitly rather than glossed over — this guide should never lead a tester to try a command that doesn't actually work here.

---

# 1. Scenario Summary

**Attack type:** SSH password brute force (MITRE ATT&CK T1110.001 — Password Guessing) against a Linux production server (`server01`).

**Attacker objective:** Gain interactive shell access to the server by guessing valid account credentials over SSH, without any prior knowledge of a working password.

**Compromised account:** `admin` (uid 1001). The attacker also unsuccessfully probed two non-existent usernames (`test`, `guest`) and the real `root` account before succeeding against `admin`.

**Attack source:** `203.0.113.25` — an external IP, distinct from the legitimate internal traffic visible elsewhere in the log (`192.168.1.10`, `192.168.1.15` — the real `developer` account's normal SSH/publickey sessions).

**Evidence available:**
- `/var/log/auth.log` — the primary evidence file. Contains the full authentication timeline: legitimate noise (cron, sudo, a real developer SSH session), then the attack sequence (invalid-user probes, repeated failed passwords, one accepted password), then the attacker's session open/close.
- `/etc/passwd` — confirms which usernames on the system are real accounts (`developer`, `admin`, `ubuntu`) versus the probed-but-nonexistent ones (`test`, `guest`) seen in `auth.log`.
- `/home/admin/.bash_history` — post-authentication evidence. Shows the attacker ran only reconnaissance commands (`whoami`, `pwd`, `hostname`, `ls`, `ls /home`, `cat /etc/os-release`) before exiting — no persistence, no malware, no data staging. This is a deliberate design choice (see `design.md`) to keep the scenario beginner-appropriate.
- `/etc/hostname`, `/etc/os-release` — flavor/context evidence, optional, not tied to any discovery.
- `/home/investigator/investigation_report.txt` — not evidence of the attack; it's the player's own deliverable.

**Ground truth the player must reconstruct:** a brute-force attempt from `203.0.113.25` succeeded against the `admin` account at `02:12:02`, after which the attacker ran two minutes of harmless reconnaissance and disconnected. There is no persistence and no ongoing compromise — the correct conclusion is "confirmed but contained," not "system still compromised."

---

# 2. Expected Investigation Flow

```
Mission Dashboard → select "SSH Brute Force Investigation"
        ↓
Desktop loads (GET /api/desktop?incidentId=ssh_bruteforce)
        ↓
Open Email — read "incident_brief" (Sarah Mitchell)
        ↓
Open Email — read "submission_requirements" (David Carter)
        ↓
(Optional) Open Browser — skim SSH/auth.log/MITRE articles
        ↓
Open Files or Terminal — locate /var/log/auth.log
        ↓
Read auth.log in full → notice the failed-attempt burst
        ↓
Search auth.log for the attacker IP → isolate every line from 203.0.113.25
        ↓
Search auth.log for "accepted" → confirm the one successful login
        ↓
Cross-reference /etc/passwd → confirm "admin" is a real account
        ↓
Read /home/admin/.bash_history → confirm post-login activity, no persistence
        ↓
Open Report → write findings
        ↓
Save Report (must be substantive — see Section 4, INVESTIGATION_REPORT_COMPLETED)
        ↓
Submit Investigation
        ↓
AI Review generated, XP/badge awarded, session frozen
```

**Why each step exists:**

- **Email first** — `emails.json` is the only place the player is told the report must be saved at `/home/investigator/investigation_report.txt` and that submission requires both the report and terminal history. Skipping the emails doesn't block progress (nothing technical enforces reading them), but a player who skips them may not know what's expected of the final deliverable.
- **Browser is explicitly optional** — `browser.json` is pure background knowledge (how SSH auth works, how to read `auth.log`, what MITRE T1110.001 is, general investigative methodology). No discovery or objective requires opening it. It exists to help a genuinely beginner player who doesn't already know what "Accepted password" vs "Failed password" means.
- **Files/Terminal before Report** — the report can technically be opened and typed into at any time (there's no gate preventing an empty-session report save attempt), but it can't be *completed* meaningfully without evidence, and `INVESTIGATION_REPORT_COMPLETED` only unlocks once the report is substantive (see Section 4) — so in practice this always comes after evidence-gathering.
- **auth.log before passwd/.bash_history** — `auth.log` is what triggers `FAILED_LOGIN_PATTERN_FOUND`, `ATTACK_SOURCE_IDENTIFIED`, and `SUCCESSFUL_AUTHENTICATION_CONFIRMED` (3 of the 4 required discoveries), so it is the natural entry point. `passwd`/`.bash_history` support `COMPROMISED_ACCOUNT_IDENTIFIED`.
- **Report save before Submit** — `submissionEngine.submitInvestigation()` hard-validates `review.json`'s `submission.requiresReport`/`requiresTerminalHistory` before allowing submission; an empty or missing report will be rejected with a 400 (`SUBMISSION_INCOMPLETE`), not silently accepted.

---

# 3. Expected Evidence

### `/var/log/auth.log`
**Why it exists:** The primary and only evidence source needed to answer all four core investigation questions in `design.md` ("what IP performed the attack", "was authentication successful", "which account was compromised", "what evidence supports this").
**What the investigator should notice:**
- A block of legitimate noise first (cron sessions, a `sudo` command from `developer`, a real SSH session from `developer` at `192.168.1.10` via publickey — this is deliberate decoy/normal-traffic noise, not part of the attack).
- Starting at `02:10:48`, a distinct burst from `203.0.113.25`: two `Invalid user` probes (`test`, `guest`), then `Failed password` for `root` ×2, then `Failed password` for `admin` ×8 in rapid succession (≈5-7 second intervals — machine-speed, not human typing).
- At `02:12:02`: `Accepted password for admin from 203.0.113.25` immediately followed by `session opened for user admin`.
- At `02:14:11`: session closed, attacker disconnects. Total attacker dwell time: ~2 minutes.
**Conclusion it supports:** A brute-force password-guessing attack from `203.0.113.25` succeeded against the `admin` account. This is the load-bearing file for the entire investigation.

### `/etc/passwd`
**Why it exists:** Lets the investigator confirm which usernames are *real, valid accounts* on this system, as opposed to usernames the attacker merely guessed.
**What the investigator should notice:** Only `developer`, `admin`, and `ubuntu` are real interactive-shell accounts (uid 1000-1002, `/bin/bash`). `test` and `guest` — seen in the `Invalid user` lines in `auth.log` — do **not** appear here at all, confirming those were failed guesses against nonexistent accounts, not a second compromise.
**Conclusion it supports:** Corroborates that `admin` (not `test`/`guest`/`root`) is the only account both (a) real and (b) successfully authenticated against — this is the cross-reference that turns "a password was accepted for admin" into a confident, evidence-backed conclusion rather than a coincidence.

### `/home/admin/.bash_history`
**Why it exists:** Direct evidence of what the attacker did *after* gaining access — this is what separates "credentials were guessed" from "the system is compromised in an ongoing way."
**What the investigator should notice:** Only six harmless commands (`whoami`, `pwd`, `hostname`, `ls`, `ls /home`, `cat /etc/os-release`) followed by `exit`. No file downloads, no new user creation, no cron/persistence changes, no lateral movement attempts.
**Conclusion it supports:** The attacker performed only basic situational-awareness reconnaissance and left without establishing persistence. This directly supports a "contained, not ongoing" severity assessment in the final report — a good report should explicitly say this, not just note that a login occurred.

### `/home/investigator/investigation_report.txt`
**Why it exists:** This is **not attack evidence** — it's the player's own deliverable, seeded with a minimal starter template (a title block, no content). It is the one "discovery" not triggered by reading evidence: `INVESTIGATION_REPORT_COMPLETED` unlocks automatically when the player *saves* content here that is substantially longer than the starter template (see `reportEngine.js`'s `MIN_SUBSTANTIVE_GROWTH = 100` — the saved content must be at least 100 characters longer, trimmed, than the template).
**What the investigator should notice:** N/A — this is where they write, not where they read.
**Conclusion it supports:** N/A.

---

# 4. Discovery Walkthrough

**Important environment note before reading this section:** the simulated Terminal (`terminalParser.js`) only recognizes a fixed command set: `ls, cat, grep, cd, pwd, find, whoami, ps, locate, strings, history, clear, help`. There is **no `less`, `tail`, `awk`, `sed`, `head`, or pipes (`|`)** in this environment — those are real-Linux commands this simulator does not implement, and typing them returns `bash: <command>: command not found`. All "alternative commands" below are limited to combinations of the commands that actually exist here, using different flags, paths, or search targets — that is the real extent of player freedom this scenario supports.

---

### `FAILED_LOGIN_PATTERN_FOUND`
- **Weight:** 15 (required)
- **Why it should unlock:** The player has seen the raw evidence of repeated failed logins, either by reading the whole log or by specifically searching for the failure pattern.
- **How a player would normally discover it:** Reading `/var/log/auth.log` in full is the most natural first move once they've found it via `ls`/Files.
- **Example command:** `cat /var/log/auth.log`
- **Alternative commands (any one fires it):**
  - `grep failed /var/log/auth.log` (case-insensitive — `Failed` / `FAILED` / `failed` all match)
  - `grep "invalid user" /var/log/auth.log`
- **Implementation detail for testers:** matched via `discoveryEngine.matchesTrigger` — the `cat` trigger requires an exact resolved-path match to `/var/log/auth.log`; the two `grep` triggers require the command's **search pattern** (first positional argument, not the target file) to contain `"failed"` or `"invalid user"` respectively, AND the target file to resolve to `/var/log/auth.log`. `grep failed /etc/passwd` will **not** fire this — the target file matters here.

### `ATTACK_SOURCE_IDENTIFIED`
- **Weight:** 25 (required)
- **Why it should unlock:** The player has specifically searched for/isolated the attacker's IP address, rather than just having read it in passing.
- **How a player would normally discover it:** After noticing the IP while reading `auth.log`, searching specifically for it to see every line it appears in.
- **Example command:** `grep 203.0.113.25 /var/log/auth.log`
- **Alternative commands:**
  - `grep 203.0.113.25 /var/log/` or any other target — **this trigger has no target-file constraint**, so a `grep` for that IP against *any* file or directory fires it (e.g. `grep -r 203.0.113.25 /`).
  - `locate 203.0.113.25` — technically fires this discovery per its trigger definition, even though `locate` searches filenames, not file contents, and no filename in this incident actually contains the IP (it would return "no results found"). This is a **known quirk**: the discovery still unlocks on attempting the search, regardless of whether the command found anything. See Section 9 if this needs tightening later.
- **Implementation detail for testers:** this is the one discovery whose grep trigger has no `targetPath`/`targetContains` — only `patternContains: "203.0.113.25"`. Confirm this stays intentional if the trigger set is ever edited; adding a target constraint would make it stricter (a design decision, not a bug either way).

### `SUCCESSFUL_AUTHENTICATION_CONFIRMED`
- **Weight:** 25 (required)
- **Why it should unlock:** The player has confirmed that (at least) one login attempt actually succeeded, not just that many failed.
- **How a player would normally discover it:** Searching for the word that distinguishes a successful line from a failed one.
- **Example command:** `grep accepted /var/log/auth.log`
- **Alternative commands:** `grep Accepted /var/log/auth.log` (case-insensitive, same result).
- **Implementation detail for testers:** requires both `patternContains: "accepted"` AND `targetPath: /var/log/auth.log`. `grep accepted /etc/passwd` will not fire it (no such line exists there anyway, but the target constraint means it wouldn't fire even coincidentally).

### `COMPROMISED_ACCOUNT_IDENTIFIED`
- **Weight:** 25 (required)
- **Why it should unlock:** The player has identified *which specific account* was breached, not just that authentication succeeded.
- **How a player would normally discover it:** Either searching `auth.log` for the account name, or directly inspecting that account's home directory once suspected.
- **Example command:** `grep admin /var/log/auth.log`
- **Alternative commands:** `cat /home/admin/.bash_history` — also independently fires this discovery (finding the attacker's own command history is itself strong confirmation of which account was used).
- **Implementation detail for testers:** two structurally different triggers on this one — a `grep` (pattern+target combo) and a `cat` (target-only). Both are real, independent paths; a player who never greps for "admin" but does read the bash history still gets credit.

### `POST_LOGIN_ACTIVITY_CONFIRMED` (bonus — not required)
- **Weight:** 10, **`required: false`**
- **Why it should unlock:** The player has looked at what the attacker actually did after logging in — this is optional supporting depth, not needed to complete the mission or hit 100% path score.
- **How a player would normally discover it:** Reading the compromised account's shell history.
- **Example command:** `cat /home/admin/.bash_history`
- **Alternative commands:** none currently defined — this discovery shares its only trigger with `COMPROMISED_ACCOUNT_IDENTIFIED`, so the same single command unlocks both simultaneously.
- **Note for testers:** because `required: false`, this discovery's weight is **excluded** from `discoveryEngine.calculatePathScore`'s denominator — a player can score a perfect 50/50 path score without ever triggering this one. Don't mistake "player never saw this unlock" for a bug; it's expected for players who don't read `.bash_history` at all (though in practice `COMPROMISED_ACCOUNT_IDENTIFIED`'s `cat` trigger is identical, so most players who complete the mission will get both together).

### `INVESTIGATION_REPORT_COMPLETED`
- **Weight:** 10 (required)
- **Why it should unlock:** Not a command-based discovery at all — `triggers: []`. It represents "the player authored a real report," which is an authoring action, not an investigative one.
- **How a player would normally discover it:** Writing and saving a report in the Report app that is substantially longer than the empty starter template.
- **Example command:** N/A — triggered by `PUT /api/investigation/report` via the Report app's Save button, not by anything typed in the Terminal.
- **Alternative commands:** N/A.
- **Implementation detail for testers:** handled entirely in `reportEngine.saveReport()`, separately from `discoveryEngine`. The threshold is `trimmed(content).length >= trimmed(template).length + 100`. The starter template is ~50 characters trimmed, so in practice a report needs to be roughly 150+ trimmed characters to unlock this. A one-line report ("admin got hacked from 203.0.113.25") will likely **not** clear the threshold — this is by design, to require an actual attempt at a report rather than a one-liner, though it is a blunt heuristic (see the project handover's Technical Debt notes).

---

# 5. Objective Completion

Objectives are a pure function of `requiredDiscoveries ⊆ unlockedKeys` — no command or filename dependency (`objectiveEngine.resolveCompletedObjectives`).

| Objective id | Title | Completes when these discoveries are ALL unlocked |
|---|---|---|
| `investigation_summary` | "Determine what happened." | `FAILED_LOGIN_PATTERN_FOUND` **and** `SUCCESSFUL_AUTHENTICATION_CONFIRMED` |
| `identify_source` | "Identify the source of the suspicious activity." | `ATTACK_SOURCE_IDENTIFIED` |
| `identify_account` | "Determine which account was affected." | `COMPROMISED_ACCOUNT_IDENTIFIED` |
| `prepare_report` | "Prepare an investigation report." | `INVESTIGATION_REPORT_COMPLETED` |

All 4 objectives require only the 4 `required: true` command-triggered/report-triggered discoveries — none of them depend on the optional `POST_LOGIN_ACTIVITY_CONFIRMED` discovery. A player can complete every objective (100% objective completion, 20/20 conclusion score) without ever reading `.bash_history` for its own sake, **as long as** they've already read it via the `COMPROMISED_ACCOUNT_IDENTIFIED` trigger path, or found that discovery via `grep admin` instead.

---

# 6. Expected Investigation Report

The following is written as a **realistic student submission** — competent, evidence-based, but with the rough edges a real beginner learner would produce (slightly informal tone in places, doesn't over-explain, doesn't hedge every claim with a citation). This is what a "good, not perfect" report looks like for testing purposes.

```
================================================

Investigation Report

================================================

INCIDENT SUMMARY

On July 17th, our production server (server01) was hit by an SSH brute
force attack. The attacker tried a bunch of usernames and passwords
against the SSH service and eventually got in using the admin account.
They looked around for about 2 minutes and then disconnected.

SOURCE IP

203.0.113.25 - this IP shows up in auth.log starting at 02:10:48, first
trying invalid usernames (test, guest) and then trying real accounts
(root, admin) with wrong passwords before finally getting the admin
password right.

AUTHENTICATION RESULT

Authentication was successful. After 10 failed attempts (2 invalid
users + 2 failed root attempts + 8 failed admin attempts), the log
shows "Accepted password for admin from 203.0.113.25" at 02:12:02,
immediately followed by a session being opened for the admin user.

COMPROMISED ACCOUNT

admin. I confirmed this is a real account by checking /etc/passwd,
which lists admin as uid 1001 with a real shell (/bin/bash) - unlike
test and guest which don't exist in passwd at all, so those were just
guesses that never had a chance.

SUPPORTING EVIDENCE

- /var/log/auth.log: full timeline of the failed attempts and the
  successful login/logout.
- /etc/passwd: confirms admin is a real account, test/guest are not.
- /home/admin/.bash_history: shows the attacker ran whoami, pwd,
  hostname, ls, ls /home, and cat /etc/os-release after logging in,
  then exited. No new files created, no persistence added as far as
  I could find.

ADDITIONAL NOTES

The attack looks automated (attempts were seconds apart, not typed by
a human) and pretty basic - once inside, they just looked around and
left. I didn't find any evidence of malware, backdoors, or new users
being created. I'd recommend resetting the admin password and maybe
looking into rate-limiting SSH login attempts since this got through
on volume.
```

**Why this counts as "good, not perfect":** it hits all four required conclusions (source, result, account, evidence) with specific supporting citations, but it doesn't quote exact timestamps for every sub-claim, doesn't explicitly discuss investigative methodology as its own topic, and has a casual tone ("a bunch of usernames", "pretty basic") rather than a formal incident-response register.

---

# 7. Expected AI Review

Based on this report against `review.json`'s six criteria (weights: `incident_summary` 15, `attack_source` 20, `authentication_result` 20, `compromised_account` 20, `supporting_evidence` 15, `investigation_methodology` 10 — sums to 100):

**Approximate expected score: 78–90 / 100.**

This range was empirically observed during backend integration testing this project (a comparably-detailed report scored **87/100** against a live OpenAI grading call). Exact scores will vary run-to-run since this is a live LLM call, not a deterministic rubric — a tester should expect a range, not an exact number, and should treat a wildly different result (e.g. below 60 or a 500 error) as worth investigating rather than a report-writing problem.

**Expected strengths (per-criterion reasoning):**
- `attack_source` (20 pts) — should score high (~85-95): the IP is named, with a timestamp and a description of the attempt pattern.
- `compromised_account` (20 pts) — should score high (~85-95): names the account, and — notably — cross-references `/etc/passwd` to justify why `admin` and not `test`/`guest`, which is exactly the kind of evidence-linking the AI reviewer is instructed to reward.
- `authentication_result` (20 pts) — should score high (~80-90): states success clearly, cites the exact log line and the failed-attempt count leading up to it.
- `supporting_evidence` (15 pts) — should score high (~85-95): explicitly lists all three evidence files and what each one shows, rather than asserting conclusions with no citation.

**Expected weaknesses:**
- `incident_summary` (15 pts) — likely mid-range (~70-80): the summary is accurate but brief; it doesn't discuss severity/impact assessment as its own idea (e.g. doesn't explicitly say "this is contained, not ongoing, because no persistence was found" — that fact is present in Additional Notes but not tied back into the summary).
- `investigation_methodology` (10 pts) — likely the lowest-scoring criterion (~60-75): the report describes *findings* thoroughly but never describes the *process* (what was checked first, why, how conclusions were cross-verified) — `review.json`'s methodology criterion is specifically about demonstrating investigative reasoning, not just reporting conclusions.

**Reasoning a tester should apply when spot-checking a real AI Review result:** the review prompt (`promptConstants.buildReviewPrompt`) explicitly instructs the model to reward evidence-backed claims and penalize unsupported speculation — a report that says "admin was compromised" with no evidence citation should score conspicuously lower on `compromised_account` than one that also references `/etc/passwd`. If a test report with strong evidence citations still scores poorly across the board, that's a sign to check the AI Review pipeline itself (Section 9), not the report.

---

# 8. Testing Checklist

☐ Mission launches from Mission Dashboard (`POST /api/sessions/start`)
☐ Desktop loads with wallpaper + icons (`GET /api/desktop?incidentId=ssh_bruteforce`)
☐ Enabled apps match `desktop.json`: Terminal, Email, Browser, Files, ARIA, Report
☐ Emails load and both are readable (`GET /api/email?incidentId=ssh_bruteforce`)
☐ Browser loads with all 4 articles + menu (`GET /api/browser?incidentId=ssh_bruteforce`)
☐ Files loads the full virtual filesystem, no duplicate paths (`GET /api/files?incidentId=ssh_bruteforce`)
☐ Terminal boots, accepts commands, `ls`/`cat`/`grep`/`find`/`locate`/`ps`/`strings`/`history` all work
☐ Terminal and Files show identical file content for the same path
☐ Each of the 4 required discoveries unlocks via at least one of its documented trigger commands (Section 4)
☐ The optional discovery (`POST_LOGIN_ACTIVITY_CONFIRMED`) unlocks without blocking mission completion if skipped
☐ Each of the 4 objectives completes when its required discoveries are unlocked (Section 5)
☐ Report opens, shows the starter template on a fresh session
☐ Report is editable and Save persists content (confirm via a second `GET /api/investigation/report` returning the saved content, not the template)
☐ Saving a substantive report (≥100 chars beyond template) unlocks `INVESTIGATION_REPORT_COMPLETED` and completes `prepare_report`
☐ ARIA hint request returns a hint that never contains an exact command or absolute path
☐ ARIA hint count decrements correctly and caps at the session limit (5)
☐ Submission is rejected (400) if report is empty/too short or terminal history is empty
☐ Submission succeeds when both requirements are met
☐ Session status becomes `completed` and `submitted_at` is set after submission
☐ Mechanical evaluation score is computed and returned (`pathScore` + `commandUsageScore` + `conclusionScore` − hint penalty)
☐ XP is awarded and reflected in the updated user object
☐ Badge is awarded if score ≥ 60
☐ AI Review is generated and returned in the same submission response, with 6 criteria entries matching `review.json`'s ids
☐ AI Review score is persisted and retrievable afterward (`GET /api/investigation/review/:sessionId`)
☐ `nextScenario` is returned and points to the correct next mission

---

# 9. Regression Checklist

Things most likely to break after future refactors, and where to look first:

- **Discoveries no longer unlock** — check `discoveryEngine.matchesTrigger()` against the current `discoveries.json` trigger shapes first; a common cause is a trigger referencing a `targetPath` that no longer matches the actual evidence file path (e.g. if `assets/replace/var/log/auth.log` is ever moved). Also check that `terminalController.executeCommand` is still calling `investigationDiscoveryModel.getUnlockedKeys` *before* matching (a stale/empty `unlockedKeysBefore` would make previously-unlocked discoveries re-fire or never register as "new").
- **Report not saved / not visible in Terminal or Files** — check `reportEngine.applyReportOverlay()` is still being called by both `terminalController.executeCommand` and `filesEngine.getFiles` after `buildEnvironment()`. If Files shows the template but Terminal shows saved content (or vice versa), the overlay call was likely removed from one of the two call sites — this is the exact bug the single-source-of-truth design in `reportEngine.js` exists to prevent.
- **Duplicate virtual files (e.g. two `/etc` or `/home` entries, React "duplicate key" warnings in FileTree)** — check `evidenceInjector.js`'s `applyCreate()` still has its existence check before pushing a new directory entry. This exact bug occurred once already (any incident whose `assets/create/` folder has a subdirectory that also exists in the base template, e.g. `etc/`, `home/`, will duplicate that directory entry if the check is removed).
- **Browser or Email content missing / 500 error** — check the content file's top-level JSON shape matches what its builder expects. `emailBuilder.js` expects `{ "emails": [...] }` (an object wrapper), not a bare array — this exact mismatch caused a 500 once already. `browserEngine`/`browserBuilder` expects `{ "homePage": ..., "pages": [...] }`.
- **Wrong incident loaded / 404 "Failed to load incident"** — check `incidentResolver.js`'s `SCENARIO_TYPE_TO_INCIDENT` map still has an entry for `'bruteforce' → 'ssh_bruteforce'`, and that the `scenarios` DB row for this mission still has `type = 'bruteforce'`.
- **AI Review fails or returns a suspiciously flat/zero score** — check `reviewEngine.parseReviewResponse()`'s fallback path isn't silently firing (it logs `[reviewEngine] Failed to parse AI review response` to the server console on JSON parse failure and returns an all-zero review). If it is, the model's raw response format has likely drifted from what `buildReviewPrompt` asks for — inspect the raw response in the log before assuming the scenario content is wrong.
- **Submission never completes / hangs** — check `submissionEngine.submitInvestigation()`'s validation step against `review.json`'s `submission.requiresReport`/`requiresTerminalHistory` — a report just under the length threshold, or a session with zero terminal commands, will correctly reject with `SUBMISSION_INCOMPLETE` rather than hang; if it's genuinely hanging (no response at all), suspect the live OpenAI call in `reviewEngine.reviewSubmission()` (no timeout is currently configured on that call).
- **Objectives never complete despite discoveries unlocking** — check `objectives.json`'s `requiredDiscoveries` keys are spelled identically to `discoveries.json`'s `key` fields. There is no cross-file validation between the two — a typo in either file fails silently (the objective simply never completes, with no error anywhere).
- **XP/badge not awarded after submission** — check `progressionModel.upsertUserProgress`/`addXpToUser`/`awardBadge` are still being called from `submissionEngine.js` (not the legacy `sessionController.completeSession`, which is a separate, no-longer-used-for-this-incident code path that reads different, unrelated DB tables).
- **Path score seems wrong (not 0-50 as expected)** — check that `discoveries.json`'s `required: true` entries still sum their `weight` values to something sensible (they don't strictly have to sum to 100 — `calculatePathScore` self-normalizes — but if they drift far from 100 without intent, it usually means a discovery was added/removed without rebalancing the others).
