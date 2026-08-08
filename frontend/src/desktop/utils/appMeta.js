/**
 * appMeta.js
 * Cosmetic, frontend-only copy for each application: the one-line role
 * shown under its name in the launcher / command palette, plus extra search
 * keywords so "shell" finds the Terminal and "inbox" finds Email.
 *
 * The application's real name and availability still come from the backend
 * (GET /api/desktop) — nothing here decides what exists, it only describes
 * what is already there. Unmapped ids fall back to a neutral descriptor.
 */
const APP_META = {
    terminal: {
        tagline: 'Shell access to the compromised host',
        keywords: ['shell', 'bash', 'console', 'command', 'cli'],
    },
    email: {
        tagline: 'Corporate mailbox and message headers',
        keywords: ['inbox', 'mail', 'phishing', 'message'],
    },
    browser: {
        tagline: 'Threat intel and open-source research',
        keywords: ['web', 'internet', 'search', 'intel', 'osint'],
    },
    files: {
        tagline: 'Filesystem evidence and artifacts',
        keywords: ['filesystem', 'explorer', 'logs', 'artifacts', 'evidence'],
    },
    alerts: {
        tagline: 'Live detections from the monitoring stack',
        keywords: ['siem', 'detection', 'monitoring', 'incident'],
    },
    aria: {
        tagline: 'AI analyst — ask, correlate, sanity-check',
        keywords: ['assistant', 'ai', 'analyst', 'help', 'hint'],
    },
    report: {
        tagline: 'Investigation findings and submission',
        keywords: ['notes', 'writeup', 'findings', 'submit', 'conclusion'],
    },
};

const DEFAULT_META = { tagline: 'Investigation tool', keywords: [] };

/**
 * @param {string} appId
 * @returns {{tagline: string, keywords: string[]}}
 */
export const getAppMeta = (appId) => APP_META[appId] || DEFAULT_META;

/**
 * Flattened haystack used by the command palette / launcher filter so the
 * matching rule lives in one place instead of in every consumer.
 *
 * @param {{id: string, name: string}} app
 * @returns {string} lowercase searchable text for the app
 */
export const getAppSearchText = (app) => {
    const meta = getAppMeta(app.id);
    return [app.name, app.id, meta.tagline, ...meta.keywords].join(' ').toLowerCase();
};
