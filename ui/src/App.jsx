import { useState, useEffect, useCallback, useRef } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { Activity, BarChart3, GitCompare, MessageSquare, FolderOpen, Sun, Moon, ChevronDown } from 'lucide-react'
import { fetchOverview } from './lib/api'
import { useTheme } from './lib/theme'
import Dashboard from './pages/Dashboard'
import Sessions from './pages/Sessions'
import DeepAnalysis from './pages/DeepAnalysis'
import Compare from './pages/Compare'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'

export default function App() {
  const [overview, setOverview] = useState(null)
  const { dark, toggle } = useTheme()

  const [selectedEditor, setSelectedEditor] = useState(() => {
    const saved = localStorage.getItem('agentlytics_selected_editor')
    if (saved === 'vsc-cora') return 'vs-code-cora'
    if (saved === 'jb-cora') return 'jet-brains-cora'
    return saved || 'all'
  })

  const refreshOverview = useCallback(() => {
    const editor = selectedEditor !== 'all' ? selectedEditor : undefined
    fetchOverview({ editor }).then(setOverview).catch(() => {})
  }, [selectedEditor])

  useEffect(() => {
    refreshOverview()
  }, [refreshOverview])

  useEffect(() => {
    localStorage.setItem('agentlytics_selected_editor', selectedEditor)
  }, [selectedEditor])

  const editorOptions = [
    { value: 'all', label: 'All Editors' },
    { value: 'vs-code-cora', label: 'VS Code Cora' },
    { value: 'jet-brains-cora', label: 'JetBrains Cora' }
  ]

  const nav = [
    { to: '/', icon: Activity, label: 'Dashboard' },
    { to: '/sessions', icon: MessageSquare, label: 'Sessions' },
    { to: '/projects', icon: FolderOpen, label: 'Projects' },
    { icon: BarChart3, label: 'Insights', children: [
      { to: '/analysis', icon: BarChart3, label: 'Deep Analysis' },
      { to: '/compare', icon: GitCompare, label: 'Compare' },
    ]},
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b sticky top-0 z-50 backdrop-blur-xl" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-2)' }}>
        <div className="flex items-center gap-6 px-6 py-4">
          <span className="flex items-center gap-3 text-base font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
            <img src="/assets/codemateLogo.svg" alt="CodeMate AI" className="h-10 w-auto" />
          </span>
          <nav className="flex items-center gap-2">
            {nav.map((item) => item.children ? (
              <NavDropdown key={item.label} icon={item.icon} label={item.label} items={item.children} />
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition ${
                    isActive ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent-light)]' : 'text-[var(--color-text-2)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-3)]'
                  }`
                }
              >
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <div className="relative flex items-center hidden">
              <select
                value={selectedEditor}
                onChange={(e) => setSelectedEditor(e.target.value)}
                className="appearance-none input w-48 cursor-pointer"
                style={{ paddingRight: '2.5rem' }}
              >
                {editorOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 pointer-events-none text-[var(--color-text-4)]" />
            </div>
            <span className="text-sm font-mono" style={{ color: 'var(--color-text-2)' }}>
              {overview ? `${overview.totalChats} sessions` : '...'}
            </span>
            <button
              onClick={toggle}
              className="p-2 rounded-lg transition hover:bg-[var(--color-bg-3)]"
              style={{ color: 'var(--color-text-2)' }}
              title={dark ? 'Light mode' : 'Dark mode'}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          <Routes>
            <Route path="/" element={<Dashboard overview={overview} selectedEditor={selectedEditor} />} />
            <Route path="/projects" element={<Projects overview={overview} selectedEditor={selectedEditor} setSelectedEditor={setSelectedEditor} />} />
            <Route path="/projects/detail" element={<ProjectDetail selectedEditor={selectedEditor} />} />
            <Route path="/sessions" element={<Sessions overview={overview} selectedEditor={selectedEditor} />} />
            <Route path="/analysis" element={<DeepAnalysis overview={overview} selectedEditor={selectedEditor} />} />
            <Route path="/compare" element={<Compare overview={overview} selectedEditor={selectedEditor} />} />
          </Routes>
        </div>
      </main>

      <footer className="border-t mt-16" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-2)' }}>
        <div className="max-w-[1600px] mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 text-sm">
            {/* Logo & Info */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <img src="/assets/codemateLogo.svg" alt="CodeMate AI" className="h-10 w-auto" />
              </div>
              <p style={{ color: 'var(--color-text-2)', lineHeight: '1.7' }} className="max-w-[300px]">
                CodeMate AI, your smart coding partner. Review, debug, and complete code faster with AI-powered assistance.
              </p>
              <div className="flex items-center gap-5">
                <a href="https://x.com/codemateai" target="_blank" rel="noopener noreferrer" className="transition hover:opacity-70" style={{ color: 'var(--color-text-3)' }}>
                  <img src="https://img.icons8.com/ios-filled/24/ffffff/twitterx--v2.png" alt="X" className="w-5 h-5" />
                </a>
                <a href="https://www.linkedin.com/company/codemateai/" target="_blank" rel="noopener noreferrer" className="transition hover:opacity-70" style={{ color: 'var(--color-text-3)' }}>
                  <img src="https://img.icons8.com/ios-filled/24/ffffff/linkedin.png" alt="LinkedIn" className="w-5 h-5" />
                </a>
                <a href="https://www.instagram.com/codemateai" target="_blank" rel="noopener noreferrer" className="transition hover:opacity-70" style={{ color: 'var(--color-text-3)' }}>
                  <img src="https://img.icons8.com/ios-filled/24/ffffff/instagram-new.png" alt="Instagram" className="w-5 h-5" />
                </a>
                <a href="https://www.youtube.com/@codemateai" target="_blank" rel="noopener noreferrer" className="transition hover:opacity-70" style={{ color: 'var(--color-text-3)' }}>
                  <img src="https://img.icons8.com/ios-filled/24/ffffff/youtube-play.png" alt="YouTube" className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Community */}
            <div className="space-y-4">
              <h4 className="font-semibold uppercase tracking-wider text-sm" style={{ color: 'var(--color-text)' }}>Community</h4>
              <ul className="space-y-3" style={{ color: 'var(--color-text-3)' }}>
                <li><a href="https://www.instagram.com/codemateai" target="_blank" rel="noopener noreferrer" className="transition hover:text-[var(--color-text)]">Instagram</a></li>
                <li><a href="https://www.linkedin.com/company/codemateai/" target="_blank" rel="noopener noreferrer" className="transition hover:text-[var(--color-text)]">LinkedIn</a></li>
                <li><a href="https://x.com/codemateai" target="_blank" rel="noopener noreferrer" className="transition hover:text-[var(--color-text)]">Twitter</a></li>
                <li><a href="https://www.youtube.com/@codemateai" target="_blank" rel="noopener noreferrer" className="transition hover:text-[var(--color-text)]">YouTube</a></li>
              </ul>
            </div>

            {/* Others */}
            <div className="space-y-4">
              <h4 className="font-semibold uppercase tracking-wider text-sm" style={{ color: 'var(--color-text)' }}>Others</h4>
              <ul className="space-y-3" style={{ color: 'var(--color-text-3)' }}>
                <li><a href="https://huggingface.co/codemateai/CodeMate-v0.1" target="_blank" rel="noopener noreferrer" className="transition hover:text-[var(--color-text)]">Hugging Face</a></li>
                <li><a href="https://docs.codemate.ai/policies/refund-policy" target="_blank" rel="noopener noreferrer" className="transition hover:text-[var(--color-text)]">Refund Policy</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div className="space-y-4">
              <h4 className="font-semibold uppercase tracking-wider text-sm" style={{ color: 'var(--color-text)' }}>Legal</h4>
              <ul className="space-y-3" style={{ color: 'var(--color-text-3)' }}>
                <li><a href="https://docs.codemate.ai/policies/privacy-policy" target="_blank" rel="noopener noreferrer" className="transition hover:text-[var(--color-text)]">Privacy Policy</a></li>
                <li><a href="https://docs.codemate.ai/policies/terms-of-service" target="_blank" rel="noopener noreferrer" className="transition hover:text-[var(--color-text)]">Terms of Service</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function NavDropdown({ icon: Icon, label, items }) {
  const [open, setOpen] = useState(false)
  const timeoutRef = useRef(null)
  const location = useLocation()
  const isActive = items.some(i => i.to === location.pathname)

  const enter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setOpen(true)
  }
  const leave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpen(false)
    }, 150)
  }

  return (
    <div className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <button
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition ${
          isActive ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent-light)]' : 'text-[var(--color-text-2)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-3)]'
        }`}
      >
        <Icon size={14} />
        {label}
        <ChevronDown size={12} style={{ opacity: 0.6 }} />
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 py-2 rounded-xl shadow-lg min-w-[180px] z-[100] overflow-hidden"
          style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-border)' }}
        >
          {items.map(({ to, icon: SubIcon, label: subLabel }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive: a }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition ${
                  a ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent-light)]' : 'text-[var(--color-text-2)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-3)]'
                }`
              }
            >
              <SubIcon size={14} />
              {subLabel}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}
