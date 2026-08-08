/**
 * useDismissable.js
 * Shared "click outside or press Escape to close" behaviour for every
 * floating surface on the desktop — the launcher menu, the notification
 * panel, the context menu. Written once here so each of them closes the same
 * way instead of re-implementing (and subtly disagreeing about) the rule.
 *
 * Returns the ref to attach to the surface's root element.
 *
 * @param {() => void} onDismiss
 * @param {boolean} [enabled]
 * @param {string} [ignoreSelector] CSS selector for the control that toggles
 *   this surface. Without it, clicking that control while the surface is open
 *   would dismiss on mousedown and immediately re-open on click.
 */

import { useEffect, useRef } from 'react';

export const useDismissable = (onDismiss, enabled = true, ignoreSelector = null) => {
    const ref = useRef(null);
    const dismissRef = useRef(onDismiss);
    dismissRef.current = onDismiss;

    useEffect(() => {
        if (!enabled) return undefined;

        const handlePointerDown = (event) => {
            if (ref.current?.contains(event.target)) return;
            if (ignoreSelector && event.target instanceof Element && event.target.closest(ignoreSelector)) return;
            dismissRef.current?.();
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') dismissRef.current?.();
        };

        // Captured on the way down so a surface closes before the click can
        // be treated as a desktop interaction underneath it.
        document.addEventListener('mousedown', handlePointerDown, true);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown, true);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [enabled, ignoreSelector]);

    return ref;
};
