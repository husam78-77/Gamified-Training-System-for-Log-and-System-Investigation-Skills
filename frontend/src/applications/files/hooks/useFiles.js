/**
 * useFiles.js
 * Fetches the virtual filesystem on mount.
 *
 * Responsibilities:
 * - fetch files on mount
 * - loading state
 * - error state
 */

import { useState, useEffect } from 'react';
import { getFiles } from '../services/fileService';

/**
 * @param {string} incidentId - from the current investigation (InvestigationContext).
 *                              Fetch waits until this is known.
 */
export const useFiles = (incidentId) => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!incidentId) return;

        const fetchFiles = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getFiles(incidentId);
                setFiles(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchFiles();
    }, [incidentId]);

    return { files, loading, error };
};
