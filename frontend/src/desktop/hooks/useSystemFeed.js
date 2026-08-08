/**
 * useSystemFeed.js
 * The desktop's own notification bus. Anything that happens on the desktop
 * (a window opening, a snap, a workspace action) reports here, and two
 * surfaces read from the same list: the transient toasts near the system bar
 * and the Notification Center's history panel.
 *
 * Deliberately client-side only — no backend notification source exists, so
 * this owns nothing but UI feedback. When real incident notifications arrive
 * (desktop.notifications from GET /api/desktop is already an empty array),
 * they can be pushed through the same notify() without changing consumers.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/** How long a toast stays on screen before it retires into the panel. */
const TOAST_LIFETIME = 4200;

/** Hard cap so a long session can't grow the history without bound. */
const MAX_ENTRIES = 40;

let entryId = 0;

export const useSystemFeed = () => {
    const [entries, setEntries] = useState([]);
    const [toastIds, setToastIds] = useState([]);
    const timeouts = useRef([]);

    useEffect(() => () => timeouts.current.forEach(clearTimeout), []);

    /**
     * @param {{title: string, detail?: string, level?: 'info'|'alert'|'success'|'muted', toast?: boolean}} entry
     */
    const notify = useCallback(({ title, detail = '', level = 'info', toast = true }) => {
        const id = `feed-${(entryId += 1)}`;
        const entry = { id, title, detail, level, at: new Date(), read: false };

        setEntries((prev) => [entry, ...prev].slice(0, MAX_ENTRIES));

        if (!toast) return;

        setToastIds((prev) => [...prev, id]);
        timeouts.current.push(
            setTimeout(() => setToastIds((prev) => prev.filter((toastId) => toastId !== id)), TOAST_LIFETIME)
        );
    }, []);

    const dismissToast = useCallback((id) => {
        setToastIds((prev) => prev.filter((toastId) => toastId !== id));
    }, []);

    const markAllRead = useCallback(() => {
        setEntries((prev) => prev.map((entry) => ({ ...entry, read: true })));
    }, []);

    const clear = useCallback(() => {
        setEntries([]);
        setToastIds([]);
    }, []);

    const toasts = entries.filter((entry) => toastIds.includes(entry.id));
    const unreadCount = entries.filter((entry) => !entry.read).length;

    return { entries, toasts, unreadCount, notify, dismissToast, markAllRead, clear };
};
