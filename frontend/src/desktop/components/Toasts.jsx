import React from 'react';
import { Info, TriangleAlert, CircleCheck, X } from 'lucide-react';

/**
 * Toasts.jsx
 * The transient half of the system feed — the same entries the Notification
 * Center lists, shown briefly under the system bar as they happen. Nothing
 * is stored here: useSystemFeed decides what is currently toasting and
 * retires each entry on its own timer, so dismissing one only hides it and
 * never loses it from the history.
 */
const LEVEL_ICONS = {
    info: Info,
    alert: TriangleAlert,
    success: CircleCheck,
    muted: Info,
};

const Toasts = ({ toasts = [], onDismiss }) => {
    if (toasts.length === 0) return null;

    return (
        <div className="toasts">
            {toasts.map((toast) => {
                const Icon = LEVEL_ICONS[toast.level] || Info;

                return (
                    <div key={toast.id} className={`toast toast--${toast.level}`}>
                        <Icon size={14} strokeWidth={2} className="toast__icon" />
                        <div className="toast__body">
                            <span className="toast__title">{toast.title}</span>
                            {toast.detail && <span className="toast__detail">{toast.detail}</span>}
                        </div>
                        <button
                            type="button"
                            className="toast__dismiss"
                            onClick={() => onDismiss(toast.id)}
                            aria-label="Dismiss notification"
                        >
                            <X size={12} strokeWidth={2.5} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

export default Toasts;
