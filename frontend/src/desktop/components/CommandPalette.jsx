import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, CornerDownLeft } from 'lucide-react';
import { getAppIcon } from '../utils/appIcons';
import { getAppAccent } from '../utils/appAccents';
import { getAppMeta, getAppSearchText } from '../utils/appMeta';

/**
 * CommandPalette.jsx
 * Ctrl+K search over everything the desktop can do: launch or focus any
 * application the incident enabled, and run any workspace command Desktop
 * passes in.
 *
 * The palette never invents capabilities — applications come from the same
 * backend-provided list as the desktop icons, and commands are handed down
 * from Desktop, which owns them. This file only filters, ranks, and runs.
 *
 * Keys are handled locally rather than through useHotkeys: the palette owns
 * a text input, and useHotkeys deliberately ignores anything typed into one.
 */
const CommandPalette = ({ applications = [], openedApplications = [], commands = [], onLaunch, onClose }) => {
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(0);
    const inputRef = useRef(null);
    const listRef = useRef(null);

    useEffect(() => inputRef.current?.focus(), []);

    const runningIds = useMemo(
        () => new Set(openedApplications.map((opened) => opened.id)),
        [openedApplications]
    );

    // Applications first (the common case), then workspace commands. A blank
    // query shows everything, so the palette doubles as a menu.
    const results = useMemo(() => {
        const needle = query.trim().toLowerCase();

        const appResults = applications
            .filter((app) => !needle || getAppSearchText(app).includes(needle))
            .map((app) => ({
                key: `app-${app.id}`,
                kind: 'application',
                title: app.name,
                subtitle: getAppMeta(app.id).tagline,
                accent: getAppAccent(app.id),
                Icon: getAppIcon(app.id),
                badge: runningIds.has(app.id) ? 'running' : null,
                run: () => onLaunch(app),
            }));

        const commandResults = commands
            .filter((command) => !needle || `${command.title} ${command.keywords || ''}`.toLowerCase().includes(needle))
            .map((command) => ({
                key: `cmd-${command.id}`,
                kind: 'command',
                title: command.title,
                subtitle: command.subtitle,
                accent: 'var(--db-cyan)',
                Icon: command.icon,
                badge: command.shortcut || null,
                run: command.run,
            }));

        return [...appResults, ...commandResults];
    }, [query, applications, commands, runningIds, onLaunch]);

    // Any change to the result set resets the cursor to the top match, so
    // Enter always runs whatever is highlighted on screen.
    useEffect(() => setSelected(0), [query]);

    useEffect(() => {
        listRef.current
            ?.querySelector('.palette__result--selected')
            ?.scrollIntoView({ block: 'nearest' });
    }, [selected, results]);

    const runResult = (result) => {
        if (!result) return;
        onClose();
        result.run();
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            onClose();
            return;
        }

        if (event.key === 'ArrowDown' || (event.key === 'Tab' && !event.shiftKey)) {
            event.preventDefault();
            setSelected((current) => (results.length ? (current + 1) % results.length : 0));
            return;
        }

        if (event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey)) {
            event.preventDefault();
            setSelected((current) => (results.length ? (current - 1 + results.length) % results.length : 0));
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            runResult(results[selected]);
        }
    };

    return (
        <div className="palette-backdrop" onMouseDown={onClose}>
            <div className="palette" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-label="Command palette">
                <div className="palette__field">
                    <Search size={16} strokeWidth={2} className="palette__field-icon" />
                    <input
                        ref={inputRef}
                        type="text"
                        className="palette__input"
                        placeholder="Search tools and actions..."
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <kbd className="palette__esc">ESC</kbd>
                </div>

                <div className="palette__results" ref={listRef}>
                    {results.length === 0 && <p className="palette__empty">No matches for “{query}”.</p>}

                    {results.map((result, index) => {
                        const Icon = result.Icon;

                        return (
                            <button
                                key={result.key}
                                type="button"
                                className={'palette__result' + (index === selected ? ' palette__result--selected' : '')}
                                style={{ '--accent': result.accent }}
                                onMouseEnter={() => setSelected(index)}
                                onClick={() => runResult(result)}
                            >
                                <span className="palette__result-icon">
                                    {Icon && <Icon size={15} strokeWidth={1.9} />}
                                </span>
                                <span className="palette__result-text">
                                    <span className="palette__result-title">{result.title}</span>
                                    {result.subtitle && (
                                        <span className="palette__result-subtitle">{result.subtitle}</span>
                                    )}
                                </span>
                                {result.badge && <span className="palette__result-badge">{result.badge}</span>}
                                {index === selected && (
                                    <CornerDownLeft size={13} strokeWidth={2} className="palette__result-enter" />
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="palette__footer">
                    <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
                    <span><kbd>↵</kbd> run</span>
                    <span><kbd>esc</kbd> dismiss</span>
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
