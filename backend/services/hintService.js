/**
 * hintService.js
 * Phase 7 — ARIA generates hints from Discoveries/Objectives/Events, never
 * from raw expected commands (development_rules.md #14).
 *
 * A hint targets the next incomplete objective. Since an objective can be
 * satisfied by any of several discoveries, and each discovery can be
 * triggered by any of several commands, there is no single "correct
 * command" left to redact — sanitizeHint instead strips any path-like or
 * command-like token as a generic backstop, regardless of scenario.
 */

const aiAdapter = require('./aiAdapter');
const { analyzePlayerState } = require('./playerStateAnalyzer');
const { buildPrompt } = require('../constants/promptConstants');

/**
 * @param {Object}   params
 * @param {Array}    params.commandHistory
 * @param {Object}   params.nextObjective     - The next incomplete objective (or null)
 * @param {string[]} params.candidateCommands - Base commands that would earn progress right now
 * @param {number}   params.completedCount
 * @param {number}   params.totalCount
 * @param {Array}    params.previousHints
 * @param {string}   params.scenarioTitle
 * @param {string}   params.missionBrief
 * @param {Date}     params.sessionStartTime
 * @param {number}   params.hintLevel
 * @param {boolean}  [params.isAutoTriggered=false]
 */
const generateHint = async ({
    commandHistory,
    nextObjective,
    candidateCommands,
    completedCount,
    totalCount,
    previousHints,
    scenarioTitle,
    missionBrief,
    sessionStartTime,
    hintLevel = 1,
    isAutoTriggered = false,
}) => {
    const playerState = analyzePlayerState({
        commandHistory,
        candidateCommands,
        completedCount,
        totalCount,
        sessionStartTime,
    });

    const recentCommands = commandHistory
        .slice(-5)
        .map(c => c.command_entered)
        .join(', ');

    const prompt = buildPrompt({
        scenarioTitle,
        missionBrief,
        recentCommands,
        playerState,
        nextObjective,
        completedCount,
        totalCount,
        previousHints,
        hintLevel,
        isAutoTriggered,
    });

    const hintText = await aiAdapter.generate(prompt);
    const safeHint = sanitizeHint(hintText);

    return {
        prompt,
        hint: safeHint,
        triggerCommands: recentCommands,
        playerState,
    };
};

/**
 * Generic leak backstop — ARIA's system prompt (HARD_RULES) already forbids
 * exact commands/paths/flags. This is a defensive net that redacts obvious
 * absolute paths and flag-style tokens if the model leaks one anyway. It
 * has no knowledge of any specific scenario's "correct" answer.
 */
const sanitizeHint = (hintText) => {
    if (!hintText) return hintText;
    let sanitized = hintText;

    // Absolute filesystem paths, e.g. /var/log/auth.log
    sanitized = sanitized.replace(/\/(?:[a-zA-Z0-9_.-]+\/)+[a-zA-Z0-9_.-]+/g, '[REDACTED]');

    // Flag-style arguments, e.g. -r, --recursive
    sanitized = sanitized.replace(/(?<=\s)--?[a-zA-Z][a-zA-Z-]*\b/g, '[REDACTED]');

    if (sanitized !== hintText) {
        console.warn('[HintSanitizer] Leaked content detected and redacted. Review prompt.');
    }

    return sanitized;
};

module.exports = { generateHint };
