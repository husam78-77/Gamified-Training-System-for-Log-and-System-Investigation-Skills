import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const ProgressionContext = createContext(null);

export const ProgressionProvider = ({ children }) => {
    const { token, isAuthenticated } = useAuth();
    
    const [progression, setProgression] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const refreshProgression = useCallback(async () => {
        if (!isAuthenticated || !token) {
            setProgression(null);
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/progression`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch progression data');
            }

            const data = await response.json();
            setProgression(data.data || data);
            setError(null);
        } catch (err) {
            console.error("Progression fetch error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [token, isAuthenticated]);

    useEffect(() => {
        refreshProgression();
    }, [refreshProgression]);

    return (
        <ProgressionContext.Provider value={{ progression, loading, error, refreshProgression }}>
            {children}
        </ProgressionContext.Provider>
    );
};

export const useProgression = () => useContext(ProgressionContext);
