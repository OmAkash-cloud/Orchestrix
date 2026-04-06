"""Sessions router for managing research sessions."""

import json
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from models.database import get_db, Session, Paper, AnalysisResult, Summary

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


class SessionListItem(BaseModel):
    """Session item for list response."""
    id: int
    name: str
    query: str
    created_at: str
    paper_count: int


class SessionUpdateRequest(BaseModel):
    """Request model for updating session notes."""
    notes: str


@router.get("")
async def list_sessions(db: Session = Depends(get_db)):
    """List all research sessions."""
    try:
        sessions = db.query(Session).all()
        
        return {
            "sessions": [
                {
                    "id": s.id,
                    "name": s.name,
                    "query": s.query,
                    "created_at": s.created_at.isoformat() if s.created_at else None,
                    "paper_count": db.query(func.count(Paper.id)).filter(Paper.session_id == s.id).scalar()
                }
                for s in sessions
            ],
            "total": len(sessions)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{session_id}")
async def get_session_details(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get session details with papers, analysis, and summaries."""
    try:
        session = db.query(Session).filter(Session.id == session_id).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        papers = db.query(Paper).filter(Paper.session_id == session_id).all()
        analysis_results = db.query(AnalysisResult).filter(AnalysisResult.session_id == session_id).all()
        summaries = db.query(Summary).filter(Summary.session_id == session_id).all()
        
        return {
            "id": session.id,
            "name": session.name,
            "query": session.query,
            "notes": session.notes,
            "created_at": session.created_at.isoformat() if session.created_at else None,
            "papers": [
                {
                    "id": p.id,
                    "title": p.title,
                    "authors": json.loads(p.authors) if p.authors else [],
                    "year": p.year,
                    "abstract": p.abstract,
                    "source": p.source,
                    "url": p.url,
                    "doi": p.doi,
                    "citation_count": p.citation_count,
                    "relevance_score": p.relevance_score
                }
                for p in papers
            ],
            "analysis": [
                {
                    "analysis_type": a.analysis_type,
                    "data": json.loads(a.data) if a.data else None
                }
                for a in analysis_results
            ],
            "summaries": [
                {
                    "summary_type": s.summary_type,
                    "content": json.loads(s.content) if s.content else None
                }
                for s in summaries
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{session_id}/notes")
async def update_session_notes(
    session_id: int,
    request: SessionUpdateRequest,
    db: Session = Depends(get_db)
):
    """Update session notes."""
    try:
        session = db.query(Session).filter(Session.id == session_id).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session.notes = request.notes
        db.commit()
        
        return {"status": "success", "notes": session.notes}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{session_id}")
async def delete_session(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Delete a session and all related data."""
    try:
        session = db.query(Session).filter(Session.id == session_id).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Delete all related records (cascade handles this, but explicit cleanup)
        db.query(Paper).filter(Paper.session_id == session_id).delete()
        db.query(AnalysisResult).filter(AnalysisResult.session_id == session_id).delete()
        db.query(Summary).filter(Summary.session_id == session_id).delete()
        db.query(Session).filter(Session.id == session_id).delete()
        
        db.commit()
        
        return {"status": "success", "message": f"Session {session_id} deleted"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/compare")
async def compare_sessions(
    ids: str = Query(..., description="Comma-separated session IDs"),
    db: Session = Depends(get_db)
):
    """Compare two sessions side by side."""
    try:
        session_ids = [int(id.strip()) for id in ids.split(",")]
        
        if len(session_ids) != 2:
            raise HTTPException(status_code=400, detail="Provide exactly 2 session IDs")
        
        session_a = db.query(Session).filter(Session.id == session_ids[0]).first()
        session_b = db.query(Session).filter(Session.id == session_ids[1]).first()
        
        if not session_a or not session_b:
            raise HTTPException(status_code=404, detail="One or both sessions not found")
        
        papers_a = db.query(Paper).filter(Paper.session_id == session_ids[0]).all()
        papers_b = db.query(Paper).filter(Paper.session_id == session_ids[1]).all()
        
        # Get DOIs for comparison
        dois_a = {p.doi for p in papers_a if p.doi}
        dois_b = {p.doi for p in papers_b if p.doi}
        
        shared_dois = dois_a & dois_b
        only_a = dois_a - dois_b
        only_b = dois_b - dois_a
        
        shared_papers = [p for p in papers_a if p.doi in shared_dois]
        new_papers = [p for p in papers_b if p.doi in only_b]
        a_only_papers = [p for p in papers_a if p.doi in only_a]
        b_only_papers = [p for p in papers_b if p.doi in only_b]
        
        def format_paper(p):
            return {
                "id": p.id,
                "title": p.title,
                "authors": json.loads(p.authors) if p.authors else [],
                "year": p.year,
                "source": p.source
            }
        
        return {
            "session_a": {
                "id": session_a.id,
                "name": session_a.name,
                "query": session_a.query
            },
            "session_b": {
                "id": session_b.id,
                "name": session_b.name,
                "query": session_b.query
            },
            "diff": {
                "shared_papers": [format_paper(p) for p in shared_papers],
                "new_papers": [format_paper(p) for p in new_papers],
                "only_in_a": [format_paper(p) for p in a_only_papers],
                "only_in_b": [format_paper(p) for p in b_only_papers]
            }
        }
    except HTTPException:
        raise
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session IDs")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
