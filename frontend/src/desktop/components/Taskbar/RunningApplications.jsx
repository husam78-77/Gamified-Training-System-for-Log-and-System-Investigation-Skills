import React from 'react';
import { getAppIcon } from '../../utils/appIcons';
import { getAppAccent, getAppAccentRgb } from '../../utils/appAccents';

/**
 * RunningApplications.jsx
 * One item per opened application, driven entirely by openedApplications —
 * the same list WindowManager renders windows from, so this never falls out
 * of sync with what's actually open.
 *
 * Clicking an item: minimized → restore, active → minimize, otherwise →
 * focus. useWindowSession.selectApplication owns that decision — this
 * component only reports the click.
 */
const RunningApplications = ({ openedApplications = [], activeAppId = null, onSelect }) => {
    if (openedApplications.length === 0) return null;

    return (
        <div className="running-applications">
            <span className="running-applications__divider" aria-hidden="true" />
            {openedApplications.map((app) => {
                const Icon = getAppIcon(app.id);
                const state = app.minimized ? 'Minimized' : app.id === activeAppId ? 'Focused' : 'Open';

                return (
                    <button
                        key={app.id}
                        type="button"
                        title={`${app.title} — ${state}`}
                        style={{ '--accent': getAppAccent(app.id), '--accent-rgb': getAppAccentRgb(app.id) }}
                        className={
                            'running-applications__item' +
                            (app.id === activeAppId ? ' running-applications__item--active' : '') +
                            (app.minimized ? ' running-applications__item--minimized' : '')
                        }
                        onClick={() => onSelect?.(app.id)}
                    >
                        <Icon size={13} strokeWidth={2} className="running-applications__icon" />
                        <span className="running-applications__label">{app.title}</span>
                        <span className="running-applications__bar" aria-hidden="true" />
                    </button>
                );
            })}
        </div>
    );
};

export default RunningApplications;
