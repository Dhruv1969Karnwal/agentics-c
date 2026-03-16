export const EDITOR_COLORS = {
  'vs-code-cora': '#3b82f6',
  'jet-brains-cora': '#a855f7',
};

export const EDITOR_LABELS = {
  'vs-code-cora': 'VS Code Cora',
  'jet-brains-cora': 'JetBrains Cora',
};

export function editorColor(src) {
  return EDITOR_COLORS[src] || '#6b7280';
}

export function editorLabel(src) {
  return EDITOR_LABELS[src] || src;
}

export function formatNumber(n) {
  if (n == null) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

export function formatCost(n) {
  if (n == null || n === 0) return '$0';
  if (n < 0.01) return '<$0.01';
  if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'K';
  if (n >= 100) return '$' + Math.round(n);
  return '$' + n.toFixed(2);
}

export function formatDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Convert { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' } date range to API ms timestamps.
 * Returns {} if range is null/incomplete.
 */
export function dateRangeToApiParams(range) {
  if (!range?.from || !range?.to) return {};
  return {
    dateFrom: new Date(range.from).getTime(),
    dateTo: new Date(range.to + 'T23:59:59').getTime(),
  };
}

export function formatDateTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString();
}
