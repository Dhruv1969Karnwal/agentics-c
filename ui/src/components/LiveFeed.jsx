import { useState, useEffect, useRef } from 'react'
import { Radio, MessageSquare, FolderOpen, Cpu } from 'lucide-react'
import EditorDot from './EditorDot'
import { editorLabel, formatNumber } from '../lib/constants'
import { fetchRelayFeed } from '../lib/api'

function timeLabel(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function LiveFeed({ onSessionClick }) {
  const [items, setItems] = useState([])
  const scrollRef = useRef(null)

  useEffect(() => {
    const load = () => {
      fetchRelayFeed({ limit: 80 })
        .then(data => {
          if (Array.isArray(data)) setItems(data)
        })
        .catch(() => {})
    }
    load()
    const iv = setInterval(load, 10000)
    return () => clearInterval(iv)
  }, [])

  // Group items by relative time buckets
  const now = Date.now()
  const buckets = []
  let currentBucket = null

  for (const item of items) {
    const diff = now - item.lastUpdatedAt
    let label
    if (diff < 300000) label = 'Just now'
    else if (diff < 3600000) label = `${Math.floor(diff / 60000)} min ago`
    else if (diff < 86400000) label = `${Math.floor(diff / 3600000)}h ago`
    else label = new Date(item.lastUpdatedAt).toLocaleDateString()

    if (!currentBucket || currentBucket.label !== label) {
      currentBucket = { label, items: [] }
      buckets.push(currentBucket)
    }
    currentBucket.items.push(item)
  }

  return (
    <div className="flex flex-col h-full" role="feed" aria-label="Live activity feed">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--c-border)', background: 'var(--c-bg2)' }}>
        <Radio size={14} style={{ color: 'var(--c-success)' }} aria-hidden="true" />
        <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--c-white)' }}>Live Feed</span>
        <span className="inline-block w-2 h-2 rounded-full pulse-dot ml-auto" style={{ background: 'var(--c-success)' }} aria-label="Live updates active" />
      </div>

      {/* Feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
        {items.length === 0 && (
          <div className="text-sm py-12 text-center" style={{ color: 'var(--c-text3)' }}>
            No recent activity
          </div>
        )}

        {buckets.map((bucket, bi) => (
          <div key={bi}>
            {/* Time separator */}
            <div className="sticky top-0 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider" style={{ background: 'var(--c-bg)', color: 'var(--c-text3)', borderBottom: '1px solid var(--c-border)' }}>
              {bucket.label}
            </div>

            {bucket.items.map((item) => (
              <div
                key={`${item.id}-${item.username}`}
                className="px-4 py-3 cursor-pointer transition hover:bg-[var(--c-card)] active:bg-[var(--c-card-active)] min-h-[60px] flex flex-col justify-center"
                style={{ borderBottom: '1px solid var(--c-border)' }}
                onClick={() => onSessionClick && onSessionClick(item.id, item.username)}
                role="article"
                aria-label={`Session: ${item.name || 'Untitled'} by ${item.username}`}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onSessionClick && onSessionClick(item.id, item.username)}
              >
                {/* Session name */}
                <div className="text-sm font-semibold truncate mb-1.5" style={{ color: 'var(--c-white)' }}>
                  {item.name || 'Untitled'}
                </div>

                {/* User + editor row */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="text-xs font-medium px-1.5 py-0.5 shrink-0 truncate max-w-[140px] rounded"
                    style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--c-accent-light)' }}
                    title={item.username}
                  >
                    {item.username}
                  </span>
                  <EditorDot source={item.source} size={7} />
                  <span className="text-xs truncate" style={{ color: 'var(--c-text2)' }}>{editorLabel(item.source)}</span>
                  <span className="text-xs ml-auto shrink-0" style={{ color: 'var(--c-text3)' }}>{timeLabel(item.lastUpdatedAt)}</span>
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-2.5 text-xs" style={{ color: 'var(--c-text3)' }}>
                  {item.totalMessages > 0 && (
                    <span className="flex items-center gap-1">
                      <MessageSquare size={12} aria-hidden="true" /> {item.totalMessages}
                    </span>
                  )}
                  {item.folder && (
                    <span className="flex items-center gap-1 truncate">
                      <FolderOpen size={12} aria-hidden="true" /> {item.folder.split('/').pop()}
                    </span>
                  )}
                  {item.mode && (
                    <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'rgba(168,85,247,0.12)', color: '#a855f7' }}>{item.mode}</span>
                  )}
                  {item.models?.[0] && (
                    <span className="flex items-center gap-1 ml-auto truncate" style={{ color: 'var(--c-accent-light)' }}>
                      <Cpu size={12} aria-hidden="true" /> {item.models[0]}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
