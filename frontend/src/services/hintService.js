/**
 * hintService.js
 * All API calls related to the AI hint system.
 * Matches backend: /api/hints
 * All requests are authenticated (Bearer token).
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const authHeaders = (token) => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
});

/**
 * Request an AI-generated contextual hint for the current session state.
 * The backend analyzes command history vs expected steps and generates
 * a hint that guides without revealing the exact answer.
 *
 * Returns 429 if hint limit (5) has been reached for this session.
 *
 * @param {number} sessionId
 * @param {string} token
 *
 * @returns {{
 *   hint: string,           - The hint text to display
 *   hintsRemaining: number  - How many hints the user has left
 * }}
 */
export const requestHint = async (sessionId, token) => {
    const response = await fetch(`${API_URL}/api/hints/request`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ session_id: sessionId }),
    });
    const data = await response.json();

    // 429 is a known, user-facing limit — not a crash
    if (response.status === 429) {
        const err = new Error(data.message || 'Hint limit reached');
        err.limitReached = true;
        throw err;
    }

    if (!response.ok) throw new Error(data.message || 'Failed to generate hint');
    return data.data; // { hint, hintsRemaining }
};

/**
 * Fetch all hints logged for a session.
 * Used to restore the hint panel on page refresh.
 *
 * @param {number} sessionId
 * @param {string} token
 *
 * @returns {{
 *   hints: array,           - All hint log rows
 *   hintsRemaining: number
 * }}
 */
export const fetchHintLog = async (sessionId, token) => {
    const response = await fetch(`${API_URL}/api/hints/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch hint log');
    return data.data; // { hints, hintsRemaining }
};