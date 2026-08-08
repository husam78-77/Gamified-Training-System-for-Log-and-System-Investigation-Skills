/**
 * analyticsEngine.js
 * Event Analytics (Phase 6).
 *
 * Builds behavioural summaries from Investigation Events, discoveries, and
 * command history. Analytics are derived data only — no AI logic lives
 * here (dev rule #16); AI Review (Phase 9) and ARIA consume these
 * summaries, applications never do.
 *
 * Command-derived metrics (counts, frequency, match rate) are computed
 * directly from command_history — the official source of terminal history
 * (dev rule #28) — never from investigation_events, which does not and
 * should not store commands (dev rule #29).
 */

const eventEngine = require('./eventEngine');
const objectiveEngine = require('./objectiveEngine');
const investigationDiscoveryModel = require('../../models/investigationDiscoveryModel');
const terminalModel = require('../../models/terminalModel');
const hintModel = require('../../models/hintModel');

const TOP_N = 5;

const uniqueValues = (list) => [...new Set(list.filter(Boolean))];

/**
 * Rank values by frequency, most-common first, capped at TOP_N. Used to
 * surface *methodology* signal (what did the player keep coming back to?)
 * that a plain unique-list can't show — e.g. a player who ran `grep` once
 * vs. one who ran it eight times looks identical in a unique list.
 *
 * @param {string[]} values
 * @param {string} keyName - property name for the value in each result row
 * @returns {Array<{[keyName]: string, count: number}>}
 */
const rankByFrequency = (values, keyName) => {
    const counts = new Map();
    for (const value of values) {
        if (!value) continue;
        counts.set(value, (counts.get(value) || 0) + 1);
    }
    return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, TOP_N)
        .map(([value, count]) => ({ [keyName]: value, count }));
};

/**
 * Build the analytics summary for a session.
 *
 * @param {Object} params
 * @param {number} params.sessionId
 * @param {Object} params.session      - sessions row (start_time, end_time)
 * @param {Array}  params.discoveries  - all discoveries for the incident
 * @param {Array}  params.objectives   - all objectives for the incident
 * @returns {Promise<Object>} analytics summary
 */
const buildAnalytics = async ({ sessionId, session, discoveries, objectives }) => {
    const [events, unlockedKeys, commandHistory, hintsUsed] = await Promise.all([
        eventEngine.getSessionEvents(sessionId),
        investigationDiscoveryModel.getUnlockedKeys(sessionId),
        terminalModel.getCommandHistory(sessionId),
        hintModel.countHintsUsed(sessionId),
    ]);

    const byType = (type) => events.filter(e => e.event_type === type);

    const applicationsUsed = uniqueValues(byType('APPLICATION_OPENED').map(e => e.event_data?.appId));
    const evidenceViewed = uniqueValues(byType('FILE_OPENED').map(e => e.event_data?.path));
    const articlesRead = uniqueValues(byType('ARTICLE_OPENED').map(e => e.event_data?.articleId));
    const emailsOpened = uniqueValues(byType('EMAIL_OPENED').map(e => e.event_data?.emailId));
    const commandsUsed = uniqueValues(commandHistory.map(c => (c.command_entered || '').trim().split(' ')[0]));

    // Methodology/efficiency signal: frequency, not just presence. A player
    // who grepped once and one who grepped eight times both show up in
    // commandsUsed identically — these surface the difference.
    const mostUsedCommands = rankByFrequency(
        commandHistory.map(c => (c.command_entered || '').trim().split(' ')[0].toLowerCase()),
        'command'
    );
    const mostInvestigatedFiles = rankByFrequency(
        byType('FILE_OPENED').map(e => e.event_data?.path),
        'path'
    );

    const matchedCommandCount = commandHistory.filter(c => c.match_expected).length;

    const completedObjectiveIds = objectiveEngine.resolveCompletedObjectives(objectives, unlockedKeys);

    const sessionEnd = session.end_time ? new Date(session.end_time) : new Date();
    const sessionDurationMs = sessionEnd - new Date(session.start_time);

    return {
        applicationsUsed,
        evidenceViewed,
        articlesRead,
        emailsOpened,
        commandsUsed,
        totalCommands: commandHistory.length,
        matchedCommandCount,
        unmatchedCommandCount: commandHistory.length - matchedCommandCount,
        mostUsedCommands,
        mostInvestigatedFiles,
        discoveriesFound: unlockedKeys,
        discoveriesFoundCount: unlockedKeys.length,
        totalDiscoveries: discoveries.length,
        objectivesCompleted: completedObjectiveIds,
        objectivesCompletedCount: completedObjectiveIds.length,
        totalObjectives: objectives.length,
        reportActivity: {
            edits: byType('REPORT_EDITED').length,
            saves: byType('REPORT_SAVED').length,
            submitted: byType('REPORT_SUBMITTED').length > 0,
        },
        hintsUsed,
        sessionDurationMs,
        sessionDurationMinutes: Math.round(sessionDurationMs / 60000),
    };
};

module.exports = {
    buildAnalytics,
};
