import { useState, useEffect, useCallback, useRef } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { Activity, BarChart3, GitCompare, MessageSquare, FolderOpen, Sun, Moon, Github, Terminal, Users, Plug, Copy, Check, Settings as SettingsIcon, ChevronDown, Twitter, Linkedin, Instagram, Youtube } from 'lucide-react'
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
  const buttonRef = useRef(null)

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
        ref={buttonRef}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`${label} navigation menu`}
        className={`flex items-center gap-1.5 px-3.5 py-2 text-[12px] rounded transition min-h-[44px] min-w-[44px] ${
          isActive ? 'bg-[var(--c-card)] text-[var(--c-white)]' : 'text-[var(--c-text2)] hover:text-[var(--c-white)] hover:bg-[var(--c-card)]'
        }`}
      >
        <Icon size={12} aria-hidden="true" />
        {label}
        <ChevronDown size={10} style={{ opacity: 0.6 }} aria-hidden="true" />
      </button>
      {open && (
        <div
          className="absolute top-full left-0 py-1 rounded-lg shadow-lg min-w-[160px] z-[100] border border-[var(--c-border)]"
          style={{ background: 'var(--c-bg)' }}
          role="menu"
          aria-label={`${label} submenu`}
        >
          {items.map(({ to, icon: SubIcon, label: subLabel }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive: a }) =>
                `flex items-center gap-2.5 px-3 py-2 text-[12px] rounded transition min-h-[40px] ${
                  a ? 'bg-[var(--c-card-active)] text-[var(--c-white)]' : 'text-[var(--c-text2)] hover:text-[var(--c-white)] hover:bg-[var(--c-card)]'
                }`
              }
              role="menuitem"
            >
              <SubIcon size={13} aria-hidden="true" />
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
        <nav className="flex gap-0.5 ml-2" aria-label="Main navigation">
          {nav.map((item) => item.children ? (
            <NavDropdown key={item.label} icon={item.icon} label={item.label} items={item.children} />
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3.5 py-2 text-[12px] rounded transition min-h-[44px] min-w-[44px] ${
                  isActive ? 'bg-[var(--c-card)] text-[var(--c-white)]' : 'text-[var(--c-text2)] hover:text-[var(--c-white)] hover:bg-[var(--c-card)]'
                }`
              }
              aria-label={`Navigate to ${item.label}`}
            >
              <item.icon size={12} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {!isRelay && (
            <>
            <div className="relative flex items-center hidden">
              <label htmlFor="editor-select" className="sr-only">Select editor</label>
              <select
                id="editor-select"
                value={selectedEditor}
                onChange={(e) => setSelectedEditor(e.target.value)}
                className="appearance-none bg-[var(--c-bg3)] text-[var(--c-text)] text-[11px] px-3 py-1.5 pr-8 rounded border border-[var(--c-border)] focus:outline-none focus:border-[var(--c-accent)] cursor-pointer hover:bg-[var(--c-card)] transition min-h-[32px]"
              >
                {editorOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown size={10} className="absolute right-2.5 pointer-events-none text-[var(--c-text3)]" aria-hidden="true" />
            </div>
            <span className="text-[11px]" style={{ color: 'var(--c-text2)' }}>
              {overview ? `${overview.totalChats} sessions` : '...'}
            </span>
            </>
          )}

          {isRelay && (
            <button
              onClick={() => { setMcpOpen(true); setMcpCopied(false) }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] transition hover:bg-[var(--c-card)] min-h-[32px]"
              style={{ color: '#818cf8', border: '1px solid var(--c-border)' }}
              title="MCP Connection"
              aria-label="Open MCP configuration"
            >
              <Plug size={12} aria-hidden="true" />
              Connect
            </button>
          )}
          <NavLink
            to="/settings"
            className="p-2.5 rounded transition hover:bg-[var(--c-card)] hidden min-h-[44px] min-w-[44px] flex items-center justify-center"
            style={({ isActive }) => ({ color: isActive ? '#6366f1' : 'var(--c-text2)' })}
            title="Settings"
            aria-label="Settings"
          >
            <SettingsIcon size={14} aria-hidden="true" />
          </NavLink>
          <button
            onClick={toggle}
            className="p-2.5 rounded transition hover:bg-[var(--c-card)] min-h-[44px] min-w-[44px] flex items-center justify-center"
            style={{ color: 'var(--c-text2)' }}
            title={dark ? 'Light mode' : 'Dark mode'}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? <Sun size={14} aria-hidden="true" /> : <Moon size={14} aria-hidden="true" />}
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

      <footer className="border-t mt-16 px-6 py-12" style={{ borderColor: 'var(--c-border)', background: 'var(--c-bg)' }} role="contentinfo" aria-label="Site footer">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 text-[12px]">
          {/* Logo & Info */}
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <img src="/assets/codemateLogo.svg" alt="CodeMate AI" className="h-9 w-auto" />
            </div>
            <p style={{ color: 'var(--c-text2)', lineHeight: '1.7' }} className="max-w-[280px] text-sm">
              CodeMate AI, your smart coding partner. Review, debug, and complete code faster with AI-powered assistance.
            </p>
            <div className="flex items-center gap-3">
              <a href="https://x.com/codemateai" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded transition hover:bg-[var(--c-card)]" style={{ color: 'var(--c-text2)' }} aria-label="Follow us on X (Twitter)">
                <Twitter size={16} />
              </a>
              <a href="https://www.linkedin.com/company/codemateai/" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded transition hover:bg-[var(--c-card)]" style={{ color: 'var(--c-text2)' }} aria-label="Follow us on LinkedIn">
                <Linkedin size={16} />
              </a>
              <a href="https://www.instagram.com/codemateai" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded transition hover:bg-[var(--c-card)]" style={{ color: 'var(--c-text2)' }} aria-label="Follow us on Instagram">
                <Instagram size={16} />
              </a>
              <a href="https://www.youtube.com/@codemateai" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded transition hover:bg-[var(--c-card)]" style={{ color: 'var(--c-text2)' }} aria-label="Subscribe on YouTube">
                <Youtube size={16} />
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
          <div className="fixed inset-0 z-[60] animate-fade-in" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setMcpOpen(false)} aria-hidden="true" />
          <div
            className="fixed z-[70] w-full max-w-[480px] p-6 rounded-xl shadow-2xl slide-in-right"
            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--c-bg2)', border: '1px solid var(--c-border)' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mcp-title"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 flex items-center justify-center rounded-lg" style={{ background: 'rgba(99,102,241,0.12)' }}>
                  <Plug size={18} style={{ color: 'var(--c-accent)' }} aria-hidden="true" />
                </div>
                <div>
                  <div id="mcp-title" className="text-sm font-semibold" style={{ color: 'var(--c-white)' }}>MCP Configuration</div>
                  <div className="text-[10px]" style={{ color: 'var(--c-text3)' }}>Connect your AI client</div>
                </div>
              </div>
              <button
                onClick={() => setMcpOpen(false)}
                className="p-1 rounded transition hover:bg-[var(--c-card)] min-h-[32px] min-w-[32px] flex items-center justify-center"
                style={{ color: 'var(--c-text3)' }}
                aria-label="Close modal"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {/* Config Section */}
            <div className="mb-5">
              <div className="text-sm font-medium mb-2" style={{ color: 'var(--c-white)' }}>MCP Server Config</div>
              <p className="text-[11px] mb-2.5" style={{ color: 'var(--c-text2)', lineHeight: '1.6' }}>
                Add this configuration to your AI client's MCP settings to connect to Agentlytics.
              </p>
              <div className="relative">
                <pre
                  className="text-[12px] px-4 py-3 rounded-lg overflow-x-auto"
                  style={{ background: 'var(--c-bg3)', border: '1px solid var(--c-border)', color: 'var(--c-text)', fontFamily: 'JetBrains Mono, monospace', lineHeight: '1.7' }}
                  aria-label="MCP configuration JSON"
                >{`{\n  "mcpServers": {\n    "agentlytics": {\n      "url": "${window.location.origin}/mcp"\n    }\n  }\n}`}</pre>
                <button
                  onClick={() => {
                    const json = JSON.stringify({ "mcpServers": { "agentlytics": { "url": `${window.location.origin}/mcp` } } }, null, 2)
                    navigator.clipboard.writeText(json)
                    setMcpCopied(true)
                    setTimeout(() => setMcpCopied(false), 2000)
                  }}
                  className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium transition hover:bg-[var(--c-card)]"
                  style={{ border: '1px solid var(--c-border)', color: mcpCopied ? 'var(--c-success)' : 'var(--c-text2)' }}
                  aria-label={mcpCopied ? 'Configuration copied' : 'Copy configuration to clipboard'}
                >
                  {mcpCopied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                </button>
              </div>
            </div>

            {/* Join Command Section */}
            <div>
              <div className="text-sm font-medium mb-2" style={{ color: 'var(--c-white)' }}>Team Join Command</div>
              <p className="text-[11px] mb-2.5" style={{ color: 'var(--c-text2)', lineHeight: '1.6' }}>
                Share this command with your team to start syncing sessions in relay mode.
              </p>
              <div className="relative">
                <pre
                  className="text-[12px] px-4 py-3 rounded-lg overflow-x-auto"
                  style={{ background: 'var(--c-bg3)', border: '1px solid var(--c-border)', color: 'var(--c-text)', fontFamily: 'JetBrains Mono, monospace', lineHeight: '1.7' }}
                  aria-label="Join command for team members"
                >{`cd /path/to/your-project
RELAY_PASSWORD=${relayPassword || '<pass>'} npx agentlytics --join ${window.location.host}`}</pre>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`cd /path/to/your-project\nRELAY_PASSWORD=${relayPassword || '<pass>'} npx agentlytics --join ${window.location.host}`)
                    setMcpCopied(true)
                    setTimeout(() => setMcpCopied(false), 2000)
                  }}
                  className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium transition hover:bg-[var(--c-card)]"
                  style={{ border: '1px solid var(--c-border)', color: mcpCopied ? 'var(--c-success)' : 'var(--c-text2)' }}
                  aria-label="Copy join command to clipboard"
                >
                  {mcpCopied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
