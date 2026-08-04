import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDesktop } from '../hooks/useDesktop';
import { Desktop } from '../components';
import { InvestigationProvider, useInvestigation } from '../../context/InvestigationContext';
import '../styles/desktop.css';

// Shown on every dead-end state below (no investigation, or a failed
// fetch) so the player is never stranded on the Desktop with no way out.
const ReturnToMissionControl = () => {
    const navigate = useNavigate();
    return (
        <button type="button" className="desktop-status__link" onClick={() => navigate('/mission')}>
            Return to Mission Control
        </button>
    );
};

/**
 * DesktopPage.jsx
 * Owns data loading for the desktop. Desktop itself only renders.
 *
 * DesktopPage is also where the Investigation Context is mounted — the
 * current investigation (session/scenario/incident) is loaded once here,
 * used immediately to fetch the right incident's desktop workspace, and
 * shared with every application window through InvestigationProvider so
 * none of them need to fetch or hardcode it themselves.
 */
const DesktopPage = () => {
    return (
        <InvestigationProvider>
            <DesktopWorkspace />
        </InvestigationProvider>
    );
};

const DesktopWorkspace = () => {
    const { investigation, loading: investigationLoading, error: investigationError } = useInvestigation();
    const { desktop, loading: desktopLoading, error: desktopError } = useDesktop(investigation?.incidentId);

    if (investigationLoading || desktopLoading) {
        return <div className="desktop-status">Loading...</div>;
    }

    if (investigationError) {
        return (
            <div className="desktop-status desktop-status--error">
                <span>Error: {investigationError}</span>
                <ReturnToMissionControl />
            </div>
        );
    }

    if (!investigation) {
        return (
            <div className="desktop-status">
                <span>No active investigation. Return to Mission Control to start one.</span>
                <ReturnToMissionControl />
            </div>
        );
    }

    if (desktopError) {
        return (
            <div className="desktop-status desktop-status--error">
                <span>Error: {desktopError}</span>
                <ReturnToMissionControl />
            </div>
        );
    }

    return <Desktop desktop={desktop} />;
};

export default DesktopPage;
