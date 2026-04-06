import React from 'react'
import { Paper } from '../api/client'

interface SynthesisPanelProps {
  synthesis: any
  selectedPapers?: Paper[]
}

// Single Paper Synthesis View
const SinglePaperView: React.FC<{ synthesis: any }> = ({ synthesis }) => {
  const tldr = synthesis?.tldr ?? 'No TL;DR available'
  const keyFindings = synthesis?.key_findings ?? []
  const tags = synthesis?.relevance_tags ?? []

  return (
    <div className="space-y-6">
      {/* TL;DR Card */}
      <div className="border-l-4 border-indigo-500 bg-indigo-50 rounded-r-lg p-4">
        <p className="text-lg italic text-indigo-900 font-medium">{tldr}</p>
      </div>

      {/* Key Findings */}
      {keyFindings.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Key Findings</h3>
          {keyFindings.map((finding: string, idx: number) => (
            <div key={idx} className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-gray-700">
              <span className="font-medium text-green-700 mr-2">{idx + 1}.</span>
              {finding}
            </div>
          ))}
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {tags.map((tag: string, idx: number) => (
            <span
              key={idx}
              className="bg-indigo-100 text-indigo-700 text-xs rounded-full px-3 py-1"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// Cross-Paper Synthesis View
const CrossPaperView: React.FC<{ synthesis: any }> = ({ synthesis }) => {
  // Support both backend field names and old names
  const keyFindings = synthesis?.key_findings ?? synthesis?.common_themes ?? []
  const contradictions = synthesis?.contradictions ?? []
  const researchGaps = synthesis?.research_gaps ?? []
  const consensus = synthesis?.consensus ?? ''
  const limitations = synthesis?.limitations ?? ''
  const methodology = synthesis?.methodology ?? ''
  const tags = synthesis?.tags ?? synthesis?.relevance_tags ?? []

  return (
    <div className="space-y-6">
      {/* Key Findings / Common Themes */}
      {keyFindings.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Key Findings</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {keyFindings.map((finding: string, idx: number) => (
              <div key={idx} className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-teal-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                    {idx + 1}
                  </span>
                  <p className="text-sm text-teal-900">{finding}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Methodology */}
      {methodology && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Methodology</h3>
          <p className="text-sm text-blue-800">{methodology}</p>
        </div>
      )}

      {/* Limitations */}
      {limitations && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-amber-900 mb-2">Limitations</h3>
          <p className="text-sm text-amber-800">{limitations}</p>
        </div>
      )}

      {/* Contradictions */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Contradictions</h3>
        {contradictions.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">No contradictions found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contradictions.map((item: any, idx: number) => (
              <div key={idx} className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-amber-900 mb-2">{item.area}</p>
                <div className="space-y-1">
                  {(item.viewpoints ?? []).map((viewpoint: string, vidx: number) => (
                    <p key={vidx} className="text-xs text-amber-800">
                      <span className="font-medium">View {vidx + 1}:</span> {viewpoint}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Research Gaps */}
      {researchGaps.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Research Gaps</h3>
          <div className="space-y-2">
            {researchGaps.map((gap: string, idx: number) => (
              <div key={idx} className="flex gap-2 text-sm text-gray-700">
                <span className="text-indigo-600">→</span>
                <span>{gap}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consensus */}
      {consensus && (
        <div className="bg-indigo-600 text-white rounded-lg p-5">
          <h3 className="text-sm font-semibold mb-2">Consensus</h3>
          <p className="text-sm italic">{consensus}</p>
        </div>
      )}

      {/* Tags / Relevance Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {tags.map((tag: string, idx: number) => (
            <span
              key={idx}
              className="bg-indigo-100 text-indigo-700 text-xs rounded-full px-3 py-1"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export const SynthesisPanel: React.FC<SynthesisPanelProps> = ({
  synthesis,
  selectedPapers = [],
}) => {
  // Handle null or error states
  if (!synthesis) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <div className="text-4xl mb-3">✨</div>
        <p className="text-lg font-semibold text-gray-900 mb-1">No Synthesis Yet</p>
        <p className="text-sm text-gray-600">Select papers and click 'Synthesize' to generate insights</p>
      </div>
    )
  }

  // Handle error in synthesis
  if (synthesis?.error) {
    return (
      <div className="bg-white border border-red-200 rounded-xl p-8 text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="text-lg font-semibold text-red-900 mb-2">Synthesis Error</p>
        <p className="text-sm text-red-700">{synthesis.error}</p>
        {synthesis.details && (
          <p className="text-xs text-red-600 mt-2">{synthesis.details}</p>
        )}
      </div>
    )
  }

  // Determine if single paper or cross-paper synthesis
  // Single paper has: tldr, key_findings (as array in blue cards)
  // Cross paper has: key_findings, methodology, limitations, etc.
  const isSinglePaper = synthesis?.tldr !== undefined

  return (
    <div>
      {isSinglePaper ? (
        <SinglePaperView synthesis={synthesis} />
      ) : (
        <CrossPaperView synthesis={synthesis} />
      )}
    </div>
  )
}

export default SynthesisPanel
