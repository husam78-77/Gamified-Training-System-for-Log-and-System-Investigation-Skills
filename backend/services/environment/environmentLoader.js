/**
 * environmentLoader.js
 * Recursively loads a template's on-disk filesystem folder into the
 * flat virtualFiles[] shape the terminal engine operates on.
 *
 * Kept modular on purpose: walkDirectory()/makeFileEntry()/makeDirEntry()
 * are separated so Evidence Pack injection can later merge extra entries
 * into (or override) the array loadTemplate() returns, without touching
 * the directory-walking logic itself.
 */

const fs = require('fs/promises');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, '..', '..', 'content', 'templates');

// Joins path segments with forward slashes regardless of host OS.
const joinPath = (basePath, name) => (basePath === '/' ? `/${name}` : `${basePath}/${name}`);

const makeDirEntry = (name, filePath) => ({
    file_name: name,
    file_path: filePath,
    file_type: 'directory',
});

const makeFileEntry = (name, filePath, content) => ({
    file_name: name,
    file_path: filePath,
    file_type: 'file',
    content,
});

/**
 * Recursively walk a directory on disk, appending virtualFiles entries
 * for every folder and file found beneath it.
 * @param {string} absDirPath - real filesystem path to read
 * @param {string} virtualDirPath - corresponding Linux-style path (e.g. "/etc")
 * @param {Array} virtualFiles - accumulator array
 */
const walkDirectory = async (absDirPath, virtualDirPath, virtualFiles) => {
    const entries = await fs.readdir(absDirPath, { withFileTypes: true });

    for (const entry of entries) {
        const absEntryPath = path.join(absDirPath, entry.name);
        const virtualEntryPath = joinPath(virtualDirPath, entry.name);

        if (entry.isDirectory()) {
            virtualFiles.push(makeDirEntry(entry.name, virtualEntryPath));
            await walkDirectory(absEntryPath, virtualEntryPath, virtualFiles);
        } else if (entry.isFile()) {
            const content = await fs.readFile(absEntryPath, 'utf-8');
            virtualFiles.push(makeFileEntry(entry.name, virtualEntryPath, content));
        }
    }
};

/**
 * Load a template's filesystem/ folder into a flat virtualFiles array.
 * @param {string} templateName - folder name under content/templates/
 * @returns {Promise<Array>} virtualFiles
 */
const loadTemplate = async (templateName) => {
    const filesystemRoot = path.join(TEMPLATES_DIR, templateName, 'filesystem');
    const virtualFiles = [];

    try {
        await walkDirectory(filesystemRoot, '/', virtualFiles);
    } catch (err) {
        throw new Error(`Failed to load template "${templateName}" (${filesystemRoot}): ${err.message}`);
    }

    return virtualFiles;
};

module.exports = {
    loadTemplate,
};
