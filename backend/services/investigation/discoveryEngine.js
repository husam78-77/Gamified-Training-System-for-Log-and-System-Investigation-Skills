/**
 * discoveryEngine.js
 * Generic, content-driven discovery matching engine (Phase 2).
 *
 * A discovery is a forensic knowledge milestone (e.g. "attack source
 * identified") that the player earns by examining evidence through ANY
 * of its registered triggers — there is no single "correct" command.
 *
 * Discoveries are loaded from an incident's discoveries.json. This engine
 * contains zero scenario-specific logic — every incident defines its own
 * discoveries and triggers; nothing here changes to support a new one.
 *
 * Public API:
 *   getDiscoveries(incidentId)                                → discoveries[]
 *   matchDiscoveries(parsed, discoveries, unlockedKeys, currentPath) → newly unlocked discoveries[]
 *   calculatePathScore(discoveries, unlockedKeys)              → 0-50 integer
 */

const { loadIncidentContent } = require('../environment/environmentEngine');
const { normalizePath } = require('../../utils/terminalParser');

// Resolve . and .. segments in an absolute path string. Kept local (same
// algorithm as terminalController.resolvePath) to avoid a circular require.
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

/**
 * Load an incident's discoveries.json.
 * @param {string} incidentId
 * @returns {Promise<Array>} discoveries, each with an embedded triggers[] array
 */
const getDiscoveries = async (incidentId) => loadIncidentContent(incidentId, 'discoveries.json');

// =============================================================================
// TRIGGER MATCHING
// =============================================================================

/**
 * Resolve the effective target of a command for comparison against a
 * trigger's targetPath/targetContains.
 *
 *   locate → the search keyword as typed (not a path)
 *   others → last positional arg, resolved against currentPath
 */
const resolveCommandTarget = (parsed, currentPath) => {
    const target = parsed.target;

    if (parsed.command === 'locate') {
        return target ? target.toLowerCase() : null;
    }

    if (!target) return normalizePath(currentPath);
    if (target === '~') return '/';
    if (target.startsWith('~/')) return normalizePath(resolveAbsPath('/' + target.slice(2)));
    if (target.startsWith('/')) return normalizePath(resolveAbsPath(target));

    const base = currentPath === '/' ? '' : currentPath;
    return normalizePath(resolveAbsPath(base + '/' + target));
};

/**
 * The "search term" of a command — the value a player typed to look for
 * something, as opposed to the file/path they looked in.
 *   locate  → the target itself (locate has no separate file argument)
 *   grep    → the first positional argument (the search pattern)
 *   others  → null (no search-term concept)
 */
const getSearchTerm = (parsed) => {
    if (parsed.command === 'locate') return (parsed.target || '').toLowerCase();
    if (parsed.command === 'grep') return (parsed.positional[0] || '').toLowerCase();
    return null;
};

/**
 * Extract the argument value after a -name flag in a find command.
 * `find / -name "*cron*"` → 'cron'
 */
const extractNameFilterArg = (parsed) => {
    const args = parsed.args || [];
    const nameIdx = args.indexOf('-name');
    if (nameIdx === -1 || !args[nameIdx + 1]) return null;
    return args[nameIdx + 1].replace(/\*/g, '').replace(/['"]/g, '').trim().toLowerCase();
};

/**
 * Test whether a parsed command satisfies a single discovery trigger.
 *
 * A trigger is a plain object from discoveries.json:
 *   { "command": "cat", "targetPath": "/var/log/auth.log" }
 *   { "command": "grep", "patternContains": "203.0.113.25", "targetPath": "/var/log/auth.log" }
 *   { "command": "grep", "patternContains": "admin" }
 *   { "command": "find", "nameContains": "cron" }
 *   { "command": "ps" }
 *
 * @param {Object} parsed      - Parsed command object
 * @param {Object} trigger     - A single trigger definition
 * @param {string} currentPath - Player's current directory
 */
const matchesTrigger = (parsed, trigger, currentPath) => {
    if (parsed.command !== trigger.command) return false;

    if (trigger.nameContains) {
        const nameArg = extractNameFilterArg(parsed);
        return !!nameArg && nameArg.includes(trigger.nameContains.toLowerCase());
    }

    if (trigger.patternContains) {
        const searchTerm = getSearchTerm(parsed);
        if (!searchTerm || !searchTerm.includes(trigger.patternContains.toLowerCase())) return false;
        // patternContains may be combined with a target constraint
        if (trigger.targetPath) return matchesTargetPath(parsed, trigger, currentPath);
        if (trigger.targetContains) return matchesTargetContains(parsed, trigger, currentPath);
        return true;
    }

    if (trigger.targetPath) return matchesTargetPath(parsed, trigger, currentPath);
    if (trigger.targetContains) return matchesTargetContains(parsed, trigger, currentPath);

    // No constraints beyond the command name — bare command match (e.g. "ps")
    return true;
};

const matchesTargetPath = (parsed, trigger, currentPath) => {
    const resolved = resolveCommandTarget(parsed, currentPath);
    return !!resolved && resolved === normalizePath(trigger.targetPath);
};

const matchesTargetContains = (parsed, trigger, currentPath) => {
    const resolved = resolveCommandTarget(parsed, currentPath) || '';
    return resolved.includes(trigger.targetContains.toLowerCase());
};

/**
 * Evaluate a parsed command against every scenario discovery.
 * Returns only newly unlocked discoveries (already-unlocked ones are skipped).
 *
 * @param {Object}   parsed        - Output from terminalParser.parseCommand()
 * @param {Array}    discoveries   - discoveries.json contents (each with triggers[])
 * @param {string[]} unlockedKeys  - discovery keys already unlocked this session
 * @param {string}   currentPath   - Player's current working directory
 * @returns {Array} newly unlocked discovery objects
 */
const matchDiscoveries = (parsed, discoveries, unlockedKeys, currentPath) => {
    if (!parsed.valid || !discoveries || discoveries.length === 0) return [];

    const newlyUnlocked = [];
    for (const discovery of discoveries) {
        if (unlockedKeys.includes(discovery.key)) continue;

        const triggers = discovery.triggers || [];
        if (triggers.some(trigger => matchesTrigger(parsed, trigger, currentPath))) {
            newlyUnlocked.push(discovery);
        }
    }
    return newlyUnlocked;
};

// =============================================================================
// SCORING
// =============================================================================

/**
 * Calculate the path score component (0-50 pts) from required discovery weights.
 * The weight values of all required discoveries are expected to sum to 100.
 *
 * @param {Array}    discoveries  - all discoveries for the incident
 * @param {string[]} unlockedKeys - discovery keys unlocked this session
 * @returns {number} 0-50
 */
const calculatePathScore = (discoveries, unlockedKeys) => {
    const required = discoveries.filter(d => d.required);
    const totalWeight = required.reduce((sum, d) => sum + (d.weight || 0), 0);
    if (totalWeight === 0) return 0;

    const earnedWeight = required
        .filter(d => unlockedKeys.includes(d.key))
        .reduce((sum, d) => sum + (d.weight || 0), 0);

    return Math.round((earnedWeight / totalWeight) * 50);
};

/**
 * The base command verbs that would currently earn progress toward an
 * objective — i.e. the trigger commands of whichever required discoveries
 * that objective still needs. Used by ARIA's proximity detection so "is
 * the player close?" is derived from Discoveries, never a hardcoded
 * command (dev rule #14).
 *
 * @param {Array}    discoveries  - all discoveries for the incident
 * @param {Object}   objective    - the objective currently being hinted (may be null)
 * @param {string[]} unlockedKeys - discovery keys already unlocked this session
 * @returns {string[]} unique base command verbs, e.g. ['cat', 'grep']
 */
const getCandidateCommands = (discoveries, objective, unlockedKeys) => {
    if (!objective) return [];

    const neededKeys = (objective.requiredDiscoveries || []).filter(key => !unlockedKeys.includes(key));
    const neededDiscoveries = discoveries.filter(d => neededKeys.includes(d.key));

    const commands = neededDiscoveries.flatMap(d => (d.triggers || []).map(t => t.command));
    return [...new Set(commands)];
};

module.exports = {
    getDiscoveries,
    matchDiscoveries,
    calculatePathScore,
    getCandidateCommands,
};
