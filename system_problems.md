# System Audit Report: Technical & Design Review
This document outlines the findings of a comprehensive code audit of both the backend and frontend systems. The identified issues are categorized by severity and cover security threats, logic/programming bugs, architectural inconsistencies, and UX/UI design flaws.

---

## Summary of Audit Findings

| Category | Issue Description | Severity | Impact | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Development** | [Core Gameplay Code Excluded from Version Control (Gitignore Leak)](#1-core-gameplay-code-excluded-from-version-control) | **Critical** | Loss of project code, deployment failures, collaboration barrier | Active |
| **Database** | [Database Schema Compilation Syntax Error](#2-database-schema-compilation-syntax-error) | **High** | Initial setup / seed failure in PostgreSQL | **Resolved (by Developer)** |
| **Logic / Game** | [Session Resume State Desynchronization](#3-session-resume-state-desynchronization) | **High** | Resumed sessions or page refreshes reset objectives and file trees | Active |
| **Branding / Integration** | [Hardcoded Leftovers & Broken C++ Platform Routes](#4-hardcoded-leftovers--broken-c-platform-routes) | **High** | Broken fetch calls to localhost:7003, incorrect user branding | Active |
| **Logic / Game** | [Unrestricted XP Farming Loop Exploit](#5-unrestricted-xp-farming-loop-exploit) | **Medium-High** | Progression system bypass, invalid player leaderboard | Active |
| **Security** | [LocalStorage Usage for Session JWT Tokens](#6-localstorage-usage-for-session-jwt-tokens) | **Medium** | Susceptibility to token theft via Cross-Site Scripting (XSS) | Active |
| **Security** | [Temporary Password Not Invalidated on First Successful Login](#7-temporary-password-not-invalidated-on-first-successful-login) | **Medium** | Attacker can reuse temp passwords for up to 1 hour | Active |
| **UX / UI** | [Secret Objectives Layout Cut-off on Short Screens](#8-secret-objectives-layout-cut-off-on-short-screens) | **Medium-Low** | Unreachable / hidden secret objectives on 1366x768 screens | Active |
| **Architecture** | [Redundant Passport Session & express-session Middleware](#9-redundant-passport-session--express-session-middleware) | **Low** | Unused session stores, unnecessary memory overhead | Active |
| **Architecture** | [Lack of Administrative Scenario Management APIs](#10-lack-of-administrative-scenario-management-apis) | **Low** | High maintenance overhead (DB direct inserts required) | Active |

---

## Detailed Findings & Remediation Plans

### 1. Core Gameplay Code Excluded from Version Control
* **File Reference:** [.gitignore](file:///c:/Users/D/Desktop/fyp/fyp%20code/.gitignore#L9)
* **Severity:** **Critical**
* **Finding:** 
  Line 9 of the root `.gitignore` file explicitly ignores the contents of the gaming environment page folder:
  ```text
  frontend/src/pages/GamingEnvironment/*
  ```
  This prevents `GamingEnvironment.jsx`, `GamingEnvironment.css`, and other key components from being tracked by git.
* **Impact:** 
  Any edits made to the core gameplay system are entirely untracked. If the developer clones the repository on a new machine or pushes to a remote repository, the core terminal/gameplay logic will be missing, causing immediate build failures.
* **Remediation:**
  Remove or comment out the ignore rule on line 9 of `.gitignore`.
  ```diff
  - frontend/src/pages/GamingEnvironment/*
  + # frontend/src/pages/GamingEnvironment/*
  ```

---

### 2. Database Schema Compilation Syntax Error
* **File Reference:** [database/database.sql](file:///c:/Users/D/Desktop/fyp/fyp%20code/database/database.sql#L14)
* **Severity:** **High**
* **Finding:** 
  On line 14 of `database.sql`, there was a premature semicolon inside the columns list of the `CREATE TABLE users` statement:
  ```sql
  CREATE TABLE users (
      ...
      level INT DEFAULT 1,
      xp INT DEFAULT 0; -- <-- Semicolon instead of a comma!
  );
  ```
* **Impact:** 
  Executing this SQL script to initialize a new PostgreSQL database instance failed with a compilation/syntax error, halting database initialization.
* **Remediation:**
  * **Status:** **Resolved.** The developer has removed the semicolon on line 14:
  ```diff
  - 	xp INT DEFAULT 0;
  + 	xp INT DEFAULT 0
  ```

---

### 3. Session Resume State Desynchronization
* **File References:**
  - [frontend/src/hooks/useObjectives.js](file:///c:/Users/D/Desktop/fyp/fyp%20code/frontend/src/hooks/useObjectives.js#L34-L47)
  - [frontend/src/hooks/useTerminal.js](file:///c:/Users/D/Desktop/fyp/fyp%20code/frontend/src/hooks/useTerminal.js#L624-L641)
  - [backend/controllers/sessionController.js](file:///c:/Users/D/Desktop/fyp/fyp%20code/backend/controllers/sessionController.js#L73-L85)
* **Severity:** **High**
* **Finding:** 
  When a user resumes an existing session or refreshes their browser mid-game, the frontend initializes all objectives to `status: INCOMPLETE` and standard visibility. Similarly, previously revealed hidden files and completed discoveries are reset in the client state. Although `useTerminal.js` fetches command history from `/api/terminal/history/:sessionId` and prints it to the terminal screen, it does not re-emit state events to sync the UI components.
* **Impact:** 
  Operatives lose visual progress metrics (sidebar file tree updates, evidence HUD, and completed objectives lists) if they refresh the page, even though the database already tracks them as completed.
* **Remediation:**
  Update the history restoration phase in `useTerminal.js` to parse the historical commands and simulate/trigger the state events (`onStepMatched`, `onFilesRevealed`, etc.), or retrieve active session progress stats directly upon start/resume.

---

### 4. Hardcoded Leftovers & Broken C++ Platform Routes
* **File References:**
  - [frontend/src/pages/ForgotPasswordPage.jsx](file:///c:/Users/D/Desktop/fyp/fyp%20code/frontend/src/pages/ForgotPasswordPage.jsx#L35)
  - [frontend/src/pages/ResetPasswordPage.jsx](file:///c:/Users/D/Desktop/fyp/fyp%20code/frontend/src/pages/ResetPasswordPage.jsx#L30)
  - [frontend/src/pages/VerifyEmailPage.jsx](file:///c:/Users/D/Desktop/fyp/fyp%20code/frontend/src/pages/VerifyEmailPage.jsx#L38)
  - [frontend/src/App.jsx](file:///c:/Users/D/Desktop/fyp/fyp%20code/frontend/src/App.jsx#L38-L40)
* **Severity:** **High**
* **Finding:** 
  The routing configuration contains three pages that are copy-pasted leftovers from a C++ learning platform template ("IntelliCode Learn"). These components contain hardcoded API URLs pointing to `https://localhost:7003` (an ASP.NET Core default port) and reference C++ course completion. The Node.js backend has no matching endpoints for email verification or validate-reset-token.
* **Impact:**
  Navigating to `/verify-email`, `/forgot-password`, or `/reset-password` results in broken fetch requests, rendering errors, and incorrect user branding.
* **Remediation:**
  Remove these redundant routes from `App.jsx` and delete their files, as the standard login page (`LoginPage.jsx`) already contains a fully functional modal that targets the Node/Express backend at `/api/auth/forgot-password`.

---

### 5. Unrestricted XP Farming Loop Exploit
* **File References:** 
  - [backend/controllers/sessionController.js](file:///c:/Users/D/Desktop/fyp/fyp%20code/backend/controllers/sessionController.js#L343)
  - [backend/models/progressionModel.js](file:///c:/Users/D/Desktop/fyp/fyp%20code/backend/models/progressionModel.js#L175-L188)
* **Severity:** **Medium-High**
* **Finding:** 
  A player can start a session for any scenario at any time. When completing a session, `completeSession` fetches the score/XP and executes `progressionModel.addXpToUser(userId, xpAwarded)` unconditionally. The application does not check if the user has already completed this scenario.
* **Impact:** 
  Gamification systems rely on progression integrity. Players can write a shell script to continuously start and complete the first scenario to gain infinite levels and unlock rewards without completing the actual course.
* **Remediation:**
  Modify `completeSession` to check if the scenario was already completed (by querying `user_progress.completed` first). If it was, only award incremental XP if they exceeded their prior high score, or completely skip awarding XP:
  ```javascript
  const wasCompletedBefore = await progressionModel.hasUserCompletedScenario(userId, session.scenario_id);
  
  if (!wasCompletedBefore) {
      const updatedUser = await progressionModel.addXpToUser(userId, xpAwarded);
  }
  ```

---

### 6. LocalStorage Usage for Session JWT Tokens
* **File Reference:** [frontend/src/context/AuthContext.jsx](file:///c:/Users/D/Desktop/fyp/fyp%20code/frontend/src/context/AuthContext.jsx#L11-L17)
* **Severity:** **Medium**
* **Finding:** 
  The frontend retrieves and sets the authentication token in `localStorage`:
  ```javascript
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  localStorage.setItem('token', authToken);
  ```
* **Impact:** 
  Data stored in `localStorage` is accessible by any script executing on the same origin. If the site is vulnerable to Cross-Site Scripting (XSS) (e.g. through a compromised NPM package), an attacker can steal the student's JWT token, gaining unauthorized API access.
* **Remediation:**
  Transition authentication tokens to **HttpOnly Secure Cookies**. Because `HttpOnly` cookies cannot be accessed via frontend JavaScript (`document.cookie`), token theft via XSS is mitigated.

---

### 7. Temporary Password Not Invalidated on First Successful Login
* **File References:**
  - [backend/services/authService.js](file:///c:/Users/D/Desktop/fyp/fyp%20code/backend/services/authService.js#L20-L55)
  - [backend/models/userModel.js](file:///c:/Users/D/Desktop/fyp/fyp%20code/backend/models/userModel.js#L36-L46)
* **Severity:** **Medium**
* **Finding:** 
  When a user requests a temporary password, it is hashed and saved under `temp_password_hash` with a 1-hour expiration. However, when the user successfully authenticates with the temporary password (`loginUser`), the system does not clear `temp_password_hash` or `temp_password_expires` from the DB.
* **Impact:** 
  An attacker who intercepts the temporary password (e.g., via email or session logs) can repeatedly log in as the target user until the 1-hour expiration window lapses. Security best practices dictate that temporary single-use passwords must be invalidated immediately upon first successful use.
* **Remediation:**
  Modify the `loginUser` function to clear the temp credentials upon a successful temporary password match:
  ```javascript
  if (isTempMatch) {
      await userModel.clearTempPassword(user.user_id);
  }
  ```

---

### 8. Secret Objectives Layout Cut-off on Short Screens
* **File Reference:** [frontend/src/components/ObjectivesPanel.jsx](file:///c:/Users/D/Desktop/fyp/fyp%20code/frontend/src/components/ObjectivesPanel.jsx#L56-L74)
* **Severity:** **Medium-Low**
* **Finding:** 
  In `ObjectivesPanel.jsx`, standard objectives are rendered within a scrollable container (`<ul className="space-y-3 flex-1 overflow-y-auto custom-scrollbar ...">`). However, the **Secret Objectives** container is rendered *outside* of this scrollable list, at the bottom of the parent section.
* **Impact:** 
  If a scenario has several standard objectives and the user unlocks secret objectives, the secret list will render beneath the scrollable list. On shorter laptop screens (e.g., 1366x768 or 1280x800), the secret objectives list will overflow the parent container and get hidden/cut off due to `overflow-hidden` on the parent `<section>`.
* **Remediation:**
  Incorporate secret objectives inside the main scrollable `<ul>` element, separating them using a divider list item, or wrap the entire panel contents inside a single scrollable container:
  ```diff
  - <ul className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-[100px]">
  -     ...
  - </ul>
  - {secretObjectives.length > 0 && (...)}
  
  + <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
  +     <ul className="space-y-3">
  +         {objectives.map(obj => <ObjectiveItem ... />)}
  +     </ul>
  +     {secretObjectives.length > 0 && (
  +         <div className="border-t border-[#FF003C]/30 pt-4">
  +             {/* Secret header */}
  +             <ul className="space-y-3">
  +                 {secretObjectives.map(obj => <ObjectiveItem ... />)}
  +             </ul>
  +         </div>
  +     )}
  + </div>
  ```

---

### 9. Redundant Passport Session & express-session Middleware
* **File References:** 
  - [backend/server.js](file:///c:/Users/D/Desktop/fyp/fyp%20code/backend/server.js#L24-L30)
  - [backend/routes/authRoutes.js](file:///c:/Users/D/Desktop/fyp/fyp%20code/backend/routes/authRoutes.js#L14)
* **Severity:** **Low**
* **Finding:** 
  In `server.js`, express-session and passport session serialization are initialized:
  ```javascript
  app.use(session({ ... }));
  app.use(passport.initialize());
  app.use(passport.session());
  ```
  However, all API routes use JWT authentication (`authMiddleware.js`), and even the Google OAuth flow in `authRoutes.js` explicitly disables sessions:
  ```javascript
  passport.authenticate('google', { failureRedirect: ..., session: false })
  ```
* **Impact:** 
  The server initializes an in-memory session store and issues a session cookie (`connect.sid`) for every request, wasting CPU cycles and memory.
* **Remediation:**
  Remove `express-session` and `passport.session()` from `server.js`, leaving only `passport.initialize()` for the stateless Google OAuth strategy.
  ```diff
  - const session = require('express-session');
  ...
  - app.use(session({
  -     secret: process.env.SESSION_SECRET,
  -     resave: false,
  -     saveUninitialized: false,
  - }));
    app.use(passport.initialize());
  - app.use(passport.session());
  ```

---

### 10. Lack of Administrative Scenario Management APIs
* **File Reference:** [backend/controllers/scenarioController.js](file:///c:/Users/D/Desktop/fyp/fyp%20code/backend/scenarioController.js)
* **Severity:** **Low**
* **Finding:** 
  The backend controllers and routes are completely read-only concerning Scenarios, Expected Steps, Objectives, and Discoveries.
* **Impact:** 
  Adding new challenges, updating logs, changing step descriptions, or modifying virtual file trees cannot be done through an interface. Administrators must manually draft and run SQL inserts/updates. This increases maintenance friction and introduces risks of database drift.
* **Remediation:**
  Design and build administrative endpoints (e.g., POST/PUT `/api/admin/scenarios`) mapped to a role-based access control (RBAC) check on `req.user.role === 'admin'`.
