import { useState, useEffect } from 'react'
import { Loader2, ArrowLeftRight } from 'lucide-react'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { fetchDeepAnalytics, fetchChats } from '../lib/api'
import { editorColor, editorLabel, formatNumber } from '../lib/constants'
import { useTheme } from '../lib/theme'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const MONO = 'JetBrains Mono, monospace'

function MetricRow({ label, a, b, colorA, colorB }) {
  const numA = parseFloat(a) || 0
  const numB = parseFloat(b) || 0
  const max = Math.max(numA, numB, 1)
  return (
    <div className="grid grid-cols-[1fr_100px_100px] gap-x-3 items-center py-0.5" style={{ borderBottom: '1px solid var(--c-border)' }}>
      <div className="text-[11px]" style={{ color: 'var(--c-text2)' }}>{label}</div>
      <div className="text-right">
        <span className="text-[12px] font-mono font-medium" style={{ color: 'var(--c-white)' }}>
          {typeof a === 'number' ? formatNumber(a) : a}
        </span>
        <div className="h-1 rounded-full mt-0.5 ml-auto" style={{ background: colorA, width: `${(numA / max * 100).toFixed(0)}%` }} />
      </div>
      <div className="text-right">
        <span className="text-[12px] font-mono font-medium" style={{ color: 'var(--c-white)' }}>
          {typeof b === 'number' ? formatNumber(b) : b}
        </span>
        <div className="h-1 rounded-full mt-0.5 ml-auto" style={{ background: colorB, width: `${(numB / max * 100).toFixed(0)}%` }} />
      </div>
    </div>
  )
}

function ListCompare({ titleA, titleB, colorA, colorB, itemsA, itemsB, limit = 8 }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <h4 className="text-[11px] font-medium uppercase tracking-wider mb-1" style={{ color: colorA }}>{titleA}</h4>
        <div className="space-y-0.5">
          {itemsA.slice(0, limit).map(t => (
            <div key={t.name} className="flex justify-between text-[11px] py-0.5">
              <span className="truncate" style={{ color: 'var(--c-text)' }}>{t.name}</span>
              <span className="font-mono ml-2" style={{ color: 'var(--c-text3)' }}>{t.count}</span>
            </div>
          ))}
          {itemsA.length === 0 && <div className="text-[11px]" style={{ color: 'var(--c-text3)' }}>none</div>}
        </div>
      </div>
      <div>
        <h4 className="text-[11px] font-medium uppercase tracking-wider mb-1" style={{ color: colorB }}>{titleB}</h4>
        <div className="space-y-0.5">
          {itemsB.slice(0, limit).map(t => (
            <div key={t.name} className="flex justify-between text-[11px] py-0.5">
              <span className="truncate" style={{ color: 'var(--c-text)' }}>{t.name}</span>
              <span className="font-mono ml-2" style={{ color: 'var(--c-text3)' }}>{t.count}</span>
            </div>
          ))}
          {itemsB.length === 0 && <div className="text-[11px]" style={{ color: 'var(--c-text3)' }}>none</div>}
        </div>
      </div>
    </div>
  )
}

export default function Compare({ overview }) {
  const editors = overview?.editors || []
  const [editorA, setEditorA] = useState(editors[0]?.id || '')
  const [editorB, setEditorB] = useState(editors[1]?.id || '')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const { dark } = useTheme()

  async function run() {
    if (!editorA || !editorB) return
    setLoading(true)
    const [deepA, deepB, chatsA, chatsB] = await Promise.all([
      fetchDeepAnalytics({ editor: editorA, limit: 500 }),
      fetchDeepAnalytics({ editor: editorB, limit: 500 }),
      fetchChats({ editor: editorA, limit: 1000 }),
      fetchChats({ editor: editorB, limit: 1000 }),
    ])
    setResult({ deepA, deepB, chatsA, chatsB })
    setLoading(false)
  }

  useEffect(() => { if (editorA && editorB) run() }, [editorA, editorB])

  const colorA = editorColor(editorA)
  const colorB = editorColor(editorB)
  const nameA = editorLabel(editorA)
  const nameB = editorLabel(editorB)

  // Derived metrics
  const avg = (total, count) => count ? (total / count).toFixed(1) : '0'
  const pct = (part, whole) => whole ? ((part / whole) * 100).toFixed(0) + '%' : '0%'

  const metrics = result ? [
    { label: 'Sessions', a: result.chatsA.total, b: result.chatsB.total },
    { label: 'Messages', a: result.deepA.totalMessages, b: result.deepB.totalMessages },
    { label: 'Tool Calls', a: result.deepA.totalToolCalls, b: result.deepB.totalToolCalls },
    { label: 'Input Tokens', a: result.deepA.totalInputTokens, b: result.deepB.totalInputTokens },
    { label: 'Output Tokens', a: result.deepA.totalOutputTokens, b: result.deepB.totalOutputTokens },
    { label: 'Cache Read', a: result.deepA.totalCacheRead, b: result.deepB.totalCacheRead },
  ] : []

  const ratios = result ? [
    { label: 'Avg Msgs / Session', a: avg(result.deepA.totalMessages, result.deepA.analyzedChats), b: avg(result.deepB.totalMessages, result.deepB.analyzedChats) },
    { label: 'Avg Tools / Session', a: avg(result.deepA.totalToolCalls, result.deepA.analyzedChats), b: avg(result.deepB.totalToolCalls, result.deepB.analyzedChats) },
    { label: 'Avg Tokens / Session', a: avg(result.deepA.totalInputTokens + result.deepA.totalOutputTokens, result.deepA.analyzedChats), b: avg(result.deepB.totalInputTokens + result.deepB.totalOutputTokens, result.deepB.analyzedChats) },
    { label: 'Output / Input Ratio', a: avg(result.deepA.totalOutputTokens, result.deepA.totalInputTokens || 1), b: avg(result.deepB.totalOutputTokens, result.deepB.totalInputTokens || 1) },
    { label: 'Tools / Message', a: avg(result.deepA.totalToolCalls, result.deepA.totalMessages || 1), b: avg(result.deepB.totalToolCalls, result.deepB.totalMessages || 1) },
    { label: 'Cache Hit Rate', a: pct(result.deepA.totalCacheRead, result.deepA.totalInputTokens), b: pct(result.deepB.totalCacheRead, result.deepB.totalInputTokens) },
  ] : []

  const gridColor = dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.06)'
  const legendColor = dark ? '#a1a1aa' : '#52525b'

  // Bar chart data for usage comparison
  const barDataA = result ? [
    result.chatsA.total,
    result.deepA.totalMessages,
    result.deepA.totalToolCalls,
  ] : [0, 0, 0]

  const barDataB = result ? [
    result.chatsB.total,
    result.deepB.totalMessages,
    result.deepB.totalToolCalls,
  ] : [0, 0, 0]

  // Token distribution chart data
  const tokenChart = result ? {
    datasets: [
      {
        data: [
          result.deepA.totalInputTokens,
          result.deepA.totalOutputTokens,
          result.deepA.totalCacheRead,
        ],
      },
      {
        data: [
          result.deepB.totalInputTokens,
          result.deepB.totalOutputTokens,
          result.deepB.totalCacheRead,
        ],
      },
    ],
  } : null

  const barOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: legendColor, font: { size: 11, family: MONO }, usePointStyle: true, pointStyle: 'circle', padding: 10 }
      },
      tooltip: {
        bodyFont: { family: MONO, size: 12 },
        titleFont: { family: MONO, size: 12 },
        padding: 12,
        cornerRadius: 8,
        backgroundColor: 'var(--color-bg-3)',
        borderColor: 'var(--color-border)',
        borderWidth: 1,
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: legendColor, font: { size: 10, family: MONO } } },
      y: { grid: { color: gridColor }, ticks: { color: legendColor, font: { size: 10, family: MONO } }, border: { display: false } },
    },
  }

  return (
    <div className="fade-in space-y-6">
      {/* Header with selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>Editor Comparison</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-3)' }}>Compare usage patterns and efficiency metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <select
              value={editorA}
              onChange={e => setEditorA(e.target.value)}
              className="input w-40"
            >
              {editors.map(e => <option key={e.id} value={e.id}>{editorLabel(e.id)}</option>)}
            </select>
            <ArrowLeftRight size={16} style={{ color: 'var(--color-text-4)' }} />
            <select
              value={editorB}
              onChange={e => setEditorB(e.target.value)}
              className="input w-40"
            >
              {editors.map(e => <option key={e.id} value={e.id}>{editorLabel(e.id)}</option>)}
            </select>
          </div>
          {loading && <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-accent)' }} />}
        </div>
      </div>

      {result && (
        <>
          {/* Metrics + Ratios side by side */}
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>Totals</h3>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: colorA }} />
                    <span style={{ color: 'var(--color-text-2)' }}>{nameA}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: colorB }} />
                    <span style={{ color: 'var(--color-text-2)' }}>{nameB}</span>
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                {metrics.map(m => <MetricRow key={m.label} label={m.label} a={m.a} b={m.b} colorA={colorA} colorB={colorB} />)}
              </div>
            </div>

            <div className="card p-5">
              <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Efficiency Ratios</h3>
              <div className="space-y-1">
                {ratios.map(m => <MetricRow key={m.label} label={m.label} a={m.a} b={m.b} colorA={colorA} colorB={colorB} />)}
              </div>
            </div>
          </div>

          {/* Charts row */}
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))' }}>
            <div className="card p-5">
              <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Usage Comparison</h3>
              <div style={{ height: 220 }}>
                <Bar
                  data={{
                    labels: ['Sessions', 'Messages', 'Tool Calls'],
                    datasets: [
                      { label: nameA, data: barDataA, backgroundColor: colorA + 'b3', borderRadius: 6 },
                      { label: nameB, data: barDataB, backgroundColor: colorB + 'b3', borderRadius: 6 },
                    ],
                  }}
                  options={{
                    ...barOpts,
                    plugins: {
                      ...barOpts.plugins,
                      legend: { ...barOpts.plugins.legend, position: 'top' },
                    },
                  }}
                />
              </div>
            </div>

            {tokenChart && (
              <div className="card p-5">
                <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Token Distribution</h3>
                <div style={{ height: 220 }}>
                  <Bar
                    data={{
                      labels: ['Input', 'Output', 'Cache Read'],
                      datasets: [
                        { label: nameA, data: tokenChart.datasets[0].data, backgroundColor: colorA + 'b3', borderRadius: 6 },
                        { label: nameB, data: tokenChart.datasets[1].data, backgroundColor: colorB + 'b3', borderRadius: 6 },
                      ],
                    }}
                    options={barOpts}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tools + Models side-by-side */}
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
            <div className="card p-5">
              <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Top Tools</h3>
              <ListCompare titleA={nameA} titleB={nameB} colorA={colorA} colorB={colorB}
                itemsA={result.deepA.topTools} itemsB={result.deepB.topTools} limit={10} />
            </div>

            <div className="card p-5">
              <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Models Used</h3>
              <ListCompare titleA={nameA} titleB={nameB} colorA={colorA} colorB={colorB}
                itemsA={result.deepA.topModels} itemsB={result.deepB.topModels} limit={8} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
