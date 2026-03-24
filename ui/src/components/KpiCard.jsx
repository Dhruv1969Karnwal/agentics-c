export default function KpiCard({ label, value, sub, onClick, icon: Icon, trend }) {
  return (
    <div
      className={`card p-4 transition-all duration-200 ${onClick ? 'cursor-pointer hover:scale-[1.02] hover:shadow-md' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        {Icon && (
          <div className="w-8 h-8 flex items-center justify-center rounded-lg" style={{
            background: 'var(--color-accent-subtle)',
            color: 'var(--color-accent-light)'
          }}>
            <Icon size={16} />
          </div>
        )}
        {trend && (
          <div className={`text-xs font-medium px-2 py-1 rounded`} style={{
            background: trend > 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: trend > 0 ? '#22c55e' : '#ef4444'
          }}>
            {trend > 0 ? '+' : ''}{trend}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold font-mono mb-1" style={{ color: 'var(--color-text)' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="text-sm font-medium" style={{ color: 'var(--color-text-3)' }}>{label}</div>
      {sub && <div className="text-xs mt-1" style={{ color: 'var(--color-text-4)' }}>{sub}</div>}
    </div>
  )
}
