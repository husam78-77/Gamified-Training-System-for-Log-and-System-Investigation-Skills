/**
 * shortcuts.js
 * The desktop's keyboard map, declared once. Desktop binds handlers by
 * looking combos up here, and the Shortcuts overlay renders the same list —
 * so the help card can never document a key that isn't actually bound.
 *
 * Combos are written in the normalised form useHotkeys builds from an event:
 * modifiers in ctrl → alt → shift order, then the lowercased key.
 *
 * Two absences are deliberate. Alt+Tab belongs to the operating system and
 * never reaches the browser, so window switching is Ctrl+`. And every combo
 * here is suppressed while the player is typing into an application, which
 * is why Ctrl+K opens the palette on the desktop but still edits the line
 * inside the Terminal.
 */
export const SHORTCUTS = [
    { id: 'palette', combo: 'ctrl+k', keys: ['Ctrl', 'K'], description: 'Command palette — search tools and actions', group: 'Shell' },
    { id: 'switcher', combo: 'ctrl+`', keys: ['Ctrl', '`'], description: 'Window switcher', group: 'Shell' },
    { id: 'launch', combo: null, keys: ['Alt', '1…9'], description: 'Launch or focus the nth application', group: 'Shell' },
    { id: 'shortcuts', combo: 'shift+?', keys: ['Shift', '?'], description: 'Show this shortcut list', group: 'Shell' },

    { id: 'snapLeft', combo: 'ctrl+alt+arrowleft', keys: ['Ctrl', 'Alt', '←'], description: 'Snap the focused window left', group: 'Windows' },
    { id: 'snapRight', combo: 'ctrl+alt+arrowright', keys: ['Ctrl', 'Alt', '→'], description: 'Snap the focused window right', group: 'Windows' },
    { id: 'maximize', combo: 'ctrl+alt+arrowup', keys: ['Ctrl', 'Alt', '↑'], description: 'Maximize / restore the focused window', group: 'Windows' },
    { id: 'minimize', combo: 'ctrl+alt+arrowdown', keys: ['Ctrl', 'Alt', '↓'], description: 'Minimize the focused window', group: 'Windows' },
    { id: 'close', combo: 'ctrl+alt+w', keys: ['Ctrl', 'Alt', 'W'], description: 'Close the focused window', group: 'Windows' },
    { id: 'tile', combo: 'ctrl+alt+t', keys: ['Ctrl', 'Alt', 'T'], description: 'Tile every open window', group: 'Windows' },
    { id: 'showDesktop', combo: 'ctrl+alt+d', keys: ['Ctrl', 'Alt', 'D'], description: 'Minimize everything — show the desktop', group: 'Windows' },

    { id: 'dragSnap', combo: null, keys: ['Drag', 'to edge'], description: 'Drag a window to a screen edge or corner to snap it', group: 'Pointer' },
    { id: 'doubleClick', combo: null, keys: ['Double-click', 'title'], description: 'Maximize or restore a window', group: 'Pointer' },
    { id: 'rightClick', combo: null, keys: ['Right-click'], description: 'Context menu on the desktop or any application tile', group: 'Pointer' },
];

/**
 * The combo string for a shortcut id, used to build the binding map.
 *
 * @param {string} id
 * @returns {string|null} null for shortcuts that are documented but bound
 *   dynamically (per-application hotkeys) or performed with the pointer.
 */
export const comboFor = (id) => SHORTCUTS.find((shortcut) => shortcut.id === id)?.combo ?? null;

/** Display groups, in the order the overlay should show them. */
export const SHORTCUT_GROUPS = ['Shell', 'Windows', 'Pointer'];
