import React from 'react';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { useDismissable } from '../../hooks/useDismissable';
import { formatRelativeTime } from '../../utils/formatters';

/**
 * NotificationCenter.jsx
 * The bell in the system bar plus the history panel behind it. The list
 * itself lives in useSystemFeed (Desktop owns it) so the same entries can
 * also surface as toasts — this component only renders and acknowledges
 * them. Opening the panel marks everything read, which is what clears the
 * count badge.
 *
 * Future sources (new email, SIEM alerts, discovery unlocks) push into the
 * same feed without changing anything here.
 */
const NotificationCenter = ({ feed, open, onToggle, onClose }) => {
    const { entries = [], unreadCount = 0, markAllRead, clear } = feed || {};
    const ref = useDismissable(onClose, open, '.notification-center__button');

    const handleToggle = () => {
        if (!open) markAllRead?.();
        onToggle?.();
    };

    return (
        <div className="notification-center">
            <button
                type="button"
                className={'notification-center__button' + (open ? ' notification-center__button--open' : '')}
                onClick={handleToggle}
                aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
                aria-expanded={open}
            >
                <Bell size={15} strokeWidth={2} />
                {unreadCount > 0 && <span className="notification-center__count">{unreadCount}</span>}
            </button>

            {open && (
                <div className="notification-panel" ref={ref}>
                    <div className="notification-panel__header">
                        <span className="notification-panel__title">System Feed</span>
                        <div className="notification-panel__tools">
                            <button type="button" onClick={markAllRead} title="Mark all read">
                                <CheckCheck size={13} strokeWidth={2} />
                            </button>
                            <button type="button" onClick={clear} title="Clear feed">
                                <Trash2 size={13} strokeWidth={2} />
                            </button>
                        </div>
                    </div>

                    <div className="notification-panel__list">
                        {entries.length === 0 && (
                            <p className="notification-panel__empty">No system activity recorded.</p>
                        )}

                        {entries.map((entry) => (
                            <div key={entry.id} className={`notification-item notification-item--${entry.level}`}>
                                <span className="notification-item__marker" aria-hidden="true" />
                                <div className="notification-item__body">
                                    <span className="notification-item__title">{entry.title}</span>
                                    {entry.detail && <span className="notification-item__detail">{entry.detail}</span>}
                                </div>
                                <span className="notification-item__time">{formatRelativeTime(entry.at)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;
