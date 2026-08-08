import React from 'react';

/**
 * WindowResizeHandles.jsx
 * The eight invisible grab strips around a window's frame. Each one only
 * reports which edge was grabbed — all the geometry lives in Window's
 * handleResizeMouseDown, so adding or removing a handle never touches the
 * resize maths.
 */
const EDGES = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

const WindowResizeHandles = ({ onResizeStart }) => {
    return (
        <>
            {EDGES.map((edge) => (
                <span
                    key={edge}
                    className={`window-resize window-resize--${edge}`}
                    onMouseDown={(event) => onResizeStart(event, edge)}
                    aria-hidden="true"
                />
            ))}
        </>
    );
};

export default WindowResizeHandles;
