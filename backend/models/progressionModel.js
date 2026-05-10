/**
 * progressionModel.js
 * Single source of truth for user progression.
 *
 * This model owns:
 * - Reading user progress per scenario
 * - Determining the next scenario a user should play
 * - Upserting progress after completion
 * - XP and level updates
 * - Badge awards
 *
 * Previously these were split between hintModel and nowhere.
 * Everything progression-related lives here now.
 */

const pool = require('../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESSION QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all user_progress rows for a user.
 * Returns a map of { scenario_id → progress_row } for O(1) lookup.
 */
const getUserProgressMap = async (userId) => {
    const result = await pool.query(
        `SELECT scenario_id, highest_score, completed
         FROM user_progress
         WHERE user_id = $1`,
        [userId]
    );

    const map = {};
    result.rows.forEach(row => {
        map[row.scenario_id] = row;
    });
    return map;
};

/**
 * Get progress for a single scenario.
 */
const getUserProgressForScenario = async (userId, scenarioId) => {
    const result = await pool.query(
        `SELECT * FROM user_progress
         WHERE user_id = $1 AND scenario_id = $2`,
        [userId, scenarioId]
    );
    return result.rows[0] || null;
};

/**
 * getNextScenarioForUser — THE single source of truth for progression.
 *
 * Algorithm:
 * 1. Load all active scenarios ordered by scenario_order ASC (deterministic)
 * 2. Load all completed scenario_ids for this user
 * 3. Walk the ordered list — return the first scenario the user has NOT completed
 * 4. If all completed → return null (user has finished all scenarios)
 *
 * This runs entirely in the DB — no frontend input influences the result.
 *
 * @param {number} userId
 * @returns {Object|null} scenario row or null if all done
 */
const getNextScenarioForUser = async (userId) => {
    const result = await pool.query(
        `SELECT s.*
         FROM scenarios s
         LEFT JOIN user_progress up
           ON up.scenario_id = s.scenario_id
           AND up.user_id = $1
           AND up.completed = TRUE
         WHERE s.is_active = TRUE
           AND up.scenario_id IS NULL
         ORDER BY s.scenario_order ASC
         LIMIT 1`,
        [userId]
    );

    return result.rows[0] || null;
};

/**
 * Check whether a user has completed a specific scenario.
 */
const hasUserCompletedScenario = async (userId, scenarioId) => {
    const result = await pool.query(
        `SELECT completed FROM user_progress
         WHERE user_id = $1 AND scenario_id = $2`,
        [userId, scenarioId]
    );
    return result.rows[0]?.completed === true;
};

/**
 * Get the scenario the user is ALLOWED to play right now.
 *
 * Rules:
 * 1. If user has an in_progress session → return that session's scenario
 *    (resume, don't create new)
 * 2. Otherwise → return getNextScenarioForUser result
 *
 * This is the gatekeeper called by startSession.
 *
 * @param {number} userId
 * @returns {{ scenario: Object, resumeSession: Object|null }}
 */
const getAuthorizedScenarioForUser = async (userId) => {
    // Check for any in_progress session first
    const activeSession = await pool.query(
        `SELECT s.*, sc.*
         FROM sessions s
         JOIN scenarios sc ON sc.scenario_id = s.scenario_id
         WHERE s.user_id = $1 AND s.status = 'in_progress'
         ORDER BY s.start_time DESC
         LIMIT 1`,
        [userId]
    );

    if (activeSession.rows.length > 0) {
        const row = activeSession.rows[0];
        return {
            resumeSession: {
                session_id: row.session_id,
                scenario_id: row.scenario_id,
                mode: row.mode,
                start_time: row.start_time,
                status: row.status,
                user_id: row.user_id,
            },
            scenario: null, // Not needed when resuming
        };
    }

    // No active session — get next scenario by progression
    const scenario = await getNextScenarioForUser(userId);
    return { resumeSession: null, scenario };
};

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS WRITES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upsert user progress after mission completion.
 * - Never downgrades completed from true → false
 * - Always keeps the highest score
 *
 * @param {number} userId
 * @param {number} scenarioId
 * @param {number} score
 * @param {boolean} completed
 */
const upsertUserProgress = async ({ userId, scenarioId, score, completed }) => {
    const result = await pool.query(
        `INSERT INTO user_progress (user_id, scenario_id, highest_score, completed)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, scenario_id) DO UPDATE SET
             highest_score = GREATEST(user_progress.highest_score, EXCLUDED.highest_score),
             -- Never downgrade completed: once true, always true
             completed = user_progress.completed OR EXCLUDED.completed
         RETURNING *`,
        [userId, scenarioId, score, completed]
    );
    return result.rows[0];
};

/**
 * Award XP to a user and recalculate level.
 * Uses a DB-level update to prevent race conditions with concurrent requests.
 * Level formula: every 1000 XP = 1 level.
 */
const addXpToUser = async (userId, xpAmount) => {
    if (!xpAmount || xpAmount <= 0) return null;

    const result = await pool.query(
        `UPDATE users
         SET
             xp    = xp + $2,
             level = FLOOR((xp + $2) / 1000) + 1
         WHERE user_id = $1
         RETURNING user_id, username, xp, level`,
        [userId, xpAmount]
    );
    return result.rows[0] || null;
};

/**
 * Award a badge. ON CONFLICT DO NOTHING prevents duplicates.
 */
const awardBadge = async ({ userId, scenarioId, badgeName, badgeType }) => {
    const result = await pool.query(
        `INSERT INTO badges (user_id, scenario_id, badge_name, badge_type, awarded_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, scenario_id, badge_name) DO NOTHING
         RETURNING *`,
        [userId, scenarioId, badgeName, badgeType]
    );
    return result.rows[0] || null;
};

/**
 * Get a user's full progression overview.
 * Used by the dashboard to show completion state.
 */
const getUserProgressOverview = async (userId) => {
    const result = await pool.query(
        `SELECT
             s.scenario_id,
             s.title,
             s.type,
             s.difficulty,
             s.scenario_order,
             COALESCE(up.completed, FALSE)     AS completed,
             COALESCE(up.highest_score, 0)     AS highest_score
         FROM scenarios s
         LEFT JOIN user_progress up
           ON up.scenario_id = s.scenario_id
           AND up.user_id = $1
         WHERE s.is_active = TRUE
         ORDER BY s.scenario_order ASC`,
        [userId]
    );
    return result.rows;
};

// ─────────────────────────────────────────────────────────────────────────────
// INVESTIGATOR PROGRESSION PAGE — Aggregated career data
// ─────────────────────────────────────────────────────────────────────────────

const RANK_THRESHOLDS = [
    { rank: 'TRAINEE',     xpBase: 0,     xpTarget: 2000,  description: 'Initial field access granted. Investigation protocols initialized.' },
    { rank: 'OPERATIVE',   xpBase: 2000,  xpTarget: 5000,  description: 'Core investigation skills confirmed. Field deployment authorized.' },
    { rank: 'INFILTRATOR', xpBase: 5000,  xpTarget: 10000, description: 'Advanced forensic techniques mastered. Deep cover clearance granted.' },
    { rank: 'PHANTOM',     xpBase: 10000, xpTarget: 20000, description: 'Ghost-level operational presence. System-wide investigation access.' },
    { rank: 'MASTER_NODE', xpBase: 20000, xpTarget: 35000, description: 'Absolute investigative authority. Highest clearance tier achieved.' },
];

function _computeRankFromXp(xp) {
    let current = RANK_THRESHOLDS[0];
    for (const tier of RANK_THRESHOLDS) {
        if (xp >= tier.xpBase) current = tier;
        else break;
    }
    const range = current.xpTarget - current.xpBase;
    const progress = Math.max(0, xp - current.xpBase);
    const xpPercent = Math.min(100, Math.round((progress / range) * 100));
    return { rank: current.rank, xpBase: current.xpBase, xpTarget: current.xpTarget, xpPercent };
}

function _computeClearanceTier(avgScore, missionsCompleted) {
    if (missionsCompleted === 0) return 'CLEARANCE_PENDING';
    if (avgScore >= 90) return 'OMEGA_CLEARANCE';
    if (avgScore >= 75) return 'ELITE_CLEARANCE';
    if (avgScore >= 60) return 'SENIOR_CLEARANCE';
    if (avgScore >= 40) return 'FIELD_CLEARANCE';
    return 'RESTRICTED_ACCESS';
}

function _computeInvestigationStyle({ sessions, noHintSessionCount, avgScore, discoveryRate, avgCommandsPerSession, avgHintsPerSession }) {
    if (sessions.length === 0) {
        return {
            classification: 'Field Operative',
            archetype: 'FIELD_TRACE',
            description: 'Your investigation career is just beginning. Complete missions to reveal your true investigator archetype.',
            traits: ['Awaiting Data', 'Profile Generating', 'Baseline Establishing'],
        };
    }
    const noHintRate = noHintSessionCount / sessions.length;
    if (noHintRate >= 0.6 && avgScore >= 65) {
        return {
            classification: 'Silent Operator',
            archetype: 'GHOST_TRACE',
            description: 'You operate in total silence. No hints, no hesitation — pure investigative instinct drives every discovery.',
            traits: ['Hint-Independent', 'High Precision', 'Self-Reliant'],
        };
    }
    if (discoveryRate >= 0.7) {
        return {
            classification: 'Evidence Hunter',
            archetype: 'DEEP_EVIDENCE_SEEKER',
            description: 'No piece of evidence escapes your investigation. You systematically uncover what others miss.',
            traits: ['Evidence Focused', 'Thorough Analysis', 'Discovery Specialist'],
        };
    }
    if (avgCommandsPerSession > 0 && avgCommandsPerSession <= 15 && sessions.length >= 2) {
        return {
            classification: 'Precision Analyst',
            archetype: 'PRECISION_TRACE',
            description: 'Every command counts. You navigate investigations with surgical efficiency, never wasting a single step.',
            traits: ['Minimal Commands', 'Surgical Efficiency', 'Tactical Approach'],
        };
    }
    if (avgHintsPerSession >= 2) {
        return {
            classification: 'Guided Operative',
            archetype: 'ASSISTED_TRACE',
            description: 'You leverage all available intelligence resources. Systematic and thorough, you build complete operational pictures.',
            traits: ['Resource Aware', 'Systematic Approach', 'Intelligence-Driven'],
        };
    }
    return {
        classification: 'Methodical Analyst',
        archetype: 'SYSTEMATIC_TRACE',
        description: 'A balanced investigator. You combine analytical precision with adaptive tactics across all investigation types.',
        traits: ['Balanced Approach', 'Adaptive Tactics', 'Field Ready'],
    };
}

function _buildRankTimeline(xp) {
    return RANK_THRESHOLDS.map((r, i) => {
        const nextXp = RANK_THRESHOLDS[i + 1]?.xpBase ?? Infinity;
        let status;
        if (xp >= r.xpBase && xp < nextXp) status = 'active';
        else if (xp >= nextXp) status = 'completed';
        else status = 'locked';
        return { rank: r.rank, xpRequired: r.xpBase, description: r.description, status };
    });
}

/**
 * Aggregate the full progression data set for the Progress page.
 * Runs all independent queries in parallel for performance.
 */
const getUserProgressionData = async (userId) => {
    const [
        userResult,
        sessionsResult,
        totalMissionsResult,
        commandsResult,
        discoveriesFoundResult,
        totalDiscoveriesResult,
        badgesResult,
        grepResult,
        payloadResult,
    ] = await Promise.all([
        pool.query(
            `SELECT username, level, xp FROM users WHERE user_id = $1`,
            [userId]
        ),
        pool.query(`
            SELECT
                s.session_id,
                s.scenario_id,
                sc.title                                                              AS scenario_title,
                sc.difficulty,
                s.final_score,
                s.end_time,
                COALESCE(up.completed, false)                                         AS mission_completed,
                ROUND(EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 60.0, 1)     AS completion_time_minutes,
                (SELECT COUNT(*) FROM ai_hint_log    hl  WHERE hl.session_id  = s.session_id) AS hints_used,
                (SELECT COUNT(*) FROM session_discoveries sd WHERE sd.session_id = s.session_id) AS evidence_found,
                (SELECT COUNT(*) FROM scenario_discoveries scd
                    WHERE scd.scenario_id = s.scenario_id AND scd.is_critical = true) AS total_critical_evidence,
                (SELECT COUNT(*) FROM command_history ch  WHERE ch.session_id  = s.session_id) AS command_count
            FROM sessions s
            JOIN scenarios sc ON sc.scenario_id = s.scenario_id
            LEFT JOIN user_progress up ON up.user_id = $1 AND up.scenario_id = s.scenario_id
            WHERE s.user_id = $1 AND s.status = 'completed'
            ORDER BY s.end_time DESC
            LIMIT 20
        `, [userId]),
        pool.query(`SELECT COUNT(*) AS total FROM scenarios WHERE is_active = true`),
        pool.query(`
            SELECT COUNT(*) AS total
            FROM command_history ch
            JOIN sessions s ON s.session_id = ch.session_id
            WHERE s.user_id = $1
        `, [userId]),
        pool.query(`
            SELECT COUNT(DISTINCT sd.discovery_id) AS found
            FROM session_discoveries sd
            JOIN sessions s ON s.session_id = sd.session_id
            WHERE s.user_id = $1
        `, [userId]),
        pool.query(`
            SELECT COUNT(*) AS total
            FROM scenario_discoveries scd
            JOIN scenarios sc ON sc.scenario_id = scd.scenario_id
            WHERE scd.is_critical = true AND sc.is_active = true
        `),
        pool.query(`
            SELECT b.badge_name, b.badge_type, b.awarded_at, b.scenario_id,
                   sc.title AS scenario_title
            FROM badges b
            LEFT JOIN scenarios sc ON sc.scenario_id = b.scenario_id
            WHERE b.user_id = $1
            ORDER BY b.awarded_at DESC
        `, [userId]),
        pool.query(`
            SELECT 1 FROM session_discoveries sd
            JOIN sessions s ON s.session_id = sd.session_id
            WHERE s.user_id = $1 AND sd.triggered_by_command ILIKE 'grep%'
            LIMIT 1
        `, [userId]),
        pool.query(`
            SELECT 1 FROM session_discoveries sd
            JOIN sessions s ON s.session_id = sd.session_id
            JOIN scenario_discoveries scd ON scd.discovery_id = sd.discovery_id
            WHERE s.user_id = $1
              AND scd.evidence_tags && ARRAY['payload','malicious','backdoor','exploit','trojan']::text[]
            LIMIT 1
        `, [userId]),
    ]);

    const user = userResult.rows[0];
    if (!user) return null;

    const sessions = sessionsResult.rows;
    const xp = parseInt(user.xp) || 0;
    const completedSessions = sessions.filter(s => s.mission_completed);
    const missionsCompleted = completedSessions.length;
    const totalMissions = parseInt(totalMissionsResult.rows[0].total) || 0;
    const totalCommandsExecuted = parseInt(commandsResult.rows[0].total) || 0;
    const hiddenEvidenceFound = parseInt(discoveriesFoundResult.rows[0].found) || 0;
    const totalHiddenEvidence = parseInt(totalDiscoveriesResult.rows[0].total) || 0;

    const avgScore = sessions.length > 0
        ? Math.round(sessions.reduce((acc, s) => acc + (parseInt(s.final_score) || 0), 0) / sessions.length)
        : 0;

    const validTimeSessions = sessions.filter(s => parseFloat(s.completion_time_minutes) > 0);
    const avgCompletionMinutes = validTimeSessions.length > 0
        ? Math.round(validTimeSessions.reduce((acc, s) => acc + parseFloat(s.completion_time_minutes), 0) / validTimeSessions.length)
        : 0;

    const totalHintsUsed = sessions.reduce((acc, s) => acc + (parseInt(s.hints_used) || 0), 0);
    const noHintSessionCount = sessions.filter(s => parseInt(s.hints_used) === 0).length;
    const aiDependencyRate = sessions.length > 0
        ? Math.round(((sessions.length - noHintSessionCount) / sessions.length) * 100)
        : 0;
    const evidenceRecoveryRate = totalHiddenEvidence > 0
        ? Math.round((hiddenEvidenceFound / totalHiddenEvidence) * 100)
        : 0;

    const fullDiscoverySessions = sessions.filter(s =>
        parseInt(s.total_critical_evidence) > 0 &&
        parseInt(s.evidence_found) >= parseInt(s.total_critical_evidence)
    );
    const discoveryCompletionRate = sessions.length > 0
        ? Math.round((fullDiscoverySessions.length / sessions.length) * 100)
        : 0;

    const rankData = _computeRankFromXp(xp);
    const clearanceTier = _computeClearanceTier(avgScore, missionsCompleted);

    // Behavioral achievement checks
    const achievements = [
        { id: 'FIRST_CONTACT',     name: 'FIRST_CONTACT',     description: 'Complete your first investigation',                                icon: 'flag',           unlocked: missionsCompleted >= 1 },
        { id: 'SILENT_OPERATOR',   name: 'SILENT_OPERATOR',   description: 'Complete a mission without requesting any AI hints',               icon: 'visibility_off', unlocked: completedSessions.some(s => parseInt(s.hints_used) === 0) },
        { id: 'TRACE_WALKER',      name: 'TRACE_WALKER',      description: 'Recover all hidden evidence in a single investigation',            icon: 'search',         unlocked: fullDiscoverySessions.length > 0 },
        { id: 'GREP_HUNTER',       name: 'GREP_HUNTER',       description: 'Discover evidence through a grep command',                        icon: 'manage_search',  unlocked: grepResult.rows.length > 0 },
        { id: 'MINIMALIST',        name: 'MINIMALIST',        description: 'Complete an investigation using 15 commands or fewer',             icon: 'compress',       unlocked: completedSessions.some(s => parseInt(s.command_count) <= 15 && parseInt(s.command_count) > 0) },
        { id: 'ORACLE_DENIED',     name: 'ORACLE_DENIED',     description: 'Score 80+ on a mission with zero AI assistance',                  icon: 'do_not_disturb', unlocked: completedSessions.some(s => parseInt(s.hints_used) === 0 && parseInt(s.final_score) >= 80) },
        { id: 'PAYLOAD_HUNTER',    name: 'PAYLOAD_HUNTER',    description: 'Discover hidden malicious evidence in an investigation',          icon: 'bug_report',     unlocked: payloadResult.rows.length > 0 },
        { id: 'IRON_TRAIL',        name: 'IRON_TRAIL',        description: 'Complete 3 or more investigations',                               icon: 'military_tech',  unlocked: missionsCompleted >= 3 },
        { id: 'DEEP_RECON',        name: 'DEEP_RECON',        description: 'Discover 5 or more evidence items across investigations',          icon: 'radar',          unlocked: hiddenEvidenceFound >= 5 },
        { id: 'EFFICIENCY_EXPERT', name: 'EFFICIENCY_EXPERT', description: 'Achieve a score of 90 or higher on any investigation',            icon: 'speed',          unlocked: sessions.some(s => parseInt(s.final_score) >= 90) },
    ];

    const discoveryRate = totalHiddenEvidence > 0 ? hiddenEvidenceFound / totalHiddenEvidence : 0;
    const avgCommandsPerSession = sessions.length > 0 ? totalCommandsExecuted / sessions.length : 0;
    const avgHintsPerSession = sessions.length > 0 ? totalHintsUsed / sessions.length : 0;

    const investigationStyle = _computeInvestigationStyle({
        sessions, noHintSessionCount, avgScore, discoveryRate,
        avgCommandsPerSession, avgHintsPerSession,
    });

    const missionArchive = sessions.map(s => ({
        sessionId:             parseInt(s.session_id),
        scenarioId:            parseInt(s.scenario_id),
        scenarioTitle:         s.scenario_title,
        codename:              `OP_${s.scenario_title.replace(/[^A-Z0-9]/gi, '_').toUpperCase()}`,
        difficulty:            s.difficulty,
        score:                 parseInt(s.final_score) || 0,
        missionCompleted:      s.mission_completed,
        completionTimeMinutes: s.completion_time_minutes ? parseFloat(s.completion_time_minutes) : null,
        hintsUsed:             parseInt(s.hints_used) || 0,
        evidenceFound:         parseInt(s.evidence_found) || 0,
        totalEvidence:         parseInt(s.total_critical_evidence) || 0,
        commandCount:          parseInt(s.command_count) || 0,
        completedAt:           s.end_time,
    }));

    return {
        identity: {
            username:          user.username,
            level:             parseInt(user.level) || 1,
            xp,
            xpBase:            rankData.xpBase,
            xpTarget:          rankData.xpTarget,
            xpPercent:         rankData.xpPercent,
            rank:              rankData.rank,
            clearanceTier,
            operationalStatus: missionsCompleted > 0 ? 'ACTIVE_DUTY' : 'TRAINING',
        },
        metrics: {
            missionsCompleted,
            totalMissions,
            completionRate:         totalMissions > 0 ? Math.round((missionsCompleted / totalMissions) * 100) : 0,
            hiddenEvidenceFound,
            totalHiddenEvidence,
            evidenceRecoveryRate,
            avgScore,
            avgCompletionMinutes,
            totalCommandsExecuted,
            totalHintsUsed,
            aiDependencyRate,
            noHintMissions:         completedSessions.filter(s => parseInt(s.hints_used) === 0).length,
            discoveryCompletionRate,
        },
        missionArchive,
        badges:             badgesResult.rows,
        achievements,
        investigationStyle,
        rankTimeline:       _buildRankTimeline(xp),
    };
};

module.exports = {
    getUserProgressMap,
    getUserProgressForScenario,
    getNextScenarioForUser,
    hasUserCompletedScenario,
    getAuthorizedScenarioForUser,
    upsertUserProgress,
    addXpToUser,
    awardBadge,
    getUserProgressOverview,
    getUserProgressionData,
};