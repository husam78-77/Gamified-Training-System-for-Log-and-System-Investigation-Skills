const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const loginUser = async ({ email, password }) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Login failed');
    return data;
};

export const registerUser = async ({ username, email, password }) => {
    const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Registration failed');
    return data;
};

export const forgotPasswordRequest = async (email) => {
    const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Request failed');
    return data;
};

/**
 * Trade a one-time Google OAuth exchange code (from the /auth/callback
 * redirect) for the actual JWT + user payload. The code is single-use and
 * expires in 60s — the real token is only ever returned in this JSON body,
 * never in a URL.
 */
export const exchangeOAuthCode = async (code) => {
    const response = await fetch(`${API_URL}/api/auth/google/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'OAuth exchange failed');
    return data.data; // { token, user }
};