import { useState, useEffect, useCallback, useRef } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { Activity, BarChart3, GitCompare, MessageSquare, FolderOpen, Sun, Moon, Github, Terminal, Users, Plug, Copy, Check, Settings as SettingsIcon, ChevronDown } from 'lucide-react'
import { fetchOverview, fetchMode, fetchRelayConfig, getAuthToken, setOnAuthFailure } from './lib/api'
import { useTheme } from './lib/theme'
import AnimatedLogo from './components/AnimatedLogo'
import AnimatedLoader from './components/AnimatedLoader'
import LoginScreen from './components/LoginScreen'
import Dashboard from './pages/Dashboard'
import Sessions from './pages/Sessions'
import DeepAnalysis from './pages/DeepAnalysis'
import Compare from './pages/Compare'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import Settings from './pages/Settings'
import RelayDashboard from './pages/RelayDashboard'
import RelayUserDetail from './pages/RelayUserDetail'

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
        className={`flex items-center gap-1.5 px-2.5 py-1 text-[12px] rounded transition ${
          isActive ? 'bg-[var(--c-card)] text-[var(--c-white)]' : 'text-[var(--c-text2)] hover:text-[var(--c-white)]'
        }`}
      >
        <Icon size={12} />
        {label}
        <ChevronDown size={10} style={{ opacity: 0.5 }} />
      </button>
      {open && (
        <div
          className="absolute top-full left-0 py-1 rounded shadow-lg min-w-[160px] z-[100]"
          style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}
        >
          {items.map(({ to, icon: SubIcon, label: subLabel }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive: a }) =>
                `flex items-center gap-2 px-3 py-1.5 text-[12px] transition ${
                  a ? 'bg-[var(--c-bg3)] text-[var(--c-white)]' : 'text-[var(--c-text2)] hover:text-[var(--c-white)] hover:bg-[var(--c-bg3)]'
                }`
              }
            >
              <SubIcon size={12} />
              {subLabel}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [overview, setOverview] = useState(null)
  const [mode, setMode] = useState(null) // 'local' | 'relay'
  const [needsAuth, setNeedsAuth] = useState(false)
  const [authed, setAuthed] = useState(!!getAuthToken())
  const { dark, toggle } = useTheme()
  const [mcpOpen, setMcpOpen] = useState(false)
  const [mcpCopied, setMcpCopied] = useState(false)
  const [relayPassword, setRelayPassword] = useState('')

  useEffect(() => {
    setOnAuthFailure(() => setAuthed(false))
  }, [])

  useEffect(() => {
    fetchMode().then(data => {
      setMode(data.mode || 'local')
      setNeedsAuth(!!data.auth)
    })
  }, [])

  useEffect(() => {
    if (mode === 'relay' && authed) {
      fetchRelayConfig().then(c => setRelayPassword(c.relayPassword || '')).catch(() => {})
    }
  }, [mode, authed])

  const [selectedEditor, setSelectedEditor] = useState(() => {
    const saved = localStorage.getItem('agentlytics_selected_editor')
    if (saved === 'vsc-cora') return 'vs-code-cora'
    if (saved === 'jb-cora') return 'jet-brains-cora'
    return saved || 'all'
  })

  const refreshOverview = useCallback(() => {
    fetchOverview({ editor: selectedEditor !== 'all' ? selectedEditor : undefined }).then(setOverview).catch(() => {})
  }, [selectedEditor])

  useEffect(() => {
    if (mode === 'local') refreshOverview()
  }, [mode, refreshOverview])

  useEffect(() => {
    localStorage.setItem('agentlytics_selected_editor', selectedEditor)
  }, [selectedEditor])

  const isRelay = mode === 'relay'
  const showLogin = isRelay && needsAuth && !authed



  const nav = isRelay ? [
    { to: '/', icon: Users, label: 'Team' },
  ] : [
    { to: '/', icon: Activity, label: 'Dashboard' },
    { to: '/sessions', icon: MessageSquare, label: 'Sessions' },
    { to: '/projects', icon: FolderOpen, label: 'Projects' },
    { icon: BarChart3, label: 'Insights', children: [
      { to: '/analysis', icon: BarChart3, label: 'Deep Analysis' },
      { to: '/compare', icon: GitCompare, label: 'Compare' },
    ]},
  ]

  const editorOptions = [
    { value: 'all', label: 'All Editors' },
    { value: 'vs-code-cora', label: 'VS Code Cora' },
    { value: 'jet-brains-cora', label: 'JetBrains Cora' }
  ]

  if (showLogin) {
    return <LoginScreen onSuccess={() => setAuthed(true)} />
  }

  return (
    <div className="min-h-screen">
      <header className="border-b px-4 py-1.5 flex items-center gap-3 sticky top-0 z-50 backdrop-blur-xl" style={{ borderColor: 'var(--c-border)', background: 'var(--c-header)' }}>
        <span className="flex items-center gap-2 text-xs font-bold tracking-tight" style={{ color: 'var(--c-white)' }}>
          <img src="/assets/codemateLogo.svg" alt="CodeMate AI" className="h-9.5 w-auto" />
          {isRelay && <span className="ml-1.5 text-[10px] font-medium px-1.5 py-0.5" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>relay</span>}
        </span>
        <nav className="flex gap-0.5 ml-2">
          {nav.map((item) => item.children ? (
            <NavDropdown key={item.label} icon={item.icon} label={item.label} items={item.children} />
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-2.5 py-1 text-[12px] rounded transition ${
                  isActive ? 'bg-[var(--c-card)] text-[var(--c-white)]' : 'text-[var(--c-text2)] hover:text-[var(--c-white)]'
                }`
              }
            >
              <item.icon size={12} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {!isRelay && (
            <>
            <div className="relative flex items-center hidden">
              <select
                value={selectedEditor}
                onChange={(e) => setSelectedEditor(e.target.value)}
                className="appearance-none bg-[var(--c-bg3)] text-[var(--c-text)] text-[11px] px-2 py-1 pr-6 rounded border border-[var(--c-border)] focus:outline-none cursor-pointer hover:bg-[var(--c-card)] transition"
              >
                {editorOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown size={10} className="absolute right-2 pointer-events-none text-[var(--c-text3)]" />
            </div>
            <span className="text-[11px]" style={{ color: 'var(--c-text2)' }}>
              {overview ? `${overview.totalChats} sessions` : '...'}
            </span>
            </>
          )}

          {isRelay && (
            <button
              onClick={() => { setMcpOpen(true); setMcpCopied(false) }}
              className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] transition hover:bg-[var(--c-card)]"
              style={{ color: '#818cf8', border: '1px solid var(--c-border)' }}
              title="MCP Connection"
            >
              <Plug size={10} />
              Connect
            </button>
          )}
          <NavLink
            to="/settings"
            className="p-1 rounded transition hover:bg-[var(--c-card)] hidden"
            style={({ isActive }) => ({ color: isActive ? '#6366f1' : 'var(--c-text2)' })}
            title="Settings"
          >
            <SettingsIcon size={13} />
          </NavLink>
          <button
            onClick={toggle}
            className="p-1 rounded transition hover:bg-[var(--c-card)]"
            style={{ color: 'var(--c-text2)' }}
            title={dark ? 'Light mode' : 'Dark mode'}
          >
            {dark ? <Sun size={13} /> : <Moon size={13} />}
          </button>
        </div>
      </header>


      <main className={isRelay ? 'px-0' : 'p-4 max-w-[1400px] mx-auto'}>
        {mode === null ? (
          <AnimatedLoader label="Loading..." />
        ) : isRelay ? (
          <Routes>
            <Route path="/" element={<RelayDashboard />} />
            <Route path="/relay" element={<RelayDashboard />} />
            <Route path="/relay/user/:username" element={<RelayUserDetail />} />
          </Routes>
        ) : (
          <Routes>
            <Route path="/" element={<Dashboard overview={overview} selectedEditor={selectedEditor} />} />
            <Route path="/projects" element={<Projects overview={overview} selectedEditor={selectedEditor} setSelectedEditor={setSelectedEditor} />} />
            <Route path="/projects/detail" element={<ProjectDetail selectedEditor={selectedEditor} />} />
            <Route path="/sessions" element={<Sessions overview={overview} selectedEditor={selectedEditor} />} />
            {/* ChatDetail is now a sidebar in Sessions */}
            <Route path="/analysis" element={<DeepAnalysis overview={overview} selectedEditor={selectedEditor} />} />
            <Route path="/compare" element={<Compare overview={overview} selectedEditor={selectedEditor} />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        )}
      </main>

      <footer className="border-t mt-12 px-6 py-12" style={{ borderColor: 'var(--c-border)', background: 'var(--c-bg)' }}>
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 text-[12px]">
          {/* Logo & Info */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <img src="/assets/codemateLogo.svg" alt="CodeMate AI" className="h-9.5 w-auto" />
            </div>
            <p style={{ color: 'var(--c-text2)', lineHeight: '1.6' }} className="max-w-[280px]">
              CodeMate AI, your smart coding partner. Review, debug, and complete code faster with AI-powered assistance.
            </p>
            <div className="flex items-center gap-4">
              <a href="https://x.com/codemateai" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition">
                <img src="https://img.icons8.com/ios-filled/24/ffffff/twitterx--v2.png" alt="X" className="w-5 h-5" />
              </a>
              <a href="https://www.linkedin.com/company/codemateai/" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition">
                <img src="https://img.icons8.com/ios-filled/24/ffffff/linkedin.png" alt="LinkedIn" className="w-5 h-5" />
              </a>
              <a href="https://www.instagram.com/codemateai" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition">
                <img src="https://img.icons8.com/ios-filled/24/ffffff/instagram-new.png" alt="Instagram" className="w-5 h-5" />
              </a>
              <a href="https://www.youtube.com/@codemateai" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition">
                <img src="https://img.icons8.com/ios-filled/24/ffffff/youtube-play.png" alt="YouTube" className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Community */}
          <div className="space-y-4">
            <h4 className="font-bold uppercase tracking-wider" style={{ color: 'var(--c-white)' }}>Community</h4>
            <ul className="space-y-2.5" style={{ color: 'var(--c-text3)' }}>
              <li><a href="https://www.instagram.com/codemateai" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--c-white)] transition">Instagram</a></li>
              <li><a href="https://www.linkedin.com/company/codemateai/" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--c-white)] transition">LinkedIn</a></li>
              <li><a href="https://x.com/codemateai" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--c-white)] transition">Twitter</a></li>
              <li><a href="https://www.youtube.com/@codemateai" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--c-white)] transition">YouTube</a></li>
            </ul>
          </div>

          {/* Others */}
          <div className="space-y-4">
            <h4 className="font-bold uppercase tracking-wider" style={{ color: 'var(--c-white)' }}>Others</h4>
            <ul className="space-y-2.5" style={{ color: 'var(--c-text3)' }}>
              <li><a href="https://huggingface.co/codemateai/CodeMate-v0.1" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--c-white)] transition">Hugging Face</a></li>
              <li><a href="https://docs.codemate.ai/policies/refund-policy" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--c-white)] transition">Refund Policy</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="font-bold uppercase tracking-wider" style={{ color: 'var(--c-white)' }}>Legal</h4>
            <ul className="space-y-2.5" style={{ color: 'var(--c-text3)' }}>
              <li><a href="https://docs.codemate.ai/policies/privacy-policy" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--c-white)] transition">Privacy Policy</a></li>
              <li><a href="https://docs.codemate.ai/policies/terms-of-service" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--c-white)] transition">Terms of Service</a></li>
            </ul>
          </div>
        </div>
      </footer>

      {/* MCP Config Modal */}
      {mcpOpen && (
        <>
          <div className="fixed inset-0 z-[60]" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setMcpOpen(false)} />
          <div
            className="fixed z-[70] w-[440px] max-w-[90vw] p-5 rounded shadow-2xl"
            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-[13px] font-bold" style={{ color: 'var(--c-white)' }}>
                <Plug size={13} className="inline mr-1.5" style={{ color: '#818cf8' }} />
                Connection Config
              </div>
              <button onClick={() => setMcpOpen(false)} className="text-[18px] leading-none px-1 hover:opacity-70 transition" style={{ color: 'var(--c-text3)' }}>&times;</button>
            </div>

            <div className="text-[12px] font-medium mb-1.5" style={{ color: 'var(--c-white)' }}>MCP Config</div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px]" style={{ color: 'var(--c-text3)' }}>Add to your AI client's MCP settings</div>
              <button
                onClick={() => {
                  const json = JSON.stringify({ "mcpServers": { "agentlytics": { "url": `${window.location.origin}/mcp` } } }, null, 2)
                  navigator.clipboard.writeText(json)
                  setMcpCopied(true)
                  setTimeout(() => setMcpCopied(false), 2000)
                }}
                className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] transition hover:bg-[var(--c-bg3)]"
                style={{ border: '1px solid var(--c-border)', color: mcpCopied ? '#22c55e' : 'var(--c-text2)' }}
              >
                {mcpCopied ? <><Check size={9} /> Copied</> : <><Copy size={9} /> Copy</>}
              </button>
            </div>
            <pre
              className="text-[11px] px-3 py-2 overflow-x-auto mb-4"
              style={{ background: 'var(--c-bg3)', border: '1px solid var(--c-border)', color: 'var(--c-text)', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.6 }}
            >{`{\n  "mcpServers": {\n    "agentlytics": {\n      "url": "${window.location.origin}/mcp"\n    }\n  }\n}`}</pre>

            <div className="text-[12px] font-medium mb-1.5" style={{ color: 'var(--c-white)' }}>Join Command</div>
            <div className="text-[10px] mb-1" style={{ color: 'var(--c-text3)' }}>Share with your team to start syncing sessions</div>
            <pre
              className="text-[11px] px-3 py-2 overflow-x-auto"
              style={{ background: 'var(--c-bg3)', border: '1px solid var(--c-border)', color: 'var(--c-text)', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.6 }}
            >{`cd /path/to/your-project\nRELAY_PASSWORD=${relayPassword || '<pass>'} npx agentlytics --join ${window.location.host}`}</pre>
          </div>
        </>
      )}
    </div>
  )
}
