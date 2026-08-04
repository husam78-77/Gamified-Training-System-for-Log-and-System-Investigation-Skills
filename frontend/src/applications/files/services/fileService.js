/**
 * fileService.js
 * All API calls related to the File Manager application.
 * Matches backend: /api/files
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Fetch the incident's virtual filesystem — the exact same one the
 * Terminal reads from the Environment Engine.
 *
 * @param {string} incidentId - from the current investigation (InvestigationContext)
 * @returns {Promise<Array>}
 */
export const getFiles = async (incidentId) => {
    const response = await fetch(`${API_URL}/api/files?incidentId=${encodeURIComponent(incidentId)}`);

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch files');

    return data.data;
};
