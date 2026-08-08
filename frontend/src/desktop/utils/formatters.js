/**
 * formatters.js
 * Display-only string/number helpers for the desktop shell. Everything here
 * is cosmetic: the raw values (incident ids, session ids, timestamps) come
 * from the backend untouched and are only reshaped for the HUD.
 */

/**
 * 'ssh_bruteforce' → 'SSH Bruteforce'. Acronyms that would otherwise be
 * title-cased into nonsense stay uppercase.
 *
 * @param {string} incidentId
 * @returns {string}
 */
const ACRONYMS = new Set(['ssh', 'dns', 'smb', 'ftp', 'sql', 'xss', 'rdp', 'c2', 'ip', 'url', 'api']);

export const formatIncidentName = (incidentId) => {
    if (!incidentId) return 'Unknown incident';

    return String(incidentId)
        .split(/[_\-\s]+/)
        .filter(Boolean)
        .map((word) => (ACRONYMS.has(word.toLowerCase())
            ? word.toUpperCase()
            : word.charAt(0).toUpperCase() + word.slice(1)))
        .join(' ');
};

/**
 * Session id → stable case number for the HUD ('CASE-0042').
 *
 * @param {number|string|null|undefined} sessionId
 * @returns {string}
 */
export const formatCaseId = (sessionId) =>
    sessionId ? `CASE-${String(sessionId).padStart(4, '0')}` : 'CASE-----';

/**
 * Seconds → 'HH:MM:SS', used by the session uptime counter.
 *
 * @param {number} totalSeconds
 * @returns {string}
 */
export const formatDuration = (totalSeconds) => {
    const safe = Math.max(0, Math.floor(totalSeconds));
    const hours = String(Math.floor(safe / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((safe % 3600) / 60)).padStart(2, '0');
    const seconds = String(safe % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
};

/**
 * Timestamp → short relative age for the notification history ('4m ago').
 *
 * @param {Date} at
 * @param {Date} [now]
 * @returns {string}
 */
export const formatRelativeTime = (at, now = new Date()) => {
    const seconds = Math.floor((now - at) / 1000);
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
};
