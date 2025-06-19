from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, Dict, Any

from app.db.session import Base

class WorkoutSession(Base):
    __tablename__ = "workout_sessions"

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    
    exercise_type = Column(String, nullable=False)
    duration = Column(Float, nullable=True, default=0.0)
    total_reps = Column(Integer, nullable=True, default=0)
    average_form_score = Column(Float, nullable=True)
    
    video_path = Column(String, nullable=True)
    status = Column(String, nullable=False, default="completed")
    analysis_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="workout_sessions")

    def __repr__(self):
        return f"<WorkoutSession(id={self.id}, user_id={self.user_id}, exercise='{self.exercise_type}')>"

# Simple Pydantic models
class WorkoutSessionCreate(BaseModel):
    exercise_type: str
    duration: Optional[float] = 0.0
    total_reps: Optional[int] = 0

class WorkoutSessionRead(BaseModel):
    id: str
    user_id: str
    exercise_type: str
    duration: Optional[float] = 0.0
    total_reps: Optional[int] = 0
    average_form_score: Optional[float] = None
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True 