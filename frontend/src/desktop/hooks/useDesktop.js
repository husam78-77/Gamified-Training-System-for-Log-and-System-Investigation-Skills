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

export const useDesktop = () => {
    const { token } = useAuth();

    const [desktop, setDesktop] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!token) return;

        const fetchDesktop = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getDesktop(token);
                setDesktop(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchDesktop();
    }, [token]);

    return { desktop, loading, error };
};
