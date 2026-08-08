import React from 'react';
import { Search, Keyboard, LogOut, ShieldCheck } from 'lucide-react';
import { getAppIcon } from '../../utils/appIcons';
import { getAppAccent } from '../../utils/appAccents';
import { getAppMeta } from '../../utils/appMeta';
import { useAuth } from '../../../context/AuthContext';
import { useInvestigation } from '../../../context/InvestigationContext';
import { useDismissable } from '../../hooks/useDismissable';
import { formatIncidentName } from '../../utils/formatters';

/**
 * LauncherMenu.jsx
 * The start menu. Lists every application the backend enabled for this
 * incident — the same `applications` array the desktop icons come from, so
 * the two can never offer different tools — with its role, accent, and
 * whether it's already running.
 *
 * The header shows who is signed in and which case they're working, read
 * from AuthContext / InvestigationContext. Both are already loaded by the
 * time Desktop renders, so nothing here fetches anything.
 */
const LauncherMenu = ({ applications = [], openedApplications = [], onClose, onLaunch, onOpenPalette, onOpenShortcuts, onExit }) => {
    const { user } = useAuth();
    const { investigation } = useInvestigation();
    const ref = useDismissable(onClose, true, '.taskbar-left__launcher');

    const runningIds = new Set(openedApplications.map((opened) => opened.id));

    const run = (action) => () => {
        onClose?.();
        action?.();
    };

    return (
        <div className="launcher" ref={ref} role="menu">
            <div className="launcher__header">
                <span className="launcher__avatar">
                    <ShieldCheck size={18} strokeWidth={2} />
                </span>
                <span className="launcher__identity">
                    <span className="launcher__operator">{user?.username || 'OPERATOR'}</span>
                    <span className="launcher__case">
                        {investigation ? formatIncidentName(investigation.incidentId) : 'NO ACTIVE CASE'}
                    </span>
                </span>
                {investigation?.difficulty && (
                    <span className="launcher__difficulty">{investigation.difficulty}</span>
                )}
            </div>

            <div className="launcher__section-label">Applications</div>

            <div className="launcher__grid">
                {applications.map((app) => {
                    const Icon = getAppIcon(app.id);
                    const meta = getAppMeta(app.id);

                    return (
                        <button
                            key={app.id}
                            type="button"
                            role="menuitem"
                            className={'launcher__app' + (runningIds.has(app.id) ? ' launcher__app--running' : '')}
                            style={{ '--accent': getAppAccent(app.id) }}
                            onClick={run(() => onLaunch(app))}
                        >
                            <span className="launcher__app-icon">
                                <Icon size={16} strokeWidth={1.9} />
                            </span>
                            <span className="launcher__app-text">
                                <span className="launcher__app-name">{app.name}</span>
                                <span className="launcher__app-tagline">{meta.tagline}</span>
                            </span>
                            {runningIds.has(app.id) && <span className="launcher__app-dot" aria-hidden="true" />}
                        </button>
                    );
                })}
            </div>

            <div className="launcher__footer">
                <button type="button" className="launcher__action" onClick={run(onOpenPalette)}>
                    <Search size={13} strokeWidth={2} />
                    Search
                    <kbd>Ctrl K</kbd>
                </button>
                <button type="button" className="launcher__action" onClick={run(onOpenShortcuts)}>
                    <Keyboard size={13} strokeWidth={2} />
                    Shortcuts
                </button>
                <button type="button" className="launcher__action launcher__action--exit" onClick={run(onExit)}>
                    <LogOut size={13} strokeWidth={2} />
                    Mission Control
                </button>
            </div>
        </div>
    );
};

export default LauncherMenu;
