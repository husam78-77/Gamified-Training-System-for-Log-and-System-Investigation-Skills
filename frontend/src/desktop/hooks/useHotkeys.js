/**
 * useHotkeys.js
 * Window-level keyboard shortcuts for the desktop shell.
 *
 * Bindings are a plain object keyed by a normalised combo string
 * ('ctrl+k', 'alt+1', 'ctrl+alt+arrowleft', 'escape'). The matched handler
 * receives the event and the shortcut is prevented from reaching the browser.
 *
 * The important rule lives in isTypingTarget(): while the player is typing
 * into an application — the Terminal's xterm surface, the Report editor, any
 * input or textarea — no shell shortcut fires. Ctrl+K belongs to the shell on
 * the desktop and to bash inside the Terminal, and this is what keeps that
 * true. Overlays with their own inputs (command palette) therefore handle
 * their keys locally instead of through this hook.
 */

import { useEffect, useRef } from 'react';

const TYPING_SELECTOR = 'input, textarea, select, [contenteditable="true"], .xterm';

const isTypingTarget = (target) =>
    target instanceof Element && Boolean(target.closest(TYPING_SELECTOR));

/**
 * Builds the lookup key for an event: modifiers in a fixed order, then the
 * key itself lowercased ('ctrl+shift+p').
 */
const comboOf = (event) => {
    const parts = [];
    if (event.ctrlKey || event.metaKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    parts.push(event.key.toLowerCase());
    return parts.join('+');
};

/**
 * @param {Object<string, (event: KeyboardEvent) => void>} bindings
 * @param {boolean} [enabled]
 */
export const useHotkeys = (bindings, enabled = true) => {
    // Held in a ref so re-created handler objects never re-bind the listener.
    const bindingsRef = useRef(bindings);
    bindingsRef.current = bindings;

    useEffect(() => {
        if (!enabled) return undefined;

        const handleKeyDown = (event) => {
            if (isTypingTarget(event.target)) return;

            const handler = bindingsRef.current[comboOf(event)];
            if (!handler) return;

            event.preventDefault();
            handler(event);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [enabled]);
};
