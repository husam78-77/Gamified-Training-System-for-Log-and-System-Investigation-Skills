/**
 * emailService.js
 * All API calls related to the Email application.
 * Matches backend: /api/email
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Fetch the incident's email list.
 *
 * @param {string} incidentId - from the current investigation (InvestigationContext)
 * @returns {Promise<Array>}
 */
export const getEmails = async (incidentId) => {
    const response = await fetch(`${API_URL}/api/email?incidentId=${encodeURIComponent(incidentId)}`);

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch emails');

    return data.data;
};
