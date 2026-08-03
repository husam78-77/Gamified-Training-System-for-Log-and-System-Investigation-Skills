/**
 * desktopService.js
 * All API calls related to the desktop workspace.
 * Matches backend: /api/desktop
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Fetch the full desktop workspace (wallpaper, applications, notifications, state).
 *
 * @param {string} token
 * @returns {Promise<{wallpaper: string, applications: Array, notifications: Array, state: Object}>}
 */
export const getDesktop = async (token) => {
    const response = await fetch(`${API_URL}/api/desktop`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch desktop');

    return data.data;
};
