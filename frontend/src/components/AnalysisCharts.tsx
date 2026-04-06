import React, { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts'
import { AnalysisData } from '../api/client'
import { GapRadar } from './GapRadar'

interface AnalysisChartsProps {
  analysis: AnalysisData | null
}

// Skeleton loader
const SkeletonLoader: React.FC<{ height?: string }> = ({ height = 'h-64' }) => (
  <div className={`${height} bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg animate-pulse`} />
)

// Color palette for keywords
const KEYWORD_COLORS = ['#6366F1', '#EC4899', '#F59E0B', '#10B981']

// Panel wrapper component
const Panel: React.FC<{ title: string; children: React.ReactNode; fullWidth?: boolean }> = ({
  title,
  children,
  fullWidth = false,
}) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${fullWidth ? 'col-span-2 md:col-span-2' : ''}`}>
    <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
    {children}
  </div>
)

export const AnalysisCharts: React.FC<AnalysisChartsProps> = ({ analysis }) => {
  // Publication Trend data
  const trendData = useMemo(() => {
    if (!analysis?.trend) return []
    return (analysis.trend.labels as string[]).map((label, idx) => ({
      name: label,
      count: (analysis.trend.values as number[])[idx] || 0,
    }))
  }, [analysis?.trend])

  // Top Authors data (limited to 10)
  const authorsData = useMemo(() => {
    if (!analysis?.authors) return []
    const authors = (analysis.authors.authors as string[]) || []
    const counts = (analysis.authors.counts as number[]) || []
    return authors
      .slice(0, 10)
      .map((author, idx) => ({
        name: author.length > 25 ? author.substring(0, 22) + '...' : author,
        count: counts[idx] || 0,
      }))
      .reverse()
  }, [analysis?.authors])

  // Keywords data (top 20)
  const keywordsData = useMemo(() => {
    if (!analysis?.keywords) return []
    const words = (analysis.keywords.words as string[]) || []
    const counts = (analysis.keywords.counts as number[]) || []
    return words
      .slice(0, 20)
      .map((word, idx) => ({
        word,
        count: counts[idx] || 0,
      }))
      .sort((a, b) => b.count - a.count)
  }, [analysis?.keywords])

  // Keywords min/max for font scaling
  const keywordCountRange = useMemo(() => {
    if (keywordsData.length === 0) return { min: 0, max: 1 }
    const counts = keywordsData.map((k) => k.count)
    return { min: Math.min(...counts), max: Math.max(...counts) }
  }, [keywordsData])

  // Calculate font size based on count
  const getKeywordFontSize = (count: number): number => {
    const { min, max } = keywordCountRange
    if (max === min) return 20
    const ratio = (count - min) / (max - min)
    return 12 + ratio * 20 // 12px to 32px
  }

  // Citation Distribution data
  const citationData = useMemo(() => {
    if (!analysis?.citations) return []
    return (analysis.citations.labels as string[]).map((label, idx) => ({
      name: label,
      count: (analysis.citations.values as number[])[idx] || 0,
    }))
  }, [analysis?.citations])

  // Citation colors (gradient from gray to amber)
  const citationColors = ['#9CA3AF', '#A78BFA', '#FCD34D', '#FBBF24', '#F59E0B', '#D97706']

  // Emerging vs Declining topics
  const emergingTopics = useMemo(
    () => (analysis?.emerging?.emerging as string[]) || [],
    [analysis?.emerging]
  )
  const decliningTopics = useMemo(
    () => (analysis?.emerging?.declining as string[]) || [],
    [analysis?.emerging]
  )

  if (!analysis) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Panel title="Publication Volume" fullWidth>
          <SkeletonLoader height="h-64" />
        </Panel>
        <Panel title="Top Contributing Authors">
          <SkeletonLoader height="h-64" />
        </Panel>
        <Panel title="Keyword Frequency">
          <SkeletonLoader height="h-64" />
        </Panel>
        <Panel title="Citation Impact">
          <SkeletonLoader height="h-64" />
        </Panel>
        <Panel title="Emerging vs Declining Topics" fullWidth>
          <SkeletonLoader height="h-48" />
        </Panel>
        <Panel title="Research Coverage Radar" fullWidth>
          <SkeletonLoader height="h-96" />
        </Panel>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* 1. Publication Trend - FULL WIDTH */}
      <Panel title="Publication Volume" fullWidth>
        {trendData.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No trend data available</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                formatter={(value) => `${value} papers`}
                labelFormatter={(label) => `Year: ${label}`}
              />
              <Bar dataKey="count" name="Papers" radius={[8, 8, 0, 0]}>
                {trendData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={`hsl(${240 + (index / trendData.length) * 60}, 70%, 50%)`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>

      {/* 2. Top Authors */}
      <Panel title="Top Contributing Authors">
        {authorsData.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No author data available</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={authorsData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={200} />
              <Tooltip />
              <Bar dataKey="count" fill="#059669" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>

      {/* 3. Keyword Frequency */}
      <Panel title="Keyword Frequency">
        {keywordsData.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No keyword data available</p>
        ) : (
          <div className="flex flex-wrap gap-3 justify-center py-4">
            {keywordsData.map((kw, idx) => (
              <span
                key={`${kw.word}-${idx}`}
                style={{
                  fontSize: `${getKeywordFontSize(kw.count)}px`,
                  color: KEYWORD_COLORS[idx % KEYWORD_COLORS.length],
                }}
                className="font-semibold transition-all hover:opacity-75 cursor-pointer"
                title={`${kw.count} occurrences`}
              >
                {kw.word}
              </span>
            ))}
          </div>
        )}
      </Panel>

      {/* 4. Citation Distribution */}
      <Panel title="Citation Impact">
        {citationData.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No citation data available</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={citationData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                formatter={(value) => `${value} papers`}
                labelFormatter={(label) => `Citations: ${label}`}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {citationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={citationColors[index % citationColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>

      {/* 5. Emerging vs Declining Topics - FULL WIDTH */}
      <Panel title="Emerging vs Declining Topics" fullWidth>
        {emergingTopics.length === 0 && decliningTopics.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No topic data available</p>
        ) : (
          <div className="grid grid-cols-2 gap-6">
            {/* Emerging Topics */}
            <div>
              <h4 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-2">
                <span>Emerging ↑</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {emergingTopics.length === 0 ? (
                  <p className="text-gray-400 text-sm">No emerging topics</p>
                ) : (
                  emergingTopics.map((topic, idx) => (
                    <span
                      key={`emerging-${idx}`}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 border border-emerald-300 text-emerald-700 rounded-full text-xs font-medium"
                    >
                      ↑ {topic}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Declining Topics */}
            <div>
              <h4 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
                <span>Declining ↓</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {decliningTopics.length === 0 ? (
                  <p className="text-gray-400 text-sm">No declining topics</p>
                ) : (
                  decliningTopics.map((topic, idx) => (
                    <span
                      key={`declining-${idx}`}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 border border-red-300 text-red-700 rounded-full text-xs font-medium"
                    >
                      ↓ {topic}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Panel>

      {/* 6. Research Coverage Radar - FULL WIDTH */}
      <GapRadar keywords={analysis?.keywords || null} emerging={analysis?.emerging || null} />
    </div>
  )
}

export default AnalysisCharts
