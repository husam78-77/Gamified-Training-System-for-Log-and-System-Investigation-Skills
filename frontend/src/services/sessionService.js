/**
 * sessionService.js
 * All API calls related to session lifecycle.
 * Matches backend: /api/sessions
 * All requests are authenticated (Bearer token).
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const authHeaders = (token) => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
});

/**
 * Start or resume a session when entering GamingEnvironment.
 * If an in_progress session already exists for this user+scenario,
 * the backend returns that session (resume).
 *
 * @param {number} scenarioId
 * @param {string} mode - 'timed' | 'free'
 * @param {string} token
 * @returns {{ session }} - session row
 */
export const startSession = async (scenarioId, mode, token) => {
    const response = await fetch(`${API_URL}/api/sessions/start`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ scenario_id: scenarioId, mode }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to start session');
    return data.data; // { session }
};

/**
 * Fetch a session by ID.
 * Used to validate session state on page load.
 *
 * @param {number} sessionId
 * @param {string} token
 */
export const getSession = async (sessionId, token) => {
    const response = await fetch(`${API_URL}/api/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch session');
    return data.data; // { session }
};

/**
 * Abandon a session — called on early exit in Timed Mode.
 * No score is saved. Session status → 'abandoned'.
 *
 * @param {number} sessionId
 * @param {string} token
 */
export const abandonSession = async (sessionId, token) => {
    const response = await fetch(`${API_URL}/api/sessions/${sessionId}/abandon`, {
        method: 'POST',
        headers: authHeaders(token),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to abandon session');
    return data.data; // { session }
};

/**
 * Complete a session — called when user ends the mission.
 * Triggers scoring, XP award, progress update, badge check.
 *
 * @param {number} sessionId
 * @param {string} token
 * @returns {{ evaluation, session, xpAwarded, updatedUser, completedObjectiveIds }}
 */
export const completeSession = async (sessionId, token) => {
    const response = await fetch(`${API_URL}/api/sessions/${sessionId}/complete`, {
        method: 'POST',
        headers: authHeaders(token),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to complete session');
    return data.data; // { evaluation, session, xpAwarded, updatedUser, completedObjectiveIds }
};