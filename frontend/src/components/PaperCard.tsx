import React, { useState } from 'react'
import { Paper } from '../api/client'

interface PaperCardProps {
  paper: Paper
  isSelected?: boolean
  onSelect?: (selected: boolean) => void
  onCite?: (paper: Paper) => void
  onSummarize?: (paper: Paper) => void
}

// Source badge colors
const SOURCE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  arxiv: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'arXiv' },
  semantic_scholar: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Semantic Scholar' },
  openalex: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'OpenAlex' },
}

export const PaperCard: React.FC<PaperCardProps> = ({
  paper,
  isSelected = false,
  onSelect,
  onCite,
  onSummarize,
}) => {
  const [showFullAbstract, setShowFullAbstract] = useState(false)

  const sourceConfig = SOURCE_COLORS[paper.source.toLowerCase()] || {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    label: paper.source,
  }

  // Display max 2 authors + et al.
  const displayAuthors = paper.authors.length > 2
    ? `${paper.authors.slice(0, 2).join(', ')} et al.`
    : paper.authors.join(', ')

  return (
    <div
      className={`bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer ${
        isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50/30' : ''
      }`}
    >
      {/* Top Row: Checkbox + Source Badge on left, Relevance Score on right */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {onSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onSelect(e.target.checked)}
              className="w-4 h-4 rounded cursor-pointer accent-indigo-600"
            />
          )}
          <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${sourceConfig.bg} ${sourceConfig.text}`}>
            {sourceConfig.label}
          </span>
        </div>
        <div className="text-sm font-semibold text-indigo-600">
          {Math.round(paper.relevance_score * 100)}%
        </div>
      </div>

      {/* Title */}
      <a
        href={paper.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-base font-semibold text-gray-900 hover:text-indigo-600 leading-snug mt-2 line-clamp-2"
      >
        {paper.title}
      </a>

      {/* Authors */}
      <p className="text-sm text-gray-500 mt-1 line-clamp-1">{displayAuthors || 'Unknown Author'}</p>

      {/* Meta Row: Year | Citation Count */}
      <div className="flex items-center gap-3 text-xs text-gray-400 mt-2">
        <span>📅 {paper.year || 'N/A'}</span>
        <span>cited: {paper.citation_count}</span>
      </div>

      {/* Abstract */}
      {paper.abstract && (
        <div className="mt-2">
          <p className={`text-sm text-gray-600 ${showFullAbstract ? '' : 'line-clamp-3'}`}>
            {paper.abstract}
          </p>
          {paper.abstract.length > 150 && (
            <button
              onClick={() => setShowFullAbstract(!showFullAbstract)}
              className="text-indigo-500 text-xs hover:text-indigo-600 mt-1"
            >
              {showFullAbstract ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {/* Relevance Bar */}
      <div className="h-1.5 bg-gray-100 rounded-full mt-3 overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all"
          style={{ width: `${paper.relevance_score * 100}%` }}
        />
      </div>

      {/* Action Row */}
      <div className="flex gap-2 mt-3">
        {onCite && (
          <button
            onClick={() => onCite(paper)}
            className="border border-gray-300 text-xs rounded-lg px-3 py-1.5 text-gray-700 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
          >
            Cite
          </button>
        )}
        {onSummarize && (
          <button
            onClick={() => onSummarize(paper)}
            className="border border-gray-300 text-xs rounded-lg px-3 py-1.5 text-gray-700 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
          >
            Summarize
          </button>
        )}
      </div>
    </div>
  )
}

export default PaperCard
