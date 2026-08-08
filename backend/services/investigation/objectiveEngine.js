/**
 * objectiveEngine.js
 * Generic, content-driven objective engine (Phase 3).
 *
 * Objectives describe investigation goals. They depend ONLY on Discoveries
 * — never on commands, filenames, or specific applications — so the same
 * engine works for every future incident without modification.
 *
 * Objectives are loaded from an incident's objectives.json.
 *
 * Public API:
 *   getObjectives(incidentId)                              → objectives[]
 *   resolveCompletedObjectives(objectives, unlockedKeys)    → completed objective ids[]
 *   calculateCompletionPercent(objectives, completedIds)    → 0-100 integer
 */

const { loadIncidentContent } = require('../environment/environmentEngine');

/**
 * Load an incident's objectives.json.
 * @param {string} incidentId
 * @returns {Promise<Array>} objectives, each with { id, title, description, requiredDiscoveries }
 */
const getObjectives = async (incidentId) => loadIncidentContent(incidentId, 'objectives.json');

/**
 * An objective is complete once every discovery it requires has been
 * unlocked. Objectives with an empty requiredDiscoveries list never
 * auto-complete (an objective must require at least one discovery).
 *
 * @param {Array}    objectives   - objectives.json contents
 * @param {string[]} unlockedKeys - discovery keys unlocked this session
 * @returns {string[]} completed objective ids
 */
const resolveCompletedObjectives = (objectives, unlockedKeys) => {
    return objectives
        .filter(obj => {
            const required = obj.requiredDiscoveries || [];
            return required.length > 0 && required.every(key => unlockedKeys.includes(key));
        })
        .map(obj => obj.id);
};

/**
 * @param {Array}    objectives
 * @param {string[]} completedIds
 * @returns {number} 0-100
 */
const calculateCompletionPercent = (objectives, completedIds) => {
    if (!objectives || objectives.length === 0) return 0;
    return Math.round((completedIds.length / objectives.length) * 100);
};

module.exports = {
    getObjectives,
    resolveCompletedObjectives,
    calculateCompletionPercent,
};
