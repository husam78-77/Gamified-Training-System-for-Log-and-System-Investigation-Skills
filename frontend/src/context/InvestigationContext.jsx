import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getCurrentInvestigation } from '../services/investigationService';

/**
 * InvestigationContext.jsx
 * The single source of the player's current investigation (sessionId,
 * scenarioId, incidentId, category, difficulty). Desktop mounts this
 * Provider once and owns the fetch — every application (Terminal, Email,
 * Files, Browser, ARIA) reads from useInvestigation() instead of each
 * fetching or hardcoding its own incident/scenario reference.
 */
const InvestigationContext = createContext(null);

export const InvestigationProvider = ({ children }) => {
    const { token } = useAuth();

    const [investigation, setInvestigation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!token) return;

        const fetchInvestigation = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getCurrentInvestigation(token);
                setInvestigation(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchInvestigation();
    }, [token]);

    return (
        <InvestigationContext.Provider value={{ investigation, loading, error }}>
            {children}
        </InvestigationContext.Provider>
    );
};

export const useInvestigation = () => useContext(InvestigationContext);
