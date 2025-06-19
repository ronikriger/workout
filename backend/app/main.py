"""
RepRight FastAPI backend application
Provides authentication, video upload, and workout analysis services
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, workouts, cues
from app.db.session import engine, Base
from app.models import user, workout  # Import models to ensure they're registered

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create all database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="RepRight API",
    description="API for workout form analysis and personal progress tracking.",
    version="1.0.0",
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for simplicity in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(workouts.router, prefix="/workouts", tags=["Workouts"])
app.include_router(cues.router, prefix="/cues", tags=["cues"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the RepRight API!"}

@app.get("/health")
def health_check():
    """Simple health check endpoint"""
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 