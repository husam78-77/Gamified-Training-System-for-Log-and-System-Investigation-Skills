import React from 'react';

/**
 * FileTree.jsx
 * Left-pane directory tree, built straight from the flat virtualFiles
 * array — no separate tree structure is maintained, so it can never
 * drift from what the Terminal sees.
 */

// Immediate child directories of `parentPath`.
const getChildDirs = (files, parentPath) => {
    const prefix = parentPath === '/' ? '/' : parentPath + '/';
    return files.filter((f) => {
        if (f.file_type !== 'directory') return false;
        if (!f.file_path.startsWith(prefix)) return false;
        const remainder = f.file_path.slice(prefix.length);
        return remainder.length > 0 && !remainder.includes('/');
    });
};

const FileTreeNode = ({ files, path, name, currentPath, onNavigate, depth }) => {
    const children = getChildDirs(files, path);
    const isActive = path === currentPath;

    return (
        <div className="file-tree__node">
            <button
                type="button"
                className={'file-tree__row' + (isActive ? ' file-tree__row--active' : '')}
                style={{ paddingLeft: `${depth * 14 + 8}px` }}
                onClick={() => onNavigate(path)}
            >
                {name}
            </button>
            {children.map((child) => (
                <FileTreeNode
                    key={child.file_path}
                    files={files}
                    path={child.file_path}
                    name={child.file_name}
                    currentPath={currentPath}
                    onNavigate={onNavigate}
                    depth={depth + 1}
                />
            ))}
        </div>
    );
};

const FileTree = ({ files, currentPath, onNavigate }) => {
    return (
        <div className="file-tree">
            <FileTreeNode
                files={files}
                path="/"
                name="/"
                currentPath={currentPath}
                onNavigate={onNavigate}
                depth={0}
            />
        </div>
    );
};

export default FileTree;
