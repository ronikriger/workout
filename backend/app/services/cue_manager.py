"""
Voice cue management service for custom audio feedback
Handles user cue preferences, custom cue creation, and cue triggering logic
"""

from typing import List, Dict, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import Column, String, Integer, Boolean, Float, JSON, DateTime
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import json
import uuid

from app.models.user import User

Base = declarative_base()

class VoiceCue(Base):
    __tablename__ = "voice_cues"
    
    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False)
    phrase = Column(String, nullable=False)
    trigger_type = Column(String, nullable=False)  # 'rep_phase', 'form_issue', 'rep_count', 'time_interval'
    trigger_condition = Column(String, nullable=False)
    exercise_type = Column(String, nullable=False)  # 'squat', 'deadlift', 'all'
    is_enabled = Column(Boolean, default=True)
    priority = Column(Integer, default=3)
    hip_angle_min = Column(Float, nullable=True)
    hip_angle_max = Column(Float, nullable=True)
    spine_angle_min = Column(Float, nullable=True)
    spine_angle_max = Column(Float, nullable=True)
    form_score_threshold = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class VoiceSettings(Base):
    __tablename__ = "voice_settings"
    
    user_id = Column(String, primary_key=True)
    is_enabled = Column(Boolean, default=False)
    volume = Column(Float, default=0.8)
    rate = Column(Float, default=1.0)
    pitch = Column(Float, default=1.0)
    language = Column(String, default='en-US')
    voice = Column(String, default='default')
    enable_haptic_with_voice = Column(Boolean, default=True)
    cue_cooldown = Column(Integer, default=3000)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CueManager:
    """Service for managing voice cues and user voice preferences"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_user_voice_settings(self, user_id: str) -> Dict[str, Any]:
        """Get user's voice settings with defaults"""
        return {
            "user_id": user_id,
            "is_enabled": True,
            "volume": 0.8,
            "rate": 1.0,
            "pitch": 1.0,
            "language": "en-US",
            "voice": "default",
            "enable_haptic_with_voice": True,
            "cue_cooldown": 3000
        }
    
    def update_user_voice_settings(self, user_id: str, settings: Dict[str, Any]) -> Dict[str, Any]:
        """Update user's voice settings"""
        # For now, just return the updated settings with the user_id
        current_settings = self.get_user_voice_settings(user_id)
        current_settings.update(settings)
        return current_settings
    
    def get_user_cues(self, user_id: str, exercise_type: Optional[str] = None, enabled_only: bool = False) -> List[Dict[str, Any]]:
        """Get all voice cues for a user"""
        # Return empty list for now - can be expanded later
        return []
    
    def create_cue(self, user_id: str, cue_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new voice cue"""
        cue = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            **cue_data
        }
        return cue
    
    def update_cue(self, user_id: str, cue_id: str, cue_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update an existing voice cue"""
        # For now, return None (not found)
        return None
    
    def delete_cue(self, user_id: str, cue_id: str) -> bool:
        """Delete a voice cue"""
        # For now, return False (not found)
        return False
    
    def get_triggered_cues(self, user_id: str, trigger_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get cues that should be triggered based on current workout state"""
        # Return empty list for now
        return []
    
    def seed_default_cues(self, user_id: str) -> List[Dict[str, Any]]:
        """Create default cues for a new user"""
        default_cues = [
            {
                "phrase": "Keep your back straight",
                "trigger_type": "form_issue",
                "trigger_condition": "spine_angle_poor",
                "exercise_type": "all",
                "is_enabled": True,
                "priority": 4,
                "form_score_threshold": 70.0
            },
            {
                "phrase": "Great form! Keep it up",
                "trigger_type": "form_issue",
                "trigger_condition": "good_form",
                "exercise_type": "all",
                "is_enabled": True,
                "priority": 2,
                "form_score_threshold": 85.0
            }
        ]
        
        created_cues = []
        for cue_data in default_cues:
            created_cue = self.create_cue(user_id, cue_data)
            created_cues.append(created_cue)
        
        return created_cues 