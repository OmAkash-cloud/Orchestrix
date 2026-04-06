import React, { useState, useEffect } from 'react'
import {
  getSessions,
  Session,
  Paper,
  updateNotes,
  deleteSession,
  compareSessions,
  getSession,
} from '../api/client'

interface ComparisonData {
  shared_papers: Paper[]
  only_in_a: Paper[]
  only_in_b: Paper[]
}

export const Dashboard: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [compareModeOn, setCompareMode] = useState(false)
  const [selectedSessions, setSelectedSessions] = useState<[number | null, number | null]>([
    null,
    null,
  ])
  const [editingNotes, setEditingNotes] = useState<number | null>(null)
  const [deletingConfirm, setDeletingConfirm] = useState<number | null>(null)
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null)
  const [sessionPaperCounts, setSessionPaperCounts] = useState<Record<number, number>>({})

  // Fetch sessions on mount
  useEffect(() => {
    loadSessions()
  }, [])

  // Fetch paper counts for each session
  useEffect(() => {
    const fetchPaperCounts = async () => {
      const counts: Record<number, number> = {}
      for (const session of sessions) {
        try {
          const data = await getSession(session.id)
          counts[session.id] = data.papers?.length || 0
        } catch (error) {
          console.error(`Failed to fetch papers for session ${session.id}:`, error)
        }
      }
      setSessionPaperCounts(counts)
    }

    if (sessions.length > 0) {
      fetchPaperCounts()
    }
  }, [sessions])

  const loadSessions = async () => {
    setIsLoading(true)
    try {
      const data = await getSessions()
      setSessions(data)
    } catch (error) {
      console.error('Failed to load sessions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateNotes = async (sessionId: number, notes: string) => {
    try {
      await updateNotes(sessionId, notes)
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, notes } : s))
      )
      setEditingNotes(null)
    } catch (error) {
      console.error('Failed to update notes:', error)
    }
  }

  const handleDeleteSession = async (sessionId: number) => {
    try {
      await deleteSession(sessionId)
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      setDeletingConfirm(null)
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
  }

  const handleCompareSessionClick = (sessionId: number) => {
    setSelectedSessions((prev) => {
      if (prev[0] === null) return [sessionId, prev[1]]
      if (prev[1] === null && prev[0] !== sessionId) return [prev[0], sessionId]
      if (prev[0] === sessionId) return [null, prev[1]]
      if (prev[1] === sessionId) return [prev[0], null]
      return [sessionId, prev[1]]
    })
  }

  const handlePerformComparison = async () => {
    if (selectedSessions[0] === null || selectedSessions[1] === null) return

    try {
      const result = await compareSessions(selectedSessions[0], selectedSessions[1])
      setComparisonData(result as ComparisonData)
    } catch (error) {
      console.error('Failed to compare sessions:', error)
    }
  }

  // Perform comparison when both sessions selected
  useEffect(() => {
    if (selectedSessions[0] !== null && selectedSessions[1] !== null) {
      handlePerformComparison()
    }
  }, [selectedSessions])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const truncateTitle = (title: string, maxLength: number = 60) => {
    return title.length > maxLength ? title.substring(0, maxLength) + '...' : title
  }

  // Comparison View
  if (compareModeOn && selectedSessions[0] !== null && selectedSessions[1] !== null && comparisonData) {
    const sessionA = sessions.find((s) => s.id === selectedSessions[0])
    const sessionB = sessions.find((s) => s.id === selectedSessions[1])

    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Knowledge Dashboard</h1>
            <button
              onClick={() => {
                setCompareMode(false)
                setSelectedSessions([null, null])
                setComparisonData(null)
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded transition-colors"
            >
              ← Back to Sessions
            </button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Session Comparison</h2>

          <div className="grid grid-cols-2 gap-6 mb-8">
            {/* Session A */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-2">{sessionA?.name}</h3>
              <p className="text-sm text-gray-600 italic mb-3">{sessionA?.query}</p>
              <p className="text-xs text-gray-500">
                {sessionPaperCounts[sessionA?.id || 0] || 0} papers ·{' '}
                {sessionA?.created_at && formatDate(sessionA.created_at)}
              </p>
            </div>

            {/* Session B */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-2">{sessionB?.name}</h3>
              <p className="text-sm text-gray-600 italic mb-3">{sessionB?.query}</p>
              <p className="text-xs text-gray-500">
                {sessionPaperCounts[sessionB?.id || 0] || 0} papers ·{' '}
                {sessionB?.created_at && formatDate(sessionB.created_at)}
              </p>
            </div>
          </div>

          {/* Diff Summary */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-8">
            <p className="text-indigo-900 font-semibold">
              {sessionB?.name} has{' '}
              <span className="text-lg font-bold">{comparisonData.only_in_b.length}</span> new
              papers compared to {sessionA?.name}
            </p>
          </div>

          {/* Shared Papers */}
          {comparisonData.shared_papers && comparisonData.shared_papers.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Shared Papers ({comparisonData.shared_papers.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {comparisonData.shared_papers.map((paper, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-start text-sm py-2 border-b border-gray-100 last:border-b-0"
                  >
                    <span className="text-gray-700 flex-1">{truncateTitle(paper.title)}</span>
                    <span className="text-gray-500 flex-shrink-0 ml-2">
                      {paper.year} · {paper.citation_count} citations
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Only in A */}
          {comparisonData.only_in_a && comparisonData.only_in_a.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Only in {sessionA?.name} ({comparisonData.only_in_a.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {comparisonData.only_in_a.map((paper, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-start text-sm py-2 border-b border-gray-100 last:border-b-0"
                  >
                    <span className="text-gray-700 flex-1">{truncateTitle(paper.title)}</span>
                    <span className="text-gray-500 flex-shrink-0 ml-2">
                      {paper.year} · {paper.citation_count} citations
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Only in B */}
          {comparisonData.only_in_b && comparisonData.only_in_b.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Only in {sessionB?.name} ({comparisonData.only_in_b.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {comparisonData.only_in_b.map((paper, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-start text-sm py-2 border-b border-gray-100 last:border-b-0"
                  >
                    <span className="text-gray-700 flex-1">{truncateTitle(paper.title)}</span>
                    <span className="text-gray-500 flex-shrink-0 ml-2">
                      {paper.year} · {paper.citation_count} citations
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    )
  }

  // Main Dashboard View
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Dashboard</h1>
          <button
            onClick={() => setCompareMode(!compareModeOn)}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              compareModeOn
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {compareModeOn ? 'Compare Mode On' : 'Compare Mode'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
              <p className="text-gray-600">Loading sessions...</p>
            </div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-lg text-gray-600 mb-2">No sessions yet</p>
            <p className="text-sm text-gray-500">Start a research query on the home page to create a session</p>
          </div>
        ) : (
          <>
            {compareModeOn && selectedSessions[0] !== null && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-indigo-900">
                  <strong>Compare Mode:</strong> Select a second session to compare
                  {selectedSessions[1] !== null && (
                    <button
                      onClick={handlePerformComparison}
                      className="ml-4 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded"
                    >
                      View Comparison
                    </button>
                  )}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {sessions.map((session) => {
                const isSelected =
                  selectedSessions[0] === session.id || selectedSessions[1] === session.id
                const isSelectionA = selectedSessions[0] === session.id
                const isSelectionB = selectedSessions[1] === session.id

                return (
                  <div
                    key={session.id}
                    className={`bg-white rounded-lg border-2 transition-all ${
                      isSelected
                        ? isSelectionA
                          ? 'border-blue-500 shadow-md'
                          : 'border-purple-500 shadow-md'
                        : 'border-gray-200 hover:border-gray-300'
                    } p-6`}
                  >
                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="mb-3">
                        <span
                          className={`inline-block px-2 py-1 text-xs font-semibold rounded text-white ${
                            isSelectionA ? 'bg-blue-500' : 'bg-purple-500'
                          }`}
                        >
                          {isSelectionA ? 'Session A' : 'Session B'}
                        </span>
                      </div>
                    )}

                    {/* Session Name (Editable) */}
                    <div className="mb-3">
                      <input
                        type="text"
                        value={session.name}
                        onChange={(e) => {
                          setSessions((prev) =>
                            prev.map((s) =>
                              s.id === session.id ? { ...s, name: e.target.value } : s
                            )
                          )
                        }}
                        className="w-full text-lg font-semibold text-gray-900 bg-transparent border-b-2 border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    {/* Query */}
                    <p className="text-sm text-gray-600 italic mb-3 line-clamp-2">{session.query}</p>

                    {/* Metadata */}
                    <p className="text-xs text-gray-500 mb-4">
                      {sessionPaperCounts[session.id] || 0} papers ·{' '}
                      {formatDate(session.created_at)}
                    </p>

                    {/* Notes Section */}
                    {editingNotes === session.id ? (
                      <div className="mb-4">
                        <textarea
                          value={session.notes || ''}
                          onChange={(e) => {
                            setSessions((prev) =>
                              prev.map((s) =>
                                s.id === session.id ? { ...s, notes: e.target.value } : s
                              )
                            )
                          }}
                          onBlur={() => {
                            handleUpdateNotes(session.id, session.notes || '')
                          }}
                          placeholder="Add notes..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                          rows={3}
                          autoFocus
                        />
                      </div>
                    ) : session.notes ? (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-200">
                        {session.notes}
                      </div>
                    ) : null}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`/`}
                        className="px-3 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-sm font-medium rounded transition-colors"
                      >
                        Open
                      </a>
                      <button
                        onClick={() => setEditingNotes(editingNotes === session.id ? null : session.id)}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded transition-colors"
                      >
                        {editingNotes === session.id ? 'Done' : 'Edit Notes'}
                      </button>
                      {compareModeOn && (
                        <button
                          onClick={() => handleCompareSessionClick(session.id)}
                          className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                            isSelected
                              ? 'bg-red-100 hover:bg-red-200 text-red-700'
                              : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                          }`}
                        >
                          {isSelected ? 'Unselect' : 'Compare'}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (deletingConfirm === session.id) {
                            handleDeleteSession(session.id)
                          } else {
                            setDeletingConfirm(session.id)
                          }
                        }}
                        className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                          deletingConfirm === session.id
                            ? 'bg-red-500 hover:bg-red-600 text-white'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        {deletingConfirm === session.id ? 'Confirm Delete' : 'Delete'}
                      </button>
                      {deletingConfirm === session.id && (
                        <button
                          onClick={() => setDeletingConfirm(null)}
                          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default Dashboard
