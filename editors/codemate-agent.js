'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

// ============================================================
// Constants
// ============================================================
// C:\Users\Dhruv\Desktop\CodeMate.AI\extra_research\agentlytics\extra_data
// const CODEMATE_TASKS_DIR = path.join(
//   os.homedir(),
//   'AppData',
//   'Roaming',
//   'Code',
//   'User',
//   'globalStorage',
//   'kilocode.kilo-code',
//   'tasks'
// );

const CODEMATE_TASKS_DIR = path.join(
  os.homedir(),
  'Desktop',
  'CodeMate.AI',
  'extra_research',
  'agentlytics',
  'extra_data',
);

const ADAPTER_NAME = 'codemate-agent';
const LABELS = { [ADAPTER_NAME]: 'CodeMate Agent' };

// Token sources in api_conversation_history.json
// Each message may carry usage data from the API response headers/body.
// If the raw history doesn't store per-message usage, we fall back to
// character-based estimates (chars / 4 ≈ tokens for English text).
const CHARS_PER_TOKEN = 4;

// ============================================================
// File helpers
// ============================================================

/**
 * Read and JSON-parse a file safely.
 * Returns the parsed value, or `null` on any error.
 *
 * @param {string} filePath
 * @returns {unknown|null}
 */
function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Return stat for a path, or null if it doesn't exist / isn't accessible.
 *
 * @param {string} p
 * @returns {fs.Stats|null}
 */
function safeStat(p) {
  try {
    return fs.statSync(p);
  } catch {
    return null;
  }
}

// ============================================================
// Token helpers
// ============================================================

/**
 * Estimate token count from a character count.
 *
 * @param {number} charCount
 * @returns {number}
 */
function estimateTokens(charCount) {
  return Math.round(charCount / CHARS_PER_TOKEN);
}

/**
 * Extract the actual API usage from an assistant message if the model
 * embedded it (some providers include a `usage` object on each message).
 *
 * Returns null when no embedded usage is found so callers can fall back
 * to the character-estimate path.
 *
 * @param {object} msg  Raw message from api_conversation_history.json
 * @returns {{ inputTokens: number, outputTokens: number, cacheRead: number, cacheWrite: number }|null}
 */
function extractEmbeddedUsage(msg) {
  // Kilo Code / Roo Code stores API usage at msg.usage or msg.apiUsage
  const usage = msg.usage ?? msg.apiUsage ?? null;
  if (!usage || typeof usage !== 'object') return null;

  return {
    // Anthropic SDK naming
    inputTokens: usage.input_tokens ?? usage.inputTokens ?? 0,
    outputTokens: usage.output_tokens ?? usage.outputTokens ?? 0,
    cacheRead: usage.cache_read_input_tokens ?? usage.cacheReadInputTokens ?? 0,
    cacheWrite: usage.cache_creation_input_tokens ?? usage.cacheWriteInputTokens ?? 0,
  };
}

// ============================================================
// Content extraction
// ============================================================

/**
 * Flatten all text parts of a message content array (or plain string) into
 * a single trimmed string.  Tool-result / image blocks are skipped.
 *
 * The raw content array can contain:
 *   { type: 'text', text: '...' }
 *   { type: 'tool_use', ... }          ← skip
 *   { type: 'tool_result', ... }       ← skip
 *   { type: 'image', ... }             ← skip
 *
 * @param {Array|string} content
 * @returns {string}
 */
function extractTextContent(content) {
  if (typeof content === 'string') return content.trim();
  if (!Array.isArray(content)) return '';

  return content
    .filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('\n')
    .trim();
}

/**
 * Extract all tool calls from a message content array.
 * Only assistant messages carry tool_use blocks.
 *
 * @param {Array} content
 * @returns {Array<{ name: string, args: object }>}
 */
function extractToolCalls(content) {
  if (!Array.isArray(content)) return [];

  return content
    .filter((part) => part.type === 'tool_use' && part.name)
    .map((part) => ({ name: part.name, args: part.input ?? {} }));
}

// ============================================================
// Chat name extraction
// ============================================================

/**
 * Pull the task name from the first <task>…</task> block found in any user
 * message, capped at 120 characters.
 *
 * @param {Array} history  Parsed api_conversation_history.json
 * @returns {string|null}
 */
function extractChatName(history) {
  for (const msg of history) {
    if (msg.role !== 'user') continue;

    const text = extractTextContent(msg.content);
    const match = text.match(/<task>([\s\S]*?)<\/task>/);
    if (match?.[1]) {
      return match[1].trim().substring(0, 120);
    }
  }
  return null;
}

// ============================================================
// Tool call extraction from metadata
// ============================================================

/**
 * Build a list of tool-call records from task_metadata.json
 * files_in_context entries.  Each file has a record_source (e.g. 'read_tool',
 * 'roo_edited') that represents one logical tool invocation.
 *
 * We preserve duplicates so callers get accurate frequency counts.
 *
 * @param {object} metadata  Parsed task_metadata.json
 * @returns {Array<{ name: string, args: object }>}
 */
function extractMetadataToolCalls(metadata) {
  const files = metadata?.files_in_context;
  if (!Array.isArray(files)) return [];

  return files
    .filter((f) => typeof f.record_source === 'string')
    .map((f) => ({ name: f.record_source, args: {} }));
}

// ============================================================
// getChats — public API
// ============================================================

/**
 * Return all CodeMate Agent task directories as chat descriptor objects.
 *
 * @returns {Array<object>}
 */
function getChats() {
  if (!fs.existsSync(CODEMATE_TASKS_DIR)) return [];

  let taskIds;
  try {
    taskIds = fs.readdirSync(CODEMATE_TASKS_DIR);
  } catch {
    return [];
  }

  const chats = [];

  for (const taskId of taskIds) {
    const taskDir = path.join(CODEMATE_TASKS_DIR, taskId);

    const stat = safeStat(taskDir);
    if (!stat?.isDirectory()) continue;

    const metadataPath = path.join(taskDir, 'task_metadata.json');
    const historyPath = path.join(taskDir, 'api_conversation_history.json');

    if (!fs.existsSync(metadataPath) || !fs.existsSync(historyPath)) continue;

    const metadata = readJsonFile(metadataPath);
    const history = readJsonFile(historyPath);

    if (!Array.isArray(history) || history.length === 0) continue;

    // Filter to roles we care about
    const userMessages = history.filter((m) => m.role === 'user');
    const assistantMessages = history.filter((m) => m.role === 'assistant');
    const bubbleCount = userMessages.length + assistantMessages.length;
    if (bubbleCount === 0) continue;

    // Timestamps — `ts` fields are Unix milliseconds
    const firstTs = history[0].ts ?? null;
    const lastTs = history[history.length - 1].ts ?? firstTs;

    chats.push({
      source: ADAPTER_NAME,
      composerId: taskId,
      name: extractChatName(history),
      createdAt: firstTs,
      lastUpdatedAt: lastTs,
      mode: 'agent',
      folder: metadata?.workspace ?? null,
      bubbleCount,
      // Private fields used by getMessages — prefixed with _ to signal that
      // they are internal and not intended for display layers.
      _taskDir: taskDir,
      _metadata: metadata ?? {},
    });
  }

  return chats;
}

// ============================================================
// getMessages — public API
// ============================================================

/**
 * Return an array of normalised message objects for a given chat.
 *
 * Token accounting strategy (in priority order):
 *
 *  1. Embedded usage object on the message (`msg.usage` / `msg.apiUsage`) —
 *     exact values as reported by the API.
 *
 *  2. Character-based estimate (chars / 4) — a reasonable approximation
 *     when the raw history doesn't carry per-message token counts.
 *
 * Token semantics:
 *  • user message   → _inputTokens  (tokens sent TO the model for that turn)
 *  • assistant msg  → _outputTokens (tokens generated BY the model)
 *  • cache tokens   → only present when embedded usage reports them;
 *                     we do NOT fabricate cache estimates from content length
 *                     because that would be misleading.
 *
 * Tool calls:
 *  • Prefer inline tool_use blocks from the content array (accurate).
 *  • Fall back to files_in_context entries in task_metadata.json for the
 *    *first* assistant message only (metadata is session-level, not per-turn).
 *
 * @param {object} chat  Chat descriptor returned by getChats()
 * @returns {Array<object>}
 */
function getMessages(chat) {
  const { _taskDir: taskDir, _metadata: metadata } = chat;

  if (!taskDir || !fs.existsSync(taskDir)) return [];

  const historyPath = path.join(taskDir, 'api_conversation_history.json');
  const history = readJsonFile(historyPath);

  if (!Array.isArray(history)) return [];

  const result = [];
  let metadataToolCallsAttached = false;

  for (const msg of history) {
    const { role } = msg;

    // Only process user and assistant turns
    if (role !== 'user' && role !== 'assistant') continue;

    const textContent = extractTextContent(msg.content);
    if (!textContent) continue;

    const normalizedRole = role; // 'user' | 'assistant'
    const embeddedUsage = extractEmbeddedUsage(msg);
    const charCount = textContent.length;

    const messageObj = {
      role: normalizedRole,
      content: textContent,
      _model: msg.model ?? 'code-complete',
    };

    if (normalizedRole === 'user') {
      // ── Input tokens ────────────────────────────────────────────────────
      // User messages represent the prompt sent to the model.
      messageObj._inputTokens = embeddedUsage
        ? embeddedUsage.inputTokens
        : estimateTokens(charCount);

      // Cache read tokens belong to the *request* side (user turn) because
      // they represent previously cached context being reused on this call.
      if (embeddedUsage && embeddedUsage.cacheRead > 0) {
        messageObj._cacheRead = embeddedUsage.cacheRead;
      }
      if (embeddedUsage && embeddedUsage.cacheWrite > 0) {
        messageObj._cacheWrite = embeddedUsage.cacheWrite;
      }
    } else {
      // ── Output tokens ────────────────────────────────────────────────────
      // Assistant messages represent model-generated completions.
      messageObj._outputTokens = embeddedUsage
        ? embeddedUsage.outputTokens
        : estimateTokens(charCount);

      // ── Tool calls ───────────────────────────────────────────────────────
      // Prefer inline tool_use blocks — these are per-turn accurate.
      const inlineToolCalls = extractToolCalls(msg.content);

      if (inlineToolCalls.length > 0) {
        messageObj._toolCalls = inlineToolCalls;
      } else if (!metadataToolCallsAttached) {
        // Fallback: attach metadata-level tool calls to the first assistant
        // message only — they are session-wide, not per-turn.
        const metaToolCalls = extractMetadataToolCalls(metadata);
        if (metaToolCalls.length > 0) {
          messageObj._toolCalls = metaToolCalls;
          metadataToolCallsAttached = true;
        }
      }
    }

    result.push(messageObj);
  }

  return result;
}

// ============================================================
// Module exports
// ============================================================

module.exports = {
  name: ADAPTER_NAME,
  labels: LABELS,
  getChats,
  getMessages,
};