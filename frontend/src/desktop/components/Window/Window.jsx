import React, { useCallback, useState } from 'react';
import WindowHeader from './WindowHeader';
import WindowBody from './WindowBody';
import WindowResizeHandles from './WindowResizeHandles';
import { getAppAccent, getAppAccentRgb } from '../../utils/appAccents';
import { getWindowMinSize, TASKBAR_HEIGHT, getWorkArea } from '../../utils/windowSizes';
import { getSnapZone } from '../../utils/snapping';
import '../../styles/window.css';

// Keeps a dragged window from disappearing entirely off-screen: at least
// this many px of it must stay reachable on every edge.
const DRAG_MARGIN = 48;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

// Explicit map rather than string concatenation (`window--${gesture}ing`) —
// 'resize' + 'ing' produces 'resizeing', which silently never matches the
// CSS class '.window--resizing'. That's not just a lint nit: without that
// class applying, `user-select: none` never kicks in during a resize, so
// dragging an edge over the window's own text content starts a native
// browser text-selection instead of only resizing.
const GESTURE_CLASS = { drag: 'window--dragging', resize: 'window--resizing' };

/**
 * Window.jsx
 * The base window frame every application (Terminal, Email, Browser, Files,
 * Alerts, ARIA, ...) renders its content inside of.
 *
 * Geometry (x, y, width, height, zIndex) is owned by the caller
 * (useWindowSession) — Window just applies it. Both gestures it supports,
 * header dragging and edge resizing, are tracked locally in `preview` while
 * the mouse is down purely so every frame doesn't round-trip through
 * Desktop's state; only the final rectangle is reported (onDragEnd /
 * onResizeEnd), which stays the single source of truth (dev rule #6).
 *
 * While dragging, the pointer's position is also reported through onSnapHint
 * so Desktop can paint the snap preview; the zone that was armed on release
 * is handed back with onDragEnd and Desktop decides what it means.
 *
 * Minimized windows stay mounted (children keep their state) and are only
 * hidden via CSS (dev rule #17). Maximized windows ignore x/y and let the
 * .window--maximized class fill the desktop area instead.
 */
const Window = ({
    appId,
    title,
    children,
    x,
    y,
    width,
    height,
    zIndex,
    minimized,
    maximized,
    snapped,
    active,
    onClose,
    onFocus,
    onMinimize,
    onMaximizeToggle,
    onDragEnd,
    onResizeEnd,
    onSnapHint,
}) => {
    const [preview, setPreview] = useState(null);
    const [gesture, setGesture] = useState(null);

    // Shared teardown for both gestures: listeners are attached to the
    // document (not the window element) so a fast drag that outruns the
    // cursor doesn't drop the gesture.
    const trackPointer = useCallback((onMove, onUp) => {
        const handleMouseMove = (event) => onMove(event);

        const handleMouseUp = (event) => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            onUp(event);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, []);

    const handleHeaderMouseDown = useCallback((event) => {
        if (maximized || event.button !== 0) return;

        const startX = event.clientX;
        const startY = event.clientY;
        const origin = { x, y };
        let zone = null;

        const nextPosition = (clientX, clientY) => ({
            x: clamp(origin.x + (clientX - startX), DRAG_MARGIN - width, window.innerWidth - DRAG_MARGIN),
            y: clamp(origin.y + (clientY - startY), TASKBAR_HEIGHT, window.innerHeight - DRAG_MARGIN),
        });

        setGesture('drag');

        trackPointer(
            (moveEvent) => {
                setPreview({ ...nextPosition(moveEvent.clientX, moveEvent.clientY), width, height });
                zone = getSnapZone(moveEvent.clientX, moveEvent.clientY);
                onSnapHint?.(zone);
            },
            (upEvent) => {
                const position = nextPosition(upEvent.clientX, upEvent.clientY);
                setPreview(null);
                setGesture(null);
                onSnapHint?.(null);
                onDragEnd?.({ ...position, width, height }, zone);
            }
        );
    }, [maximized, x, y, width, height, onDragEnd, onSnapHint, trackPointer]);

    /**
     * Edge/corner resize. `edge` is any combination of n/s/e/w — the letters
     * present decide which sides move, so all eight handles share this one
     * routine.
     */
    const handleResizeMouseDown = useCallback((event, edge) => {
        if (maximized || event.button !== 0) return;

        event.stopPropagation();
        onFocus?.();

        const startX = event.clientX;
        const startY = event.clientY;
        const origin = { x, y, width, height };
        const workArea = getWorkArea();
        const minSize = getWindowMinSize(appId);

        const nextBounds = (clientX, clientY) => {
            const deltaX = clientX - startX;
            const deltaY = clientY - startY;
            const bounds = { ...origin };

            if (edge.includes('e')) {
                bounds.width = clamp(origin.width + deltaX, minSize.width, workArea.width - origin.x);
            }

            if (edge.includes('s')) {
                bounds.height = clamp(
                    origin.height + deltaY,
                    minSize.height,
                    workArea.top + workArea.height - origin.y
                );
            }

            if (edge.includes('w')) {
                const right = origin.x + origin.width;
                bounds.width = clamp(origin.width - deltaX, minSize.width, right);
                bounds.x = right - bounds.width;
            }

            if (edge.includes('n')) {
                const bottom = origin.y + origin.height;
                bounds.height = clamp(origin.height - deltaY, minSize.height, bottom - workArea.top);
                bounds.y = bottom - bounds.height;
            }

            return bounds;
        };

        setGesture('resize');

        trackPointer(
            (moveEvent) => setPreview(nextBounds(moveEvent.clientX, moveEvent.clientY)),
            (upEvent) => {
                const bounds = nextBounds(upEvent.clientX, upEvent.clientY);
                setPreview(null);
                setGesture(null);
                onResizeEnd?.(bounds);
            }
        );
    }, [maximized, appId, x, y, width, height, onFocus, onResizeEnd, trackPointer]);

    const bounds = preview || { x, y, width, height };

    const style = maximized
        ? { zIndex, '--accent': getAppAccent(appId), '--accent-rgb': getAppAccentRgb(appId) }
        : {
            left: bounds.x,
            top: bounds.y,
            width: bounds.width,
            height: bounds.height,
            zIndex,
            '--accent': getAppAccent(appId),
            '--accent-rgb': getAppAccentRgb(appId),
        };

    const className = [
        'window',
        maximized && 'window--maximized',
        minimized && 'window--minimized',
        active && 'window--active',
        snapped && 'window--snapped',
        gesture && GESTURE_CLASS[gesture],
    ].filter(Boolean).join(' ');

    return (
        <div className={className} style={style} onMouseDown={onFocus}>
            <WindowHeader
                appId={appId}
                title={title}
                maximized={maximized}
                onHeaderMouseDown={handleHeaderMouseDown}
                onClose={onClose}
                onMinimize={onMinimize}
                onMaximizeToggle={onMaximizeToggle}
            />
            <WindowBody title={title}>{children}</WindowBody>
            {!maximized && <WindowResizeHandles onResizeStart={handleResizeMouseDown} />}
            <span className="window__corner window__corner--tl" aria-hidden="true" />
            <span className="window__corner window__corner--br" aria-hidden="true" />
        </div>
    );
};

export default Window;
