/**
 * sessionService.js
 * All API calls related to session lifecycle.
 *
 * KEY CHANGE: startSession no longer sends scenario_id.
 * The backend determines which scenario to assign.
 * The backend returns both the session AND the scenario in the response.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const authHeaders = (token) => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
});

/**
 * Start or resume a session.
 * Sends ONLY mode — backend assigns the correct scenario.
 *
 * @param {string} mode   - 'timed' | 'free'
 * @param {string} token
 * @returns {{
 *   session:  Object,    - session row
 *   scenario: Object,    - scenario row (what the backend assigned)
 *   resumed:  boolean    - true if an existing session was resumed
 * }}
 */
export const startSession = async (mode, token, scenario_id) => {
    const res = await fetch(`${API_URL}/api/sessions/start`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ mode, scenario_id }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to start session');

    return data.data; // { session, scenario, resumed }
};
/**
 * Get the next scenario for this user without creating a session.
 * Use this on the MissionSequence/Briefing pages to show what comes next.
 *
 * @param {string} token
 * @returns {{ scenario: Object|null, allComplete: boolean }}
 */
export const getNextScenario = async (token) => {
    const res = await fetch(`${API_URL}/api/sessions/next-scenario`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to get next scenario');
    return data.data; // { scenario, allComplete }
};

/**
 * Fetch a session by ID.
 *
 * @param {number} sessionId
 * @param {string} token
 */
export const getSession = async (sessionId, token) => {
    const res = await fetch(`${API_URL}/api/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch session');
    return data.data; // { session }
};

/**
 * Abandon a session — timed mode early exit.
 * No score saved, no progress recorded.
 *
 * @param {number} sessionId
 * @param {string} token
 */
export const abandonSession = async (sessionId, token) => {
    const res = await fetch(`${API_URL}/api/sessions/${sessionId}/abandon`, {
        method: 'POST',
        headers: authHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to abandon session');
    return data.data; // { session }
};

/**
 * Complete a session.
 * Returns evaluation, XP, and the NEXT scenario to play.
 * Frontend should navigate to the next scenario using nextScenario from the response.
 *
 * @param {number} sessionId
 * @param {string} token
 * @returns {{
 *   evaluation:           Object,
 *   session:              Object,
 *   missionCompleted:     boolean,
 *   xpAwarded:            number,
 *   updatedUser:          Object,
 *   completedObjectiveIds: number[],
 *   nextScenario:         Object|null  ← use this for navigation
 * }}
 */
export const completeSession = async (sessionId, token) => {
    const res = await fetch(`${API_URL}/api/sessions/${sessionId}/complete`, {
        method: 'POST',
        headers: authHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to complete session');
    return data.data;
};