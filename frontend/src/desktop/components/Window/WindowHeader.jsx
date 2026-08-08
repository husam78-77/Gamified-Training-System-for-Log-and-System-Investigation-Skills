import React from 'react';
import WindowControls from './WindowControls';
import { getAppIcon } from '../../utils/appIcons';

/**
 * WindowHeader.jsx
 * Renders the application's icon, title, and window controls. The icon is
 * resolved from appId through the shared appIcons map — the same one the
 * desktop icons and the taskbar use — so a window always carries the same
 * identity as the tile that launched it.
 *
 * Dragging is started here (onHeaderMouseDown, from Window.jsx) — control
 * buttons stop propagation on their own mousedown so clicking them never
 * starts a drag. Double-click toggles maximize.
 */
const WindowHeader = ({ appId, title, maximized, onHeaderMouseDown, onClose, onMinimize, onMaximizeToggle }) => {
    const Icon = getAppIcon(appId);

    return (
        <div className="window-header" onMouseDown={onHeaderMouseDown} onDoubleClick={onMaximizeToggle}>
            <div className="window-header__identity">
                <span className="window-header__icon">
                    <Icon size={13} strokeWidth={2} />
                </span>
                <span className="window-header__title">{title}</span>
            </div>
            <div className="window-header__rail" aria-hidden="true" />
            <WindowControls
                maximized={maximized}
                onClose={onClose}
                onMinimize={onMinimize}
                onMaximizeToggle={onMaximizeToggle}
            />
        </div>
    );
};

export default WindowHeader;
