import React, { useEffect, useRef } from 'react';

/**
 * Wallpaper.jsx
 * The desktop background: the incident's image, plus the ambient layers that
 * make it read as a live operations surface — a drifting aurora wash, the
 * survey grid, scanlines, and a vignette that pushes focus to the centre.
 *
 * Each layer is a real element rather than a pseudo-element so the aurora
 * can be moved independently: the pointer's position is written to CSS
 * custom properties (--pointer-x / --pointer-y) on a rAF, giving a slight
 * parallax without React re-rendering anything. Motion is reduced to a
 * static wash under prefers-reduced-motion (desktop.css).
 *
 * The image is served by the backend's existing static /content route —
 * nothing new is requested here.
 */
const Wallpaper = ({ wallpaper }) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const rootRef = useRef(null);
    const frame = useRef(0);

    useEffect(() => {
        const handlePointerMove = (event) => {
            if (frame.current) return;

            frame.current = requestAnimationFrame(() => {
                frame.current = 0;
                const node = rootRef.current;
                if (!node) return;

                node.style.setProperty('--pointer-x', (event.clientX / window.innerWidth - 0.5).toFixed(3));
                node.style.setProperty('--pointer-y', (event.clientY / window.innerHeight - 0.5).toFixed(3));
            });
        };

        window.addEventListener('pointermove', handlePointerMove);
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            if (frame.current) cancelAnimationFrame(frame.current);
        };
    }, []);

    const style = wallpaper
        ? { backgroundImage: `url(${API_URL}/content/desktop/${wallpaper})` }
        : undefined;

    return (
        <div className="desktop-wallpaper" ref={rootRef} style={style} aria-hidden="true">
            <div className="desktop-wallpaper__aurora" />
            <div className="desktop-wallpaper__grid" />
            <div className="desktop-wallpaper__sweep" />
            <div className="desktop-wallpaper__scanlines" />
            <div className="desktop-wallpaper__vignette" />
        </div>
    );
};

export default Wallpaper;
