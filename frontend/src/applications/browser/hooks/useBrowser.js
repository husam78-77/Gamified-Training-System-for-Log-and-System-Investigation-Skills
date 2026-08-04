/**
 * useBrowser.js
 * Fetches the Knowledge Browser content on mount.
 *
 * Responsibilities:
 * - fetch homePage + pages on mount
 * - loading state
 * - error state
 */

import { useState, useEffect } from 'react';
import { getBrowser } from '../services/browserService';

/**
 * @param {string} incidentId - from the current investigation (InvestigationContext).
 *                              Fetch waits until this is known.
 */
export const useBrowser = (incidentId) => {
    const [homePage, setHomePage] = useState(null);
    const [pages, setPages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!incidentId) return;

        const fetchBrowser = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getBrowser(incidentId);
                setHomePage(data.homePage);
                setPages(data.pages);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchBrowser();
    }, [incidentId]);

    return { homePage, pages, loading, error };
};
