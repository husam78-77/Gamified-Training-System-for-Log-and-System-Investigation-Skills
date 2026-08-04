import React from 'react';

/**
 * Breadcrumb.jsx
 * Displays the current path as a chain of clickable ancestor paths,
 * e.g. currentPath "/etc/ssh" renders: /  /etc  /etc/ssh
 */
const Breadcrumb = ({ currentPath, onNavigate }) => {
    const segments = currentPath.split('/').filter(Boolean);

    const crumbs = [{ path: '/' }];
    let acc = '';
    segments.forEach((segment) => {
        acc += '/' + segment;
        crumbs.push({ path: acc });
    });

    return (
        <div className="breadcrumb">
            {crumbs.map((crumb) => (
                <button
                    key={crumb.path}
                    type="button"
                    className={
                        'breadcrumb__item' +
                        (crumb.path === currentPath ? ' breadcrumb__item--active' : '')
                    }
                    onClick={() => onNavigate(crumb.path)}
                >
                    {crumb.path}
                </button>
            ))}
        </div>
    );
};

export default Breadcrumb;
