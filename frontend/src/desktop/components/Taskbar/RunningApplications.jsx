import React from 'react';

/**
 * RunningApplications.jsx
 * One item per opened application, driven entirely by openedApplications —
 * the same list WindowManager renders windows from, so this never falls
 * out of sync with what's actually open.
 *
 * No click behavior yet. Focus/minimize wiring plugs in later via an
 * onSelect-style prop without changing this component's shape.
 */
const RunningApplications = ({ openedApplications = [] }) => {
    if (openedApplications.length === 0) return null;

    return (
        <div className="running-applications">
            {openedApplications.map((app) => (
                <div key={app.id} className="running-applications__item">
                    {app.title}
                </div>
            ))}
        </div>
    );
};

export default RunningApplications;
