import React from 'react';

/**
 * FileViewer.jsx
 * Right-pane content view. Shows a directory's immediate children, or a
 * file's raw content — driven entirely by currentPath against the same
 * flat virtualFiles array FileTree renders from.
 */

// Immediate children (files + directories) of `parentPath`.
const getChildren = (files, parentPath) => {
    const prefix = parentPath === '/' ? '/' : parentPath + '/';
    return files.filter((f) => {
        if (!f.file_path.startsWith(prefix)) return false;
        const remainder = f.file_path.slice(prefix.length);
        return remainder.length > 0 && !remainder.includes('/');
    });
};

const FileViewer = ({ files, currentPath, onNavigate }) => {
    const node = files.find((f) => f.file_path === currentPath);

    if (node && node.file_type === 'file') {
        return (
            <div className="file-viewer">
                <div className="file-viewer__filename">{node.file_name}</div>
                <pre className="file-viewer__content">{node.content}</pre>
            </div>
        );
    }

    const children = getChildren(files, currentPath);

    return (
        <div className="file-viewer">
            {children.length === 0 && (
                <div className="file-viewer__empty">(empty directory)</div>
            )}
            {children.map((child) => (
                <button
                    key={child.file_path}
                    type="button"
                    className="file-viewer__item"
                    onClick={() => onNavigate(child.file_path)}
                >
                    <span className="file-viewer__icon">
                        {child.file_type === 'directory' ? '📁' : '📄'}
                    </span>
                    <span>{child.file_name}</span>
                </button>
            ))}
        </div>
    );
};

export default FileViewer;
