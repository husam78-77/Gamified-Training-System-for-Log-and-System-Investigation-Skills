import React, { useState, useEffect } from 'react';
import { formatCaseId, formatIncidentName } from '../utils/formatters';

/**
 * BootSequence.jsx
 * The short cold-open that plays when the workspace mounts: the shell
 * reporting that it has attached to the case. Purely presentational — it
 * checks nothing and blocks nothing, the desktop is already fully loaded
 * behind it (DesktopPage only renders Desktop once the fetches resolved).
 *
 * It is skippable on any click or key, and it can never trap the player: a
 * single timer retires it whether or not every line has printed.
 */
const BOOT_LINES = [
    'secure channel established',
    'evidence volume mounted — read only',
    'session recorder armed',
    'workspace handed to operator',
];

/** Total time on screen before the overlay retires itself. */
const BOOT_DURATION = 1700;
const LINE_INTERVAL = BOOT_DURATION / (BOOT_LINES.length + 1);

const BootSequence = ({ investigation, onFinish }) => {
    const [visibleLines, setVisibleLines] = useState(0);
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        const timers = BOOT_LINES.map((_, index) =>
            setTimeout(() => setVisibleLines(index + 1), LINE_INTERVAL * (index + 1))
        );

        timers.push(setTimeout(() => setClosing(true), BOOT_DURATION));
        timers.push(setTimeout(() => onFinish?.(), BOOT_DURATION + 320));

        return () => timers.forEach(clearTimeout);
    }, [onFinish]);

    return (
        <div
            className={'boot' + (closing ? ' boot--closing' : '')}
            onClick={onFinish}
            onKeyDown={onFinish}
            role="presentation"
        >
            <div className="boot__panel">
                <div className="boot__brand">
                    <span className="boot__mark" aria-hidden="true" />
                    KINETIC BREACH
                    <span className="boot__version">OS 2.4</span>
                </div>

                <div className="boot__case">
                    <span className="boot__case-id">{formatCaseId(investigation?.sessionId)}</span>
                    <span className="boot__case-name">
                        {investigation ? formatIncidentName(investigation.incidentId) : 'Standby'}
                    </span>
                </div>

                <ul className="boot__lines">
                    {BOOT_LINES.map((line, index) => (
                        <li
                            key={line}
                            className={'boot__line' + (index < visibleLines ? ' boot__line--on' : '')}
                        >
                            <span className="boot__ok">OK</span>
                            {line}
                        </li>
                    ))}
                </ul>

                <div className="boot__progress">
                    <span className="boot__progress-fill" style={{ animationDuration: `${BOOT_DURATION}ms` }} />
                </div>

                <span className="boot__skip">click to skip</span>
            </div>
        </div>
    );
};

export default BootSequence;
