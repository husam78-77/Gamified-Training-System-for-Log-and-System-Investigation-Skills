# KINETIC BREACH / Intellicode-Learn: Complete Technical System Analysis

This document serves as the master technical blueprint and analytical breakdown of the system. It is specifically designed to provide the deep architectural, logical, and structural context required to draft a comprehensive academic Final Year Project (FYP) report.

---

## 1. Project Overview

**KINETIC BREACH**  is a web-based, gamified educational platform engineered to train users in digital forensics, log analysis, and Linux system administration. 

*   **What the system does:** It provides a safe, browser-based, zero-risk simulated terminal environment. Users are tasked with investigating cyber incidents (e.g., brute-force attacks) by interacting with a virtual filesystem, executing standard Linux commands (`ls`, `cat`, `grep`), and uncovering evidence.
*   **Target Users:** Cybersecurity students, junior SOC analysts, and technology enthusiasts who need hands-on command-line experience without the overhead of configuring real virtual machines.
*   **Project Purpose:** To bridge the gap between theoretical knowledge and practical incident response by utilizing a "learning-by-doing" pedagogy, heavily reinforced by gamification and real-time, adaptive AI tutoring.
*   **Major Functionality:** 
    *   Simulated pseudo-terminal (PTY) interface.
    *   Dual-track evaluation engine (rigid linear steps + flexible discovery milestones).
    *   Behavior-aware AI oracle that calculates player frustration and provides tiered, contextual hints.
    *   Gamified progression tracking XP, player ranks, and session scoring.

---

## 2. High-Level Architecture

The system employs a strictly decoupled Client-Server architecture, ensuring clear separation of concerns and a stateless API design (barring session data).

*   **Frontend Architecture (Client):** A React 18 Single Page Application (SPA) built with Vite. It manages localized UI state and user interactions. The frontend never computes game logic or validates answers; it acts purely as a dumb presentation layer that sends commands to the backend and renders the resulting terminal output, updated filesystem state, and UI changes.
*   **Backend Architecture (Server):** A Node.js/Express REST API acting as the central orchestration engine. It follows a strict Service-Controller pattern. Controllers handle HTTP payloads and validation, delegating the heavy lifting (parsing, scoring, AI evaluation) to dedicated Service modules.
*   **Communication Flow:**
    1.  User enters a command in the frontend `xterm.js` instance.
    2.  The frontend issues a POST request to `/api/terminal/execute`.
    3.  The backend's `terminalController` intercepts this, passing the string to `terminalParser` to tokenize the command.
    4.  The controller queries the database for the active scenario's `virtual_files`.
    5.  The parsed command is evaluated against `expected_steps` and `scenario_discoveries`.
    6.  The `playerStateAnalyzer` passively evaluates the user's history and computes a "stuck score". If thresholds are met, the AI is asynchronously queried.
    7.  The server returns a structured JSON payload: `{ output, matchedStep, newDiscoveries, newlyRevealedFiles, auto_hint }`.
    8.  The frontend updates its visual state (React state) and writes the text payload to the terminal.
*   **Database Interaction Flow:** PostgreSQL handles all persistence. The backend uses the `pg` library for pooled connections. Database calls are heavily abstracted into Model files (`progressionModel.js`, `discoveryModel.js`).

---

## 3. Full Folder Structure Analysis

The repository is modularly divided, enforcing strict architectural boundaries.

*   **`frontend/src/`**
    *   `components/`: Reusable, stateless UI blocks (e.g., `HintPanel.jsx`, `TerminalPanel.jsx`).
    *   `context/`: Global React Context providers for widely shared state (`AuthContext.jsx`, `ProgressionContext.jsx`).
    *   `hooks/`: The core of the frontend's business logic. Custom hooks (`useTerminal.js`, `useSession.js`, `useHint.js`) abstract complex side-effects (like managing the `xterm` instance) away from UI components.
    *   `pages/`: Top-level view containers. The most critical is `GamingEnvironment.jsx`, the monolith that mounts the game UI and binds all hooks together.
    *   `services/`: Promise-based API wrappers utilizing `fetch()` to interact with the Express backend.
*   **`backend/`**
    *   `controllers/`: HTTP route handlers. They extract `req.body`, invoke services, and return `res.json()`.
    *   `services/`: The brain of the application. Contains isolated business logic (`evaluationService.js`, `playerStateAnalyzer.js`, `aiAdapter.js`).
    *   `models/`: Database access objects. They contain raw parameterized SQL queries mapping to Postgres.
    *   `utils/`: Pure functions. Most notably `terminalParser.js`, which tokenizes raw command strings into AST-like structures.
    *   `middleware/`: Express middleware for generic tasks (JWT auth validation, `express-validator` schemas).
    *   `constants/`: System constants, importantly `promptConstants.js` holding the elaborate LLM system prompts.
*   **`database/`**
    *   Contains raw `.sql` schemas and migration scripts necessary to rebuild the PostgreSQL database from scratch.

---

## 4. Frontend Analysis

*   **Frameworks Used:** React 18, Vite, Tailwind CSS, Framer Motion.
*   **UI Structure & Styling:** The system employs a cohesive "Cyberpunk/Hacker" aesthetic. It utilizes CSS variables for themeing, extensive Tailwind utility classes, and Framer Motion to create fluid, kinetic animations (`slamUp`, `slamLeft`) that make the web app feel like a native client.
*   **Routing System:** `react-router-dom` manages SPA navigation. A `ProtectedRoute` wrapper intercepts unauthenticated users and redirects them to the login screen.
*   **State Management:** React Context API manages Authentication and Progression. The `GamingEnvironment` utilizes localized state via custom hooks (`useTerminal`, `useSession`) rather than a heavy global store like Redux.
*   **Reusable Components:** The application successfully modularizes the UI. Components like `HintPanel` accept props for loading states, limits, and histories, completely unaware of how the data is fetched.
*   **Terminal Interface:** Uses `xterm.js` and `@xterm/addon-fit`. It manages an `inputBuffer` and `cursorPos`, meticulously handling raw keyboard events (backspace, arrow keys for history, tab for auto-complete) to perfectly mimic a real shell.
*   **Weaknesses:** The `GamingEnvironment.jsx` component is a monolithic "God Component". It wires together too many hooks and state variables, making it fragile and difficult to test in isolation. Responsive design is lacking; the terminal layout assumes a desktop viewport.

---

## 5. Backend Analysis

*   **Server Structure:** Standard Node.js + Express.js setup.
*   **Route Organization:** Routes are prefixed under `/api/` (e.g., `/api/terminal`, `/api/hints`). Protected routes utilize an `authMiddleware` to verify JWTs.
*   **Controllers & Services:** Excellent separation of concerns. `terminalController` manages the request/response lifecycle, but relies entirely on `evaluationService` for scoring and `discoveryService` for milestone tracking.
*   **Authentication:** Dual strategy using `passport.js`. Supports Local (bcrypt password hashing) and Google OAuth2.
*   **Database Communication:** Uses raw SQL via the `pg` package. This avoids ORM overhead but requires careful parameterization (`$1`, `$2`) to prevent SQL injection.
*   **Validation & Security:** Utilizes `express-validator` to ensure payloads meet strict schemas before hitting controllers.
*   **Scalability:** Highly scalable. By keeping the terminal logic strictly string-based and in-memory (no spawned Docker containers or real OS shells), the backend is practically stateless (aside from the DB connection), meaning it can be horizontally scaled infinitely.

---

## 6. Database Analysis

The database uses PostgreSQL. The relational schema is robustly designed to track both content configuration and user progression.

*   **Core Entities:**
    *   `users`: Authentication data, global level, total XP.
    *   `scenarios`: Mission metadata (title, difficulty, brief).
    *   `virtual_files`: The simulated filesystem. Maps to a scenario. Contains `file_path`, `content`, `is_hidden`, and trigger columns (`reveal_at_step`).
    *   `expected_steps`: The linear "golden path" for a scenario. Defines the `command_expected` and `target_path`.
    *   `scenario_discoveries` & `discovery_triggers`: Defines non-linear forensic evidence milestones. A single discovery can have multiple triggers (e.g., `cat` vs `strings`).
*   **State & Tracking Entities:**
    *   `sessions`: Tracks an individual playthrough instance (`start_time`, `status`, `final_score`). Includes a unique constraint to prevent race conditions (only one active session per user/scenario).
    *   `command_history`: An audit log of every command entered. Crucial for the AI's contextual awareness.
    *   `session_discoveries`: Join table tracking which discoveries a user has unlocked in a specific session.
    *   `evaluation_results`: Post-session breakdown of path scores, command usage, and hint penalties.
    *   `user_progress`: Aggregated high scores and completion booleans per scenario.
    *   `badges`: Gamification achievements unlocked by users.

---

## 7. Terminal Engine Analysis

The terminal engine is the technical centerpiece of the project. It provides an authentic shell experience with **zero risk of Remote Code Execution (RCE)**.

*   **Command Parsing (`terminalParser.js`):** Employs a custom tokenizer. It splits input by whitespace, handling quoted strings as single arguments. It identifies the base `command`, maps flags (e.g., `-r`, `-n`), isolates positional arguments, and determines the `target` path.
*   **Virtual Filesystem (`buildTerminalOutput`):** There is no real Linux disk. The "disk" is the `virtual_files` SQL table. When a user executes `cat /logs/auth.log`, the backend searches the database array for a matching `file_path` and returns its `content` string.
*   **Command Execution Flow:**
    1.  Parse input.
    2.  Resolve relative paths (e.g., `cd ../logs`) to absolute paths based on the user's current working directory.
    3.  Route to specific handlers (`handleLs`, `handleGrep`, `handleFind`).
    4.  Handlers manipulate strings (e.g., `handleGrep` performs a regex/substring match on the text content of a virtual file).
*   **State Synchronization:** The engine supports progressive disclosure. A file might exist in the DB but be flagged `is_hidden`. If a user completes a prerequisite step, the backend returns the file in `newlyRevealedFiles`. The frontend hook intercepts this and injects it into its local `virtualFiles` array, making it accessible to future commands.

---

## 8. AI Hint System Analysis

The AI system is highly innovative, operating as an active, behavioral tutor rather than a passive chatbot.

*   **Player State Analyzer (`playerStateAnalyzer.js`):** Mathematically models the user's cognitive state. It examines the last 8 commands and computes a `stuckScore` (0-100).
    *   *Repetition Check:* Detects if the user is spamming the exact same incorrect command.
    *   *Proximity Detection:* Uses Levenshtein distance to check if the user's command is a minor typo away from the correct answer.
    *   *Behavior Classification:* Classifies the user as `thrashing` (random guessing), `exploring` (methodical wrong guesses), or `idle`.
*   **Prompt Engineering (`promptConstants.js`):** The LLM (OpenAI GPT-4o-mini) is heavily constrained by system prompts. It is fed the player's computed behavior ("User is thrashing, stuck score 85"), their command history, and the expected next step. The prompt explicitly forbids the AI from directly revealing commands.
*   **Auto-Triggering:** The backend evaluates the stuck score after every command. If it breaches a threshold, the system autonomously queries the LLM and pushes an `auto_hint` to the frontend.
*   **Hint Caching (`hintCacheService.js`):** To optimize API costs, hints are cached in PostgreSQL against a composite key of the scenario, current step, and requested hint level.
*   **Anti-Spoiler Logic:** A sanitization utility runs a regex pass over the AI's final text. If the AI hallucinates and includes the exact expected command or target path, the system redacts it.

---

## 9. Gamification System Analysis

The system utilizes heavy gamification to increase engagement and retention.

*   **XP System:** Base XP is determined by scenario difficulty. This is multiplied by the player's final evaluation score percentage. A bonus is awarded for completing missions without hints.
*   **Ranks:** The `progressionModel.js` calculates a rank based on cumulative XP (Trainee -> Operative -> Infiltrator -> Phantom -> Master Node). Ranks unlock visual flair in the UI.
*   **Evaluation Scoring (`evaluationService.js`):**
    *   *Path Score (50pts):* Rewarded for finding evidence and matching steps.
    *   *Command Usage (30pts):* The system calculates a "thrashing ratio" and deducts points if the user types dozens of irrelevant commands.
    *   *Conclusion (20pts):* Awarded for triggering the final mission objective.
    *   *Hint Penalties:* Each AI hint requested deducts 5 points from the final score.
*   **Achievements (Badges):** Awarded for specific actions, like finishing a scenario with 100% efficiency.

---

## 10. Mission & Scenario System

The mission structure supports complex, multi-layered investigations.

*   **Dual-Track Progression:** The most technically complex part of the scenario design. It abandons strict tutorials.
    1.  **Linear Expected Steps:** The "golden path" (e.g., `cat /etc/passwd`).
    2.  **Discovery Triggers:** Flexible evidence finding. If the user needs to find an IP, they can use `cat auth.log | grep IP`, or `strings auth.log`, or `find / -exec cat {} +`. The `discoveryService` parses the command and unlocks the discovery milestone regardless of the method, promoting creative problem solving.
*   **"The Front Door" Scenario:** The primary implemented scenario. A brute-force SSH attack simulation where the user must navigate `/logs`, identify the targeted user, and isolate the attacker's IP address.

---

## 11. Security & Validation

*   **Auth Security:** Uses JWTs (JSON Web Tokens) stored securely. A custom in-memory `oauthExchangeStore` ensures Google OAuth redirects do not leak tokens in URLs or insecure cookies.
*   **API Validation:** `express-validator` sits in front of all POST routes. It strictly checks email formats, password strength rules (enforced by centralized constants), and payload integrity.
*   **Zero-RCE Architecture:** Because the terminal is a string parser operating on a database table, there is absolute zero risk of shell injection or escaping the sandbox.
*   **Anti-Cheat:** The `is_hidden` logic ensures that even if a student knows the name of the final report file, they cannot `cat` it until the backend explicitly marks it revealed based on their progression.

---

## 12. Current System Completion Status

*   **Completed Systems (Production Ready):** Terminal string parser, Virtual Filesystem DB mapping, Command Execution flow, AI Player State Analyzer, Hint Caching, OAuth integration, XP/Scoring Engine, Discovery milestone logic.
*   **Partially Implemented:** The frontend visualizes some features (like websockets or active connections) that are actually simulated via React timeouts or mocked data arrays.
*   **Technical Debt:** The frontend `GamingEnvironment.jsx` is massive (~700 lines). The backend `terminalController.js` handles an enormous amount of orchestration (evaluating steps, handling discoveries, triggering auto-hints) that could be further abstracted into a facade or orchestrator service.

---

## 13. Strengths of the System

*   **Architectural Safety & Scalability:** By entirely mocking the Linux environment via string parsing and PostgreSQL, the system is infinitely cheaper to host and drastically more secure than spinning up isolated Docker containers per user.
*   **Behavioral AI Tutoring:** The implementation of a `stuckScore` and Levenshtein-based proximity detection represents a major innovation over standard ChatGPT wrappers. The AI genuinely understands the user's current cognitive state.
*   **Dual-Evaluation Logic:** Allowing both linear and discovery-based progression perfectly mimics the reality of digital forensics, where there is rarely only one "right" way to find evidence.
*   **Premium Polish:** The use of Framer Motion and strict design system adherence creates an incredibly engaging, professional-grade UI.

---

## 14. Weaknesses and Risks

*   **Terminal Parser Limitations:** The custom parser is impressive but rudimentary compared to a real shell. It does not currently support complex combinations, piping (`|`), output redirection (`>`), or shell scripting.
*   **Scalability Concern (Database I/O):** Every single terminal command triggers multiple PostgreSQL queries (to fetch virtual files, history, and check steps). Under heavy concurrent load, this read-heavy architecture could bottleneck the database.
*   **Frontend Monoliths:** Tight coupling of UI and state in `GamingEnvironment` makes the frontend brittle to changes in the mission sequence logic.

---

## 15. Suggested Improvements

*   **Architecture (Caching):** Implement a Redis caching layer for `virtual_files` and `expected_steps`. Because these configurations rarely change during a scenario, hitting Redis instead of Postgres on every `executeCommand` would massively increase scalability.
*   **Terminal Realism:** Expand `terminalParser.js` to handle basic pipe (`|`) logic by executing the first command, capturing its output, and passing it as a simulated file input to the second command.
*   **Refactoring:** Refactor `GamingEnvironment.jsx` using the React Compound Component pattern, separating the layout from the hook state logic.

---

## 16. Technologies & Dependencies

*   **Frontend:**
    *   `react` & `vite`: Chosen for rapid development and hot-module replacement.
    *   `tailwindcss`: Chosen for rapid, utility-first UI styling without massive CSS files.
    *   `framer-motion`: Essential for the complex, kinetic cyberpunk animations.
    *   `@xterm/xterm`: The industry standard web-terminal library (powers VS Code's terminal).
*   **Backend:**
    *   `express.js` & `node.js`: Chosen for highly scalable, non-blocking asynchronous I/O API construction.
    *   `pg`: Chosen for robust PostgreSQL connection pooling.
    *   `passport`: Chosen for standardized, multi-strategy authentication (Local + Google).
    *   `openai`: The core LLM API powering the "ARIA" adaptive tutor.

---

## 17. Development Methodology Inference

The architecture and migration scripts heavily imply an **Iterative / Agile** methodology. 
*   The database contains incremental migration scripts (`phase1`, `phase2`), indicating features were added iteratively.
*   The strong separation of services vs controllers implies a deliberate Software Engineering strategy to maintain modularity as the project scope expanded.
*   The system prioritizes functional completeness and robust logic over strict DRY principles in the orchestration layers, common in rapid prototyping and academic environments.

---

## 18. Report-Writing Insights (For FYP Chapters)

This project contains substantial academic and technical merit. When writing your FYP report, structure it around these key innovations:

*   **For the Design & Architecture Chapter:** Contrast your approach with traditional Cyber Ranges. Emphasize why you chose a *Simulated String-Parsed Terminal* backed by a relational database over provisioning Docker containers. Discuss the trade-offs (loss of perfect OS realism vs. absolute security, zero container overhead, and perfect scalability).
*   **For the Implementation Chapter:** Dedicate a significant portion to `playerStateAnalyzer.js`. The algorithmic modeling of human frustration (Thrashing Ratio, Repetition Detection, Levenshtein Proximity) as a precursor to LLM prompt engineering is your strongest academic contribution. It bridges software engineering with educational pedagogy.
*   **For the Evaluation/Testing Chapter:** Focus on the Dual-Evaluation engine. Discuss how the system resolves the conflict between strict tutorial rails (`expected_steps`) and creative problem solving (`discoveryService`). You can theorize or demonstrate how the system handles users who skip steps by creatively finding evidence using alternative commands.
*   **Diagrams to Generate:**
    *   **Sequence Diagram:** Map the `executeCommand` lifecycle (Input -> Parser -> DB Fetch -> Direct Match / Discovery Match -> AI Auto-Trigger -> Output).
    *   **Flowchart:** Visualize the `stuckScore` algorithm.
    *   **ERD:** Map the relationship between Scenarios, Virtual Files, Sessions, and Discoveries.