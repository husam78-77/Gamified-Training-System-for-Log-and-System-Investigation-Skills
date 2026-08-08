import React from 'react';

/**
 * WindowErrorBoundary.jsx
 * Contains a crash to the window it happened in.
 *
 * Without this, an exception thrown while rendering any application unmounts
 * the entire React tree — the player loses the whole workspace, every other
 * open window, and the way back to Mission Control, for a fault in one tool.
 * With it, the offending window shows what went wrong and everything else
 * keeps running.
 *
 * It deliberately reports rather than retries silently: the player decides
 * whether to reload the application or close it.
 */
class WindowErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        // Surfaced in the console for debugging; the desktop stays usable.
        console.error(`Application "${this.props.title}" crashed:`, error, info);
    }

    render() {
        if (!this.state.error) return this.props.children;

        return (
            <div className="window-error">
                <span className="window-error__badge">Application fault</span>
                <p className="window-error__message">
                    {this.props.title} stopped responding and was contained. The rest of the
                    workspace is unaffected.
                </p>
                <code className="window-error__detail">{String(this.state.error.message || this.state.error)}</code>
                <button
                    type="button"
                    className="window-error__retry"
                    onClick={() => this.setState({ error: null })}
                >
                    Reload application
                </button>
            </div>
        );
    }
}

export default WindowErrorBoundary;
