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
 * @param {number} [sessionId] - overlays the session's saved Investigation Report
 */
export const useFiles = (incidentId, sessionId) => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!incidentId) return;

        const fetchFiles = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getFiles(incidentId, sessionId);
                setFiles(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchFiles();
    }, [incidentId, sessionId]);

    return { files, loading, error };
};
