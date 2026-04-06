import React, { useMemo } from 'react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

interface GapRadarProps {
  keywords: { words: string[]; counts: number[] } | null
  emerging: { emerging: string[]; declining: string[] } | null
}

interface RadarDataPoint {
  keyword: string
  coverage: number
}

interface GapItem {
  keyword: string
  score: number
}

export const GapRadar: React.FC<GapRadarProps> = ({ keywords, emerging }) => {
  const radarData = useMemo(() => {
    if (!keywords || !keywords.words || keywords.words.length === 0) {
      return { data: [], gaps: [], wellCovered: [] }
    }

    // Get top 8 keywords
    const wordCountPairs = keywords.words.map((word, idx) => ({
      word,
      count: keywords.counts[idx] || 0,
    }))

    wordCountPairs.sort((a, b) => b.count - a.count)
    const topKeywords = wordCountPairs.slice(0, 8)

    // Calculate coverage scores
    const emeringSet = new Set(emerging?.emerging || [])
    const decliningSet = new Set(emerging?.declining || [])

    // Find max count for normalization
    const maxCount = Math.max(...topKeywords.map((k) => k.count), 1)

    const radarPoints: RadarDataPoint[] = topKeywords.map(({ word, count }) => {
      // Base score: normalize count to 0-100
      let coverage = (count / maxCount) * 100

      // Apply boosts and penalties
      if (emeringSet.has(word)) {
        coverage += 20
      }
      if (decliningSet.has(word)) {
        coverage -= 20
      }

      // Clamp to 0-100
      coverage = Math.max(0, Math.min(100, coverage))

      return { keyword: word, coverage: Math.round(coverage) }
    })

    // Identify gaps (< 40) and well-covered (> 70)
    const gaps: GapItem[] = radarPoints
      .filter((p) => p.coverage < 40)
      .sort((a, b) => a.coverage - b.coverage)
      .map((p) => ({ keyword: p.keyword, score: p.coverage }))

    const wellCovered: GapItem[] = radarPoints
      .filter((p) => p.coverage > 70)
      .sort((a, b) => b.coverage - a.coverage)
      .map((p) => ({ keyword: p.keyword, score: p.coverage }))

    return {
      data: radarPoints,
      gaps,
      wellCovered,
    }
  }, [keywords, emerging])

  if (!keywords?.words || keywords.words.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500">No keyword data available</p>
      </div>
    )
  }

  const { data, gaps, wellCovered } = radarData

  return (
    <div className="bg-white rounded-lg border-l-4 border-indigo-500 border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 px-6 py-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-900">Research Coverage Radar</h3>
              <span className="inline-block px-2 py-0.5 bg-indigo-200 text-indigo-700 text-xs font-semibold rounded-full">
                ✨ Novelty Feature
              </span>
            </div>
            <p className="text-sm text-gray-600">Low coverage = potential research gap</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Radar Chart */}
        <div className="flex justify-center">
          <ResponsiveContainer width={350} height={350}>
            <RadarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <PolarGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <PolarAngleAxis
                dataKey="keyword"
                tick={{ fontSize: 12, fill: '#4B5563' }}
                angle={90}
                domain={[0, 360]}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
              />
              <Radar
                name="Coverage"
                dataKey="coverage"
                stroke="#4F46E5"
                fill="rgba(79, 70, 229, 0.2)"
                isAnimationActive={true}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '8px',
                }}
                formatter={(value: number) => `${value}%`}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Gap Analysis */}
        <div className="grid grid-cols-2 gap-4">
          {/* Identified Gaps */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
              <span className="text-xl">🔴</span> Identified Gaps
            </h4>
            {gaps.length === 0 ? (
              <p className="text-sm text-red-700">No coverage gaps identified</p>
            ) : (
              <div className="space-y-2">
                {gaps.map((gap, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-red-900">{gap.keyword}</span>
                    <span className="px-2 py-1 bg-red-200 text-red-800 rounded text-xs font-semibold">
                      {gap.score}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Well-Covered Areas */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
              <span className="text-xl">🟢</span> Well-Covered Areas
            </h4>
            {wellCovered.length === 0 ? (
              <p className="text-sm text-green-700">No well-covered areas identified</p>
            ) : (
              <div className="space-y-2">
                {wellCovered.map((area, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-green-900">{area.keyword}</span>
                    <span className="px-2 py-1 bg-green-200 text-green-800 rounded text-xs font-semibold">
                      {area.score}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
          <p className="font-medium text-gray-900 mb-2">Coverage Score Calculation:</p>
          <ul className="space-y-1">
            <li>• <span className="font-semibold">Base:</span> Keyword frequency (0-100)</li>
            <li>• <span className="font-semibold">Boost:</span> +20 if emerging trend</li>
            <li>• <span className="font-semibold">Penalty:</span> -20 if declining trend</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default GapRadar
