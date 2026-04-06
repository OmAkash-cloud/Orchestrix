"""Main FastAPI application entry point."""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
print(f"--- Loaded ANTHROPIC_API_KEY: {os.getenv('ANTHROPIC_API_KEY')} ---")

# Import routers and database
from routers import research, sessions, export
from models.database import engine, create_all_tables


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan event for startup and shutdown."""
    # Startup
    print("🚀 Orchestrix backend starting up...")
    create_all_tables(engine)
    print("✅ Database tables initialized")
    
    yield
    
    # Shutdown
    print("🛑 Orchestrix backend shutting down...")


# Create FastAPI app with lifespan
app = FastAPI(
    title="Orchestrix API",
    description="Distributed research orchestration platform",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(research.router)
app.include_router(sessions.router)
app.include_router(export.router)


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "version": "1.0.0"}


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Orchestrix API running"}


if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("BACKEND_PORT", 8000))
    
    # This configuration allows the port to be reused more quickly,
    # preventing the "address already in use" error on fast restarts.
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=port, 
        reload=True, 
        log_level="info"
    )
