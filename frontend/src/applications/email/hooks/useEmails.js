/**
 * useEmails.js
 * Fetches the email list on mount.
 *
 * Responsibilities:
 * - fetch emails on mount
 * - loading state
 * - error state
 */

import { useState, useEffect } from 'react';
import { getEmails } from '../services/emailService';

/**
 * @param {string} incidentId - from the current investigation (InvestigationContext).
 *                              Fetch waits until this is known.
 */
export const useEmails = (incidentId) => {
    const [emails, setEmails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!incidentId) return;

        const fetchEmails = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getEmails(incidentId);
                setEmails(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchEmails();
    }, [incidentId]);

    return { emails, loading, error };
};
