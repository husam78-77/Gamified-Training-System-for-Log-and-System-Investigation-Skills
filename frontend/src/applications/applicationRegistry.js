import TerminalApp from './terminal';
import EmailApp from './email';
import BrowserApp from './browser';
import FilesApp from './files';
import AlertsApp from './alerts';
import AriaApp from './aria';

/**
 * applicationRegistry.js
 * The single source of truth mapping an application id to its component.
 *
 * This is the only file that needs to change when a new application is
 * added: create its folder under src/applications/, export it from that
 * folder's index.js, and register it here. Desktop and WindowManager
 * never need to change.
 */
const applicationRegistry = {
    terminal: TerminalApp,
    email: EmailApp,
    browser: BrowserApp,
    files: FilesApp,
    alerts: AlertsApp,
    aria: AriaApp,
};

export default applicationRegistry;
