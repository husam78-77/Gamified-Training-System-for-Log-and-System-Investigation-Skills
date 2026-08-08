import React from 'react';

/**
 * RunningApplications.jsx
 * One item per opened application, driven entirely by openedApplications —
 * the same list WindowManager renders windows from, so this never falls
 * out of sync with what's actually open.
 *
 * Clicking an item: minimized → restore, active → minimize, otherwise →
 * focus. Desktop.handleTaskbarSelect owns that decision — this component
 * only reports the click.
 */
const RunningApplications = ({ openedApplications = [], activeAppId = null, onSelect }) => {
    if (openedApplications.length === 0) return null;

    return (
        <div className="running-applications">
            {openedApplications.map((app) => (
                <button
                    key={app.id}
                    type="button"
                    className={
                        'running-applications__item' +
                        (app.id === activeAppId ? ' running-applications__item--active' : '') +
                        (app.minimized ? ' running-applications__item--minimized' : '')
                    }
                    onClick={() => onSelect?.(app.id)}
                >
                    {app.title}
                </button>
            ))}
        </div>
    );
};

export default RunningApplications;
