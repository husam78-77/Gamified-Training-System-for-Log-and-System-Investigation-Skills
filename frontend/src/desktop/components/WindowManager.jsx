import React from 'react';
import { Window } from './Window';
import applicationRegistry from '../../applications/applicationRegistry';

/**
 * WindowManager.jsx
 * Renders one Window per opened application, driven entirely by
 * openedApplications ({ id, title, x, y, width, height, zIndex, minimized,
 * maximized, snapped }).
 *
 * Renders every opened application regardless of minimized state — Window
 * itself hides minimized windows via CSS so the application component never
 * unmounts (dev rule #17). WindowManager never knows how any application
 * works — it only looks up app.id in applicationRegistry and renders
 * whatever component comes back.
 */
const WindowManager = ({
    openedApplications,
    activeAppId,
    onClose,
    onFocus,
    onMinimize,
    onMaximizeToggle,
    onDragEnd,
    onResizeEnd,
    onSnapHint,
}) => {
    return (
        <>
            {openedApplications.map((app) => {
                const Component = applicationRegistry[app.id];

                return (
                    <Window
                        key={app.id}
                        appId={app.id}
                        title={app.title}
                        x={app.x}
                        y={app.y}
                        width={app.width}
                        height={app.height}
                        zIndex={app.zIndex}
                        minimized={app.minimized}
                        maximized={app.maximized}
                        snapped={app.snapped}
                        active={app.id === activeAppId}
                        onClose={() => onClose(app.id)}
                        onFocus={() => onFocus(app.id)}
                        onMinimize={() => onMinimize(app.id)}
                        onMaximizeToggle={() => onMaximizeToggle(app.id)}
                        onDragEnd={(bounds, snapZone) => onDragEnd(app.id, bounds, snapZone)}
                        onResizeEnd={(bounds) => onResizeEnd(app.id, bounds)}
                        onSnapHint={onSnapHint}
                    >
                        {Component ? <Component /> : null}
                    </Window>
                );
            })}
        </>
    );
};

export default WindowManager;
