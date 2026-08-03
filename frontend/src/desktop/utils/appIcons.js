import { Terminal, Mail, Globe, Folder, Bell, Bot, HelpCircle } from 'lucide-react';

/**
 * appIcons.js
 * Maps an application id to its Lucide icon component. Add new entries
 * here as new applications are introduced — DesktopIcon (and anything
 * else that renders an app icon) never hardcodes which icon goes with
 * which app.
 */
const APP_ICONS = {
    terminal: Terminal,
    email: Mail,
    browser: Globe,
    files: Folder,
    alerts: Bell,
    aria: Bot,
};

/**
 * @param {string} appId
 * @returns {React.ComponentType} icon component for the given app id,
 *   falling back to a generic icon for unmapped ids
 */
export const getAppIcon = (appId) => APP_ICONS[appId] || HelpCircle;
