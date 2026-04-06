"""Export router for exporting research results."""

import json
import tempfile
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from models.database import get_db, Paper, Session as DBSession
from agents.citation import CitationAgent

router = APIRouter(prefix="/api/export", tags=["export"])


class ExportCitationsRequest(BaseModel):
    """Request model for exporting citations."""
    session_id: int
    style: str  # "apa", "mla", "ieee", "chicago"
    paper_ids: Optional[List[int]] = None


@router.post("/citations/txt")
async def export_citations_txt(
    request: ExportCitationsRequest,
    db: Session = Depends(get_db)
):
    """Export citations as a text file."""
    try:
        # Validate session exists
        session = db.query(DBSession).filter(DBSession.id == request.session_id).first()
        if not session:
            return {"error": "Session not found"}
        
        # Get papers
        if request.paper_ids:
            papers = db.query(Paper).filter(
                Paper.session_id == request.session_id,
                Paper.id.in_(request.paper_ids)
            ).all()
        else:
            papers = db.query(Paper).filter(Paper.session_id == request.session_id).all()
        
        if not papers:
            return {"error": "No papers to export"}
        
        # Validate style
        if request.style.lower() not in ["apa", "mla", "ieee", "chicago"]:
            return {"error": "Invalid citation style"}
        
        # Convert ORM objects to dicts for citation agent
        citation_agent = CitationAgent()
        
        # Build paper dicts for citation agent
        paper_dicts = []
        for p in papers:
            authors = []
            if p.authors:
                try:
                    authors = json.loads(p.authors)
                except:
                    authors = []
            
            paper_dicts.append({
                "title": p.title or "Untitled",
                "authors": authors,
                "year": p.year,
                "abstract": p.abstract,
                "url": p.url,
                "doi": p.doi,
                "source": p.source,
                "citation_count": p.citation_count or 0
            })
        
        # Generate citations
        result = await citation_agent.run(paper_dicts, request.style.lower())
        
        # Build text content
        content = result.get("bulk_txt", "")
        
        # Write to temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        
        filename = f"citations_{request.style.lower()}.txt"
        
        return FileResponse(
            tmp_path,
            media_type="text/plain",
            filename=filename,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[export] Error in export_citations_txt: {str(e)}")
        return {"error": str(e)}


@router.post("/citations/bib")
async def export_citations_bib(
    request: ExportCitationsRequest,
    db: Session = Depends(get_db)
):
    """Export citations as a BibTeX file."""
    try:
        # Validate session exists
        session = db.query(DBSession).filter(DBSession.id == request.session_id).first()
        if not session:
            return {"error": "Session not found"}
        
        # Get papers
        if request.paper_ids:
            papers = db.query(Paper).filter(
                Paper.session_id == request.session_id,
                Paper.id.in_(request.paper_ids)
            ).all()
        else:
            papers = db.query(Paper).filter(Paper.session_id == request.session_id).all()
        
        if not papers:
            return {"error": "No papers to export"}
        
        # Convert ORM objects to dicts for citation agent
        citation_agent = CitationAgent()
        
        # Build paper dicts for citation agent
        paper_dicts = []
        for p in papers:
            authors = []
            if p.authors:
                try:
                    authors = json.loads(p.authors)
                except:
                    authors = []
            
            paper_dicts.append({
                "title": p.title or "Untitled",
                "authors": authors,
                "year": p.year,
                "abstract": p.abstract,
                "url": p.url,
                "doi": p.doi,
                "source": p.source,
                "citation_count": p.citation_count or 0
            })
        
        # Generate citations (BibTeX doesn't depend on style)
        result = await citation_agent.run(paper_dicts, "apa")
        
        # Build BibTeX content
        content = result.get("bulk_bib", "")
        
        # Write to temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.bib', delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        
        filename = "references.bib"
        
        return FileResponse(
            tmp_path,
            media_type="application/x-bibtex",
            filename=filename,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[export] Error in export_citations_bib: {str(e)}")
        return {"error": str(e)}

