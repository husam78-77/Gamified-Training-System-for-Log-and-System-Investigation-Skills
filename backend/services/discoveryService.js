/**
 * discoveryService.js
 * Core engine for the discovery-based investigation system.
 *
 * A discovery is a forensic milestone (e.g. "found the malicious cron entry")
 * that can be unlocked by ANY of its registered trigger commands — not just one
 * specific command typed in one specific way.
 *
 * This service runs in parallel with the existing step-matching engine and does
 * not replace it. The step-matching engine keeps the hint system functional.
 * When a discovery fires it optionally credits its mapped step_order so that
 * hint level tracking automatically stays in sync.
 *
 * Public API:
 *   matchDiscoveries(parsed, discoveries, completedDiscoveryIds, currentPath)
 *     → newly unlocked discovery objects[]
 *
 *   calculateDiscoveryPathScore(discoveries, completedDiscoveryIds)
 *     → 0–50 integer path score based on critical discovery weights
 *
 *   resolveDiscoveryObjectives(objectives, sessionDiscoveries)
 *     → objective_id[]
 */

const { normalizePath } = require('../utils/terminalParser');

// Resolve . and .. segments in an absolute path string.
// Same algorithm as terminalController.resolvePath — kept local to avoid circular deps.
const resolveAbsPath = (absPath) => {
    const parts = absPath.split('/').filter(p => p !== '');
    const out = [];
    for (const part of parts) {
        if (part === '.') continue;
        if (part === '..') { out.pop(); }
        else out.push(part);
    }
    return '/' + out.join('/') || '/';
};

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

/**
 * Evaluate a parsed command against all scenario discoveries.
 * Returns only newly unlocked discoveries (already-completed ones are skipped).
 *
 * @param {Object}   parsed                - Output from terminalParser.parseCommand()
 * @param {Array}    discoveries           - scenario_discoveries rows (with triggers embedded)
 * @param {number[]} completedDiscoveryIds - IDs already unlocked in this session
 * @param {string}   currentPath           - Player's current working directory
 * @returns {Array}  newly unlocked discovery objects
 */
const matchDiscoveries = (parsed, discoveries, completedDiscoveryIds, currentPath) => {
    if (!parsed.valid || !discoveries || discoveries.length === 0) return [];

    const newlyUnlocked = [];

    for (const discovery of discoveries) {
        if (completedDiscoveryIds.includes(discovery.discovery_id)) continue;

        const triggers = discovery.triggers || [];
        for (const trigger of triggers) {
            if (matchesTrigger(parsed, trigger, currentPath)) {
                newlyUnlocked.push(discovery);
                break; // First matching trigger is enough — no double-counting
            }
        }
    }

    return newlyUnlocked;
};

// =============================================================================
// TRIGGER MATCHING
// =============================================================================

/**
 * Test whether a parsed command satisfies a single discovery trigger.
 *
 * Matching rules (evaluated in order):
 *  1. Command name must match trigger_command exactly
 *  2. If name_filter_pattern is set (find -name style): match against the -name arg value
 *  3. If target_pattern is set: resolve the command's target and match with match_type strategy
 *  4. If neither 2 nor 3: command name alone is sufficient (e.g. bare `ps`)
 *
 * @param {Object} parsed          - Parsed command object
 * @param {Object} trigger         - A single discovery_triggers row
 * @param {string} currentPath     - Player's current directory
 * @returns {boolean}
 */
const matchesTrigger = (parsed, trigger, currentPath) => {
    if (!parsed.valid) return false;

    // Step 1: Command must match
    if (parsed.command !== trigger.trigger_command) return false;

    // Step 2: find -name filter match
    if (trigger.name_filter_pattern) {
        const nameArg = extractNameFilterArg(parsed);
        if (!nameArg) return false;
        return nameArg.toLowerCase().includes(trigger.name_filter_pattern.toLowerCase());
    }

    // Step 3: Target path / keyword match
    if (trigger.target_pattern) {
        const resolvedTarget = resolveCommandTarget(parsed, currentPath);
        if (!resolvedTarget) return false;
        return matchPattern(resolvedTarget, trigger.target_pattern, trigger.match_type || 'exact');
    }

    // Step 4: No constraints beyond command name — bare command match
    return true;
};

/**
 * Resolve the effective target of a command for comparison against a trigger pattern.
 *
 * Special handling per command type:
 *   locate  → target is the search keyword as typed (not a path)
 *   grep    → last positional arg is the file/directory
 *   all others → target path resolved against currentPath
 *
 * @param {Object} parsed
 * @param {string} currentPath
 * @returns {string|null} normalized string to compare
 */
const resolveCommandTarget = (parsed, currentPath) => {
    const target = parsed.target;

    // locate: the search keyword IS the target (no path resolution)
    if (parsed.command === 'locate') {
        return target ? target.toLowerCase() : null;
    }

    // No target typed: implicit target is the current directory
    if (!target) return normalizePath(currentPath);

    // ~ expands to root in this simulated environment
    if (target === '~') return '/';
    if (target.startsWith('~/')) {
        return normalizePath(resolveAbsPath('/' + target.slice(2)));
    }

    // Absolute path: resolve . and .. segments
    if (target.startsWith('/')) {
        return normalizePath(resolveAbsPath(target));
    }

    // Relative path: resolve against current directory (handles .., ., chained segments)
    const base = currentPath === '/' ? '' : currentPath;
    return normalizePath(resolveAbsPath(base + '/' + target));
};

/**
 * Extract the argument value after a -name flag in a find command.
 * Strips surrounding quotes and wildcard characters for pattern matching.
 *
 * Examples:
 *   `find / -name "*cron*"`  → 'cron'
 *   `find /etc -name "*.sh"` → '.sh'
 *   `find /tmp -name sync`   → 'sync'
 *
 * @param {Object} parsed
 * @returns {string|null}
 */
const extractNameFilterArg = (parsed) => {
    const args = parsed.args || [];
    const nameIdx = args.indexOf('-name');
    if (nameIdx === -1 || !args[nameIdx + 1]) return null;

    return args[nameIdx + 1]
        .replace(/\*/g, '')    // strip wildcards
        .replace(/['"]/g, '')  // strip quotes
        .trim()
        .toLowerCase();
};

/**
 * Match a resolved value against a trigger pattern using the specified strategy.
 *
 * @param {string} value     - The resolved target/keyword to test
 * @param {string} pattern   - The pattern from discovery_triggers
 * @param {string} matchType - 'exact' | 'prefix' | 'contains' | 'wildcard'
 * @returns {boolean}
 */
const matchPattern = (value, pattern, matchType) => {
    if (!value || !pattern) return false;
    const v = value.toLowerCase();
    const p = pattern.toLowerCase();

    switch (matchType) {
        case 'exact':    return v === p;
        case 'prefix':   return v.startsWith(p);
        case 'contains': return v.includes(p);
        case 'wildcard': return wildcardMatch(v, p);
        default:         return v === p;
    }
};

/**
 * Simple * wildcard matcher.
 * `*` matches any sequence of characters (including empty).
 */
const wildcardMatch = (str, pattern) => {
    const parts = pattern.split('*');
    let pos = 0;
    for (const part of parts) {
        if (!part) continue;
        const found = str.indexOf(part, pos);
        if (found === -1) return false;
        pos = found + part.length;
    }
    return true;
};

// =============================================================================
// SCORING
// =============================================================================

/**
 * Calculate the path score component (0–50 pts) based on critical discoveries.
 *
 * Replaces the step-weight-based path score for scenarios that have discoveries.
 * The weight_percent values of all critical discoveries sum to 100.
 * Earned weight from completed critical discoveries is mapped to 0–50 range.
 *
 * @param {Array}    discoveries           - All scenario_discoveries for the scenario
 * @param {number[]} completedDiscoveryIds - IDs unlocked in this session
 * @returns {number} 0–50
 */
const calculateDiscoveryPathScore = (discoveries, completedDiscoveryIds) => {
    const critical = discoveries.filter(d => d.is_critical);
    const totalWeight = critical.reduce((sum, d) => sum + (d.weight_percent || 0), 0);
    if (totalWeight === 0) return 0;

    const earnedWeight = critical
        .filter(d => completedDiscoveryIds.includes(d.discovery_id))
        .reduce((sum, d) => sum + (d.weight_percent || 0), 0);

    return Math.round((earnedWeight / totalWeight) * 50);
};

/**
 * Resolve which objectives are completed based on session discoveries.
 * An objective triggers when its trigger_step is credited by a discovery's
 * maps_to_step_order — this is cross-referenced here for discovery-driven sessions.
 *
 * @param {Array} objectives       - All objectives for the scenario
 * @param {Array} sessionDiscoveries - Full session_discoveries rows (from discoveryModel)
 * @returns {number[]} completed objective_ids
 */
const resolveDiscoveryObjectives = (objectives, sessionDiscoveries) => {
    // Collect all step_orders credited via discoveries
    const creditedSteps = new Set(
        sessionDiscoveries
            .map(sd => sd.maps_to_step_order)
            .filter(Boolean)
    );

    return objectives
        .filter(obj => obj.trigger_step !== null && creditedSteps.has(obj.trigger_step))
        .map(obj => obj.objective_id);
};

module.exports = {
    matchDiscoveries,
    calculateDiscoveryPathScore,
    resolveDiscoveryObjectives,
};
