import React, { useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useInvestigation } from '../../../context/InvestigationContext';
import { useFiles } from '../hooks/useFiles';
import FileTree from './FileTree';
import FileViewer from './FileViewer';
import Breadcrumb from './Breadcrumb';
import { logEvent } from '../../../services/investigationService';
import '../styles/files.css';

/**
 * FilesApp.jsx
 * Graphical viewer for the same virtual filesystem the Terminal reads —
 * both consume GET /api/files, backed by the Environment Engine. No
 * filesystem logic lives here: this component only tracks which path is
 * currently selected and renders the tree/viewer/breadcrumb around it.
 *
 * incidentId comes from the Investigation Context Desktop already loaded —
 * this component never fetches or hardcodes it itself.
 */
const FilesApp = () => {
    const { token } = useAuth();
    const { investigation } = useInvestigation();
    const { files, loading, error } = useFiles(investigation?.incidentId, investigation?.sessionId);
    const [currentPath, setCurrentPath] = useState('/');

    // Investigation Events only care about actual evidence views, not every
    // directory the player steps through (dev rule #7 — discoveries, and by
    // extension methodology analytics, are about knowledge gained, not UI
    // navigation) — so this only logs FILE_OPENED for file nodes, not dirs.
    const handleNavigate = useCallback((path) => {
        setCurrentPath(path);
        const node = files.find((f) => f.file_path === path);
        if (node && node.file_type === 'file') {
            logEvent('FILE_OPENED', { path }, token);
        }
    }, [files, token]);

    if (loading) {
        return <div className="files-status">Loading...</div>;
    }

    if (error) {
        return <div className="files-status files-status--error">Error: {error}</div>;
    }

    return (
        <div className="files-app">
            <Breadcrumb currentPath={currentPath} onNavigate={handleNavigate} />
            <div className="files-app__body">
                <FileTree files={files} currentPath={currentPath} onNavigate={handleNavigate} />
                <FileViewer files={files} currentPath={currentPath} onNavigate={handleNavigate} />
            </div>
        </div>
    );
};

export default FilesApp;
