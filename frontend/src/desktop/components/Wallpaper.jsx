import React from 'react';

/**
 * Wallpaper.jsx
 * Renders the desktop background image.
 *
 * NOTE: assumes the backend serves backend/content/desktop statically at
 * /content/desktop — that static route doesn't exist yet, so the image
 * won't resolve until it's added. Wired here so the piece is ready.
 */
const Wallpaper = ({ wallpaper }) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const style = wallpaper
        ? { backgroundImage: `url(${API_URL}/content/desktop/${wallpaper})` }
        : undefined;

    return <div className="desktop-wallpaper" style={style} />;
};

export default Wallpaper;
