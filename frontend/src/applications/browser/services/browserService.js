/**
 * browserService.js
 * All API calls related to the Knowledge Browser application.
 * Matches backend: /api/browser
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Fetch the incident's Knowledge Browser content (homePage + pages).
 *
 * @param {string} incidentId - from the current investigation (InvestigationContext)
 * @returns {Promise<{homePage: string, pages: Array}>}
 */
export const getBrowser = async (incidentId) => {
    const response = await fetch(`${API_URL}/api/browser?incidentId=${encodeURIComponent(incidentId)}`);

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch browser content');

    return data.data;
};
