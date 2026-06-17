# Frontend Codebase Audit: Problems & Technical Debt Report

This document outlines the findings of a comprehensive static analysis and code audit conducted on the React-based frontend application (`Gamified Training System for Log and System Investigation Skills`). It identifies architecture patterns, routing anomalies, state desynchronizations, hardcoded properties, and legacy leftover components that pose bugs or risks to overall user experience and progression.

---

## 1. Summary of Identified Issues

| Severity | Category | Issue Description | Primary Files |
| :--- | :--- | :--- | :--- |
| **CRITICAL** | Functional / Logic | Hardcoded scenario locking prevents users from playing subsequent levels in a category sequence. | `MissionSequence.jsx` |
| **HIGH** | State / Sync | Stateless working directory (`currentPath`) resets on browser refresh, desynchronizing commands and backend path validation. | `useTerminal.js` |
| **HIGH** | Architecture | Leftover routes, branding, and hardcoded C# ASP.NET Core API endpoints (`localhost:7003`) from a C++ learning platform. | `ForgotPasswordPage.jsx`, `ResetPasswordPage.jsx`, `VerifyEmailPage.jsx` |
| **MEDIUM** | Network / Reliability | Gaps in API base URL (`VITE_API_URL`) fallbacks, risking screen crashes if environment variables are not loaded. | `Profile.jsx`, `Dashboard.jsx`, `ProgressionContext.jsx` |
| **MEDIUM** | Performance | Redundant server-side API polling: fetching progression data in `Dashboard.jsx` despite availability of `useProgression` context. | `Dashboard.jsx` |
| **LOW** | UX / Compatibility | WebKit-only scrollbar styling causes native unstyled gray scrollbars in non-WebKit browsers like Mozilla Firefox. | `GamingEnvironment.css` |

---

## 2. Technical Deep-Dive & Code Analysis

### Issue #1: Hardcoded Scenario Sequence Locking (Critical)
*   **File:** [`MissionSequence.jsx`](file:///c:/Users/D/Desktop/fyp/fyp%20code/frontend/src/pages/Mission/MissionDashboard/MissionSequence.jsx#L192)
*   **Snippet:**
    ```javascript
    const isLocked = index > 0; // TODO: Real logic
    ```
*   **Impact:** 
    All scenarios in any chosen sequence (Brute Force, Script Execution, SSH Forensics) beyond the first element (`index === 0`) are hardcoded to lock. The lock overlay consumes mouse interactions via a high `z-index`, making it impossible for the user to unlock or play levels 2 and 3, even if they successfully completed the first level.
*   **Fix Strategy:**
    1. Import the `useProgression` hook context inside `MissionSequence.jsx`.
    2. Extract the completed scenario IDs from `progression.missionArchive`.
    3. Replace the hardcoded expression with checking if the index is `0` OR if the prior level's scenario ID is present in the set of completed scenario IDs.

---

### Issue #2: Stateless Working Directory Desynchronization (High)
*   **File:** [`useTerminal.js`](file:///c:/Users/D/Desktop/fyp/fyp%20code/frontend/src/hooks/useTerminal.js#L116)
*   **Snippet:**
    ```javascript
    const [currentPath, setCurrentPath] = useState('/');
    ```
*   **Impact:**
    If a student is in the middle of a scenario (e.g., in directory `/var/log/nginx`), and they hit refresh or navigate away and back:
    1. The React state resets `currentPath` to `/`.
    2. The visual prompt displays `root@hyperion:~$ ` (default root `/`).
    3. The next command executed is sent to the backend with `current_path: '/'`.
    4. Backend validation (e.g. `cat access.log` matching a step in `/var/log/nginx`) fails instantly with `"No such file or directory"`.
    The player is forced to manually type `cd` commands to reconstruct their terminal path after every refresh.
*   **Fix Strategy:**
    Persist the player's active directory in `localStorage` keyed by `sessionId` or cache it via the backend session entity, retrieving and setting it as the initial state during hook mount.

---

### Issue #3: Leftover C++ Coding Platform Components & Endpoints (High)
*   **Files:** 
    *   [`ForgotPasswordPage.jsx`](file:///c:/Users/D/Desktop/fyp/fyp%20code/frontend/src/pages/ForgotPasswordPage.jsx)
    *   [`ResetPasswordPage.jsx`](file:///c:/Users/D/Desktop/fyp/fyp%20code/frontend/src/pages/ResetPasswordPage.jsx)
    *   [`VerifyEmailPage.jsx`](file:///c:/Users/D/Desktop/fyp/fyp%20code/frontend/src/pages/VerifyEmailPage.jsx)
*   **Snippet Examples:**
    ```javascript
    // ForgotPasswordPage.jsx Line 35
    const res = await fetch("https://localhost:7003/api/user/forgot-password", ...

    // VerifyEmailPage.jsx Line 136
    Your account is now active. You're ready to start your C++ learning journey.
    ```
*   **Impact:**
    These pages were copied over from a C++ education project ("IntelliCode Learn") and contain:
    1. Hardcoded target URLs to port `7003` (a legacy C# ASP.NET service) instead of leveraging the Node/Express backend on port `5000`.
    2. Visual layout classes and branding (`IntelliCode Learn`, light-mode `bg-gray-50 bg-white` grids) that break the unified cyberpunk theme.
    3. Leftover user-facing copy referencing a C++ learning path.
*   **Fix Strategy:**
    Refactor these pages to route their fetch requests through the configured Node.js API client (e.g. `authService.js`), replace C++ text strings with system forensics branding, and apply the dark/cyber styling rules defined in `tailwind.config.js`.

---

### Issue #4: Gaps in API URL Fallbacks (Medium)
*   **Files:**
    *   [`Profile.jsx`](file:///c:/Users/D/Desktop/fyp/fyp%20code/frontend/src/pages/Profile/Profile.jsx#L25)
    *   [`Dashboard.jsx`](file:///c:/Users/D/Desktop/fyp/fyp%20code/frontend/src/pages/Dashboard/Dashboard.jsx#L18)
    *   [`ProgressionContext.jsx`](file:///c:/Users/D/Desktop/fyp/fyp%20code/frontend/src/context/ProgressionContext.jsx#L21)
*   **Snippet Example:**
    ```javascript
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/profile`, ...
    ```
*   **Impact:**
    Unlike the standalone API services (e.g. `authService.js` or `scenarioService.js`), which use `import.meta.env.VITE_API_URL || 'http://localhost:5000'`, these inline fetch calls have no fallback. If a local developer launches the web application without a `.env` file containing `VITE_API_URL`, these requests resolve to `undefined/api/users/...`, crashing the component rendering lifecycle.
*   **Fix Strategy:**
    Standardize all API fetches by utilizing a single unified HTTP client wrapper or introducing local port fallbacks (`|| 'http://localhost:5000'`) on all inline fetches.

---

### Issue #5: Redundant API Requests for User Progression (Medium)
*   **File:** [`Dashboard.jsx`](file:///c:/Users/D/Desktop/fyp/fyp%20code/frontend/src/pages/Dashboard/Dashboard.jsx#L23)
*   **Snippet:**
    ```javascript
    const progRes = await fetch(`${import.meta.env.VITE_API_URL}/api/users/progression`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    ```
*   **Impact:**
    `Dashboard.jsx` already initializes and imports the `useProgression` hook on line 10 (`const { progression } = useProgression();`). However, inside its mount `useEffect`, it triggers an manual inline fetch to `/api/users/progression` to compute metrics. This generates unnecessary duplicate database queries and HTTP traffic upon loading the dashboard.
*   **Fix Strategy:**
    Remove the manual API fetch of `/api/users/progression` from `Dashboard.jsx` and read metrics directly from the imported `progression` object exposed by the React context provider.

---

### Issue #6: Cross-Browser CSS Scrollbars Compatibility (Low)
*   **File:** [`GamingEnvironment.css`](file:///c:/Users/D/Desktop/fyp/fyp%20code/frontend/src/pages/GamingEnvironment/GamingEnvironment.css#L125-L129)
*   **Snippet:**
    ```css
    .custom-scrollbar::-webkit-scrollbar { width: 3px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 235, 247, 0.2); }
    ```
*   **Impact:**
    The scrollbars are styled exclusively using WebKit-specific selectors. In browsers such as Mozilla Firefox (which does not support `-webkit-scrollbar`), scrollable containers in the gaming interface (objectives panel, filesystem directory tree, log panel) fallback to thick, default-styled gray scrollbars, interrupting the game's premium neon-dark aesthetic.
*   **Fix Strategy:**
    Add W3C scrollbar standards to the CSS classes:
    ```css
    .custom-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: rgba(0, 235, 247, 0.2) transparent;
    }
    ```

---

## 3. Recommended Remediation Plan

1.  **Resolve Hardcoded Logic:** Fix the level locking in `MissionSequence.jsx` by checking level sequence progression against user-completed tasks.
2.  **Unify Configuration variables:** Add `|| 'http://localhost:5000'` fallback to all fetch calls that read from `import.meta.env.VITE_API_URL`.
3.  **Refactor Leftover Pages:** Port forgot password, email verification, and password reset requests from port 7003 to the Node.js API server configuration, and apply dark-mode styling variables.
4.  **Optimise State & Navigation:** Set up localStorage keying inside `useTerminal.js` to preserve the user's active path context.
