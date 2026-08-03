/**
 * evidenceInjector.js
 * Applies an incident's evidence pack (assets/replace, assets/create,
 * assets/delete) on top of a template's virtualFiles array.
 *
 * Kept modular on purpose: each operation (replace/create/delete) has its
 * own apply* function built on the same walk() primitive, so later
 * additions (e.g. an "append/" or "rename/" op) only need a new apply*
 * function wired into injectEvidence().
 */

const fs = require('fs/promises');
const path = require('path');

const INCIDENTS_DIR = path.join(__dirname, '..', '..', 'content', 'incidents');

const joinPath = (basePath, name) => (basePath === '' ? name : `${basePath}/${name}`);

// Recursively lists every entry under a directory as POSIX-style relative
// paths (e.g. "var/log/auth.log"), regardless of host OS. Returns []
// (rather than throwing) when the directory doesn't exist, since an
// incident may not define every asset folder.
const walk = async (absDir, relDir = '') => {
    let dirents;
    try {
        dirents = await fs.readdir(absDir, { withFileTypes: true });
    } catch (err) {
        if (err.code === 'ENOENT') return [];
        throw err;
    }

    const entries = [];
    for (const dirent of dirents) {
        const absPath = path.join(absDir, dirent.name);
        const relPath = joinPath(relDir, dirent.name);

        if (dirent.isDirectory()) {
            entries.push({ relPath, absPath, isDirectory: true });
            entries.push(...(await walk(absPath, relPath)));
        } else if (dirent.isFile()) {
            entries.push({ relPath, absPath, isDirectory: false });
        }
    }
    return entries;
};

const toVirtualPath = (relPath) => `/${relPath}`;

// ── replace/ ─────────────────────────────────────────────────────────────
// Overwrites the `content` of an existing virtual file; every other field
// (file_type, is_hidden, reveal_at_step, ...) is left untouched.
const applyReplace = async (virtualFiles, replaceDir) => {
    const entries = await walk(replaceDir);

    for (const entry of entries) {
        if (entry.isDirectory) continue;

        const virtualPath = toVirtualPath(entry.relPath);
        const target = virtualFiles.find(f => f.file_path === virtualPath);

        if (!target) {
            console.warn(`[evidenceInjector] replace: no virtual file at "${virtualPath}", skipped`);
            continue;
        }

        target.content = await fs.readFile(entry.absPath, 'utf-8');
    }
};

// ── delete/ ──────────────────────────────────────────────────────────────
// Marker files/directories whose path identifies a virtual file to remove.
// Only the path is used — marker content is irrelevant.
const applyDelete = async (virtualFiles, deleteDir) => {
    const entries = await walk(deleteDir);

    for (const entry of entries) {
        const virtualPath = toVirtualPath(entry.relPath);
        const index = virtualFiles.findIndex(f => f.file_path === virtualPath);

        if (index === -1) {
            console.warn(`[evidenceInjector] delete: no virtual file at "${virtualPath}", skipped`);
            continue;
        }

        virtualFiles.splice(index, 1);
    }
};

// ── create/ ──────────────────────────────────────────────────────────────
// Adds brand new virtual file/directory objects.
const applyCreate = async (virtualFiles, createDir) => {
    const entries = await walk(createDir);

    for (const entry of entries) {
        const virtualPath = toVirtualPath(entry.relPath);
        const fileName = path.basename(entry.relPath);

        if (entry.isDirectory) {
            virtualFiles.push({
                file_name: fileName,
                file_path: virtualPath,
                file_type: 'directory',
            });
            continue;
        }

        const content = await fs.readFile(entry.absPath, 'utf-8');
        virtualFiles.push({
            file_name: fileName,
            file_path: virtualPath,
            file_type: 'file',
            content,
        });
    }
};

/**
 * Apply an incident's evidence pack on top of a template's virtualFiles.
 * Mutates and returns the same array.
 * @param {Array} virtualFiles
 * @param {string} incidentId
 * @returns {Promise<Array>} updated virtualFiles
 */
const injectEvidence = async (virtualFiles, incidentId) => {
    const assetsDir = path.join(INCIDENTS_DIR, incidentId, 'assets');

    await applyReplace(virtualFiles, path.join(assetsDir, 'replace'));
    await applyDelete(virtualFiles, path.join(assetsDir, 'delete'));
    await applyCreate(virtualFiles, path.join(assetsDir, 'create'));

    return virtualFiles;
};

module.exports = {
    injectEvidence,
};
