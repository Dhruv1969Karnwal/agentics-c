export default function KpiCard({ label, value, sub, onClick, icon: Icon }) {
  return (
    <div
      className={`card p-3 ${onClick ? 'cursor-pointer hover:bg-[var(--c-card-hover)] hover:border-[var(--c-accent-dim)]' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      aria-label={onClick ? `View ${label} details` : undefined}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        {Icon && (
          <div className="w-6 h-6 flex items-center justify-center rounded shrink-0" style={{ background: 'rgba(99,102,241,0.1)' }}>
            <Icon size={14} style={{ color: 'var(--c-accent)' }} aria-hidden="true" />
          </div>
        )}
        <div className={`font-bold ${Icon ? 'text-sm' : 'text-base'}`} style={{ color: onClick ? 'var(--c-accent)' : 'var(--c-white)' }}>
          {value}
        </div>
      </div>
      <div className="text-xs font-medium" style={{ color: 'var(--c-text2)' }}>{label}</div>
      {sub && (
        <div className="text-[11px] mt-1 flex items-center gap-1" style={{ color: 'var(--c-text3)' }}>
          {sub}
        </div>
      )}
    </div>
  )
}
