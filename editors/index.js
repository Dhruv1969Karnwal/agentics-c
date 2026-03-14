const codemateAgent = require('./codemate-agent');

const editors = [codemateAgent]
// Build a unified source → display-label map from all editor modules
const editorLabels = {};
for (const editor of editors) {
  if (editor.labels) Object.assign(editorLabels, editor.labels);
}

/**
 * Get all chats from all editor adapters, sorted by most recent first.
 */
function getAllChats() {
  const chats = [];
  for (const editor of editors) {
    try {
      const editorChats = editor.getChats();
      chats.push(...editorChats);
    } catch { /* skip broken adapters */ }
  }

  chats.sort((a, b) => {
    const ta = a.lastUpdatedAt || a.createdAt || 0;
    const tb = b.lastUpdatedAt || b.createdAt || 0;
    return tb - ta;
  });

  return chats;
}

/**
 * Get messages for a chat object, dispatching to the right editor adapter.
 */
function getMessages(chat) {
  const editor = editors.find((e) => e.name === chat.source);
  // Match variants: windsurf-next, antigravity, claude-code, vscode-insiders etc.
  const resolvedEditor = editor || editors.find((e) =>
    chat.source && (chat.source.startsWith(e.name) || (e.sources && e.sources.includes(chat.source)))
  );
  if (!resolvedEditor) return [];
  return resolvedEditor.getMessages(chat);
}

function resetCaches() {
  for (const editor of editors) {
    if (typeof editor.resetCache === 'function') editor.resetCache();
  }
}

/**
 * Get usage / quota data from all editors that support it.
 * Returns an array of usage objects, one per editor/variant.
 */
async function getAllUsage() {
  const results = [];
  for (const editor of editors) {
    if (typeof editor.getUsage !== 'function') continue;
    try {
      const usage = await editor.getUsage();
      if (!usage) continue;
      // Windsurf returns an array (one per variant), Cursor returns a single object
      if (Array.isArray(usage)) results.push(...usage);
      else results.push(usage);
    } catch { /* skip broken adapters */ }
  }
  return results;
}

/**
 * Get all artifacts for a given project folder from all editors.
 * Also scans for general/shared artifact files (plan.md, etc.).
 */
function getAllArtifacts(folder) {
  const { scanArtifacts } = require('./base');
  const artifacts = [];

  // Collect from each editor that implements getArtifacts
  for (const editor of editors) {
    if (typeof editor.getArtifacts !== 'function') continue;
    try {
      artifacts.push(...editor.getArtifacts(folder));
    } catch { /* skip broken adapters */ }
  }

  // General / shared artifact files (not tied to any specific editor)
  if (folder) {
    try {
      artifacts.push(...scanArtifacts(folder, {
        editor: '_general',
        label: 'General',
        files: ['AGENTS.md', '.mcp.json', 'plan.md', 'progress.md', 'TODO.md', 'CONVENTIONS.md', 'ARCHITECTURE.md', 'PLANNING.md'],
        dirs: [],
      }));
    } catch { /* skip */ }
  }

  // Deduplicate by path — editor-specific entries take priority over general
  const seen = new Map();
  for (const a of artifacts) {
    const existing = seen.get(a.path);
    if (!existing || (existing.editor === '_general' && a.editor !== '_general')) {
      seen.set(a.path, a);
    }
  }
  return Array.from(seen.values());
}

module.exports = { getAllChats, getMessages, editors, editorLabels, resetCaches, getAllUsage, getAllArtifacts };
