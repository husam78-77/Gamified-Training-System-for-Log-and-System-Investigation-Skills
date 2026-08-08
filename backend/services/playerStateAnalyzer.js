/**
 * playerStateAnalyzer.js
 * Phase 1 — Player State Intelligence Layer
 *
 * Analyzes raw command history and session timing to produce a
 * structured PlayerState object. This object is the single input
 * that drives hint strength, prompt tone, and auto-trigger logic
 * in all subsequent phases.
 *
 * Called by: hintService.js → generateHint()
 * Reads from: command_history rows (already loaded by hintController)
 *
 * DETECTS:
 *   - repetition          → player is looping the same wrong command
 *   - exploration         → player is trying diverse but incorrect commands
 *   - random thrashing    → no pattern, high entropy, no progress
 *   - proximity           → player's last command is close to the correct one
 *   - time pressure       → long idle gap since last command
 *   - stall               → no commands entered for > STALL_THRESHOLD_MS
 *
 * OUTPUT: PlayerState object (see buildPlayerState return shape)
 *
 * Path: backend/services/playerStateAnalyzer.js
 */

// ─── Thresholds ────────────────────────────────────────────────────────────

/** Ms of silence before we consider the player stalled */
const STALL_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

/** Ms of silence before we treat idle as "stuck a long time" */
const LONG_IDLE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

/** How many of the most recent commands to use for pattern analysis */
const ANALYSIS_WINDOW = 8;

/** Ratio of repeated commands above which we flag repetition */
const REPETITION_RATIO_THRESHOLD = 0.5;

/** Minimum unique commands to consider "exploration" (not random) */
const EXPLORATION_MIN_UNIQUE = 3;

/** Levenshtein distance ≤ this means "close to correct" */
const PROXIMITY_DISTANCE_THRESHOLD = 4;

// ─── Main export ────────────────────────────────────────────────────────────

/**
 * Analyze the player's command history and current session state.
 *
 * @param {Object}   params
 * @param {Array}    params.commandHistory        - All command_history rows for this session
 * @param {string[]} [params.candidateCommands]   - Base command verbs that would earn progress right now (from Discoveries), used for proximity detection instead of a single "correct" command
 * @param {number}   params.completedCount        - Objectives/discoveries already completed
 * @param {number}   params.totalCount            - Total objectives/discoveries for the scenario
 * @param {Date}     params.sessionStartTime      - When the session started (session.start_time)
 *
 * @returns {PlayerState}
 */
const analyzePlayerState = ({
    commandHistory,
    candidateCommands = [],
    completedCount,
    totalCount,
    sessionStartTime,
}) => {
    const now = Date.now();

    // ── Slice to analysis window (most recent N commands) ────────────────
    const recentHistory = commandHistory.slice(-ANALYSIS_WINDOW);
    const wrongHistory = getWrongCommandsSinceLastMatch(commandHistory);

    // ── Time analysis ────────────────────────────────────────────────────
    const lastCommandTime = getLastCommandTime(commandHistory);
    const timeSinceLastCmd = lastCommandTime ? now - lastCommandTime : null;
    const sessionAgeMs = sessionStartTime ? now - new Date(sessionStartTime).getTime() : 0;

    const isStalled = timeSinceLastCmd !== null && timeSinceLastCmd > STALL_THRESHOLD_MS;
    const isLongIdle = timeSinceLastCmd !== null && timeSinceLastCmd > LONG_IDLE_THRESHOLD_MS;

    // ── Repetition detection ─────────────────────────────────────────────
    const repetitionResult = detectRepetition(recentHistory);

    // ── Behavior classification ──────────────────────────────────────────
    const behaviorType = classifyBehavior(recentHistory, wrongHistory);

    // ── Proximity to correct answer ──────────────────────────────────────
    const proximityResult = detectProximity(commandHistory, candidateCommands);

    // ── Progress metrics ─────────────────────────────────────────────────
    const completionRatio = totalCount > 0 ? completedCount / totalCount : 0;
    const wrongSinceMatch = wrongHistory.length;

    // ── Composite stuck score (0–100) ────────────────────────────────────
    // Higher = more stuck. Used to select hint level and prompt tone.
    const stuckScore = computeStuckScore({
        wrongSinceMatch,
        isStalled,
        isLongIdle,
        isRepeating: repetitionResult.isRepeating,
        behaviorType,
        proximityResult,
    });

    return {
        // Raw counts
        wrongCommandCount: wrongSinceMatch,
        totalCommandCount: commandHistory.length,
        completedCount,
        totalCount,
        completionRatio,

        // Time signals
        timeSinceLastCommandMs: timeSinceLastCmd,
        sessionAgeMs,
        isStalled,
        isLongIdle,

        // Behavior signals
        behaviorType,           // 'repeating' | 'exploring' | 'thrashing' | 'progressing' | 'idle'
        isRepeating: repetitionResult.isRepeating,
        repeatedCommand: repetitionResult.repeatedCommand,
        repetitionCount: repetitionResult.repetitionCount,

        // Proximity signal
        isClose: proximityResult.isClose,
        proximityDistance: proximityResult.distance,
        closestCommand: proximityResult.closestCommand,

        // Composite score
        stuckScore,            // 0–100 (100 = maximally stuck)

        // Human-readable label for prompt injection
        stuckLabel: getStuckLabel(stuckScore),
    };
};

// ─── Repetition Detection ────────────────────────────────────────────────────

/**
 * Detect if the player is repeating the same wrong command.
 * We check the WRONG commands only (since last correct match).
 *
 * @param {Array} recentHistory - Slice of command_history rows
 * @returns {{ isRepeating: boolean, repeatedCommand: string|null, repetitionCount: number }}
 */
const detectRepetition = (recentHistory) => {
    const wrongCmds = recentHistory
        .filter(c => !c.match_expected)
        .map(c => normalizeCommand(c.command_entered));

    if (wrongCmds.length < 2) {
        return { isRepeating: false, repeatedCommand: null, repetitionCount: 0 };
    }

    // Count frequency of each command
    const freq = {};
    wrongCmds.forEach(cmd => {
        freq[cmd] = (freq[cmd] || 0) + 1;
    });

    // Find the most-repeated command
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    const [topCmd, topCount] = sorted[0];

    const ratio = topCount / wrongCmds.length;
    const isRepeating = ratio >= REPETITION_RATIO_THRESHOLD && topCount >= 2;

    return {
        isRepeating,
        repeatedCommand: isRepeating ? topCmd : null,
        repetitionCount: isRepeating ? topCount : 0,
    };
};

// ─── Behavior Classification ─────────────────────────────────────────────────

/**
 * Classify the player's overall behavior pattern.
 *
 * Returns one of:
 *   'progressing' → mostly correct commands, moving forward
 *   'repeating'   → stuck on the same wrong command
 *   'exploring'   → trying diverse wrong commands systematically
 *   'thrashing'   → many wrong commands with no clear pattern
 *   'idle'        → very few commands entered at all
 *
 * @param {Array} recentHistory  - Slice of command_history rows
 * @param {Array} wrongHistory   - Wrong commands since last correct match
 * @returns {string}
 */
const classifyBehavior = (recentHistory, wrongHistory) => {
    if (recentHistory.length === 0) return 'idle';

    const correctCount = recentHistory.filter(c => c.match_expected).length;
    const correctRatio = correctCount / recentHistory.length;

    // Mostly correct → progressing
    if (correctRatio >= 0.5) return 'progressing';

    if (wrongHistory.length === 0) return 'progressing';

    // Check repetition
    const { isRepeating } = detectRepetition(recentHistory);
    if (isRepeating) return 'repeating';

    // Check exploration: are they trying different things?
    const uniqueWrongCmds = new Set(
        wrongHistory.map(c => normalizeCommand(c.command_entered))
    );

    if (uniqueWrongCmds.size >= EXPLORATION_MIN_UNIQUE) {
        return 'exploring';
    }

    // Default: random/thrashing
    return 'thrashing';
};

// ─── Proximity Detection ─────────────────────────────────────────────────────

/**
 * Detect if the player's most recent command is "close" to earning progress.
 * Uses Levenshtein distance on the base command (first token only) against
 * every candidate command that would currently unlock a needed discovery.
 *
 * "close" means the player likely has the right tool but the wrong target
 * or search term. This should produce a more confirmatory hint ("you're on
 * the right track") rather than a redirectional one.
 *
 * Unlike a single "correct command", candidateCommands is derived from
 * Discoveries — there is no one right answer, only tools that currently
 * matter. This keeps proximity detection content-driven (dev rule #14).
 *
 * @param {Array}    commandHistory    - Full command history
 * @param {string[]} candidateCommands - Base command verbs that would earn progress right now
 * @returns {{ isClose: boolean, distance: number|null, closestCommand: string|null }}
 */
const detectProximity = (commandHistory, candidateCommands) => {
    const NULL_RESULT = { isClose: false, distance: null, closestCommand: null };

    if (!candidateCommands || candidateCommands.length === 0 || commandHistory.length === 0) {
        return NULL_RESULT;
    }

    // Check last 3 commands only (recency matters for proximity)
    const recents = commandHistory.slice(-3).map(c => c.command_entered?.toLowerCase()?.split(' ')[0] || '');

    let minDistance = Infinity;
    let closestCmd = null;

    for (const cmd of recents) {
        if (!cmd) continue;
        for (const candidate of candidateCommands) {
            const dist = levenshtein(cmd, candidate.toLowerCase());
            if (dist < minDistance) {
                minDistance = dist;
                closestCmd = cmd;
            }
        }
    }

    const isClose = minDistance <= PROXIMITY_DISTANCE_THRESHOLD;

    return {
        isClose,
        distance: minDistance === Infinity ? null : minDistance,
        closestCommand: closestCmd,
    };
};

// ─── Stuck Score ─────────────────────────────────────────────────────────────

/**
 * Compute a 0–100 stuck score.
 * Higher score = player needs stronger/more explicit hint.
 *
 * Scoring breakdown:
 *   Wrong commands since match  → up to 40 pts
 *   Stall / long idle           → up to 25 pts
 *   Repetition                  → up to 20 pts
 *   Behavior type               → up to 15 pts
 *   Proximity (reduces score)   → up to -10 pts
 */
const computeStuckScore = ({
    wrongSinceMatch,
    isStalled,
    isLongIdle,
    isRepeating,
    behaviorType,
    proximityResult,
}) => {
    let score = 0;

    // Wrong command count (capped at 10 for full 40 pts)
    score += Math.min(wrongSinceMatch, 10) * 4;

    // Time signals
    if (isLongIdle) score += 25;
    else if (isStalled) score += 12;

    // Repetition
    if (isRepeating) score += 20;

    // Behavior type
    if (behaviorType === 'thrashing') score += 15;
    else if (behaviorType === 'exploring') score += 8;
    else if (behaviorType === 'idle') score += 5;

    // Proximity reduces score (player is close, doesn't need big hint)
    if (proximityResult.isClose) score = Math.max(0, score - 10);

    return Math.min(score, 100);
};

// ─── Stuck Label ─────────────────────────────────────────────────────────────

/**
 * Convert numeric stuck score to a human-readable label
 * that is injected directly into AI prompts.
 *
 * @param {number} score
 * @returns {string}
 */
const getStuckLabel = (score) => {
    if (score >= 70) return 'critically stuck — has been trying for a long time with no progress';
    if (score >= 45) return 'significantly stuck — multiple failed attempts, needs clearer direction';
    if (score >= 20) return 'somewhat stuck — a few wrong attempts, needs a nudge';
    return 'exploring — making attempts, may just need confirmation';
};

// ─── Utility Helpers ─────────────────────────────────────────────────────────

/**
 * Get all wrong commands entered since the last matched step.
 * Scans from the end of history backwards until a match is found.
 *
 * @param {Array} commandHistory
 * @returns {Array} - Subset of command_history rows
 */
const getWrongCommandsSinceLastMatch = (commandHistory) => {
    const wrong = [];
    for (let i = commandHistory.length - 1; i >= 0; i--) {
        if (commandHistory[i].match_expected) break;
        wrong.unshift(commandHistory[i]);
    }
    return wrong;
};

/**
 * Get the timestamp of the most recent command as a JS Date ms timestamp.
 *
 * @param {Array} commandHistory
 * @returns {number|null}
 */
const getLastCommandTime = (commandHistory) => {
    if (commandHistory.length === 0) return null;
    const last = commandHistory[commandHistory.length - 1];
    return last.timestamp ? new Date(last.timestamp).getTime() : null;
};

/**
 * Normalize a command string for comparison:
 * - Lowercase
 * - Trim whitespace
 * - Collapse multiple spaces
 * - Extract base command (first token) for pattern analysis
 *
 * @param {string} cmd
 * @returns {string}
 */
const normalizeCommand = (cmd) => {
    if (!cmd) return '';
    return cmd.toLowerCase().trim().replace(/\s+/g, ' ').split(' ')[0];
};

/**
 * Compute Levenshtein edit distance between two strings.
 * Used for proximity detection between player input and expected command.
 *
 * Classic DP implementation — O(m*n) time, O(m*n) space.
 * Strings are short (commands), so this is negligible.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
const levenshtein = (a, b) => {
    if (!a) return b?.length || 0;
    if (!b) return a.length;

    const m = a.length;
    const n = b.length;

    // dp[i][j] = edit distance between a[0..i-1] and b[0..j-1]
    const dp = Array.from({ length: m + 1 }, (_, i) =>
        Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (a[i - 1] === b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(
                    dp[i - 1][j],     // deletion
                    dp[i][j - 1],     // insertion
                    dp[i - 1][j - 1]  // substitution
                );
            }
        }
    }

    return dp[m][n];
};

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
    analyzePlayerState,
    detectRepetition,
    detectProximity,
    classifyBehavior,
    computeStuckScore,
    levenshtein,
};