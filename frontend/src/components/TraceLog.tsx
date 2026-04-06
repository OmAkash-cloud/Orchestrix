import React, { useMemo } from 'react'
import { TraceStep } from '../api/client'

interface TraceLogProps {
  steps: TraceStep[]
  isLoading: boolean
  planReasoning?: string
  onStepClick?: (step: TraceStep) => void
}

// Agent emojis
const AGENT_ICONS: Record<string, string> = {
  discovery: '🔍',
  analysis: '📊',
  citation: '📝',
  synthesis: '🧠',
}

// Get agent icon with fallback
const getAgentIcon = (agentName: string): string => {
  return AGENT_ICONS[agentName.toLowerCase()] || '⚙️'
}

// Calculate step timing
const getStepDuration = (step: TraceStep): number | null => {
  if (!step.started_at || !step.finished_at) return null
  return new Date(step.finished_at).getTime() - new Date(step.started_at).getTime()
}

// Calculate total elapsed time
const getTotalElapsedTime = (steps: TraceStep[]): number => {
  if (steps.length === 0) return 0
  const firstStep = steps[0]
  const lastStep = steps[steps.length - 1]
  if (!firstStep.started_at || !lastStep.finished_at) return 0
  return new Date(lastStep.finished_at).getTime() - new Date(firstStep.started_at).getTime()
}

// Format milliseconds to readable time
const formatTime = (ms: number): string => {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export const TraceLog: React.FC<TraceLogProps> = ({
  steps,
  isLoading,
  planReasoning,
  onStepClick,
}) => {
  const doneCount = useMemo(() => steps.filter((s) => s.status === 'done').length, [steps])
  const totalTime = useMemo(() => getTotalElapsedTime(steps), [steps])

  if (steps.length === 0 && !isLoading) {
    return null
  }

  return (
    <div className="w-full">
      {/* Clean white card container */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Header with progress bar */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Execution Progress</h3>
            <span className="text-xs font-mono text-gray-500">
              {totalTime > 0 ? formatTime(totalTime) : '—'}
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-300 rounded-full"
              style={{ width: `${steps.length > 0 ? (doneCount / steps.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Plan reasoning (if available) */}
        {planReasoning && (
          <div className="px-5 py-3 bg-indigo-50 border-b border-gray-100">
            <p className="text-sm text-indigo-900">💡 {planReasoning}</p>
          </div>
        )}

        {/* Steps container */}
        <div className="divide-y divide-gray-100">
          {steps.length === 0 ? (
            <div className="px-5 py-6 text-center text-gray-500 text-sm">
              {isLoading ? 'Initializing execution...' : 'No execution steps'}
            </div>
          ) : (
            steps.map((step, index) => {
              const duration = getStepDuration(step)
              const statusConfig: Record<TraceStep['status'], { bgColor: string; textColor: string; label: string }> = {
                pending: { bgColor: 'bg-gray-100', textColor: 'text-gray-500', label: 'Pending' },
                running: { bgColor: 'bg-amber-100', textColor: 'text-amber-700', label: 'Running' },
                done: { bgColor: 'bg-green-100', textColor: 'text-green-700', label: 'Done' },
                failed: { bgColor: 'bg-red-100', textColor: 'text-red-700', label: 'Failed' },
                skipped: { bgColor: 'bg-gray-100', textColor: 'text-gray-400', label: 'Skipped' },
              }
              const config = statusConfig[step.status] || statusConfig.pending

              return (
                <div
                  key={`${step.step_number}-${step.agent_name}`}
                  className="px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer flex items-start gap-3"
                  onClick={() => onStepClick?.(step)}
                >
                  {/* Step number badge */}
                  <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center font-mono flex-shrink-0">
                    {step.step_number}
                  </div>

                  {/* Agent icon and name */}
                  <div className="flex-shrink-0 w-8 text-center text-base">
                    {getAgentIcon(step.agent_name)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {step.agent_name}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          step.status === 'running' ? 'animate-pulse' : ''
                        } ${config.bgColor} ${config.textColor}`}
                      >
                        {config.label}
                        {duration !== null && duration !== undefined && step.status === 'done'
                          ? ` (${formatTime(duration)})`
                          : ''}
                      </span>
                    </div>
                    {(step.output_summary || step.input_summary) && (
                      <p className="text-sm text-gray-600 line-clamp-1">
                        {step.output_summary || step.input_summary}
                      </p>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Loading indicator */}
        {isLoading && steps.length > 0 && (
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-center">
            <span className="text-xs text-gray-500">Processing...</span>
          </div>
        )}
      </div>

      {/* Summary stats */}
      {steps.length > 0 && (
        <div className="mt-3 flex gap-3 text-xs">
          <div className="flex items-center gap-1 text-green-700 bg-green-50 px-2.5 py-1 rounded-lg">
            <span>✓</span>
            <span className="font-medium">Done: {doneCount}/{steps.length}</span>
          </div>
          {steps.some((s) => s.status === 'running') && (
            <div className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg animate-pulse">
              <span>●</span>
              <span className="font-medium">Running</span>
            </div>
          )}
          {steps.some((s) => s.status === 'failed') && (
            <div className="flex items-center gap-1 text-red-700 bg-red-50 px-2.5 py-1 rounded-lg">
              <span>✗</span>
              <span className="font-medium">Failed</span>
            </div>
          )}
          {steps.some((s) => s.status === 'skipped') && (
            <div className="flex items-center gap-1 text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
              <span>⊘</span>
              <span className="font-medium">Skipped</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default TraceLog
