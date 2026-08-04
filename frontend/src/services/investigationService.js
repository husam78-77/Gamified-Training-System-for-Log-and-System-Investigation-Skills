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
