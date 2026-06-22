const crypto = require('crypto');
const authService = require('../services/authService');
const response = require('../utils/responseHelper');
const MESSAGES = require('../constants/messages');

// ── OAuth exchange-code store ────────────────────────────────────────────
// The Google OAuth callback can't hand the JWT straight back in JSON — it's
// a redirect, so the only channel back to the frontend is the URL. Putting
// the JWT itself in that URL leaks it into browser history, server logs,
// and any Referer header. Instead the callback mints a short-lived,
// single-use, opaque code and puts THAT in the URL; the frontend
// immediately exchanges it here for the real token over a normal POST,
// the same way /api/auth/login already returns it.
const oauthExchangeStore = new Map();
const OAUTH_CODE_TTL_MS = 60 * 1000; // 60s — just long enough for the redirect + exchange call

const createOAuthExchangeCode = ({ token, user }) => {
    const code = crypto.randomBytes(32).toString('hex');
    oauthExchangeStore.set(code, { token, user, expiresAt: Date.now() + OAUTH_CODE_TTL_MS });
    return code;
};

const register = async (req, res) => {
    try {
        // role is intentionally never read from req.body here — public
        // registration always creates a 'student' account (see authService).
        const { username, email, password } = req.body;
        const result = await authService.registerUser({ username, email, password });
        if (result.conflict) return response.error(res, 409, MESSAGES.USER_EXISTS);
        return response.success(res, 201, MESSAGES.USER_CREATED, { user: result.user });
    } catch (err) {
        console.error('Register error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await authService.loginUser({ email, password });
        if (result.notFound) return response.error(res, 401, MESSAGES.INVALID_CREDENTIALS);
        return response.success(res, 200, MESSAGES.LOGIN_SUCCESS, {
            token: result.token,
            user: result.user,
        });
    } catch (err) {
        console.error('Login error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

// 👇 Add this
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const result = await authService.forgotPassword(email);

        // Always return success to prevent email enumeration
        return response.success(res, 200, 'If this email exists, a temporary password has been sent.');
    } catch (err) {
        console.error('Forgot password error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

// POST /api/auth/google/exchange
// Trades a one-time OAuth code (from the /auth/callback redirect) for the
// actual JWT + user payload. Public route, but the code itself is the
// credential here: random 32-byte value, single-use (deleted on first
// read), and expires in 60s — there's nothing useful an attacker could do
// with a guessed/replayed code even if they had one.
const exchangeOAuthCode = async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return response.error(res, 400, MESSAGES.INVALID_INPUT);
        }

        const entry = oauthExchangeStore.get(code);
        oauthExchangeStore.delete(code); // single-use regardless of outcome

        if (!entry || entry.expiresAt < Date.now()) {
            return response.error(res, 401, 'ACCESS_DENIED: OAuth exchange code invalid or expired.');
        }

        return response.success(res, 200, MESSAGES.LOGIN_SUCCESS, {
            token: entry.token,
            user: entry.user,
        });
    } catch (err) {
        console.error('OAuth exchange error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

module.exports = { register, login, forgotPassword, createOAuthExchangeCode, exchangeOAuthCode };