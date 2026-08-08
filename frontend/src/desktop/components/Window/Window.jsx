import React, { useCallback, useRef, useState } from 'react';
import WindowHeader from './WindowHeader';
import WindowBody from './WindowBody';
import '../../styles/window.css';

// Keeps a dragged window from disappearing entirely off-screen: at least
// this many px of it must stay reachable on every edge.
const DRAG_MARGIN = 40;
const TASKBAR_HEIGHT = 44;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * Window.jsx
 * The base window frame every application (Terminal, Email, Browser,
 * Files, Alerts, ARIA, ...) renders its content inside of.
 *
 * Position/stacking (x, y, zIndex) are owned by the caller (Desktop) —
 * Window just applies them. Dragging is tracked locally (previewPos) while
 * the mouse is down purely so every frame doesn't round-trip through
 * Desktop's state; only the final position is reported via onDragEnd,
 * which stays the single source of truth (dev rule #6). No resize yet.
 *
 * Minimized windows stay mounted (children keep their state) and are only
 * hidden via CSS (dev rule #17). Maximized windows ignore x/y and let the
 * .window--maximized class fill the desktop area instead.
 */
const Window = ({ title, children, x, y, zIndex, size = 'medium', minimized, maximized, active, onClose, onFocus, onMinimize, onMaximizeToggle, onDragEnd }) => {
    const windowRef = useRef(null);
    const [previewPos, setPreviewPos] = useState(null);

    const handleHeaderMouseDown = useCallback((event) => {
        if (maximized || event.button !== 0) return;

        const rect = windowRef.current?.getBoundingClientRect();
        const width = rect?.width ?? 400;
        const startX = event.clientX;
        const startY = event.clientY;
        const originX = x;
        const originY = y;

        const nextPosition = (clientX, clientY) => ({
            x: clamp(originX + (clientX - startX), DRAG_MARGIN - width, window.innerWidth - DRAG_MARGIN),
            y: clamp(originY + (clientY - startY), TASKBAR_HEIGHT, window.innerHeight - DRAG_MARGIN),
        });

        const handleMouseMove = (moveEvent) => {
            setPreviewPos(nextPosition(moveEvent.clientX, moveEvent.clientY));
        };

        const handleMouseUp = (upEvent) => {
            const { x: finalX, y: finalY } = nextPosition(upEvent.clientX, upEvent.clientY);
            onDragEnd?.(finalX, finalY);
            setPreviewPos(null);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [maximized, x, y, onDragEnd]);

    const style = maximized
        ? { zIndex }
        : { left: previewPos ? previewPos.x : x, top: previewPos ? previewPos.y : y, zIndex };

    const className = [
        'window',
        !maximized && `window--${size}`,
        maximized && 'window--maximized',
        minimized && 'window--minimized',
        active && 'window--active',
        previewPos && 'window--dragging',
    ].filter(Boolean).join(' ');

    return (
        <div ref={windowRef} className={className} style={style} onMouseDown={onFocus}>
            <WindowHeader
                title={title}
                maximized={maximized}
                onHeaderMouseDown={handleHeaderMouseDown}
                onClose={onClose}
                onMinimize={onMinimize}
                onMaximizeToggle={onMaximizeToggle}
            />
            <WindowBody>{children}</WindowBody>
        </div>
    );
};

export default Window;
