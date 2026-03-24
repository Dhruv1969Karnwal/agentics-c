import { Calendar, X } from 'lucide-react'
import { useTheme } from '../lib/theme'

const PRESETS = [
  { label: '7d',  days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '1y',  days: 365 },
]

// value: { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' } | null
// onChange: called with same shape, or null to clear
export default function DateRangePicker({ value, onChange }) {
  const { dark } = useTheme()
  const today = new Date().toISOString().split('T')[0]
  const active = !!value

  function applyPreset(days) {
    const to = new Date()
    const from = new Date(to.getTime() - days * 86400000)
    onChange({
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
    })
  }

  function setFrom(from) {
    onChange({ from, to: value?.to || today })
  }

  function setTo(to) {
    onChange({ from: value?.from || today, to })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Date range selection">
      <span className="flex items-center gap-1.5" style={{ color: 'var(--c-text2)' }}>
        <Calendar size={14} aria-hidden="true" />
        <span className="text-sm font-medium">Date Range</span>
      </span>

      {/* Preset buttons */}
      {PRESETS.map(p => {
        const isActive = active && (() => {
          const diff = Math.round((Date.now() - new Date(value.from).getTime()) / 86400000)
          return diff >= p.days - 1 && diff <= p.days + 1
        })()
        return (
          <button
            key={p.label}
            onClick={() => applyPreset(p.days)}
            className="px-3 py-1 text-xs font-medium transition min-h-[32px] min-w-[48px]"
            style={{
              border: isActive ? '1px solid var(--c-accent)' : '1px solid var(--c-border)',
              color: isActive ? 'var(--c-accent)' : 'var(--c-text2)',
              background: isActive ? 'rgba(99,102,241,0.1)' : 'var(--c-bg3)',
            }}
            aria-pressed={isActive}
          >
            {p.label}
          </button>
        )
      })}

      {/* Custom date inputs */}
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={value?.from || ''}
          max={value?.to || today}
          onChange={e => setFrom(e.target.value)}
          className="px-3 py-1.5 text-sm outline-none cursor-pointer min-h-[36px]"
          style={{
            background: 'var(--c-bg3)',
            color: 'var(--c-text)',
            border: '1px solid var(--c-border)',
            colorScheme: dark ? 'dark' : 'light',
          }}
          aria-label="Start date"
        />
        <span className="text-sm" style={{ color: 'var(--c-text3)' }}>to</span>
        <input
          type="date"
          value={value?.to || ''}
          min={value?.from || ''}
          max={today}
          onChange={e => setTo(e.target.value)}
          className="px-3 py-1.5 text-sm outline-none cursor-pointer min-h-[36px]"
          style={{
            background: 'var(--c-bg3)',
            color: 'var(--c-text)',
            border: '1px solid var(--c-border)',
            colorScheme: dark ? 'dark' : 'light',
          }}
          aria-label="End date"
        />
      </div>

      {/* Clear button */}
      {active && (
        <button
          onClick={() => onChange(null)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium transition min-h-[36px]"
          style={{ border: '1px solid var(--c-accent)', color: 'var(--c-accent)', background: 'transparent' }}
          aria-label="Clear date range filter"
        >
          <X size={12} aria-hidden="true" /> Clear
        </button>
      )}
    </div>
  )
}

