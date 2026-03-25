export const BASE = '';
const DEFAULT_SESSION = 'db584093-d905-49ef-9448-c8c02b521d15';

// Helper to add x-session header to all requests
async function apiFetch(url, opts = {}) {
  const headers = {
    ...opts.headers,
    'x-session': DEFAULT_SESSION
  };
  return fetch(url, { ...opts, headers });
}

// Append optional dateFrom/dateTo (ms timestamps) to URLSearchParams
function appendDateParams(q, params) {
  if (params.dateFrom) q.set('dateFrom', params.dateFrom);
  if (params.dateTo) q.set('dateTo', params.dateTo);
}

export async function fetchOverview(params = {}) {
  const q = new URLSearchParams();
  if (params.editor) q.set('editor', params.editor);
  appendDateParams(q, params);
  const qs = q.toString();
  const res = await apiFetch(`${BASE}/api/overview${qs ? '?' + qs : ''}`);
  return res.json();
}

export async function fetchChats(params = {}) {
  const q = new URLSearchParams();
  if (params.editor) q.set('editor', params.editor);
  if (params.folder) q.set('folder', params.folder);
  if (params.limit) q.set('limit', params.limit);
  if (params.offset) q.set('offset', params.offset);
  if (params.named === false) q.set('named', 'false');
  appendDateParams(q, params);
  const res = await apiFetch(`${BASE}/api/chats?${q}`);
  return res.json();
}

export async function fetchProjects(params = {}) {
  const q = new URLSearchParams();
  appendDateParams(q, params);
  const qs = q.toString();
  const res = await apiFetch(`${BASE}/api/projects${qs ? '?' + qs : ''}`);
  return res.json();
}

export async function fetchDailyActivity(params = {}) {
  const q = new URLSearchParams();
  if (params.editor) q.set('editor', params.editor);
  appendDateParams(q, params);
  const qs = q.toString();
  const res = await apiFetch(`${BASE}/api/daily-activity${qs ? '?' + qs : ''}`);
  return res.json();
}

export async function fetchDeepAnalytics(params = {}) {
  const q = new URLSearchParams();
  if (params.editor) q.set('editor', params.editor);
  if (params.folder) q.set('folder', params.folder);
  if (params.limit) q.set('limit', params.limit);
  appendDateParams(q, params);
  const res = await apiFetch(`${BASE}/api/deep-analytics?${q}`);
  return res.json();
}

export async function fetchDashboardStats(params = {}) {
  const q = new URLSearchParams();
  if (params.editor) q.set('editor', params.editor);
  appendDateParams(q, params);
  const qs = q.toString();
  const res = await apiFetch(`${BASE}/api/dashboard-stats${qs ? '?' + qs : ''}`);
  return res.json();
}

export async function fetchToolCalls(name, opts = {}) {
  const q = new URLSearchParams({ name });
  if (opts.limit) q.set('limit', opts.limit);
  if (opts.folder) q.set('folder', opts.folder);
  const res = await apiFetch(`${BASE}/api/tool-calls?${q}`);
  return res.json();
}
