const path = require('path');
const os = require('os');

const HOME = os.homedir();

// --- Platform utilities ---

/**
 * Get platform-specific app data directory path for VS Code-like editors.
 * - macOS: ~/Library/Application Support/{appName}/User/...
 * - Windows: ~/AppData/Roaming/{appName}/User/...
 * - Linux: ~/.config/{appName}/User/...
 */
function getAppDataPath(appName) {
  switch (process.platform) {
    case 'darwin':
      return path.join(HOME, 'Library', 'Application Support', appName);
    case 'win32':
      return path.join(HOME, 'AppData', 'Roaming', appName);
    default: // linux, etc.
      return path.join(HOME, '.config', appName);
  }
}

/**
 * Every editor adapter must implement:
 *
 *   name        - string identifier (e.g. 'cursor', 'windsurf')
 *   getChats()  - returns array of chat objects:
 *       { source, composerId, name, createdAt, lastUpdatedAt, mode, folder, bubbleCount, encrypted }
 *   getMessages(chat) - returns array of message objects:
 *       { role: 'user'|'assistant'|'system'|'tool', content: string|Array }
 */

/**
 * Scan a project folder for artifact files.
 *
 * @param {string} folder - Absolute path to the project folder
 * @param {Object} opts
 * @param {string} opts.editor - Editor identifier (e.g. 'cursor', 'claude-code')
 * @param {string} opts.label - Display label (e.g. 'Cursor', 'Claude Code')
 * @param {string[]} [opts.files] - Relative file paths to check (e.g. ['CLAUDE.md'])
 * @param {string[]} [opts.dirs] - Relative directories to scan for .md/.yaml/.yml/.json files
 * @returns {Array} Array of artifact objects
 */
function scanArtifacts(folder, { editor, label, files = [], dirs = [] }) {
  const fs = require('fs');
  const artifacts = [];
  if (!folder || !fs.existsSync(folder)) return artifacts;

  for (const relPath of files) {
    const filePath = path.join(folder, relPath);
    try {
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) continue;
      const content = fs.readFileSync(filePath, 'utf-8');
      artifacts.push({
        editor,
        editorLabel: label,
        name: relPath,
        path: filePath,
        relativePath: relPath,
        size: stat.size,
        modifiedAt: stat.mtime.getTime(),
        preview: content.substring(0, 500),
        lines: content.split('\n').length,
      });
    } catch { /* skip */ }
  }

  const isArtifactFile = (f) =>
    f.endsWith('.md') || f.endsWith('.mdc') || f.endsWith('.yaml') || f.endsWith('.yml') || f.endsWith('.json');

  const addFile = (filePath, relPath, fileName) => {
    try {
      const fstat = fs.statSync(filePath);
      if (!fstat.isFile()) return;
      const content = fs.readFileSync(filePath, 'utf-8');
      artifacts.push({
        editor,
        editorLabel: label,
        name: fileName,
        path: filePath,
        relativePath: relPath,
        size: fstat.size,
        modifiedAt: fstat.mtime.getTime(),
        preview: content.substring(0, 500),
        lines: content.split('\n').length,
      });
    } catch { /* skip */ }
  };

  for (const dir of dirs) {
    const dirPath = path.join(folder, dir);
    try {
      const stat = fs.statSync(dirPath);
      if (!stat.isDirectory()) continue;
      const entries = fs.readdirSync(dirPath);
      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry);
        if (isArtifactFile(entry)) {
          addFile(entryPath, path.join(dir, entry), entry);
        } else {
          // Recurse one level into subdirectories (e.g. .kiro/specs/<name>/, .windsurf/skills/<name>/)
          try {
            const eStat = fs.statSync(entryPath);
            if (!eStat.isDirectory()) continue;
            const subEntries = fs.readdirSync(entryPath).filter(isArtifactFile);
            for (const subFile of subEntries) {
              addFile(path.join(entryPath, subFile), path.join(dir, entry, subFile), subFile);
            }
          } catch { /* skip */ }
        }
      }
    } catch { /* skip */ }
  }

  return artifacts;
}

module.exports = {
  getAppDataPath,
  scanArtifacts,
};
