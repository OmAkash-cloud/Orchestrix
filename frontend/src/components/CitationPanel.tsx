import React, { useState } from 'react'
import { Paper } from '../api/client'

type CitationStyle = 'apa' | 'mla' | 'ieee' | 'chicago'

interface CitationPanelProps {
  citations?: any
  papers?: Paper[]
  sessionId?: number
}

export const CitationPanel: React.FC<CitationPanelProps> = ({
  citations = null,
  papers = [],
  sessionId = 0,
}) => {
  const [selectedStyle, setSelectedStyle] = useState<CitationStyle>('apa')
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  // Debug logging
  React.useEffect(() => {
    console.log('CitationPanel received:', citations)
  }, [citations])

  // Get citations from the citations object (from ResearchResult)
  const citationsList = citations?.citations || []
  const bulkTxt = citations?.bulk_txt || ''
  const bulkBib = citations?.bulk_bib || ''

  // Handle copy to clipboard
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(copiedIndex === null ? 0 : null)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  // Handle download .txt
  const handleDownloadTxt = () => {
    if (!bulkTxt) return
    const blob = new Blob([bulkTxt], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `citations_${selectedStyle}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Handle download .bib
  const handleDownloadBib = () => {
    if (!bulkBib) return
    const blob = new Blob([bulkBib], { type: 'application/x-bibtex' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'citations.bib'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (!citations) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <div className="text-4xl mb-3">📄</div>
        <p className="text-gray-600 font-medium">Run a search first to generate citations</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Style Selector - Pill Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['apa', 'mla', 'ieee', 'chicago'] as CitationStyle[]).map((style) => (
          <button
            key={style}
            onClick={() => setSelectedStyle(style)}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              selectedStyle === style
                ? 'bg-indigo-600 text-white'
                : 'border border-gray-300 text-gray-600 hover:border-indigo-400'
            }`}
          >
            {style.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Citations List */}
      {citationsList.length > 0 ? (
        <div className="space-y-4">
          {citationsList.map((paperCitations: any, index: number) => {
            const citationText = paperCitations?.[selectedStyle] || ''
            return (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Paper {index + 1}</div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 font-mono text-xs text-gray-700 break-all mb-3 max-h-24 overflow-y-auto">
                  {citationText}
                </div>
                <button
                  onClick={() => handleCopy(citationText)}
                  className="text-xs text-indigo-600 hover:underline cursor-pointer"
                >
                  {copiedIndex === index ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <div className="text-3xl mb-2">📋</div>
          <p className="text-amber-900 font-medium mb-1">No Individual Citations</p>
          <p className="text-sm text-amber-700 mb-4">{bulkTxt || 'Citations are processed after papers are found'}</p>
          {bulkTxt && (
            <div className="mt-4 p-3 bg-white rounded border border-amber-200 text-left text-xs text-gray-700 max-h-32 overflow-y-auto font-mono">
              {bulkTxt}
            </div>
          )}
        </div>
      )}

      {/* Export Bar */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={handleDownloadTxt}
          disabled={!bulkTxt}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Download .txt
        </button>
        <button
          onClick={handleDownloadBib}
          disabled={!bulkBib}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Download .bib
        </button>
      </div>
    </div>
  )
}

export default CitationPanel
