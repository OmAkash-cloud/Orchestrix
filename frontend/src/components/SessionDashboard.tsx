import React from 'react'

interface Session {
  id: string
  topic: string
  status: string
  created_at: string
  paper_count?: number
}

interface SessionDashboardProps {
  sessions: Session[]
  onSelectSession?: (session: Session) => void
  onDeleteSession?: (sessionId: string) => void
  onCreateSession?: (topic: string) => void
  isLoading?: boolean
}

export const SessionDashboard: React.FC<SessionDashboardProps> = ({
  sessions = [],
  onSelectSession,
  onDeleteSession,
  onCreateSession,
  isLoading = false,
}) => {
  const [newTopic, setNewTopic] = React.useState('')

  const handleCreateSession = () => {
    if (newTopic.trim()) {
      onCreateSession?.(newTopic)
      setNewTopic('')
    }
  }

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
      <h2 className="text-xl font-semibold text-white mb-4">Research Sessions</h2>

      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Enter research topic..."
          value={newTopic}
          onChange={(e) => setNewTopic(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleCreateSession()}
          className="flex-1 bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 placeholder-gray-400"
        />
        <button
          onClick={handleCreateSession}
          disabled={!newTopic.trim() || isLoading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded"
        >
          Create Session
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No sessions yet. Create one to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="bg-slate-700 rounded p-3 hover:bg-slate-600 cursor-pointer transition-colors"
              onClick={() => onSelectSession?.(session)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-white">{session.topic}</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(session.created_at).toLocaleDateString()}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs bg-green-900 text-green-200 px-2 py-1 rounded">
                      {session.status}
                    </span>
                    {session.paper_count !== undefined && (
                      <span className="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded">
                        {session.paper_count} papers
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteSession?.(session.id)
                  }}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default SessionDashboard
