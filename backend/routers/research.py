"""Research router for research discovery and analysis endpoints."""

import json
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from models.database import get_db, Paper, TraceLog
from orchestrator.executor import OrchestratorExecutor

router = APIRouter(prefix="/api/research", tags=["research"])


class ResearchQueryRequest(BaseModel):
    """Request model for research queries."""
    query: str
    max_results: int = 20


class PaperResponse(BaseModel):
    """Response model for papers."""
    id: int
    title: str
    authors: List[str]
    url: str
    abstract: Optional[str] = None
    source: str
    year: Optional[int] = None
    citation_count: int
    relevance_score: float


@router.post("/query")
async def execute_research_query(
    request: ResearchQueryRequest,
    db: Session = Depends(get_db)
):
    """Execute a research query using the orchestrator."""
    try:
        executor = OrchestratorExecutor()
        result = await executor.execute(request.query, db)
        
        # Add paper_count to response
        return {
            **result.dict(),
            "paper_count": len(result.papers)
        }
    except Exception as e:
        import traceback
        print(f"❌ ERROR in /api/research/query: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{session_id}/papers")
async def get_session_papers(
    session_id: int,
    sort_by: str = Query("relevance", regex="^(relevance|year|citations)$"),
    db: Session = Depends(get_db)
):
    """Get all papers for a session with optional sorting."""
    try:
        papers = db.query(Paper).filter(Paper.session_id == session_id).all()
        
        if not papers:
            raise HTTPException(status_code=404, detail="Session not found or no papers")
        
        # Sort papers
        if sort_by == "relevance":
            papers = sorted(papers, key=lambda p: p.relevance_score, reverse=True)
        elif sort_by == "year":
            papers = sorted(papers, key=lambda p: p.year or 0, reverse=True)
        elif sort_by == "citations":
            papers = sorted(papers, key=lambda p: p.citation_count, reverse=True)
        
        return {
            "session_id": session_id,
            "sort_by": sort_by,
            "papers": [
                {
                    "id": p.id,
                    "title": p.title,
                    "authors": json.loads(p.authors) if p.authors else [],
                    "url": p.url,
                    "abstract": p.abstract,
                    "source": p.source,
                    "year": p.year,
                    "citation_count": p.citation_count,
                    "relevance_score": p.relevance_score
                }
                for p in papers
            ],
            "total": len(papers)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{session_id}/trace")
async def get_session_trace(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get execution trace for a session."""
    try:
        trace_logs = db.query(TraceLog).filter(
            TraceLog.session_id == session_id
        ).order_by(TraceLog.step_number).all()
        
        if not trace_logs:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return {
            "session_id": session_id,
            "trace": [
                {
                    "step_number": t.step_number,
                    "agent_name": t.agent_name,
                    "status": t.status,
                    "input_summary": t.input_summary,
                    "output_summary": t.output_summary,
                    "started_at": t.started_at.isoformat() if t.started_at else None,
                    "finished_at": t.finished_at.isoformat() if t.finished_at else None
                }
                for t in trace_logs
            ],
            "total_steps": len(trace_logs)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
