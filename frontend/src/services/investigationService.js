/**
 * investigationService.js
 * All API calls related to the player's current investigation.
 * Matches backend: /api/investigation
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Fetch the current investigation (active session, scenario, and incident)
 * for the authenticated user.
 *
 * @param {string} token
 * @returns {Promise<{sessionId: number, scenarioId: number, incidentId: string, category: string, difficulty: string}>}
 */
export const getCurrentInvestigation = async (token) => {
    const response = await fetch(`${API_URL}/api/investigation/current`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch current investigation');

    return data.data;
};

/**
 * Fetch the player's Investigation Report — their saved content if
 * they've saved before, otherwise the incident's starter template.
 *
 * @param {string} token
 * @returns {Promise<{path: string, content: string, updatedAt: string|null}>}
 */
export const getReport = async (token) => {
    const response = await fetch(`${API_URL}/api/investigation/report`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch investigation report');

    return data.data;
};

/**
 * Save the player's Investigation Report content. May unlock the
 * INVESTIGATION_REPORT_COMPLETED discovery once the report is substantive.
 *
 * @param {string} content
 * @param {string} token
 * @returns {Promise<{content: string, updatedAt: string, unlockedDiscovery: object|null}>}
 */
export const saveReport = async (content, token) => {
    const response = await fetch(`${API_URL}/api/investigation/report`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to save investigation report');

    return data.data;
};

/**
 * Submit the active investigation: validates the report + terminal
 * history, freezes the session, awards XP/badges, and runs the AI Review.
 *
 * @param {string} token
 * @returns {Promise<{session, evaluation, xpAwarded, updatedUser, analytics, review, nextScenario}>}
 */
export const submitInvestigation = async (token) => {
    const response = await fetch(`${API_URL}/api/investigation/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    if (!response.ok) {
        const err = new Error(data.message || 'Submission failed');
        err.code = response.status;
        throw err;
    }

    return data.data;
};

/**
 * Fetch a previously generated AI Review for a session.
 *
 * @param {number} sessionId
 * @param {string} token
 * @returns {Promise<Object|null>}
 */
export const getReview = async (sessionId, token) => {
    const response = await fetch(`${API_URL}/api/investigation/review/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(data.message || 'Failed to fetch AI review');

    return data.data;
};

/**
 * Log a generic Investigation Event (Phase 5) — fire-and-forget, any
 * application can call this instead of getting a dedicated backend route.
 * Failures are swallowed: event logging must never block gameplay.
 *
 * @param {string} eventType - e.g. 'EMAIL_OPENED', 'ARTICLE_OPENED', 'APPLICATION_OPENED'
 * @param {Object} eventData
 * @param {string} token
 */
export const logEvent = (eventType, eventData, token) => {
    if (!token) return;
    fetch(`${API_URL}/api/investigation/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ eventType, eventData }),
    }).catch(() => { });
};
