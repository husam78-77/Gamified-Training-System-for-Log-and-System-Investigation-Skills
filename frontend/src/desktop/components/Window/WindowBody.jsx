import React from 'react';
import WindowErrorBoundary from './WindowErrorBoundary';

/**
 * WindowBody.jsx
 * Content container — every application's content renders here, inside an
 * error boundary so a fault in one tool can't take the whole desktop down
 * with it.
 *
 * The 16px padding is part of the contract with the applications: each one's
 * root style cancels it with `margin: -16px` when it wants to bleed to the
 * frame. Don't change it here without changing them.
 */
const WindowBody = ({ title, children }) => {
    return (
        <div className="window-body">
            <WindowErrorBoundary title={title}>{children}</WindowErrorBoundary>
        </div>
    );
};

export default WindowBody;
