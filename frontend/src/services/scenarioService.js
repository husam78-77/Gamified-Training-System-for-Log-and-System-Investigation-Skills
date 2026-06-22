/**
 * scenarioService.js
 * All API calls related to scenarios.
 * Matches backend: /api/scenarios
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Fetch all active scenarios grouped by type.
 * Used by MissionDashboard to render type cards.
 * Auth required.
 *
 * @param {string} token - JWT from AuthContext
 */
export const fetchAllScenarios = async (token) => {
    const response = await fetch(`${API_URL}/api/scenarios`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch scenarios');
    return data.data; // { grouped, total }
};

/**
 * Fetch all scenarios of a specific type.
 * Used by MissionSequence to render level cards.
 * Auth required.
 *
 * @param {string} type - e.g. 'bruteforce', 'script'
 * @param {string} token - JWT from AuthContext
 */
export const fetchScenariosByType = async (type, token) => {
    const response = await fetch(`${API_URL}/api/scenarios/type/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch scenarios');
    return data.data; // { scenarios: [] }
};

/**
 * Fetch a single scenario's meta + visible objectives.
 * Used by MissionBriefing.
 * Auth required.
 *
 * @param {number} scenarioId
 * @param {string} token - JWT from AuthContext
 */
export const fetchScenarioById = async (scenarioId, token) => {
    const response = await fetch(`${API_URL}/api/scenarios/${scenarioId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch scenario');
    return data.data; // { scenario, objectives }
};

/**
 * Fetch the full scenario payload to boot GamingEnvironment.
 * Returns: scenario meta, visible virtual files, hidden file metadata,
 *          expected steps, and all objectives (including secrets).
 * Auth required.
 *
 * @param {number} scenarioId
 * @param {string} token - JWT from AuthContext
 */
export const fetchFullScenarioData = async (scenarioId, token) => {
    const response = await fetch(`${API_URL}/api/scenarios/${scenarioId}/full`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to load scenario data');
    return data.data; // { scenario, virtualFiles, hiddenFilesMeta, expectedSteps, objectives }
};