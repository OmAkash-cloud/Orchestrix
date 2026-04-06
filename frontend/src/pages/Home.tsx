import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { runQuery, ResearchResult, TraceStep, Paper } from '../api/client'
import TraceLog from '../components/TraceLog'
import PaperCard from '../components/PaperCard'
import AnalysisCharts from '../components/AnalysisCharts'
import CitationPanel from '../components/CitationPanel'
import SynthesisPanel from '../components/SynthesisPanel'

// CSS for animations and fonts
const styles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

body {
  font-family: 'Inter', sans-serif;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.fade-in {
  animation: fade-in 0.6s ease-out forwards;
}

@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

.shimmer {
  background: linear-gradient(to right, #f3f4f6 8%, #e5e7eb 18%, #f3f4f6 33%);
  background-size: 800px 104px;
  animation: shimmer 1.5s infinite;
}
`

// Inject styles
if (!document.getElementById('orchestrix-styles')) {
  const styleEl = document.createElement('style')
  styleEl.id = 'orchestrix-styles'
  styleEl.textContent = styles
  document.head.appendChild(styleEl)
}

const EXAMPLE_QUERIES = [
  'Transformer attention mechanisms',
  'RLHF training methods',
  'Graph neural networks survey',
]

export const Home: React.FC = () => {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<ResearchResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'papers' | 'analysis' | 'citations' | 'synthesis'>('papers')
  const [selectedPapers, setSelectedPapers] = useState<number[]>([])
  const [sortBy, setSortBy] = useState<'relevance' | 'year' | 'citations'>('relevance')
  const [traceData, setTraceData] = useState<TraceStep[]>([])
  const [resultFadeIn, setResultFadeIn] = useState(false)
  const [showSinglePaperModal, setShowSinglePaperModal] = useState(false)
  const [singlePaperSynthesis, setSinglePaperSynthesis] = useState<any>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout>()

  // Fetch trace logs during loading
  const fetchTraceLogs = async (sessionId: number) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/research/sessions/${sessionId}/trace`)
      const data = await response.json()
      setTraceData(data.trace || [])
    } catch (error) {
      console.error('Failed to fetch trace logs:', error)
    }
  }

  // Start polling trace logs when loading
  useEffect(() => {
    if (isLoading && result?.session_id) {
      pollingIntervalRef.current = setInterval(() => {
        fetchTraceLogs(result.session_id)
      }, 1500)
      return () => {
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
      }
    }
  }, [isLoading, result?.session_id])

  // Trigger fade-in for results
  useEffect(() => {
    if (result) {
      setResultFadeIn(false)
      const timer = setTimeout(() => setResultFadeIn(true), 50)
      return () => clearTimeout(timer)
    }
  }, [result])

  // Handle search
  const handleSearch = async () => {
    if (!query.trim()) return

    setIsLoading(true)
    setResult(null)
    setError(null)
    setTraceData([])
    setSelectedPapers([])
    setActiveTab('papers')

    try {
      const data = await runQuery(query)
      console.log('Result received:', data)
      console.log('Citations data:', data.citations)
      console.log('Synthesis data:', data.synthesis)
      setResult(data)
      setTraceData(data.trace || [])
    } catch (err: any) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error('Search failed:', errorMsg)
      setError(errorMsg)
    } finally {
      setIsLoading(false)
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
    }
  }

  // Handle single paper summarization
  const handleSummarizePaper = async (paper: Paper) => {
    try {
      const data = await runQuery(paper.title)
      console.log('Single paper synthesis result:', data.synthesis)
      setSinglePaperSynthesis(data.synthesis)
      setShowSinglePaperModal(true)
    } catch (err: any) {
      console.error('Failed to synthesize paper:', err)
      setError('Failed to synthesize paper')
    }
  }

  // Handle chip click
  const handleChipClick = (chipText: string) => {
    setQuery(chipText)
  }

  // Handle paper selection
  const togglePaperSelection = (index: number) => {
    setSelectedPapers((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    )
  }

  // Sort papers
  const sortedPapers = React.useMemo(() => {
    if (!result?.papers) return []
    const papers = [...result.papers]
    
    switch (sortBy) {
      case 'year':
        return papers.sort((a, b) => (b.year || 0) - (a.year || 0))
      case 'citations':
        return papers.sort((a, b) => b.citation_count - a.citation_count)
      case 'relevance':
      default:
        return papers.sort((a, b) => b.relevance_score - a.relevance_score)
    }
  }, [result?.papers, sortBy])

  // Calculate stats
  const stats = result ? {
    papers: result.papers?.length || 0,
    agents: result.trace?.length || 0,
    analysis: result.analysis ? 1 : 0,
    time: result.total_duration_ms ? `${Math.round(result.total_duration_ms / 1000)}s` : '—',
  } : null

  return (
    <div className="min-h-screen bg-[#F9FAFB]" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB] h-14">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-xl text-indigo-600">⬡</span>
            <span className="text-lg font-semibold text-gray-900">Orchestrix</span>
          </div>
          
          {/* Dashboard Link */}
          <a
            href="/dashboard"
            className="text-indigo-600 hover:underline cursor-pointer text-sm font-medium transition-colors"
          >
            Dashboard →
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-56px)]">
        {isLoading ? (
          // Loading State
          <div className="pt-20 pb-12 px-6">
            <div className="max-w-2xl mx-auto">
              {/* Loading Card */}
              <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                  <p className="text-gray-900 font-medium">Orchestrating agents...</p>
                </div>
                
                {/* Shimmer Bars */}
                <div className="space-y-3">
                  <div className="h-3 rounded shimmer"></div>
                  <div className="h-3 rounded shimmer" style={{ animationDelay: '0.2s' }}></div>
                  <div className="h-3 rounded shimmer" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>

              {/* Trace Log */}
              <TraceLog steps={traceData} isLoading={isLoading} />
            </div>
          </div>
        ) : result ? (
          // Results State
          <div className={`pt-8 pb-12 px-6 transition-opacity duration-600 ${resultFadeIn ? 'fade-in' : 'opacity-0'}`}>
            <div className="max-w-7xl mx-auto space-y-8">
              {/* Error Banner */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-900">
                    <span className="font-medium">❌ Error:</span> {error}
                  </p>
                </div>
              )}

              {/* Conflict Warning Banner */}
              {result.conflict && typeof result.conflict === 'object' && 'has_conflict' in result.conflict && result.conflict.has_conflict && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-900">
                    <span className="font-medium">⚠ Agent disagreement:</span> {
                      result.conflict && typeof result.conflict === 'object' && 'conflict_areas' in result.conflict && Array.isArray(result.conflict.conflict_areas) && (result.conflict.conflict_areas as string[])[0]
                    }
                  </p>
                </div>
              )}

              {/* Stats Row */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-indigo-600">{stats?.papers}</div>
                  <div className="text-xs text-gray-500 mt-1">Papers Found</div>
                </div>
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-indigo-600">{stats?.agents}</div>
                  <div className="text-xs text-gray-500 mt-1">Agents Run</div>
                </div>
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-indigo-600">{stats?.analysis}</div>
                  <div className="text-xs text-gray-500 mt-1">Analysis Ready</div>
                </div>
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-indigo-600">{stats?.time}</div>
                  <div className="text-xs text-gray-500 mt-1">Time</div>
                </div>
              </div>

              {/* Tab Bar */}
              <div className="border-b border-[#E5E7EB]">
                <div className="flex gap-8">
                  <button
                    onClick={() => setActiveTab('papers')}
                    className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
                      activeTab === 'papers'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Papers
                  </button>
                  <button
                    onClick={() => setActiveTab('analysis')}
                    className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
                      activeTab === 'analysis'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Analysis
                  </button>
                  <button
                    onClick={() => setActiveTab('citations')}
                    className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
                      activeTab === 'citations'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Citations
                  </button>
                  <button
                    onClick={() => setActiveTab('synthesis')}
                    className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
                      activeTab === 'synthesis'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Synthesis
                  </button>
                </div>
              </div>

              {/* Tab Panels */}
              <div className="mt-6">
                {/* Papers Tab */}
                {activeTab === 'papers' && (
                  <div className="space-y-4">
                    {/* Controls */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">Sort by:</label>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as 'relevance' | 'year' | 'citations')}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="relevance">Relevance</option>
                          <option value="year">Year</option>
                          <option value="citations">Citations</option>
                        </select>
                      </div>

                      {selectedPapers.length >= 2 && (
                        <button
                          onClick={() => setActiveTab('synthesis')}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          Synthesize ({selectedPapers.length})
                        </button>
                      )}
                    </div>

                    {/* Papers Grid */}
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-1 lg:grid-cols-2">
                      {sortedPapers.map((paper, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedPapers.includes(index)}
                            onChange={() => togglePaperSelection(index)}
                            className="mt-4 w-4 h-4 cursor-pointer accent-indigo-600"
                          />
                          <div className="flex-1">
                            <PaperCard 
                              paper={paper}
                              onSummarize={handleSummarizePaper}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Analysis Tab */}
                {activeTab === 'analysis' && (
                  <div className="w-full">
                    <AnalysisCharts analysis={result.analysis} />
                  </div>
                )}

                {/* Citations Tab */}
                {activeTab === 'citations' && (
                  <div className="w-full">
                    <CitationPanel 
                      citations={result.citations} 
                      papers={result.papers}
                      sessionId={result.session_id}
                    />
                  </div>
                )}

                {/* Synthesis Tab */}
                {activeTab === 'synthesis' && (
                  <div className="w-full">
                    <SynthesisPanel
                      synthesis={result.synthesis}
                      selectedPapers={selectedPapers.map((i) => sortedPapers[i])}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Initial State - Hero Section
          <div className="min-h-[calc(100vh-56px)] bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex flex-col">
            {/* Decorative Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-20 right-10 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
              <div className="absolute top-40 -left-4 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
              <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex-1 flex flex-col justify-center items-center px-6 py-20">
              <div className="max-w-4xl mx-auto w-full space-y-8">
                
                {/* Hero Badge */}
                <div className="flex justify-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100/60 backdrop-blur border border-indigo-200/80">
                    <span className="text-sm font-medium text-indigo-900">✨ AI-Powered Research</span>
                  </div>
                </div>

                {/* Main Heading */}
                <div className="text-center space-y-4">
                  <h1 className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-indigo-900 to-indigo-600 leading-tight">
                    Research<br />Intelligence
                  </h1>
                  <p className="text-xl md:text-2xl text-slate-600 font-medium">
                    Orchestrated by AI agents
                  </p>
                  <p className="text-base md:text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
                    Ask any research question. Parallel agents simultaneously search arXiv, Semantic Scholar, and OpenAlex — then intelligently synthesize findings into actionable insights.
                  </p>
                </div>

                {/* Search Card - Enhanced */}
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/50 p-8 space-y-6">
                  {/* Search Input */}
                  <div className="relative">
                    <textarea
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          handleSearch()
                        }
                      }}
                      placeholder="e.g., Survey of transformer attention mechanisms in 2023-2024"
                      className="w-full px-6 py-4 border-2 border-slate-200 rounded-xl text-base resize-none focus:ring-0 focus:border-indigo-500 focus:outline-none shadow-sm bg-white transition-all duration-200 font-medium"
                      rows={3}
                    />
                    <div className="absolute right-4 top-4 text-2xl">🔍</div>
                  </div>

                  {/* Quick Examples */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Quick Examples</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {EXAMPLE_QUERIES.map((example) => (
                        <button
                          key={example}
                          onClick={() => handleChipClick(example)}
                          className="group relative overflow-hidden px-4 py-3 rounded-lg border-2 border-slate-200 bg-slate-50/50 hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-300 text-left"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/0 to-indigo-400/0 group-hover:from-indigo-400/10 group-hover:to-indigo-400/0 transition-all"></div>
                          <p className="text-sm font-medium text-slate-900 relative">{example}</p>
                          <p className="text-xs text-slate-500 mt-1 relative">Click to fill</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Search Button */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleSearch}
                      disabled={!query.trim()}
                      className="flex-1 px-8 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-indigo-500/30 disabled:shadow-none flex items-center justify-center gap-2"
                    >
                      <span>🚀 Research Now</span>
                      <span className="text-xl">→</span>
                    </button>
                  </div>

                  {/* Keyboard Shortcut Hint */}
                  <p className="text-xs text-slate-400 text-center">
                    Tip: Press <kbd className="px-2 py-1 bg-slate-100 rounded border border-slate-300">Ctrl+Enter</kbd> to search
                  </p>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-3 gap-4 mt-12">
                  <div className="group p-6 rounded-xl bg-white/60 backdrop-blur border border-slate-200/50 hover:border-indigo-300/50 hover:bg-white/80 transition-all hover:shadow-xl">
                    <div className="text-3xl mb-2">🔍</div>
                    <h3 className="font-bold text-slate-900 mb-1">Multi-Source</h3>
                    <p className="text-xs text-slate-600">Search across arXiv, Semantic Scholar & OpenAlex</p>
                  </div>
                  <div className="group p-6 rounded-xl bg-white/60 backdrop-blur border border-slate-200/50 hover:border-indigo-300/50 hover:bg-white/80 transition-all hover:shadow-xl">
                    <div className="text-3xl mb-2">⚡</div>
                    <h3 className="font-bold text-slate-900 mb-1">Parallel Agents</h3>
                    <p className="text-xs text-slate-600">Specialized AI agents run simultaneously</p>
                  </div>
                  <div className="group p-6 rounded-xl bg-white/60 backdrop-blur border border-slate-200/50 hover:border-indigo-300/50 hover:bg-white/80 transition-all hover:shadow-xl">
                    <div className="text-3xl mb-2">🧠</div>
                    <h3 className="font-bold text-slate-900 mb-1">Synthesized</h3>
                    <p className="text-xs text-slate-600">Intelligent synthesis of key findings</p>
                  </div>
                </div>

                {/* Footer Info */}
                <div className="text-center pt-8 border-t border-slate-200/50">
                  <p className="text-xs text-slate-400">
                    Powered by <span className="font-semibold text-slate-600">Claude Haiku</span> • <span className="font-semibold text-slate-600">arXiv</span> • <span className="font-semibold text-slate-600">Semantic Scholar</span> • <span className="font-semibold text-slate-600">OpenAlex</span>
                  </p>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Single Paper Synthesis Modal */}
        {showSinglePaperModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Paper Synthesis</h2>
                <button
                  onClick={() => {
                    setShowSinglePaperModal(false)
                    setSinglePaperSynthesis(null)
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
              <SynthesisPanel synthesis={singlePaperSynthesis} selectedPapers={[]} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default Home
