import React, { useState } from 'react';
import { useInvestigation } from '../../../context/InvestigationContext';
import { useFiles } from '../hooks/useFiles';
import FileTree from './FileTree';
import FileViewer from './FileViewer';
import Breadcrumb from './Breadcrumb';
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
    const { investigation } = useInvestigation();
    const { files, loading, error } = useFiles(investigation?.incidentId);
    const [currentPath, setCurrentPath] = useState('/');

    if (loading) {
        return <div className="files-status">Loading...</div>;
    }

    if (error) {
        return <div className="files-status files-status--error">Error: {error}</div>;
    }

    return (
        <div className="files-app">
            <Breadcrumb currentPath={currentPath} onNavigate={setCurrentPath} />
            <div className="files-app__body">
                <FileTree files={files} currentPath={currentPath} onNavigate={setCurrentPath} />
                <FileViewer files={files} currentPath={currentPath} onNavigate={setCurrentPath} />
            </div>
        </div>
    );
};

export default FilesApp;
