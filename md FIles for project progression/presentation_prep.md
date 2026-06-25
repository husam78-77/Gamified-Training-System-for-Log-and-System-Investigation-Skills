# FYP Presentation & Viva Preparation Guide: KINETIC BREACH
**Gamified Training System for Log and System Investigation Skills**

This document provides a comprehensive, highly technical breakdown of every major module, architecture decision, and algorithmic flow in the project. It is designed to be your master reference for your Final Year Project (FYP) presentation, viva defense, and software demonstration.

---

## Table of Contents
1. [Authentication System](#authentication-system)
2. [Investigation Management System (Terminal Engine)](#investigation-management-system)
3. [Evidence System (Virtual Filesystem)](#evidence-system)
4. [Discovery System & Matching Logic](#discovery-system)
5. [Assessment System (Scoring Algorithm)](#assessment-system)
6. [Player Analysis Service (Learning Analytics)](#player-analysis-service)
7. [Auto-Trigger Hint System](#auto-trigger-hint-system)
8. [AI Guidance Service (ARIA) & Prompt Builder](#ai-guidance-service)
9. [Progress Tracking & Achievement Engine](#progress-tracking-system)
10. [Task & Objective Management System](#task-management-system)
11. [Database Layer](#database-layer)
12. [API & Backend Architecture](#api--backend-architecture)
13. [Frontend Architecture & State Management](#frontend-architecture--state-management)
14. [Caching Mechanisms](#caching-mechanisms)
15. [Security Features](#security-features)
16. [Logging & Report Generation](#logging--report-generation)
17. [Special Sections](#special-sections)
    - [Complete System Flow](#complete-system-flow)
    - [Database Explanation](#database-explanation)
    - [Architecture Summary](#architecture-summary)
    - [Key Algorithms](#key-algorithms)
    - [Most Likely Viva Questions (50 Qs)](#most-likely-viva-questions)
    - [Quick Revision Notes](#quick-revision-notes)

---

# Authentication System

## Purpose
Secures the platform, manages user identities, and facilitates both traditional credential-based login and Google OAuth 2.0 Single Sign-On (SSO).

## Responsibilities
- Issue and validate JSON Web Tokens (JWT).
- Hash and verify passwords using bcrypt.
- Handle OAuth callbacks securely without leaking tokens in URLs.
- Manage temporary passwords for account recovery.

## How It Works
1. **Local Auth:** User submits email/password. System compares hash via bcrypt. If valid, signs a JWT (HS256) with `user_id` and `role`.
2. **OAuth Flow:** User authenticates via Google. Google redirects to the backend callback. The backend mints a 32-byte secure random string (Exchange Code) with a 60-second TTL in memory. The backend redirects the frontend with `?code=[ExchangeCode]`. The frontend immediately POSTs this code to `/api/auth/google/exchange` to receive the actual JWT.

## Inputs
- User credentials (email/password).
- Google OAuth profile data.

## Processing
- Password hashing (12 salt rounds).
- Temporary password generation (10-character hex string).
- JWT generation (7-day expiry).

## Outputs
- HTTP Response containing the JWT token and user profile object.

## Related Components
- `authController.js`, `authService.js`, `passport.js`
- `users` database table.

## Possible Evaluator Questions
**Q: Why didn't you just put the JWT in the URL redirect after Google OAuth?**
**Q: How do you protect passwords in the database?**

## Suggested Answers
**A:** Putting a JWT directly in a URL parameter is a security risk because it can be leaked in browser histories, proxy logs, or HTTP Referer headers. I implemented an "Exchange Code" pattern where the backend generates a short-lived (60s), single-use code. The frontend trades this code for the actual JWT via a POST request, keeping the token out of the URL.
**A:** Passwords are never stored in plaintext. I use `bcrypt` with a work factor (salt rounds) of 12 to securely hash passwords before inserting them into the database.

---

# Investigation Management System
*(Terminal Command Processing Pipeline)*

## Purpose
This is the core gameplay engine. It parses, validates, and executes simulated Linux terminal commands against a virtual environment, providing the core forensic training experience.

## Responsibilities
- Parse raw string input into commands and arguments.
- Maintain the user's current working directory (`pwd`).
- Resolve file paths (absolute and relative).
- Check commands against expected scenario steps.

## How It Works
1. User types a command in the frontend React Terminal (`xterm.js`).
2. The command is sent via POST to `/api/terminal/execute`.
3. `terminalParser.js` tokenizes the input, separating the command from flags and targets.
4. `terminalController.js` resolves the path (e.g., expanding `~`, `..`, and `.`).
5. The system performs "Dual Evaluation": it checks if the command matches a legacy `expected_step` OR matches a dynamic `discovery_trigger`.
6. The command is logged to `command_history`.
7. Based on unlocked discoveries, the system calculates which hidden files are now visible.
8. The specific command handler (e.g., `handleLs`, `handleCat`) generates the simulated bash output.

## Inputs
- `session_id`
- `command` (raw string)
- `current_path` (string)

## Processing
- Path Normalization Algorithm.
- Substring and Regex matching for simulated bash outputs.

## Outputs
- Simulated terminal text output.
- Arrays of newly revealed files, completed objectives, and new discoveries.

## Related Components
- `terminalController.js`, `terminalParser.js`, `useTerminal.js` (Frontend)
- `command_history`, `sessions` tables.

## Possible Evaluator Questions
**Q: How does the terminal keep track of where the user is in the filesystem?**
**Q: What happens if the server crashes during a session? Do they lose their terminal history?**

## Suggested Answers
**A:** The frontend maintains a `currentPath` state variable. On every command, this path is sent to the backend. The backend's path resolution algorithm uses a stack-based approach to resolve `..` (pop) and `.` (ignore), updating the path. If it's a `cd` command, the backend returns the new path, which updates the frontend state.
**A:** No, the terminal state is completely restorable. Because every command is instantly appended to the `command_history` database table, if a session drops, the system simply fetches the history and replays it client-side to instantly reconstruct the exact terminal view, path, and unlocked files. The backend design is fully stateless in this regard.

---

# Evidence System
*(Virtual Filesystem Engine)*

## Purpose
Simulates a forensic environment by managing files and directories that the player must investigate. It securely handles "hidden" evidence that only reveals itself when specific forensic actions are taken.

## Responsibilities
- Serve file metadata and content.
- Restrict visibility of hidden files until unlock conditions are met.

## How It Works
Files in the database have a boolean `is_hidden` flag, and optional `reveal_at_step` or `reveal_at_discovery_key` fields.
When the frontend loads a scenario, the backend only sends the *metadata* of hidden files, never their content. 
On every terminal command, the backend dynamically calculates `updatedStepOrders` (all steps completed so far). A file becomes visible if it is not hidden, OR if its `reveal_at_step` is in the completed steps array.

## Inputs
- Player's current progress (completed steps, unlocked discoveries).
- Request for directory contents (`ls`) or file contents (`cat`).

## Processing
- Set unions (`completed_steps` ∪ `newly_completed_steps`).
- Visibility boolean logic: `!is_hidden || reveal_at_step ∈ completedSteps`.

## Outputs
- File contents (if visible).
- "File not found" error (if hidden or non-existent).

## Related Components
- `scenarioModel.js`, `virtual_files` table.

## Possible Evaluator Questions
**Q: If a file is "hidden", can a smart user just inspect the React network tab and read the file content from the initial scenario JSON payload?**

## Suggested Answers
**A:** No. I specifically designed the backend to scrub the contents of hidden files before sending the initial scenario payload. The frontend only receives metadata stubs for hidden files. The actual content is only sent over the network when the backend strictly verifies that the player has unlocked the required discovery or step.

---

# Discovery System

## Purpose
Allows players to use multiple, creative terminal commands to find the same piece of evidence, rather than forcing them to type one exact command. This makes the simulation feel like a real forensic investigation.

## Responsibilities
- Evaluate commands against flexible matching rules.
- Unlock narrative discoveries and update session state.

## How It Works
The system uses "Discovery Triggers". For example, finding a malicious cron job could be triggered by `cat /etc/crontab`, `grep -r cron /etc`, or `locate crontab`.
The `matchesTrigger` algorithm runs sequentially:
1. Does the base command match (e.g., `find`)?
2. Does it use the correct flag pattern (e.g., `-name *cron*`)?
3. Does the resolved target path match using the required strategy (`exact`, `prefix`, `contains`, `wildcard`)?

## Inputs
- Parsed player command.
- Array of available `discovery_triggers`.

## Processing
- Path resolution and wildcard regex conversion.
- Fallback matching strategies.

## Outputs
- Unlocked `discovery_id`.

## Related Components
- `discoveryService.js`, `scenario_discoveries`, `discovery_triggers` tables.

## Possible Evaluator Questions
**Q: Your system allows multiple commands to find the same clue. How do you prevent users from gaining infinite points by running all of them?**

## Suggested Answers
**A:** The database utilizes idempotency. The `session_discoveries` table has a composite UNIQUE constraint on `(session_id, discovery_id)`. When the backend inserts a discovery, it uses an `ON CONFLICT DO NOTHING` SQL clause. No matter how many times a user triggers a discovery, it only counts once towards their score and progress.

---

# Assessment System
*(Scoring Algorithm)*

## Purpose
Grades the player's performance deterministically to provide XP, rank progression, and performance badges.

## Responsibilities
- Calculate a 0-100 score based on discoveries found, command efficiency, and objectives completed.
- Apply penalties for using AI hints.

## How It Works
The final score is a composite of four distinct mathematical calculations:
1. **Path Score (Max 50):** `round((earned_critical_weight / total_critical_weight) * 50)`.
2. **Command Usage Score (Max 30):** Penalizes inefficiency. If a player uses more commands than expected, they lose 5 points for every 3 extra commands used.
3. **Conclusion Score (Max 20):** `round((completed_required_objectives / total_required_objectives) * 20)`.
4. **Hint Penalty:** Subtracts 5 points for every AI hint used.
Final Score = `Clamp(Path + Command + Conclusion - Penalty, 0, 100)`.

## Inputs
- Mission session telemetry (command count, discoveries found, objectives completed, hints used).

## Processing
- Arithmetic weight distributions.

## Outputs
- Numeric Score (0-100).
- Awarded XP (base difficulty XP * score modifier).

## Related Components
- `evaluationService.js`, `evaluation_results` table.

## Possible Evaluator Questions
**Q: How does the system handle scoring for older scenarios that don't use the new Discovery system?**

## Suggested Answers
**A:** The scoring algorithm is designed with auto-mode-switching. When it calculates the Path Score, it first checks if the scenario has any `discoveries` mapped in the database. If it does, it uses discovery-weighted scoring. If the array is empty, it seamlessly falls back to legacy `expected_steps` weighted scoring. This ensures backward compatibility for all scenario types.

---

# Player Analysis Service
*(Learning Analytics)*

## Purpose
Quietly analyzes the player's terminal behavior in real-time to detect if they are frustrated, stuck, or making steady progress.

## Responsibilities
- Classify player behavior.
- Compute a numerical "Stuck Score".

## How It Works
The `computeStuckScore` algorithm aggregates four signals:
1. **Errors:** Number of wrong commands since the last correct step.
2. **Time:** Is the player idle for >5 mins or stalled for >3 mins?
3. **Repetition:** Are they spamming the exact same wrong command?
4. **Proximity:** Calculates Levenshtein edit distance between their wrong command and the expected command to see if it's just a typo.
Behavior is classified into 5 states: `progressing`, `repeating`, `exploring`, `thrashing`, or `idle`.

## Inputs
- Command history, timestamps, error flags.

## Processing
- Levenshtein distance calculation.
- Weighted heuristic aggregation.

## Outputs
- `stuckScore` (0-100).
- `behaviorType` string.

## Related Components
- `playerStateAnalyzer.js`.

## Possible Evaluator Questions
**Q: How do you differentiate between a player who is completely lost and a player who just made a typo?**

## Suggested Answers
**A:** I implemented proximity detection using the Levenshtein edit distance algorithm. If a player's wrong command has an edit distance of 4 or less compared to the expected correct command, the system flags them as "close". This applies a massive discount to their "Stuck Score" and changes the AI's behavior to offer "Proximity Confirmation" (e.g., "Check your spelling") rather than assuming they are totally lost.

---

# Auto-Trigger Hint System

## Purpose
Proactively intervenes to help players who are struggling but haven't manually asked for help, preventing user churn and frustration.

## Responsibilities
- Evaluate the Stuck Score against predefined thresholds.
- Push an unsolicited AI hint to the terminal.

## How It Works
The `evaluateAutoTrigger` logic uses a guard-then-branch structure:
**Guards:** Has the hint cap been reached? Has this step already been auto-hinted? Has the 3-minute cooldown elapsed?
**Triggers (OR logic):**
- (Idle > 5m AND > 2 wrong commands) OR
- (Repeated same wrong command 4 times) OR
- (Composite Stuck Score > 65).
If any trigger hits, it requests a hint from ARIA and flags it as `is_auto_triggered`.

## Inputs
- Output from Player Analysis Service.

## Processing
- Threshold boolean evaluations.

## Outputs
- Asynchronous trigger event to the AI service.

## Related Components
- `autoTriggerService.js`.

## Possible Evaluator Questions
**Q: Will the auto-trigger system annoy players by constantly interrupting them?**

## Suggested Answers
**A:** No, I designed strict guardrails to prevent notification fatigue. There is a hard cooldown of 3 minutes between auto-hints, a hard cap of 5 hints total per session (shared with manual hints), and a rule that a specific scenario step can only ever be auto-hinted once. 

---

# AI Guidance Service (ARIA)
*(Prompt Builder & AI Adapter Layer)*

## Purpose
Provides an intelligent, narrative-driven AI assistant (ARIA) that gives dynamic hints without ever directly giving away the exact answer.

## Responsibilities
- Construct contextual prompts.
- Call the LLM provider (OpenAI / Ollama).
- Enforce strict anti-leak data sanitization.

## How It Works
1. **Level Escalation:** Hints go from Level 1 (Vague) -> Level 2 (Directional) -> Level 3 (Specific).
2. **Cache Check:** System checks the `hint_cache`. If a hint for this scenario/step/level exists, it returns it instantly to save API costs.
3. **Prompt Building:** `buildPrompt` concatenates system rules, dynamic persona tone (based on completion %), player history, and the specific directive. It uses a literal split marker `'━━━ ACTIVE INCIDENT ━━━'` to separate system instructions from user state.
4. **Generation:** `aiAdapter` calls OpenAI (or local Ollama).
5. **Sanitization:** `sanitizeHint` runs regex to strip out exact expected commands or file paths as defense-in-depth against AI hallucinations.

## Inputs
- `scenario_id`, `step_order`, `hint_level`, `stuckScore`.

## Processing
- Context string concatenation.
- Regex redaction.
- Cache concurrency management.

## Outputs
- Formatted, safe markdown text.

## Related Components
- `hintService.js`, `aiAdapter.js`, `promptConstants.js`.

## Possible Evaluator Questions
**Q: Large Language Models are notorious for ignoring instructions. How do you guarantee ARIA won't just output the exact command the player needs to type?**
**Q: How did you optimize the cost of using the OpenAI API?**

## Suggested Answers
**A:** I used a defense-in-depth approach. First, the prompt includes 6 absolute HARD RULES instructing the AI not to leak syntax. Second, knowing LLMs can fail, I implemented a deterministic post-processing layer (`sanitizeHint`). It uses regular expressions to find and redact the exact expected command and target paths from the AI's output before it reaches the player, replacing them with safe placeholders.
**A:** I built a global Hint Cache. The cache key is a composite of `(scenario_id, step_order, hint_level)`. If Student A gets stuck on Step 2 and asks for a Level 1 hint, the API is called and the result is cached. If Student B gets stuck on the same step later, they receive the cached response instantly. This drastically reduces token usage and API latency.

---

# Progress Tracking & Task Management System
*(Objective Tracking & Achievements)*

## Purpose
Maintains the gamified progression loop (XP, Ranks, Clearances) and manages in-game objective states.

## Responsibilities
- Award XP and calculate user levels.
- Evaluate behavioral achievements (e.g., "Minimalist", "Silent Operator").
- Track `INCOMPLETE -> IN_PROGRESS -> COMPLETED` objective states.

## How It Works
**Objectives:** When a terminal command completes a step mapped to an objective's `trigger_step`, the objective is marked complete. Secret objectives become visible at this point.
**Achievements:** Upon session completion, `progressionModel` runs 10 parallel SQL queries to evaluate achievement conditions (e.g., did they finish with 0 hints? Did they use < 15 commands?).
**Archetypes:** A decision tree classifies the player's style (e.g., "Ghost Trace" if high score + no hints; "Precision Analyst" if low command count).

## Inputs
- Final session evaluation telemetry.

## Processing
- 9-query parallel Promise execution for achievements.
- Archetype if/else decision tree.

## Outputs
- Updated `user_progress` and `badges` DB rows.

## Related Components
- `progressionModel.js`, `useObjectives.js` (Frontend).

## Possible Evaluator Questions
**Q: How do you handle race conditions if a user gains XP from two different windows simultaneously?**

## Suggested Answers
**A:** The XP update logic is atomic at the database level. Instead of fetching the user's XP, adding to it in Node.js, and saving it back, I execute a direct SQL `UPDATE users SET xp_total = xp_total + $1`. This ensures thread safety and prevents race conditions without needing explicit table locks.

---

# Database Layer

## Purpose
Provides persistent, relational storage for the entire application.

## Responsibilities
- Enforce data integrity through foreign keys and unique constraints.
- Provide efficient data retrieval for the backend services.

## How It Works
Built on PostgreSQL. It relies heavily on standard relational design (3NF where applicable). Crucial optimizations include:
- `ON CONFLICT DO NOTHING` for idempotent inserts (like discoveries).
- Partial unique indexes (e.g., `UNIQUE(user_id, scenario_id) WHERE status = 'in_progress'`) to prevent players from having multiple active sessions for the same mission.

## Inputs
- Parameterized SQL queries from the backend models.

## Processing
- PostgreSQL query planner and execution.

## Outputs
- Result sets mapped to Javascript objects.

## Related Components
- All `*Model.js` files.

## Possible Evaluator Questions
**Q: Why use PostgreSQL instead of a NoSQL database like MongoDB for this?**

## Suggested Answers
**A:** This system is highly relational. A session belongs to a user and a scenario. Discoveries belong to scenarios, and session_discoveries link them all together. Calculating scores and achievements requires complex JOINs and aggregations across these entities. PostgreSQL handles these relational constraints natively and guarantees ACID compliance, which is critical for accurate scoring and progression tracking.

---

# API & Backend Architecture

## Purpose
Serves as the central brain of the application, bridging the database and the frontend.

## Responsibilities
- Expose RESTful endpoints.
- Enforce business logic and security middleware.

## How It Works
The backend follows a strict **Service-Oriented MVC Pattern**:
- **Routes:** Define the HTTP endpoints.
- **Controllers:** Handle HTTP request/response formatting and validation.
- **Services:** Contain the complex business logic (Scoring, AI generation, Player Analysis).
- **Models:** Exclusively handle database queries.
This separation of concerns makes the system highly testable.

## Possible Evaluator Questions
**Q: Why did you separate Controllers and Services in your backend?**

## Suggested Answers
**A:** To strictly adhere to the Single Responsibility Principle. Controllers should only care about HTTP—extracting the payload and sending a 200 or 400 response. Services contain the actual algorithms (like scoring or AI logic). By separating them, I can call the scoring service from anywhere in the application, or test it independently, without needing to mock an entire HTTP request.

---

# Frontend Architecture & State Management

## Purpose
Delivers a highly interactive, dynamic, and premium "dark mode" user interface.

## Responsibilities
- Render the terminal simulator and dashboards.
- Manage local state and API communication.

## How It Works
Built using React (Vite). It utilizes custom React Hooks (`useTerminal.js`, `useObjectives.js`) to encapsulate complex state logic away from the UI components. 
It does not use Redux; instead, it utilizes React Context and local state, which is perfectly sufficient for the module-based architecture of the mission sequences. 

## Possible Evaluator Questions
**Q: The terminal in the browser feels incredibly fast. How are you managing state for the terminal input and output?**

## Suggested Answers
**A:** I heavily abstracted the terminal logic into a massive custom hook called `useTerminal`. It interfaces directly with `xterm.js`, writing directly to the xterm buffer for instant visual feedback, while simultaneously synchronizing an internal `currentPath` and history array to ensure the React state perfectly mirrors the visual terminal state.

---

# Caching Mechanisms

## Purpose
To optimize performance and reduce external API costs (specifically OpenAI).

## Responsibilities
- Store and retrieve frequently requested data quickly.

## How It Works
The primary caching mechanism is the **Global AI Hint Cache**.
When ARIA generates a hint, it is stored in the `hint_cache` table with a unique composite key of `(scenario_id, step_order, hint_level)`. Because the AI response depends only on the scenario context and not the specific user, this cache is shared globally across all users.

## Possible Evaluator Questions
**Q: What happens if two users request the same uncached hint at the exact same millisecond?**

## Suggested Answers
**A:** Both requests will miss the cache and hit the OpenAI API. However, when they both try to save the result to the cache, the database utilizes a unique constraint and an `ON CONFLICT DO NOTHING` clause. The first query writes the hint; the second query fails silently and gracefully, ensuring data integrity without throwing application errors.

---

# Security Features

## Purpose
Protect the application from common web vulnerabilities and prevent cheating.

## Summary of Implementations
- **SQL Injection Prevention:** All backend queries use parameterized `$1, $2` inputs via the `pg` library.
- **Password Security:** 12-round bcrypt hashing.
- **XSS Prevention:** React automatically escapes string variables in the DOM.
- **Cheat Prevention:** Declarative file revelation (hidden files have content scrubbed by the backend).
- **Token Security:** OAuth exchange-code pattern prevents JWT leakage in URL parameters.

## Possible Evaluator Questions
**Q: Did you implement any specific security measures beyond the standard framework features?**

## Suggested Answers
**A:** Yes, cheating prevention was a major architectural consideration. I designed a "Declarative File Revelation" system. A common exploit in web games is inspecting network payloads. If I sent the whole scenario JSON at the start, users could read hidden file contents. Instead, the backend only sends metadata stubs for hidden files. The actual content is dynamically lazy-loaded over the network only when the backend verifies the user has completed the necessary forensic step to unlock it.

---

# Logging & Report Generation

## Purpose
Provide transparency into system usage and player performance.

## Responsibilities
- Log terminal commands and AI interactions.
- Generate performance summaries.

## How It Works
- **Command Logging:** Every command is saved to `command_history`.
- **AI Logging:** Every hint request, including the prompt sent and the AI's response, is saved to `ai_hint_log`.
- **Report Generation:** The `Session Completion Overlay` acts as a dynamic report generation tool. It aggregates the data from `evaluation_results`, `session_discoveries`, and `ai_hint_log` to present a breakdown of score, XP, efficiency, and investigation archetype to the user.

---

# Special Sections

## Complete System Flow
**From Login to Mission Completion:**
1. **Auth:** User logs in via local credentials or Google SSO. Receives JWT.
2. **Dashboard:** Fetches user progression and available scenarios. User selects a scenario.
3. **Briefing:** Scenario data is fetched. User reviews objectives and narrative.
4. **Initialization:** User clicks start. Backend creates a `session` row (status: `in_progress`). Frontend loads the terminal environment.
5. **Gameplay Loop:** User enters command -> API Execution -> Dual Evaluation -> File Visibility Updated -> Output rendered -> Objectives updated -> Async Player Analysis determines if Auto-Hint is needed.
6. **Completion:** When all critical discoveries/objectives are met, backend flags session as `completed`.
7. **Evaluation:** `evaluationService` calculates the 4-component score.
8. **Progression:** `progressionModel` awards XP, evaluates achievements, calculates archetype.
9. **Report:** Frontend displays the Assessment screen with badges and stats.

## Database Explanation
- **Core:** `users` (accounts), `scenarios` (missions), `sessions` (active gameplay instances).
- **Content:** `virtual_files` (filesystem), `objectives` (tasks), `expected_steps` (legacy tasks).
- **Discovery Engine:** `scenario_discoveries` (evidence), `discovery_triggers` (commands to find evidence), `session_discoveries` (what a player has found).
- **Tracking:** `command_history` (all inputs), `evaluation_results` (scores), `session_player_state` (behavior stats).
- **AI:** `ai_hint_log` (audit trail), `user_hint_progress` (escalation tracking), `hint_cache` (global optimization).
- **Progression:** `user_progress` (scenario clears), `badges` (achievements).

## Architecture Summary
KINETIC BREACH utilizes a **Client-Server Service-Oriented Architecture**. 
- **Frontend:** React (Vite) Single Page Application utilizing custom hooks for state management and an interactive UI.
- **Backend:** Node.js/Express REST API heavily utilizing the MVC pattern (Controllers for routing, Services for business logic, Models for DB interaction).
- **Database:** Relational PostgreSQL database ensuring ACID compliance and referential integrity.
- **External:** Integration with OpenAI API (or local Ollama) for generative AI capabilities.

## Key Algorithms
1. **Path Resolution:** Client and Server share logic to resolve `.` and `..` traversals against absolute and relative paths.
2. **Discovery Matching:** A 4-strategy algorithm (exact, prefix, contains, wildcard) to map diverse command inputs to specific forensic evidence.
3. **Scoring Formula:** A clamped arithmetic combination of Discovery Weights, Command Efficiency Penalties, and Hint Penalties.
4. **Stuck Score Calculation:** An aggregate heuristic analyzing idle time, command repetition, error frequency, and Levenshtein command proximity to classify player frustration.

---

## Most Likely Viva Questions

**Technical & Architecture**
1. Why did you choose React over plain HTML/JS for this project?
2. Explain the purpose of the Service layer in your backend.
3. How is the terminal state managed in the frontend?
4. What happens if the backend server crashes while a user is playing?
5. How did you implement path resolution for the `cd` and `ls` commands?
6. Why are you using PostgreSQL instead of MongoDB?
7. Explain the "Dual Evaluation" architecture in your terminal controller.
8. How do you handle race conditions in your database?
9. What is the OAuth Exchange Code pattern, and why use it?
10. How does the frontend know when an objective is completed?

**AI & System Logic**
11. How do you prevent the AI from giving away the exact answer?
12. Explain how the AI Hint Cache works.
13. What happens if the OpenAI API goes down during a demonstration?
14. How does the system detect if a player is stuck?
15. Explain the "Proximity Detection" feature in the learning analytics.
16. How does the Auto-Trigger hint system decide when to interrupt the player?
17. Why does the AI have different "personas" based on completion percentage?
18. What is the difference between Ollama and OpenAI in your application?
19. Explain the prompt engineering strategy used for ARIA.
20. How is the "Stuck Score" calculated numerically?

**Gameplay & Scoring**
21. Why did you create the Discovery system instead of just expecting specific commands?
22. How are scores calculated? Break down the formula.
23. Does using a hint penalize the player? How much?
24. Explain the difference between Path Score and Command Usage Score.
25. How do you determine a player's "Investigation Style Archetype"?
26. How are achievements/badges evaluated at the end of a session?
27. Why do some scenarios use step-scoring and others use discovery-scoring?
28. How do hidden files become visible to the player?
29. What prevents a player from spamming the same discovery to get infinite points?
30. Can a player lose XP if they replay a mission and get a worse score?

**Database & Security**
31. How are user passwords protected?
32. What prevents a user from inspecting the network tab to read hidden files?
33. How do you prevent SQL injection in your backend?
34. Explain the `ON CONFLICT DO NOTHING` SQL clause and where you used it.
35. How is the JWT structured, and what data does it contain?
36. Why is the forgot password route designed to always return a 200 OK?
37. Explain the relationships between `sessions`, `scenario_discoveries`, and `session_discoveries`.
38. How does the system handle temporary passwords?
39. Why do you use partial unique indexes in the database?
40. How long is a JWT valid for, and how is it stored on the frontend?

**Design & Evaluation**
41. What was the hardest technical challenge in this project?
42. If you had 3 more months, what feature would you add?
43. How did you test the scoring algorithm to ensure it was fair?
44. Why did you design the UI with a dark mode aesthetic?
45. How does this system compare to existing cybersecurity platforms like HackTheBox?
46. What is the main research contribution of this project?
47. How scalable is the AI Hint system for 1000 concurrent users?
48. What are the limitations of the current terminal parser?
49. How did you ensure the project met its original objectives?
50. Walk me through the exact lifecycle of the `ls` command from keystroke to screen output.

---

## Quick Revision Notes
*Read this 10 minutes before the presentation.*
- **Tech Stack:** React (Frontend), Node.js/Express (Backend), PostgreSQL (DB).
- **Core Innovation:** The Discovery System allows flexible, realistic command usage instead of rigid "type exactly this" learning.
- **AI Integration:** ARIA uses strict prompt rules + regex sanitization to provide safe hints. The global Hint Cache saves API costs.
- **Analytics:** The system computes a "Stuck Score" (time + errors + repetition - proximity) to auto-trigger help before players quit.
- **Scoring:** Max 100 points. Discovery weight (50) + Command Efficiency (30) + Objective Completion (20) - Hint Penalty (5 per hint).
- **Security:** Hidden file contents are NOT sent to the frontend until unlocked. Passwords hashed with bcrypt(12). OAuth uses an exchange code, not URL params.
- **Stateless Resilience:** Terminal history is appended to the DB on every command. If the browser crashes, the session reloads perfectly by replaying history.
- **Architecture:** Strict Model-View-Controller. Routes -> Controllers (HTTP) -> Services (Logic) -> Models (DB). 
- **Be Confident:** You built a highly complex, deterministic state engine combined with generative AI. Own it!
