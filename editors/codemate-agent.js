'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

// ============================================================
// Constants
// ============================================================


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

// Average English characters per token (GPT/Claude tokeniser approximation).
const CHARS_PER_TOKEN = 4;

// Estimated system prompt token count.
// Kilo Code injects a large system prompt on every session.  We do not have
// access to the raw prompt text, so we use a fixed estimate.
// ⚠️  Update this value if the system prompt changes significantly.
const SYSTEM_PROMPT_TOKENS = 25_000;

// ============================================================
// Role classification
// ============================================================

/**
 * Normalise a raw history message into one of three internal roles:
 *
 *   'user'      — real human turn; presence of msg.id is the signal.
 *   'tool'      — app-injected tool-result turn (role=user in raw JSON, no id).
 *                 These are INPUT to the model but are NOT human messages.
 *   'assistant' — model-generated response.
 *
 * @param {{ role: string, id?: string }} msg
 * @returns {'user'|'tool'|'assistant'|null}  null = unknown, skip this message
 */
function classifyRole(msg) {
  if (msg.role === 'assistant') return 'assistant';
  if (msg.role === 'user')      return msg.id ? 'user' : 'tool';
  return null;
}

// ============================================================
// File helpers
// ============================================================

/**
 * Read and JSON-parse a file, returning null on any error.
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
 * Return fs.Stats for a path, or null if inaccessible.
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
 * Extract embedded API usage from a raw message object if present.
 * Kilo Code / Roo Code may store this at msg.usage or msg.apiUsage.
 *
 * Returns null when absent — callers fall back to character-based estimates.
 *
 * @param {object} msg
 * @returns {{ inputTokens: number, outputTokens: number, cacheRead: number, cacheWrite: number }|null}
 */
function extractEmbeddedUsage(msg) {
  const usage = msg.usage ?? msg.apiUsage ?? null;
  if (!usage || typeof usage !== 'object') return null;

  return {
    inputTokens:  usage.input_tokens                ?? usage.inputTokens             ?? 0,
    outputTokens: usage.output_tokens               ?? usage.outputTokens            ?? 0,
    cacheRead:    usage.cache_read_input_tokens      ?? usage.cacheReadInputTokens    ?? 0,
    cacheWrite:   usage.cache_creation_input_tokens  ?? usage.cacheWriteInputTokens   ?? 0,
  };
}

// ============================================================
// Content extraction
// ============================================================

/**
 * Flatten all text-type content parts into a single trimmed string.
 * Non-text parts (tool_use, tool_result, image) are intentionally skipped.
 *
 * @param {Array|string} content
 * @returns {string}
 */
/**
 * Flatten all text-type content parts into a single trimmed string.
 * Non-text parts (tool_use, tool_result, image) are intentionally skipped.
 *
 * @param {Array|string} content
 * @param {boolean} onlyFirstPart — if true, only use the first text part found.
 * @returns {string}
 */
function extractTextContent(content, onlyFirstPart = false) {
  if (typeof content === 'string') return content.trim();
  if (!Array.isArray(content)) return '';

  const textParts = content
    .filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text);

  if (onlyFirstPart && textParts.length > 0) {
    return textParts[0].trim();
  }

  return textParts.join('\n').trim();
}

/**
 * Extract inline tool_use blocks from an assistant message content array.
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
 * Extract the task name from the first <task>…</task> block found in any
 * real user message (role=user with id), capped at 120 characters.
 *
 * @param {Array} history
 * @returns {string|null}
 */
function extractChatName(history) {
  for (const msg of history) {
    if (classifyRole(msg) !== 'user') continue;

    const text  = extractTextContent(msg.content);
    const match = text.match(/<task>([\s\S]*?)<\/task>/);
    if (match?.[1]) {
      return match[1].trim().substring(0, 120);
    }
  }
  return null;
}

// ============================================================
// Metadata tool-call extraction
// ============================================================

/**
 * Build a list of tool calls from task_metadata.json → files_in_context.
 * Duplicates are preserved so callers get accurate invocation counts.
 *
 * @param {object} metadata
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
// Cache token estimation
// ============================================================

/**
 * Estimate cache and full input tokens for a real user turn.
 *
 * Anthropic's prompt cache operates on the INPUT side only.
 *
 *   inputTokens = TOTAL tokens sent to the API for this call
 *               = system prompt + all prior messages + this turn's content
 *               This is what you are actually billed for (before cache
 *               discounts are applied by the API).
 *
 *   cacheRead   = subset of inputTokens served from the cache (cheaper).
 *                 = system prompt + all prior messages
 *                 On the first turn this is 0 (nothing cached yet).
 *
 *   cacheWrite  = tokens written into the cache for the first time.
 *                 Turn 1: system prompt + this turn's content (whole prefix).
 *                 Turn N: only this turn's new content (the delta).
 *
 * Sanity check that holds across all turns:
 *   inputTokens === cacheRead + cacheWrite
 *
 * Note: prior assistant tokens ARE included in cacheRead on the next user
 * turn because assistant responses form part of the accumulated context
 * prefix — this is as close as we can get to "output cache value".
 *
 * @param {number}  turnTokens       Token count of THIS turn's new content only
 * @param {number}  priorTokens      Accumulated tokens of all prior messages (excl. system)
 * @param {boolean} isFirstUserTurn  True only for the very first user (with id) message
 * @returns {{ inputTokens: number, cacheRead: number, cacheWrite: number }}
 */
function estimateCacheTokens(turnTokens, priorTokens, isFirstUserTurn) {
  if (isFirstUserTurn) {
    // Nothing cached yet — full prefix is written for the first time.
    const inputTokens = SYSTEM_PROMPT_TOKENS + turnTokens;
    return {
      inputTokens,
      cacheRead:  0,
      cacheWrite: inputTokens,   // system + this turn stored in cache
    };
  }

  // Subsequent turns: prior context is read from cache; only delta is written.
  const cacheRead  = SYSTEM_PROMPT_TOKENS + priorTokens;
  const cacheWrite = turnTokens;
  return {
    inputTokens: cacheRead + cacheWrite,   // total = read + write
    cacheRead,
    cacheWrite,
  };
}

// ============================================================
// getChats — public API
// ============================================================

/**
 * Scan the Kilo Code tasks directory and return a chat descriptor for each
 * valid task.
 *
 * bubbleCount reflects only real human turns (user with id) + assistant turns.
 * Tool-result injections (user without id) are excluded from this count.
 *
 * folder is sourced from task_metadata.json → workspace.
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
    const historyPath  = path.join(taskDir, 'api_conversation_history.json');

    if (!fs.existsSync(metadataPath) || !fs.existsSync(historyPath)) continue;

    const metadata = readJsonFile(metadataPath);
    const history  = readJsonFile(historyPath);

    if (!Array.isArray(history) || history.length === 0) continue;

    // Count only real human turns + assistant turns for the bubble count.
    const bubbleCount = history.filter((m) => {
      const r = classifyRole(m);
      return r === 'user' || r === 'assistant';
    }).length;

    if (bubbleCount === 0) continue;

    const firstTs = history[0].ts ?? null;
    const lastTs  = history[history.length - 1].ts ?? firstTs;

    chats.push({
      source:        ADAPTER_NAME,
      composerId:    taskId,
      name:          extractChatName(history),
      createdAt:     firstTs,
      lastUpdatedAt: lastTs,
      mode:          'agent',
      folder:        metadata?.workspace ?? null,   // from task_metadata.json
      bubbleCount,
      _taskDir:  taskDir,
      _metadata: metadata ?? {},
    });
  }

  return chats;
}

// ============================================================
// getMessages — public API
// ============================================================

/**
 * Return normalised message objects for a chat.
 *
 * Role mapping
 * ────────────
 *   raw role=user  + has id  →  role: 'user'       (human prompt)
 *   raw role=user  + no  id  →  role: 'tool'        (app-injected tool result)
 *   raw role=assistant       →  role: 'assistant'   (model output)
 *
 * Token accounting
 * ─────────────────
 *   'user'      → _inputTokens  (TOTAL tokens sent to API: system + all prior + this turn)
 *                 _cacheRead    (system + all prior message tokens — served from cache)
 *                 _cacheWrite   (tokens written to cache: full prefix on turn 1, delta thereafter)
 *                 Invariant: _inputTokens === _cacheRead + _cacheWrite
 *
 *   'tool'      → _inputTokens  (tool results are input to the model; no cache attribution)
 *
 *   'assistant' → _outputTokens (tokens generated by the model)
 *
 * Source priority: embedded msg.usage → character estimate (chars / CHARS_PER_TOKEN).
 *
 * priorTokens accumulates ALL roles because all messages form the context
 * prefix for subsequent API calls.
 *
 * Tool calls
 * ───────────
 *   1. Inline tool_use blocks in assistant content (per-turn, most accurate).
 *   2. Fallback: files_in_context from task_metadata.json, first assistant only.
 *
 * @param {object} chat
 * @returns {Array<object>}
 */
function getMessages(chat) {
  const { _taskDir: taskDir, _metadata: metadata } = chat;

  if (!taskDir || !fs.existsSync(taskDir)) return [];

  const historyPath = path.join(taskDir, 'api_conversation_history.json');
  const history = readJsonFile(historyPath);
  if (!Array.isArray(history)) return [];

  const result = [];

  // Accumulated token count of all messages processed so far.
  // Drives cacheRead estimation on each new user turn.
  let priorTokens = 0;

  // Flipped to true after the first real human turn is processed.
  let firstUserTurnSeen = false;

  // Ensures metadata tool calls are attached to the first assistant msg only.
  let metadataToolCallsAttached = false;

  for (const msg of history) {
    const role = classifyRole(msg);
    if (!role) continue;

    const textContent = extractTextContent(msg.content, role === 'user');
    if (!textContent) continue;

    const embeddedUsage = extractEmbeddedUsage(msg);
    const charCount     = textContent.length;

    // Raw token count for this turn (before any system-prompt addition).
    const turnTokens = embeddedUsage
      ? (role === 'assistant' ? embeddedUsage.outputTokens : embeddedUsage.inputTokens)
      : estimateTokens(charCount);

    const messageObj = {
      role,
      content: textContent,
      _model: msg.model ?? 'code-complete',
    };

    // ── Token assignment ────────────────────────────────────────────────────

    if (role === 'user') {
      const isFirstUserTurn = !firstUserTurnSeen;
      firstUserTurnSeen = true;

      if (embeddedUsage) {
        // Real API values — use directly, no estimation needed.
        messageObj._inputTokens = embeddedUsage.inputTokens;
        if (embeddedUsage.cacheRead  > 0) messageObj._cacheRead  = embeddedUsage.cacheRead;
        if (embeddedUsage.cacheWrite > 0) messageObj._cacheWrite = embeddedUsage.cacheWrite;
      } else {
        const { cacheRead, cacheWrite } = estimateCacheTokens(
          turnTokens,
          priorTokens,
          isFirstUserTurn,
        );
        // _inputTokens = content tokens for this turn only.
        // System prompt tokens appear in cacheWrite (turn 1) or cacheRead
        // (subsequent turns) but are NOT added here to avoid double-counting
        // in dashboards that sum inputTokens + cacheWrite.
        messageObj._inputTokens = turnTokens;
        messageObj._cacheRead   = cacheRead;
        messageObj._cacheWrite  = cacheWrite;
      }

    } else if (role === 'tool') {
      // Tool results are input to the model — no cache attribution.
      messageObj._inputTokens = embeddedUsage
        ? embeddedUsage.inputTokens
        : turnTokens;

    } else {
      // assistant
      messageObj._outputTokens = embeddedUsage
        ? embeddedUsage.outputTokens
        : turnTokens;

      // Tool calls: inline blocks take precedence over metadata fallback.
      const inlineToolCalls = extractToolCalls(msg.content);
      if (inlineToolCalls.length > 0) {
        messageObj._toolCalls = inlineToolCalls;
      } else if (!metadataToolCallsAttached) {
        const metaToolCalls = extractMetadataToolCalls(metadata);
        if (metaToolCalls.length > 0) {
          messageObj._toolCalls = metaToolCalls;
          metadataToolCallsAttached = true;
        }
      }
    }

    // All roles contribute to the running prior-token total because all
    // prior messages form part of the context prefix for the next API call.
    priorTokens += turnTokens;

    result.push(messageObj);
  }

  return result;
}

// ============================================================
// Module exports
// ============================================================

module.exports = {
  name:      ADAPTER_NAME,
  labels:    LABELS,
  getChats,
  getMessages,
};