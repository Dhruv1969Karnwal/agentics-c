import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, EyeOff, Eye, FolderOpen, Search } from 'lucide-react'
import { fetchConfig, updateConfig, fetchAllProjects } from '../lib/api'
import { editorLabel, formatNumber, formatDate } from '../lib/constants'
import EditorIcon from '../components/EditorIcon'
import SectionTitle from '../components/SectionTitle'
import AnimatedLoader from '../components/AnimatedLoader'

export default function Settings() {
  const [config, setConfig] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    Promise.all([fetchConfig(), fetchAllProjects()]).then(([cfg, projs]) => {
      setConfig(cfg)
      setProjects(projs)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading || !config) {
    return <AnimatedLoader label="Loading settings..." />
  }

  const hiddenProjects = config.hiddenProjects || []

  const toggleProject = async (folder) => {
    setSaving(true)
    const isHidden = hiddenProjects.includes(folder)
    const updated = isHidden
      ? hiddenProjects.filter(f => f !== folder)
      : [...hiddenProjects, folder]
    const newConfig = await updateConfig({ hiddenProjects: updated })
    setConfig(newConfig)
    setSaving(false)
  }

  const filtered = projects.filter(p => {
    if (!search) return true
    const q = search.toLowerCase()
    return p.folder.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
  })

  const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>Settings</h1>
        <p className="text-sm" style={{ color: 'var(--color-text-3)' }}>Manage your projects and preferences</p>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <SectionTitle icon={FolderOpen}>Projects ({projects.length})</SectionTitle>
          <div className="flex items-center gap-3">
            {hiddenProjects.length > 0 && (
              <span className="badge badge-muted">
                {hiddenProjects.length} hidden
              </span>
            )}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-4)' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Filter projects..."
                className="input w-64"
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>
        </div>
        <div className="text-sm px-5 py-3" style={{ color: 'var(--color-text-3)', background: 'var(--color-bg-3)' }}>
          Hidden projects are excluded from all dashboard stats, sessions, costs, and analytics.
        </div>

        {sorted.map(p => (
          <ProjectRow key={p.folder} project={p} hidden={hiddenProjects.includes(p.folder)} onToggle={toggleProject} saving={saving} />
        ))}

        {sorted.length === 0 && (
          <div className="text-center py-12 text-base" style={{ color: 'var(--color-text-3)' }}>No projects match your filter</div>
        )}
      </div>
    </div>
  )
}

function ProjectRow({ project: p, hidden, onToggle, saving }) {
  const editors = Object.entries(p.editors || {}).sort((a, b) => b[1] - a[1])

  return (
    <div
      className="flex items-center gap-4 px-5 py-4 transition-all border-b"
      style={{
        borderBottomColor: 'var(--color-border)',
        opacity: hidden ? 0.5 : 1,
        background: 'transparent',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-3)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <button
        onClick={() => onToggle(p.folder)}
        disabled={saving}
        className="shrink-0 w-10 h-10 flex items-center justify-center rounded-lg transition-all hover:scale-105 disabled:opacity-50"
        style={{
          background: hidden ? 'rgba(239, 68, 68, 0.1)' : 'var(--color-bg-3)',
          color: hidden ? '#ef4444' : 'var(--color-text-3)',
          border: '1px solid var(--color-border)',
        }}
        title={hidden ? 'Show this project' : 'Hide this project'}
      >
        {hidden ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="text-base font-semibold truncate mb-1" style={{ color: hidden ? 'var(--color-text-4)' : 'var(--color-text)' }}>
          {p.name}
        </div>
        <div className="text-sm truncate" style={{ color: 'var(--color-text-4)' }} title={p.folder}>
          {p.folder}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {editors.slice(0, 4).map(([src, count]) => (
          <div key={src} className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ background: 'var(--color-bg-3)' }}>
            <EditorIcon source={src} size={12} />
            <span className="text-sm font-mono" style={{ color: 'var(--color-text-2)' }}>{count}</span>
          </div>
        ))}
      </div>
      <div className="text-sm font-mono shrink-0 w-24 text-right" style={{ color: 'var(--color-text-2)' }}>
        {formatNumber(p.totalSessions)}
      </div>
      <div className="text-sm shrink-0 w-32 text-right" style={{ color: 'var(--color-text-4)' }}>
        {formatDate(p.lastSeen)}
      </div>
    </div>
  )
}
