/**
 * useDesktop.js
 * Fetches the desktop workspace on mount.
 *
 * Responsibilities:
 * - fetch desktop on mount
 * - loading state
 * - error state
 */

import { useState, useEffect } from 'react';
import { getDesktop } from '../services/desktopService';
import { useAuth } from '../../context/AuthContext';

/**
 * @param {string} incidentId - from the current investigation (InvestigationContext).
 *                              Fetch waits until this is known.
 */
export const useDesktop = (incidentId) => {
    const { token } = useAuth();

    const [desktop, setDesktop] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!token || !incidentId) return;

        const fetchDesktop = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getDesktop(token, incidentId);
                setDesktop(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchDesktop();
    }, [token, incidentId]);

    return { desktop, loading, error };
};
