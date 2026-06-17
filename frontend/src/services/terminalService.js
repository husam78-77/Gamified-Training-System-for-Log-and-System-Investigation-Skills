/**
 * terminalService.js
 * All API calls related to terminal command execution.
 * Matches backend: /api/terminal
 * All requests are authenticated (Bearer token).
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const authHeaders = (token) => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
});

/**
 * Send a terminal command to the backend for processing.
 *
 * The backend will:
 *  - Parse the command
 *  - Match it against expected steps
 *  - Build filesystem output
 *  - Return newly revealed files and objective updates
 *
 * @param {number} sessionId
 * @param {string} command      - Raw command string the user typed
 * @param {string} currentPath  - User's current directory in the virtual FS
 * @param {string} token
 *
 * @returns {{
 *   output: string,             - Text to write to xterm.js
 *   matched: boolean,           - Whether this command matched an expected step
 *   matchedStep: object|null,   - Step info if matched
 *   newlyRevealedFiles: array,  - Files now visible after this step
 *   completedObjectiveIds: array - Objectives completed by this step
 * }}
 */
export const executeCommand = async (sessionId, command, currentPath, token) => {
    const response = await fetch(`${API_URL}/api/terminal/execute`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({
            session_id: sessionId,
            command,
            current_path: currentPath,
        }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Command execution failed');
    return data.data;
};

/**
 * Fetch the full command history for a session.
 * Used to restore the terminal output on page refresh.
 *
 * @param {number} sessionId
 * @param {string} token
 * @returns {{ history: array }}
 */
export const fetchCommandHistory = async (sessionId, token) => {
    const response = await fetch(`${API_URL}/api/terminal/history/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch command history');
    return data.data; // { history }
};

/**
 * Fetch the rehydration snapshot for a resumed session: objectives already
 * completed and hidden files already revealed, computed server-side from
 * this session's full command/discovery history.
 *
 * Used on mount to resync the UI after a page refresh, instead of waiting
 * for the next command to bring this state back.
 *
 * @param {number} sessionId
 * @param {string} token
 * @returns {{ completedObjectiveIds: number[], revealedFiles: array }}
 */
export const fetchResumeState = async (sessionId, token) => {
    const response = await fetch(`${API_URL}/api/terminal/resume/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch session resume state');
    return data.data; // { completedObjectiveIds, revealedFiles }
};