# System Summary — IntelliCode Learn

## Overview

**IntelliCode Learn** is a gamified cybersecurity investigation and forensics training platform (Final Year Project). Students conduct digital forensics investigations by executing real Linux commands in a simulated terminal to uncover evidence and complete security missions.

**Core Philosophy:** Discovery-based learning — any valid forensic technique counts toward mission completion, not just rigid step-by-step procedures.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | Node.js, Express 5.2.1 |
| **Database** | PostgreSQL (Supabase in production) |
| **Auth** | JWT, Passport.js, Google OAuth 2.0, bcrypt |
| **AI** | Anthropic Claude API (hint generation) |
| **Email** | Nodemailer, Mailjet, Resend |
| **Frontend** | React 18.2.0, React Router 7.14.0 |
| **Styling** | Tailwind CSS 3.4.4, Framer Motion 12.38.0 |
| **Terminal** | xterm.js 6.0.0 (with FitAddon) |
| **Build** | Vite 5.2.0 |
| **Deployment** | Vercel (frontend), Node.js host (backend) |

---

## Architecture

```
Frontend (React)
  Pages: Landing, Login, Dashboard, Mission, Gaming Environment
  Hooks: useSession, useTerminal, useObjectives, useHint
  Services: sessionService, terminalService, scenarioService
         │
         │ REST API + JWT
         ▼
Backend (Express.js)
  Controllers: auth, scenario, session, terminal, hint, user
  Routes:      /api/auth, /api/scenarios, /api/sessions, /api/terminal, /api/hints
  Services:    Discovery engine, hint generation, scoring, AI adapter
  Models:      Direct PostgreSQL queries
         │
         │ Connection Pool
         ▼
PostgreSQL Database (Supabase / Local)
  14 Tables: users, scenarios, sessions, command_history,
             objectives, discoveries, virtual_files, badges, ...
```

---

## Project Structure

```
/backend
  /config        → db.js, passport.js
  /controllers   → authController, scenarioController, sessionController,
                   terminalController, hintController, userController
  /models        → scenarioModel, sessionModel, terminalModel, discoveryModel,
                   progressionModel, hintModel, hintCacheModel, userModel
  /services      → evaluationService, discoveryService, hintService,
                   hintLevelService, hintCacheService, autoTriggerService,
                   aiAdapter, authService, playerStateAnalyzer
  /routes        → 7 route files
  /middleware    → authMiddleware, validateRequest
  /utils         → terminalParser, emailSender, responseHelper
  server.js

/frontend/src
  /pages         → 12 pages (Landing, Login, Dashboard, Mission, Game, Profile, ...)
  /components    → TerminalPanel, ObjectivesPanel, HintPanel, Header, Layout
  /hooks         → useAuth, useSession, useTerminal, useObjectives, useHint
  /services      → sessionService, terminalService, scenarioService, hintService
  /context       → AuthContext
  App.jsx, main.jsx

/database
  database.sql                              → Initial schema (14 tables)
  discovery_based_progression_refactor.sql  → Discovery system tables
  phase1_player_state.sql
  phase2_hint_levels.sql
  phase3_hint_cache.sql
  fix_discovery_triggers_reveals.sql
```

---

## Database Schema (14 Tables)

| Table | Purpose |
|---|---|
| `users` | Accounts, XP, level, password reset tokens |
| `scenarios` | Mission metadata (title, type, difficulty, brief) |
| `virtual_files` | Simulated filesystem per scenario (content, hidden flags, reveal conditions) |
| `expected_steps` | Legacy ordered steps with command + weight |
| `objectives` | Mission goals with XP rewards, secret flag |
| `sessions` | Active gameplay sessions (user × scenario) |
| `command_history` | All commands executed, match type, step matched |
| `evaluation_results` | Final score breakdown per session |
| `user_progress` | Per-user per-scenario best scores and completion |
| `scenario_discoveries` | Discovery definitions (evidence milestones, weights, tags) |
| `discovery_triggers` | Trigger conditions for each discovery (command + pattern) |
| `session_discoveries` | Discoveries unlocked per session |
| `ai_hint_log` | Hint requests, prompts, responses, cache hit flag |
| `user_hint_progress` | Per-step hint level tracking per session |
| `badges` | Awarded badges (score ≥ 60) |
| `ai_hint_cache` | Cached Claude responses (Phase 3) |

---

## Core Systems

### 1. Dual Evaluation Engine

Two parallel systems run on every command:

**System 1 — Direct Step Matching (Legacy)**
- Compares command against `expected_steps` (exact → relative → bare command)
- Keeps hint system functional for older scenarios

**System 2 — Discovery-Based (New)**
- Compares command against `discovery_triggers`
- ANY trigger match unlocks a discovery
- Multiple discoveries can fire per command
- Discovery credits a `maps_to_step_order` to sync with hints

**Combined result per command:**
- Both match → saved as `direct`, discovery also recorded
- Discovery only → saved as `discovery`, credits mapped step
- Neither → saved as unmatched

---

### 2. Scoring System (100 points total)

| Component | Points | Calculation |
|---|---|---|
| Path Score | 50 | Sum of critical discovery weights earned (or step weights for legacy) |
| Command Usage | 30 | Efficiency: penalty −5 per 3 excess commands over reference count |
| Conclusion | 20 | `(completed objectives / required) × 20` |
| Hint Penalty | −5 per hint | Applied after total, minimum score = 0 |

---

### 3. Hint System (3 Phases)

- **Phase 1:** AI hint generation via Claude (single prompt, no history)
- **Phase 2:** Per-step hint levels (Level 1 = vague → Level 2 = strong → Level 3 = explicit), max 5 hints/session
- **Phase 3 (Current):** Cache-first strategy — checks `ai_hint_cache` before calling Claude; `cache_key = scenario_id + step_order + hint_level`

**Auto-Trigger:** Fires after 30+ seconds of no matched steps; non-blocking.

---

### 4. Discovery System

Replaces rigid step requirements with forensic realism.

**Key Concept:** A discovery is a forensic milestone (e.g. "found malicious cron entry") unlocked by any matching trigger command.

**Trigger Matching Strategies:**
- `exact` — command and path must match exactly
- `prefix` — path starts with pattern
- `contains` — path contains pattern
- `wildcard` — glob-style matching

**Evidence Tags** (ARRAY field): categorize findings (e.g. `['persistence', 'cron', 'malicious']`)

**File Revelation:** Files are revealed when either `reveal_at_step` is matched OR `reveal_at_discovery_key` is unlocked.

---

### 5. Virtual Terminal Engine

**Supported Commands (13):**

| Command | Features |
|---|---|
| `ls` | Directory listing, hidden file filtering |
| `cat` | File contents from virtual FS |
| `grep` | Pattern matching, `-r/-R/-i/-n/-v` flags |
| `find` | `-name`, `-type f/d`, wildcard support |
| `cd` | Path changes, validates `file_type='directory'` |
| `pwd` | Current path |
| `ps` | Process table (shows suspicious processes) |
| `locate` | Full-text filename search |
| `strings` | Extracts readable ASCII (≥4 chars) |
| `whoami` | Returns "root" |
| `history` | Numbered session command list |
| `clear` | Clears terminal (frontend signal) |
| `help` | Lists all commands with syntax |

**Terminal UX Features:**
- TAB completion (commands + file/directory names, context-aware)
- Up/Down arrow history navigation with saved-input preservation
- Typo suggestions via Levenshtein distance (max edit distance 2)
- Absolute and relative path resolution (`.`, `..`, `~`)

---

## Authentication & Security

| Feature | Implementation |
|---|---|
| Password hashing | bcrypt |
| Session tokens | JWT (jsonwebtoken) |
| OAuth | Passport.js + Google OAuth 2.0 |
| Password reset | Temp hash with 1-hour expiration |
| Route protection | authMiddleware verifies JWT on all non-public routes |
| Email | Nodemailer + Mailjet/Resend for verification and reset |

---

## Page Routes

| Route | Page | Purpose |
|---|---|---|
| `/` | LandingPage | Public landing |
| `/login` | LoginPage | Email/password + Google OAuth |
| `/register` | RegisterPage | Registration form |
| `/forgot-password` | ForgotPasswordPage | Reset request |
| `/dashboard` | Dashboard | XP, level, progress summary |
| `/mission` | MissionDashboard | Investigation type selection |
| `/sequence/:type` | MissionSequence | Scenarios filtered by type |
| `/briefing/:id` | MissionBriefing | Scenario brief + start button |
| `/game/:id` | GamingEnvironment | Main terminal game engine |
| `/profile` | Profile | Achievements and badge gallery |

---

## Game Session Flow

```
1. Select investigation type (MissionDashboard)
2. Select difficulty scenario (MissionSequence)
3. Read briefing + start session (MissionBriefing → POST /api/sessions/start)
4. Execute commands in terminal (POST /api/terminal/execute)
   └─ Backend: parse → match (direct + discovery) → reveal files → return output
5. Request hints if stuck (POST /api/hints/request)
   └─ Backend: cache check → Claude API fallback → return hint + level
6. Complete all objectives → POST /api/sessions/:id/complete
   └─ Backend: score + XP + badge → return full result summary
7. View results screen → navigate to Dashboard
```

---

## Key Files by Function

| Goal | File |
|---|---|
| Scoring logic | [backend/services/evaluationService.js](backend/services/evaluationService.js) |
| Discovery matching | [backend/services/discoveryService.js](backend/services/discoveryService.js) |
| Hint generation | [backend/services/hintService.js](backend/services/hintService.js) |
| Command parsing | [backend/utils/terminalParser.js](backend/utils/terminalParser.js) |
| Session lifecycle | [backend/controllers/sessionController.js](backend/controllers/sessionController.js) |
| Terminal execution | [backend/controllers/terminalController.js](backend/controllers/terminalController.js) |
| Frontend game loop | [frontend/src/pages/GamingEnvironment/GamingEnvironment.jsx](frontend/src/pages/GamingEnvironment/GamingEnvironment.jsx) |
| Terminal UI | [frontend/src/hooks/useTerminal.js](frontend/src/hooks/useTerminal.js) |
| Objectives tracking | [frontend/src/hooks/useObjectives.js](frontend/src/hooks/useObjectives.js) |
| Initial DB schema | [database/database.sql](database/database.sql) |
| Discovery tables | [database/discovery_based_progression_refactor.sql](database/discovery_based_progression_refactor.sql) |

---

## Gamification

| Element | Details |
|---|---|
| XP | 500 (easy) / 1250 (medium) / 5000 (hard), scaled by score percentage |
| Levels | Accumulate XP across all scenarios |
| Badges | Awarded when final score ≥ 60 |
| No-hint Bonus | Extra XP multiplier for completing without hints |
| Leaderboards | Stored in `user_progress`, highest score per scenario |

---

## Environment Variables

**Backend `.env`:**
```
DATABASE_URL, DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
PORT, FRONTEND_URL, JWT_SECRET, SESSION_SECRET
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
CLAUDE_API_KEY
MAILJET_PUBLIC_KEY, MAILJET_PRIVATE_KEY, RESEND_API_KEY
```

**Frontend `.env`:**
```
VITE_API_URL=http://localhost:5000
```