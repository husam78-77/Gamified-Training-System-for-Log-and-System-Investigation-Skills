import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, RadioTower } from 'lucide-react';
import { useDesktop } from '../hooks/useDesktop';
import { Desktop } from '../components';
import { InvestigationProvider, useInvestigation } from '../../context/InvestigationContext';
import '../styles/desktop.css';

/**
 * DesktopPage.jsx
 * Owns data loading for the desktop. Desktop itself only renders.
 *
 * DesktopPage is also where the Investigation Context is mounted — the
 * current investigation (session/scenario/incident) is loaded once here,
 * used immediately to fetch the right incident's desktop workspace, and
 * shared with every application window through InvestigationProvider so none
 * of them need to fetch or hardcode it themselves.
 */
const DesktopPage = () => {
    return (
        <InvestigationProvider>
            <DesktopWorkspace />
        </InvestigationProvider>
    );
};

// Shown on every dead-end state below (no investigation, or a failed fetch)
// so the player is never stranded on the Desktop with no way out.
const ReturnToMissionControl = () => {
    const navigate = useNavigate();
    return (
        <button type="button" className="desktop-status__link" onClick={() => navigate('/mission')}>
            Return to Mission Control
        </button>
    );
};

/**
 * The full-screen panel every pre-desktop state renders into: connecting,
 * error, and idle all share one frame so the transition into the workspace
 * is a single visual step rather than three different screens.
 */
const StatusScreen = ({ tone = 'loading', title, message, children }) => (
    <div className={`desktop-status desktop-status--${tone}`}>
        <div className="desktop-status__panel">
            <span className="desktop-status__mark">
                {tone === 'error' ? <AlertTriangle size={20} strokeWidth={2} /> : <RadioTower size={20} strokeWidth={2} />}
            </span>
            <span className="desktop-status__title">{title}</span>
            <span className="desktop-status__message">{message}</span>
            {tone === 'loading' && (
                <span className="desktop-status__track" aria-hidden="true">
                    <span className="desktop-status__beam" />
                </span>
            )}
            {children}
        </div>
    </div>
);

const DesktopWorkspace = () => {
    const { investigation, loading: investigationLoading, error: investigationError } = useInvestigation();
    const { desktop, loading: desktopLoading, error: desktopError } = useDesktop(investigation?.incidentId);

    if (investigationLoading) {
        return <StatusScreen title="Locating your case" message="Requesting the active investigation..." />;
    }

    if (investigationError) {
        return (
            <StatusScreen tone="error" title="Uplink failed" message={investigationError}>
                <ReturnToMissionControl />
            </StatusScreen>
        );
    }

    // Checked before the desktop's own loading flag: with no incident to fetch,
    // useDesktop never starts and never stops loading, so asking about it first
    // would leave this screen spinning forever on a real, explainable state.
    if (!investigation) {
        return (
            <StatusScreen
                tone="idle"
                title="No active investigation"
                message="Pick up a case in Mission Control and the workspace will assemble around it."
            >
                <ReturnToMissionControl />
            </StatusScreen>
        );
    }

    if (desktopError) {
        return (
            <StatusScreen tone="error" title="Workspace unavailable" message={desktopError}>
                <ReturnToMissionControl />
            </StatusScreen>
        );
    }

    if (desktopLoading || !desktop) {
        return <StatusScreen title="Assembling workspace" message="Mounting evidence and provisioning tools..." />;
    }

    return <Desktop desktop={desktop} />;
};

export default DesktopPage;
