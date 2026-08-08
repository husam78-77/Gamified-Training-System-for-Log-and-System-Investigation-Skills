/**
 * reportEngine.js
 * Generic Investigation Report engine (Phase 4).
 *
 * The report is a normal virtual file (seeded by the incident's evidence
 * pack, like any other) that becomes player-editable. Since the
 * Environment Engine rebuilds virtualFiles fresh on every request, the
 * player's edits are persisted separately (investigation_reports) and
 * overlaid back onto the file at that path — so Terminal and File Manager
 * always render the exact same, single source of truth.
 */

const { buildEnvironment } = require('../environment/environmentEngine');
const investigationReportModel = require('../../models/investigationReportModel');
const investigationDiscoveryModel = require('../../models/investigationDiscoveryModel');
const discoveryEngine = require('./discoveryEngine');
const eventEngine = require('./eventEngine');

const DEFAULT_REPORT_PATH = '/home/investigator/investigation_report.txt';
const REPORT_COMPLETION_DISCOVERY_KEY = 'INVESTIGATION_REPORT_COMPLETED';
const MIN_SUBSTANTIVE_GROWTH = 100; // characters beyond the starter template

/**
 * An incident may override where its report lives via incident.json's
 * "reportPath"; every incident that doesn't gets the same convention.
 */
const getReportPath = (incident) => incident.reportPath || DEFAULT_REPORT_PATH;

const findFile = (virtualFiles, filePath) => virtualFiles.find(f => f.file_path === filePath);

/**
 * Resolve the report the player currently sees: their saved content if
 * they've saved before, otherwise the incident's starter template.
 * @param {number} sessionId
 * @param {string} incidentId
 */
const getReport = async (sessionId, incidentId) => {
    const environment = await buildEnvironment(incidentId);
    const reportPath = getReportPath(environment.incident);
    const templateFile = findFile(environment.virtualFiles, reportPath);

    const saved = await investigationReportModel.getReport(sessionId);

    return {
        path: reportPath,
        content: saved ? saved.content : (templateFile ? templateFile.content : ''),
        updatedAt: saved ? saved.updated_at : null,
    };
};

/**
 * Overlay a session's saved report content onto an already-built
 * virtualFiles array, in place. Terminal and File Manager both call this
 * after buildEnvironment() so `cat`/File Manager preview show live edits
 * instead of the static starter template.
 *
 * @param {Array}  virtualFiles - from buildEnvironment(incidentId)
 * @param {Object} incident     - from buildEnvironment(incidentId)
 * @param {number} sessionId
 * @returns {Promise<Array>} the same array, mutated
 */
const applyReportOverlay = async (virtualFiles, incident, sessionId) => {
    const saved = await investigationReportModel.getReport(sessionId);
    if (!saved) return virtualFiles;

    const reportPath = getReportPath(incident);
    const file = findFile(virtualFiles, reportPath);
    if (file) file.content = saved.content;

    return virtualFiles;
};

const isSubstantive = (content, templateContent) => {
    const trimmedLen = (content || '').trim().length;
    const templateLen = (templateContent || '').trim().length;
    return trimmedLen >= templateLen + MIN_SUBSTANTIVE_GROWTH;
};

/**
 * Save the player's report content.
 *
 * If the report has grown substantively beyond the starter template and
 * the incident defines an INVESTIGATION_REPORT_COMPLETED discovery, that
 * discovery is unlocked — this is the one discovery the Discovery Engine
 * doesn't reach via a terminal command trigger, since "wrote a report" is
 * an authoring action, not an investigative command.
 *
 * @param {Object} params
 * @param {number} params.sessionId
 * @param {string} params.incidentId
 * @param {string} params.content
 * @returns {Promise<{report: Object, unlockedDiscovery: Object|null}>}
 */
const saveReport = async ({ sessionId, incidentId, content }) => {
    const environment = await buildEnvironment(incidentId);
    const reportPath = getReportPath(environment.incident);
    const templateFile = findFile(environment.virtualFiles, reportPath);
    const templateContent = templateFile ? templateFile.content : '';

    const saved = await investigationReportModel.saveReport(sessionId, content);
    await eventEngine.logEvent(sessionId, eventEngine.EVENT_TYPES.REPORT_SAVED, { length: content.length });

    let unlockedDiscovery = null;
    if (isSubstantive(content, templateContent)) {
        const discoveries = await discoveryEngine.getDiscoveries(incidentId);
        const reportDiscovery = discoveries.find(d => d.key === REPORT_COMPLETION_DISCOVERY_KEY);

        if (reportDiscovery) {
            const inserted = await investigationDiscoveryModel.saveDiscovery({
                sessionId,
                discoveryKey: reportDiscovery.key,
                triggeredByCommand: 'report_saved',
            });
            if (inserted) {
                unlockedDiscovery = reportDiscovery;
                await eventEngine.logEvent(sessionId, eventEngine.EVENT_TYPES.DISCOVERY_UNLOCKED, {
                    key: reportDiscovery.key,
                    source: 'report',
                });
            }
        }
    }

    return { report: saved, unlockedDiscovery };
};

module.exports = {
    getReportPath,
    getReport,
    applyReportOverlay,
    saveReport,
};
