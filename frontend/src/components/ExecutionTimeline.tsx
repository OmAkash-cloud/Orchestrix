import React, { useMemo, useState } from 'react'
import { TraceStep } from '../api/client'

interface ExecutionTimelineProps {
  trace: TraceStep[]
  totalDurationMs: number
}

interface TooltipState {
  visible: boolean
  x: number
  y: number
  agent: string
  duration: number
  status: string
}

const AGENT_COLORS: Record<string, string> = {
  Discovery: '#10B981',
  Analysis: '#F59E0B',
  Citation: '#EC4899',
  Synthesis: '#6366F1',
}

const AGENT_NAMES = ['Discovery', 'Analysis', 'Citation', 'Synthesis']
const SVG_HEIGHT = 180
const PADDING = { top: 30, bottom: 30, left: 120, right: 20 }
const CHART_HEIGHT = SVG_HEIGHT - PADDING.top - PADDING.bottom
const BAR_HEIGHT = CHART_HEIGHT / AGENT_NAMES.length
const SVG_WIDTH = 800

export const ExecutionTimeline: React.FC<ExecutionTimelineProps> = ({ trace, totalDurationMs }) => {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    agent: '',
    duration: 0,
    status: '',
  })

  // Calculate time offset for bars
  const queryStartTime = useMemo(() => {
    if (trace.length === 0) return 0
    const validTimes = trace
      .map((step) => Number(step.started_at) || 0)
      .filter((t) => t > 0)
    return validTimes.length > 0 ? Math.min(...validTimes) : 0
  }, [trace])

  // Get Y position for agent
  const getAgentYPosition = (agentName: string): number => {
    const index = AGENT_NAMES.indexOf(agentName)
    return index >= 0 ? index : 0
  }

  // Calculate bar position and width
  const calculateBarPosition = (step: TraceStep) => {
    const startTime = Number(step.started_at) || 0
    const endTime = Number(step.ended_at) || 0
    const duration = totalDurationMs || 1
    
    if (!startTime || duration === 0) {
      return { x: 0, width: 0 }
    }

    const relativeStart = startTime - queryStartTime
    const barDuration = endTime > startTime ? endTime - startTime : duration * 0.1
    const containerWidth = SVG_WIDTH - PADDING.left - PADDING.right

    const x = PADDING.left + (relativeStart / duration) * containerWidth
    const width = Math.max((barDuration / duration) * containerWidth, 3)

    // Validate results are numbers
    return { 
      x: isFinite(x) ? x : 0, 
      width: isFinite(width) ? width : 0 
    }
  }

  // Handle bar hover
  const handleBarHover = (
    step: TraceStep,
    mouseX: number,
    mouseY: number,
    isEnter: boolean
  ) => {
    if (isEnter) {
      const startTime = Number(step.started_at) || 0
      const endTime = Number(step.ended_at) || 0
      const duration = endTime > startTime ? endTime - startTime : 0
      setTooltip({
        visible: true,
        x: mouseX,
        y: mouseY - 20,
        agent: step.agent,
        duration: isFinite(duration) ? duration : 0,
        status: step.status,
      })
    } else {
      setTooltip({ ...tooltip, visible: false })
    }
  }

  // Create hatched pattern for skipped steps
  const HatchPattern = () => (
    <defs>
      <pattern id="hatch" patternUnits="userSpaceOnUse" width="4" height="4">
        <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke="#9CA3AF" strokeWidth="0.5" />
      </pattern>
    </defs>
  )

  // Get bar color and fill
  const getBarStyle = (step: TraceStep) => {
    if (step.status === 'failed') {
      return { fill: '#EF4444', pattern: false }
    }
    if (step.status === 'skipped') {
      return { fill: 'url(#hatch)', pattern: true }
    }
    return { fill: AGENT_COLORS[step.agent] || '#6B7280', pattern: false }
  }

  if (trace.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-gray-500 text-center py-8">No execution trace available</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
        <h3 className="text-lg font-semibold text-gray-900">
          Execution Timeline — {totalDurationMs}ms total
        </h3>
        <p className="text-sm text-gray-600 mt-1">Agent execution sequence and duration</p>
      </div>

      {/* SVG Chart */}
      <div className="p-6 overflow-x-auto">
        <svg width={SVG_WIDTH} height={SVG_HEIGHT} className="bg-white">
          <HatchPattern />

          {/* Y Axis Labels (Agent Names) */}
          {AGENT_NAMES.map((agent, idx) => (
            <text
              key={`label-${agent}`}
              x={PADDING.left - 10}
              y={PADDING.top + idx * BAR_HEIGHT + BAR_HEIGHT / 2 + 4}
              textAnchor="end"
              fontSize="12"
              fill="#4B5563"
              fontWeight="500"
            >
              {agent}
            </text>
          ))}

          {/* Horizontal Grid Lines */}
          {AGENT_NAMES.map((_, idx) => (
            <line
              key={`grid-${idx}`}
              x1={PADDING.left}
              y1={PADDING.top + (idx + 1) * BAR_HEIGHT}
              x2={SVG_WIDTH - PADDING.right}
              y2={PADDING.top + (idx + 1) * BAR_HEIGHT}
              stroke="#E5E7EB"
              strokeDasharray="2,2"
            />
          ))}

          {/* Bars (Execution Steps) */}
          {trace.map((step, idx) => {
            const { x, width } = calculateBarPosition(step)
            const yIndex = getAgentYPosition(step.agent)
            const y = PADDING.top + yIndex * BAR_HEIGHT + (BAR_HEIGHT - 20) / 2
            const style = getBarStyle(step)

            // Skip rendering if positions are invalid
            if (!isFinite(x) || !isFinite(y) || !isFinite(width)) {
              return null
            }

            return (
              <g key={`bar-${idx}`}>
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={20}
                  fill={style.fill}
                  stroke={step.status === 'failed' ? '#DC2626' : '#374151'}
                  strokeWidth="1"
                  rx="2"
                  onMouseEnter={(e) =>
                    handleBarHover(step, e.clientX, e.clientY, true)
                  }
                  onMouseLeave={() => handleBarHover(step, 0, 0, false)}
                  style={{ cursor: 'pointer' }}
                />
                {/* Duration label on bar */}
                {width > 30 && step.ended_at && (
                  <text
                    x={x + width / 2}
                    y={y + 14}
                    textAnchor="middle"
                    fontSize="10"
                    fill="white"
                    fontWeight="bold"
                  >
                    {step.ended_at - step.started_at}ms
                  </text>
                )}
              </g>
            )
          })}

          {/* X Axis */}
          <line
            x1={PADDING.left}
            y1={SVG_HEIGHT - PADDING.bottom}
            x2={SVG_WIDTH - PADDING.right}
            y2={SVG_HEIGHT - PADDING.bottom}
            stroke="#374151"
            strokeWidth="1"
          />

          {/* X Axis Ticks and Labels (0%, 25%, 50%, 75%, 100%) */}
          {[0, 0.25, 0.5, 0.75, 1].map((percent, idx) => {
            const x = PADDING.left + percent * (SVG_WIDTH - PADDING.left - PADDING.right)
            const ms = Math.round(percent * totalDurationMs)

            return (
              <g key={`tick-${idx}`}>
                {/* Tick mark */}
                <line
                  x1={x}
                  y1={SVG_HEIGHT - PADDING.bottom}
                  x2={x}
                  y2={SVG_HEIGHT - PADDING.bottom + 5}
                  stroke="#374151"
                  strokeWidth="1"
                />
                {/* Label */}
                <text
                  x={x}
                  y={SVG_HEIGHT - PADDING.bottom + 18}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#6B7280"
                >
                  {ms}ms
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex flex-wrap gap-4 text-sm">
        {AGENT_NAMES.map((agent) => (
          <div key={`legend-${agent}`} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: AGENT_COLORS[agent] }}
            />
            <span className="text-gray-700">{agent}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500" />
          <span className="text-gray-700">Failed</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{ fill: 'url(#hatch)' }}
          />
          <span className="text-gray-700">Skipped</span>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            zIndex: 1000,
          }}
          className="bg-gray-900 text-white px-3 py-2 rounded shadow-lg text-sm pointer-events-none"
        >
          <div className="font-semibold">{tooltip.agent}</div>
          <div className="text-gray-300">{tooltip.duration}ms</div>
          <div className="text-xs text-gray-400 capitalize">{tooltip.status}</div>
        </div>
      )}
    </div>
  )
}

export default ExecutionTimeline
