import React from 'react';
import { Window } from './Window';
import applicationRegistry from '../../applications/applicationRegistry';
import { getWindowSize } from '../utils/windowSizes';

/**
 * WindowManager.jsx
 * Renders one Window per opened application, driven entirely by
 * openedApplications ({ id, title, x, y, zIndex, minimized, maximized }).
 *
 * Renders every opened application regardless of minimized state — Window
 * itself hides minimized windows via CSS so the application component
 * never unmounts (dev rule #17). WindowManager never knows how any
 * application works — it only looks up app.id in applicationRegistry and
 * renders whatever component comes back.
 */
const WindowManager = ({ openedApplications, activeAppId, onClose, onFocus, onMinimize, onMaximizeToggle }) => {
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
                        size={getWindowSize(app.id)}
                        minimized={app.minimized}
                        maximized={app.maximized}
                        active={app.id === activeAppId}
                        onClose={() => onClose(app.id)}
                        onFocus={() => onFocus(app.id)}
                        onMinimize={() => onMinimize(app.id)}
                        onMaximizeToggle={() => onMaximizeToggle(app.id)}
                    >
                        {Component ? <Component /> : null}
                    </Window>
                );
            })}
        </>
    );
};

export default WindowManager;
