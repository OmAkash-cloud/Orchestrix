"""Database models and session management using SQLAlchemy 2.0."""

from sqlalchemy import create_engine, Column, String, Integer, DateTime, Text, Float, ForeignKey, JSON
from sqlalchemy.orm import DeclarativeBase, sessionmaker, relationship
from datetime import datetime
import os

# Database URL - SQLite for development
DATABASE_URL = "sqlite:///./orchestrix.db"

# Create engine with SQLite-specific configuration
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# SQLAlchemy 2.0 declarative base
class Base(DeclarativeBase):
    pass


class Session(Base):
    """Model for research sessions."""
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    name = Column(String(200), nullable=False)
    query = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    notes = Column(Text, nullable=True)

    # Relationships
    papers = relationship("Paper", back_populates="session", cascade="all, delete-orphan")
    analysis_results = relationship("AnalysisResult", back_populates="session", cascade="all, delete-orphan")
    summaries = relationship("Summary", back_populates="session", cascade="all, delete-orphan")
    trace_logs = relationship("TraceLog", back_populates="session", cascade="all, delete-orphan")


class Paper(Base):
    """Model for research papers."""
    __tablename__ = "papers"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    title = Column(String(500), nullable=False)
    authors = Column(JSON, nullable=True)
    year = Column(Integer, nullable=True)
    abstract = Column(Text, nullable=True)
    url = Column(String(500), nullable=True)
    doi = Column(String(200), nullable=True, unique=True, index=True)
    citation_count = Column(Integer, default=0)
    source = Column(String(50), nullable=True)
    relevance_score = Column(Float, default=0.0)

    # Relationships
    session = relationship("Session", back_populates="papers")
    summaries = relationship("Summary", back_populates="paper", cascade="all, delete-orphan")


class AnalysisResult(Base):
    """Model for analysis results."""
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    analysis_type = Column(String(100), nullable=False)
    data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    session = relationship("Session", back_populates="analysis_results")


class Summary(Base):
    """Model for summaries (single paper or cross-session)."""
    __tablename__ = "summaries"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    paper_id = Column(Integer, ForeignKey("papers.id"), nullable=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=True)
    summary_type = Column(String(50), nullable=False)
    content = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    paper = relationship("Paper", back_populates="summaries")
    session = relationship("Session", back_populates="summaries")


class TraceLog(Base):
    """Model for trace logs of agent execution."""
    __tablename__ = "trace_logs"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    step_number = Column(Integer, nullable=False)
    agent_name = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False)
    input_summary = Column(Text, nullable=True)
    output_summary = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)

    # Relationships
    session = relationship("Session", back_populates="trace_logs")


def get_db():
    """Dependency for getting database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_all_tables(engine):
    """Create all tables in the database using SQLAlchemy 2.0 style."""
    Base.metadata.create_all(bind=engine)
