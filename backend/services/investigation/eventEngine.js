/**
 * eventEngine.js
 * Generic Investigation Event system (Phase 5).
 *
 * Every application reports what the player did — opening an app, reading
 * a file, unlocking a discovery — as a flat, typed event. Events carry no
 * AI logic and no scenario-specific meaning; they are the raw material
 * Event Analytics (Phase 6) and ARIA (Phase 7) summarize and reason over.
 *
 * Terminal commands are the one exception: command_history is their single
 * official source (dev rule #28). There is intentionally no
 * COMMAND_EXECUTED event type — logging one here would duplicate what
 * command_history already records (dev rule #29). Anything that needs
 * command-derived metrics (counts, frequency, match rate) reads
 * command_history directly, the way analyticsEngine.js does.
 */

const investigationEventModel = require('../../models/investigationEventModel');

// The full set of events this platform recognizes. Kept as documentation
// and a light validation guard — not a hard enum, so a future incident's
// application never needs an engine change to log a new kind of moment.
const EVENT_TYPES = {
    APPLICATION_OPENED: 'APPLICATION_OPENED',
    APPLICATION_CLOSED: 'APPLICATION_CLOSED',
    FILE_OPENED: 'FILE_OPENED',
    FILE_EDITED: 'FILE_EDITED',
    FILE_SAVED: 'FILE_SAVED',
    EMAIL_OPENED: 'EMAIL_OPENED',
    ARTICLE_OPENED: 'ARTICLE_OPENED',
    DISCOVERY_UNLOCKED: 'DISCOVERY_UNLOCKED',
    OBJECTIVE_COMPLETED: 'OBJECTIVE_COMPLETED',
    REPORT_EDITED: 'REPORT_EDITED',
    REPORT_SAVED: 'REPORT_SAVED',
    REPORT_SUBMITTED: 'REPORT_SUBMITTED',
    HINT_REQUESTED: 'HINT_REQUESTED',
    SESSION_STARTED: 'SESSION_STARTED',
    SESSION_FINISHED: 'SESSION_FINISHED',
};

/**
 * Log one investigation event. Never throws into the caller's request path
 * — a logging failure must not break gameplay — errors are caught and
 * reported to the console only.
 *
 * @param {number} sessionId
 * @param {string} eventType - one of EVENT_TYPES
 * @param {Object} [eventData]
 */
const logEvent = async (sessionId, eventType, eventData = {}) => {
    try {
        await investigationEventModel.logEvent({ sessionId, eventType, eventData });
    } catch (err) {
        console.error(`[eventEngine] Failed to log ${eventType} for session ${sessionId}:`, err.message);
    }
};

/**
 * @param {number} sessionId
 * @returns {Promise<Array>} full event log, oldest first
 */
const getSessionEvents = async (sessionId) => investigationEventModel.getSessionEvents(sessionId);

module.exports = {
    EVENT_TYPES,
    logEvent,
    getSessionEvents,
};
