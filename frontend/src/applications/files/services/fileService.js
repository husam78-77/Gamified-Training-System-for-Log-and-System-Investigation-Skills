/**
 * fileService.js
 * All API calls related to the File Manager application.
 * Matches backend: /api/files
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Fetch the incident's virtual filesystem — the exact same one the
 * Terminal reads from the Environment Engine. Pass sessionId so a saved
 * Investigation Report overlays the starter template here too (dev rule
 * #11 — File Manager and Terminal must show identical content).
 *
 * @param {string} incidentId - from the current investigation (InvestigationContext)
 * @param {number} [sessionId]
 * @returns {Promise<Array>}
 */
export const getFiles = async (incidentId, sessionId) => {
    const params = new URLSearchParams({ incidentId });
    if (sessionId) params.set('sessionId', sessionId);

    const response = await fetch(`${API_URL}/api/files?${params.toString()}`);

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch files');

    return data.data;
};
