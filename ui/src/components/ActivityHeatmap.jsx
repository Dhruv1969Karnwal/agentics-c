import { useState, useMemo, useRef } from 'react'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js'
import { Line } from 'react-chartjs-2'
import { editorColor, editorLabel } from '../lib/constants'
import { useTheme } from '../lib/theme'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

const CELL_SIZE = 11
const CELL_GAP = 2
const WEEK_COLS = 53
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

function getIntensity(count, maxCount) {
  if (count === 0) return 0
  if (maxCount <= 0) return 1
  const ratio = count / maxCount
  if (ratio > 0.75) return 4
  if (ratio > 0.5) return 3
  if (ratio > 0.25) return 2
  return 1
}

const INTENSITY_COLORS_DARK = ['rgba(255,255,255,0.03)', '#0e4429', '#006d32', '#26a641', '#39d353']
const INTENSITY_COLORS_LIGHT = ['rgba(0,0,0,0.04)', '#9be9a8', '#40c463', '#30a14e', '#216e39']

export default function ActivityHeatmap({ dailyData }) {
  const { dark } = useTheme()
  const [selectedDay, setSelectedDay] = useState(null)
  const containerRef = useRef(null)

  // Build a full year grid (53 weeks × 7 days)
  const grid = useMemo(() => {
    if (!dailyData || dailyData.length === 0) return { weeks: [], months: [], maxCount: 0 }

    const dayMap = {}
    let maxCount = 0
    for (const d of dailyData) {
      dayMap[d.day] = d
      if (d.total > maxCount) maxCount = d.total
    }

    // End on Saturday of the current week, start WEEK_COLS-1 weeks before
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(today)
    start.setDate(start.getDate() - start.getDay() - (WEEK_COLS - 1) * 7)

    const weeks = []
    const months = []
    let lastMonth = -1
    const cursor = new Date(start)

    for (let w = 0; w < WEEK_COLS; w++) {
      const week = []
      for (let d = 0; d < 7; d++) {
        const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
        const data = dayMap[key] || null
        const count = data ? data.total : 0
        const isFuture = cursor > today

        if (cursor.getMonth() !== lastMonth) {
          lastMonth = cursor.getMonth()
          months.push({ week: w, label: cursor.toLocaleString('default', { month: 'short' }) })
        }

        week.push({ key, count, data, isFuture, day: d })
        cursor.setDate(cursor.getDate() + 1)
      }
      weeks.push(week)
    }

    return { weeks, months, maxCount }
  }, [dailyData])

  // Hourly drill-down for selected day
  const hourlyChart = useMemo(() => {
    if (!selectedDay?.data) return null
    const hours = selectedDay.data.hours || {}
    const editors = Object.keys(hours)
    const labels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)

    return {
      labels,
      datasets: editors.map(eid => ({
        label: editorLabel(eid),
        data: hours[eid],
        borderColor: editorColor(eid),
        backgroundColor: editorColor(eid) + '20',
        borderWidth: 1.5,
        tension: 0.3,
        pointRadius: 1,
        pointHoverRadius: 3,
        fill: true,
      })),
    }
  }, [selectedDay])

  if (!grid.weeks.length) return null

  const COLORS = dark ? INTENSITY_COLORS_DARK : INTENSITY_COLORS_LIGHT
  const txtDim = dark ? '#555' : '#999'
  const gridColor = dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.06)'
  const legendColor = dark ? '#888' : '#555'

  const cellSize = CELL_SIZE + 2 // Larger touch target
  const svgWidth = WEEK_COLS * cellSize + 32
  const svgHeight = 7 * cellSize + 24

  return (
    <div>
      <div className="overflow-x-auto scrollbar-thin" ref={containerRef}>
        <svg width={svgWidth} height={svgHeight} className="block" role="img" aria-label="GitHub-style contribution heatmap showing coding activity">
          {/* Month labels */}
          {grid.months.map((m, i) => (
            <text key={i} x={30 + m.week * cellSize} y={10} fill="var(--c-text2)" fontSize={10} fontWeight="500">{m.label}</text>
          ))}
          {DAY_LABELS.map((label, i) => (
            <text key={i} x={2} y={18 + i * cellSize + CELL_SIZE - 2} fill="var(--c-text3)" fontSize={9}>{label}</text>
          ))}
          {/* Cells */}
          {grid.weeks.map((week, w) =>
            week.map((cell, d) => {
              if (cell.isFuture) return null
              const intensity = getIntensity(cell.count, grid.maxCount)
              const isSelected = selectedDay?.key === cell.key
              return (
                <g key={cell.key}>
                  <rect
                    x={30 + w * cellSize}
                    y={12 + d * cellSize}
                    width={CELL_SIZE}
                    height={CELL_SIZE}
                    rx={2}
                    fill={COLORS[intensity]}
                    className="cursor-pointer transition-all hover:brightness-110"
                    style={{ outline: isSelected ? '2px solid var(--c-accent)' : 'none', outlineOffset: '1px' }}
                    onClick={() => setSelectedDay(cell.count > 0 ? cell : null)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedDay(cell.count > 0 ? cell : null); }}}
                    tabIndex={cell.count > 0 ? 0 : -1}
                    role="gridcell"
                    aria-label={`${cell.key}: ${cell.count} session${cell.count !== 1 ? 's' : ''}`}
                    aria-selected={isSelected}
                  />
                </g>
              )
            })
          )}
        </svg>
      </div>

      <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: 'var(--c-text2)', lineHeight: '1.6' }}>
        <span>Less</span>
        {COLORS.map((color, i) => (
          <span key={i} className="inline-block w-4 h-4 rounded-sm" style={{ background: color, border: '1px solid var(--c-border)' }} />
        ))}
        <span>More</span>
      </div>

      {/* Drill-down: hourly activity for selected day */}
      {selectedDay && selectedDay.data && (
        <div className="mt-3 card p-4 fade-in" role="region" aria-label={`Hourly activity for ${selectedDay.key}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-sm font-semibold" style={{ color: 'var(--c-white)' }}>{selectedDay.key}</span>
              <span className="text-xs ml-2" style={{ color: 'var(--c-text2)' }}>
                {selectedDay.count} session{selectedDay.count !== 1 ? 's' : ''}
                {' · '}
                {Object.entries(selectedDay.data.editors || {}).map(([e, c]) => `${editorLabel(e)}: ${c}`).join(', ')}
              </span>
            </div>
            <button
              onClick={() => setSelectedDay(null)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition min-h-[28px]"
              style={{ color: 'var(--c-text2)', border: '1px solid var(--c-border)' }}
              aria-label="Close hourly breakdown"
            >
              Close
            </button>
          </div>
          {hourlyChart && (
            <div style={{ height: 160 }} aria-hidden="true">
              <Line
                data={hourlyChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: { mode: 'index', intersect: false },
                  scales: {
                    x: {
                      grid: { color: gridColor },
                      ticks: { color: txtDim, font: { size: 10, family: 'JetBrains Mono, monospace' }, maxRotation: 0 },
                    },
                    y: {
                      beginAtZero: true,
                      grid: { color: gridColor },
                      ticks: { color: txtDim, stepSize: 1, font: { size: 10, family: 'JetBrains Mono, monospace' } },
                    },
                  },
                  plugins: {
                    legend: {
                      position: 'top',
                      labels: { color: legendColor, font: { size: 10, family: 'JetBrains Mono, monospace' }, usePointStyle: true, pointStyle: 'circle', padding: 8 },
                    },
                    tooltip: {
                      bodyFont: { family: 'JetBrains Mono, monospace', size: 11 },
                      titleFont: { family: 'JetBrains Mono, monospace', size: 11 },
                    },
                  },
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
