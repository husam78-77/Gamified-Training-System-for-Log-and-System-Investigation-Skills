import React, { useState, useEffect } from 'react';
import { ChevronRight, Layers, Timer, Crosshair } from 'lucide-react';
import { useInvestigation } from '../../context/InvestigationContext';
import { formatCaseId, formatIncidentName, formatDuration } from '../utils/formatters';

/**
 * CaseHud.jsx
 * The standing HUD panel on the desktop surface: which case the player is
 * inside, its category and difficulty, how long this workspace has been
 * open, and how many tools they currently have running.
 *
 * Every field is read from data the desktop already has — InvestigationContext
 * (fetched once by DesktopPage) and the live window list. It issues no
 * requests of its own and adds nothing to the backend's contract.
 *
 * Collapsible, because on a small screen the icon column matters more than
 * the readout.
 */
const CaseHud = ({ openedApplications = [], applicationCount = 0 }) => {
    const { investigation } = useInvestigation();
    const [collapsed, setCollapsed] = useState(false);
    const [seconds, setSeconds] = useState(0);

    // Counts from the moment the workspace mounted. Labelled "uptime" rather
    // than "elapsed" on purpose — the session's real start time lives on the
    // backend and is not part of the desktop payload.
    useEffect(() => {
        const interval = setInterval(() => setSeconds((current) => current + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    const running = openedApplications.length;

    return (
        <aside className={'case-hud' + (collapsed ? ' case-hud--collapsed' : '')}>
            <button
                type="button"
                className="case-hud__toggle"
                onClick={() => setCollapsed((current) => !current)}
                aria-label={collapsed ? 'Expand case panel' : 'Collapse case panel'}
            >
                <ChevronRight size={14} strokeWidth={2.5} />
            </button>

            <div className="case-hud__head">
                <span className="case-hud__id">{formatCaseId(investigation?.sessionId)}</span>
                <span className="case-hud__status">
                    <span className="case-hud__pulse" aria-hidden="true" />
                    Active
                </span>
            </div>

            <h2 className="case-hud__name">
                {investigation ? formatIncidentName(investigation.incidentId) : 'Awaiting assignment'}
            </h2>

            <div className="case-hud__tags">
                {investigation?.category && <span className="case-hud__tag">{investigation.category}</span>}
                {investigation?.difficulty && (
                    <span className="case-hud__tag case-hud__tag--difficulty">{investigation.difficulty}</span>
                )}
            </div>

            <dl className="case-hud__metrics">
                <div className="case-hud__metric">
                    <dt><Timer size={12} strokeWidth={2} /> Uptime</dt>
                    <dd>{formatDuration(seconds)}</dd>
                </div>
                <div className="case-hud__metric">
                    <dt><Layers size={12} strokeWidth={2} /> Running</dt>
                    <dd>{running} / {applicationCount}</dd>
                </div>
                <div className="case-hud__metric">
                    <dt><Crosshair size={12} strokeWidth={2} /> Posture</dt>
                    <dd>{running > 0 ? 'Investigating' : 'Idle'}</dd>
                </div>
            </dl>
        </aside>
    );
};

export default CaseHud;
