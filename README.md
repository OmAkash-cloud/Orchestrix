# Orchestrix — Multi-Agent Research Intelligence Platform

## What it does

Orchestrix solves the problem of research information overload by automatically discovering, analyzing, and synthesizing academic papers across multiple sources. A multi-agent system coordinates specialized AI agents (discovery, analysis, citation, synthesis) to extract insights from research, with an LLM-powered orchestrator that plans and executes the analysis pipeline. The platform identifies research gaps, detects conflicting findings, and generates comprehensive cross-paper syntheses to accelerate research workflows.

## Architecture

The platform employs six specialized agents orchestrated by an LLM-powered planner:

- **Discovery Agent**: Searches arXiv, Semantic Scholar, and OpenAlex asynchronously to gather relevant papers
- **Analysis Agent**: Extracts trends, author networks, keyword frequencies, citation metrics, and emerging/declining topics
- **Citation Agent**: Formats citations in APA, MLA, IEEE, and Chicago styles; exports to BibTeX and plain text
- **Synthesis Agent**: Generates single-paper TL;DRs and cross-paper synthesis with methodology comparison and consensus gaps
- **Planner Agent**: Uses Claude to reason about research intent and generate execution DAGs with dependency resolution
- **Executor Agent**: Runs the execution plan, detects agent conflicts, and persists results to SQLite

## Quick Start (under 10 minutes)

### Prerequisites

- Python 3.11+
- Node.js 18+
- API Keys: Anthropic (required), Semantic Scholar (free, optional but improves results)

### Setup

```bash
git clone https://github.com/yourusername/orchestrix.git
cd orchestrix

# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
uvicorn main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Visit http://localhost:5173

### Environment Variables

| Variable                 | Required | Description                                                                         |
| ------------------------ | -------- | ----------------------------------------------------------------------------------- |
| ANTHROPIC_API_KEY        | Yes      | From [console.anthropic.com](https://console.anthropic.com)                         |
| SEMANTIC_SCHOLAR_API_KEY | No       | From [semanticscholar.org/product/api](https://www.semanticscholar.org/product/api) |

## Agent Architecture

| Agent     | Responsibility                                | External APIs                     | Output                                                                  |
| --------- | --------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------- |
| Discovery | Paper search and metadata collection          | arXiv, Semantic Scholar, OpenAlex | List[Paper] with authors, dates, citations                              |
| Analysis  | Trend extraction and metadata analysis        | None                              | AnalysisData with trends, authors, keywords, citations, emerging topics |
| Citation  | Citation style formatting and export          | None                              | Formatted citations (APA/MLA/IEEE/Chicago), BibTeX, plain text          |
| Synthesis | Single & cross-paper summarization            | Claude API                        | SynthesisResult with summaries, methodologies, consensus, gaps          |
| Planner   | Execution DAG generation and routing          | Claude API                        | ExecutionPlan with task dependencies and parameters                     |
| Executor  | Pipeline orchestration and conflict detection | All above agents                  | PipelineResult with results, trace logs, conflicts                      |

## Novelty Features

- **LLM-powered orchestration planner** with reasoning-visible execution trace logging all agent decisions
- **Research Gap Radar visualization** identifies underexplored keywords and emerging trends as research opportunities
- **Agent Conflict Resolution detector** identifies contradictions and inconsistencies in cross-paper synthesis
- **Cross-paper synthesis with gap identification** highlights consensus, contradictions, and open research questions

## API Endpoints

### Research Operations

- `POST /api/research/query` — Run full research pipeline (query string, returns papers, analysis, trace logs)
- `GET /api/research/sessions/{session_id}/papers` — Retrieve papers from a session
- `GET /api/research/sessions/{session_id}/trace` — Stream live execution trace logs

### Session Management

- `GET /api/sessions` — List all research sessions
- `POST /api/sessions` — Create new session
- `GET /api/sessions/{session_id}` — Get session details (papers, analysis, synthesis)
- `PATCH /api/sessions/{session_id}` — Update session (name, notes)
- `DELETE /api/sessions/{session_id}` — Delete session

### Export & Download

- `POST /api/export/citations/txt` — Export citations as plain text
- `POST /api/export/citations/bib` — Export citations as BibTeX

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy 2.0, SQLite, httpx, Anthropic SDK (Claude Haiku 4.5)
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Recharts
- **AI**: Claude Haiku 4.5 for orchestration, summarization, synthesis, and conflict detection
- **Deployment**: CORS-enabled for localhost:5173 and localhost:3000

- `ResearchSession`: Manages research sessions
- `Paper`: Stores paper metadata and references
- `Analysis`: Stores AI analysis results
- `ResearchPlan`: Stores task plans
- `Citation`: Manages citations
- `SynthesisReport`: Stores generated reports

## Contributing

1. Create a feature branch
2. Make your changes
3. Ensure code is properly formatted
4. Submit a pull request

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
