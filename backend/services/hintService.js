/**
 * hintService.js  ← backend/services/hintService.js
 * Phase 5 — Passes isAutoTriggered to buildPrompt
 *
 * CHANGES FROM PHASE 4:
 *   1. generateHint() accepts isAutoTriggered parameter
 *   2. Passes it to buildPrompt() so ARIA's voice shifts for auto-pushed hints
 *   3. Everything else identical to Phase 4
 *
 * Path: backend/services/hintService.js
 */

const aiAdapter = require('./aiAdapter');
const { analyzePlayerState } = require('./playerStateAnalyzer');
const { buildPrompt } = require('../constants/promptConstants');

/**
 * @param {Object}  params
 * @param {Array}   params.commandHistory
 * @param {Array}   params.expectedSteps
 * @param {Array}   params.completedStepOrders
 * @param {Array}   params.previousHints
 * @param {string}  params.scenarioTitle
 * @param {string}  params.missionBrief
 * @param {Date}    params.sessionStartTime
 * @param {number}  params.hintLevel
 * @param {boolean} [params.isAutoTriggered=false]   ← Phase 5
 */
const generateHint = async ({
    commandHistory,
    expectedSteps,
    completedStepOrders,
    previousHints,
    scenarioTitle,
    missionBrief,
    sessionStartTime,
    hintLevel = 1,
    isAutoTriggered = false,   // Phase 5
}) => {
    const nextStep = expectedSteps.find(
        s => !completedStepOrders.includes(s.step_order)
    );

    const playerState = analyzePlayerState({
        commandHistory,
        nextStep,
        completedStepOrders,
        totalSteps: expectedSteps.length,
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
        nextStep,
        completedCount: completedStepOrders.length,
        totalSteps: expectedSteps.length,
        previousHints,
        hintLevel,
        isAutoTriggered, // Phase 5
    });

    const hintText = await aiAdapter.generate(prompt);
    const safeHint = sanitizeHint(hintText, nextStep);

    return {
        prompt,
        hint: safeHint,
        triggerCommands: recentCommands,
        playerState,
    };
};

// Sanitizer — unchanged from Phase 4
const sanitizeHint = (hintText, nextStep) => {
    if (!nextStep || !hintText) return hintText;

    const expectedCommand = nextStep.command_expected?.toLowerCase();
    const expectedPath = nextStep.target_path?.toLowerCase();
    let sanitized = hintText;

    if (expectedCommand) {
        const cmdRegex = new RegExp(`\\b${escapeRegex(expectedCommand)}\\b`, 'gi');
        sanitized = sanitized.replace(cmdRegex, '[REDACTED]');
    }
    if (expectedPath) {
        const pathRegex = new RegExp(escapeRegex(expectedPath), 'gi');
        sanitized = sanitized.replace(pathRegex, '[REDACTED]');
    }
    if (sanitized !== hintText) {
        console.warn('[HintSanitizer] Leaked content detected and redacted. Review prompt.');
    }

    return sanitized;
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { generateHint };