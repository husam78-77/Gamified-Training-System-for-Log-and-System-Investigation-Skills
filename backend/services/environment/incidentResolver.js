/**
 * incidentResolver.js
 * The scenarios table has no incidentId column — this is the single place
 * that bridges a scenario's `type` to the content/incidents/<incidentId>/
 * folder that represents it, so nothing else has to hardcode that mapping.
 */

const SCENARIO_TYPE_TO_INCIDENT = {
    bruteforce: 'ssh_bruteforce',
    script: 'suspicious_script',
    ssh_forensics: 'ssh_forensics',
};

/**
 * @param {string} scenarioType - a scenario row's `type` column
 * @returns {string} incidentId
 */
const resolveIncidentId = (scenarioType) => {
    const incidentId = SCENARIO_TYPE_TO_INCIDENT[scenarioType];
    if (!incidentId) {
        throw new Error(`No incident mapped for scenario type "${scenarioType}"`);
    }
    return incidentId;
};

module.exports = {
    resolveIncidentId,
};
