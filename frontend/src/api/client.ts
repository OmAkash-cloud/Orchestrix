import axios, { AxiosInstance } from 'axios'

// TypeScript Interfaces

export interface Paper {
  id?: number
  title: string
  authors: string[]
  year: number
  abstract: string
  url: string
  doi?: string
  citation_count: number
  source: string
  relevance_score: number
}

export interface TraceStep {
  step_number: number
  agent_name: string
  status: 'pending' | 'running' | 'done' | 'failed' | 'skipped'
  input_summary: string
  output_summary: string
  started_at?: string
  finished_at?: string
  started_at_ms?: number
  finished_at_ms?: number
}

export interface AnalysisData {
  trend: { labels: string[]; values: number[]; type: string }
  authors: { authors: string[]; counts: number[]; type: string }
  keywords: { words: string[]; counts: number[]; type: string }
  citations: { labels: string[]; values: number[]; type: string }
  emerging: { emerging: string[]; declining: string[]; type: string }
}

export interface ResearchResult {
  session_id: number
  plan: object
  papers: Paper[]
  analysis: AnalysisData | null
  citations: object | null
  synthesis: object | null
  conflict: object | null
  trace: TraceStep[]
  status: string
  paper_count: number
  total_duration_ms: number
}

export interface Session {
  id: number
  name: string
  query: string
  created_at: string
  notes?: string
}

// API Client Setup

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const client: AxiosInstance = axios.create({
  baseURL: apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
})

// API Functions

/**
 * Execute a research query using the orchestrator
 */
export async function runQuery(query: string, maxResults?: number): Promise<ResearchResult> {
  try {
    const response = await client.post<ResearchResult>('/api/research/query', {
      query,
      max_results: maxResults || 20,
    })
    
    // Log raw response
    console.log('API response:', response.data)
    
    // Check for empty response
    if (!response.data) {
      throw new Error('Empty response from API')
    }
    
    return response.data
  } catch (error: any) {
    console.error('runQuery error:', error)
    throw error
  }
}

/**
 * Get all research sessions
 */
export async function getSessions(): Promise<Session[]> {
  const response = await client.get<{ sessions: Session[] }>('/api/sessions')
  return response.data.sessions
}

/**
 * Get a specific session with its papers
 */
export async function getSession(id: number): Promise<Session & { papers: Paper[] }> {
  const response = await client.get<Session & { papers: Paper[] }>(`/api/sessions/${id}`)
  return response.data
}

/**
 * Update session notes
 */
export async function updateNotes(id: number, notes: string): Promise<void> {
  await client.put(`/api/sessions/${id}/notes`, { notes })
}

/**
 * Delete a session
 */
export async function deleteSession(id: number): Promise<void> {
  await client.delete(`/api/sessions/${id}`)
}

/**
 * Compare two sessions
 */
export async function compareSessions(idA: number, idB: number): Promise<object> {
  const response = await client.get(`/api/sessions/compare`, {
    params: { ids: `${idA},${idB}` },
  })
  return response.data
}

/**
 * Download citations as text file
 */
export async function downloadCitationsTxt(
  sessionId: number,
  style: string
): Promise<Blob> {
  const response = await client.post(
    '/api/export/citations/txt',
    {
      session_id: sessionId,
      style,
    },
    {
      responseType: 'blob',
    }
  )
  return response.data
}

/**
 * Download citations as BibTeX file
 */
export async function downloadCitationsBib(sessionId: number): Promise<Blob> {
  const response = await client.post(
    '/api/export/citations/bib',
    {
      session_id: sessionId,
      style: 'apa', // style is ignored for BibTeX but required
    },
    {
      responseType: 'blob',
    }
  )
  return response.data
}

export default client
