import React from 'react';
import { Window } from './Window';
import applicationRegistry from '../../applications/applicationRegistry';

/**
 * WindowManager.jsx
 * Renders one Window per opened application, driven entirely by
 * openedApplications ({ id, title, x, y, zIndex }).
 *
 * Never knows how any application works — it only looks up app.id in
 * applicationRegistry and renders whatever component comes back.
 */
const WindowManager = ({ openedApplications, onClose, onFocus }) => {
    return (
        <>
            {openedApplications.map((app) => {
                const Component = applicationRegistry[app.id];

                return (
                    <Window
                        key={app.id}
                        title={app.title}
                        x={app.x}
                        y={app.y}
                        zIndex={app.zIndex}
                        onClose={() => onClose(app.id)}
                        onFocus={() => onFocus(app.id)}
                    >
                        {Component ? <Component /> : null}
                    </Window>
                );
            })}
        </>
    );
};

export default WindowManager;
