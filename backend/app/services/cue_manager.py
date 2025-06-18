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
    
    def get_user_voice_settings(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get voice settings for a user"""
        settings = self.db.query(VoiceSettings).filter(
            VoiceSettings.user_id == user_id
        ).first()
        
        if not settings:
            # Create default settings for new user
            settings = VoiceSettings(user_id=user_id)
            self.db.add(settings)
            self.db.commit()
            self.db.refresh(settings)
        
        return {
            "user_id": settings.user_id,
            "is_enabled": settings.is_enabled,
            "volume": settings.volume,
            "rate": settings.rate,
            "pitch": settings.pitch,
            "language": settings.language,
            "voice": settings.voice,
            "enable_haptic_with_voice": settings.enable_haptic_with_voice,
            "cue_cooldown": settings.cue_cooldown
        }
    
    def update_user_voice_settings(
        self, 
        user_id: str, 
        settings_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update voice settings for a user"""
        settings = self.db.query(VoiceSettings).filter(
            VoiceSettings.user_id == user_id
        ).first()
        
        if not settings:
            settings = VoiceSettings(user_id=user_id)
            self.db.add(settings)
        
        # Update fields if provided
        if "is_enabled" in settings_data:
            settings.is_enabled = settings_data["is_enabled"]
        if "volume" in settings_data:
            settings.volume = max(0.0, min(1.0, settings_data["volume"]))
        if "rate" in settings_data:
            settings.rate = max(0.1, min(2.0, settings_data["rate"]))
        if "pitch" in settings_data:
            settings.pitch = max(0.5, min(2.0, settings_data["pitch"]))
        if "language" in settings_data:
            settings.language = settings_data["language"]
        if "voice" in settings_data:
            settings.voice = settings_data["voice"]
        if "enable_haptic_with_voice" in settings_data:
            settings.enable_haptic_with_voice = settings_data["enable_haptic_with_voice"]
        if "cue_cooldown" in settings_data:
            settings.cue_cooldown = max(1000, min(10000, settings_data["cue_cooldown"]))
        
        settings.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(settings)
        
        return self.get_user_voice_settings(user_id)
    
    def get_user_cues(
        self, 
        user_id: str, 
        exercise_type: Optional[str] = None,
        enabled_only: bool = False
    ) -> List[Dict[str, Any]]:
        """Get all voice cues for a user"""
        query = self.db.query(VoiceCue).filter(VoiceCue.user_id == user_id)
        
        if exercise_type:
            query = query.filter(
                (VoiceCue.exercise_type == exercise_type) | 
                (VoiceCue.exercise_type == 'all')
            )
        
        if enabled_only:
            query = query.filter(VoiceCue.is_enabled == True)
        
        cues = query.order_by(VoiceCue.priority.desc(), VoiceCue.created_at.asc()).all()
        
        return [self._cue_to_dict(cue) for cue in cues]
    
    def create_cue(self, user_id: str, cue_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new voice cue for a user"""
        cue = VoiceCue(
            id=f"{user_id}_{cue_data.get('id', datetime.utcnow().isoformat())}",
            user_id=user_id,
            phrase=cue_data["phrase"],
            trigger_type=cue_data["trigger_type"],
            trigger_condition=cue_data["trigger_condition"],
            exercise_type=cue_data.get("exercise_type", "all"),
            is_enabled=cue_data.get("is_enabled", True),
            priority=cue_data.get("priority", 3),
            hip_angle_min=cue_data.get("hip_angle_min"),
            hip_angle_max=cue_data.get("hip_angle_max"),
            spine_angle_min=cue_data.get("spine_angle_min"),
            spine_angle_max=cue_data.get("spine_angle_max"),
            form_score_threshold=cue_data.get("form_score_threshold")
        )
        
        self.db.add(cue)
        self.db.commit()
        self.db.refresh(cue)
        
        return self._cue_to_dict(cue)
    
    def update_cue(self, user_id: str, cue_id: str, cue_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update an existing voice cue"""
        cue = self.db.query(VoiceCue).filter(
            VoiceCue.id == cue_id,
            VoiceCue.user_id == user_id
        ).first()
        
        if not cue:
            return None
        
        # Update fields if provided
        if "phrase" in cue_data:
            cue.phrase = cue_data["phrase"]
        if "trigger_type" in cue_data:
            cue.trigger_type = cue_data["trigger_type"]
        if "trigger_condition" in cue_data:
            cue.trigger_condition = cue_data["trigger_condition"]
        if "exercise_type" in cue_data:
            cue.exercise_type = cue_data["exercise_type"]
        if "is_enabled" in cue_data:
            cue.is_enabled = cue_data["is_enabled"]
        if "priority" in cue_data:
            cue.priority = max(1, min(5, cue_data["priority"]))
        if "hip_angle_min" in cue_data:
            cue.hip_angle_min = cue_data["hip_angle_min"]
        if "hip_angle_max" in cue_data:
            cue.hip_angle_max = cue_data["hip_angle_max"]
        if "spine_angle_min" in cue_data:
            cue.spine_angle_min = cue_data["spine_angle_min"]
        if "spine_angle_max" in cue_data:
            cue.spine_angle_max = cue_data["spine_angle_max"]
        if "form_score_threshold" in cue_data:
            cue.form_score_threshold = cue_data["form_score_threshold"]
        
        cue.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(cue)
        
        return self._cue_to_dict(cue)
    
    def delete_cue(self, user_id: str, cue_id: str) -> bool:
        """Delete a voice cue"""
        cue = self.db.query(VoiceCue).filter(
            VoiceCue.id == cue_id,
            VoiceCue.user_id == user_id
        ).first()
        
        if not cue:
            return False
        
        self.db.delete(cue)
        self.db.commit()
        return True
    
    def get_triggered_cues(
        self,
        user_id: str,
        exercise_type: str,
        rep_phase: str,
        hip_angle: float,
        spine_angle: float,
        form_score: float,
        rep_count: int,
        session_duration: int
    ) -> List[Dict[str, Any]]:
        """Get cues that should be triggered based on current workout state"""
        cues = self.get_user_cues(user_id, exercise_type, enabled_only=True)
        triggered_cues = []
        
        for cue in cues:
            if self._should_trigger_cue(
                cue, rep_phase, hip_angle, spine_angle, 
                form_score, rep_count, session_duration
            ):
                triggered_cues.append(cue)
        
        # Sort by priority (highest first)
        triggered_cues.sort(key=lambda x: x["priority"], reverse=True)
        return triggered_cues
    
    def _should_trigger_cue(
        self,
        cue: Dict[str, Any],
        rep_phase: str,
        hip_angle: float,
        spine_angle: float,
        form_score: float,
        rep_count: int,
        session_duration: int
    ) -> bool:
        """Check if a cue should be triggered based on current conditions"""
        trigger_type = cue["trigger_type"]
        trigger_condition = cue["trigger_condition"]
        
        if trigger_type == "rep_phase":
            if trigger_condition != rep_phase:
                return False
            
            # Check angle ranges
            if cue["hip_angle_min"] is not None and hip_angle < cue["hip_angle_min"]:
                return False
            if cue["hip_angle_max"] is not None and hip_angle > cue["hip_angle_max"]:
                return False
            if cue["spine_angle_min"] is not None and spine_angle < cue["spine_angle_min"]:
                return False
            if cue["spine_angle_max"] is not None and spine_angle > cue["spine_angle_max"]:
                return False
            
            return True
        
        elif trigger_type == "form_issue":
            if trigger_condition == "forward_lean":
                return (cue["spine_angle_min"] is not None and 
                       cue["spine_angle_max"] is not None and
                       cue["spine_angle_min"] <= spine_angle <= cue["spine_angle_max"])
            
            elif trigger_condition == "insufficient_depth":
                return (rep_phase == "bottom" and
                       cue["hip_angle_min"] is not None and 
                       cue["hip_angle_max"] is not None and
                       cue["hip_angle_min"] <= hip_angle <= cue["hip_angle_max"])
            
            elif trigger_condition == "poor_form":
                return (cue["form_score_threshold"] is not None and 
                       form_score < cue["form_score_threshold"])
            
            elif trigger_condition == "excellent_form":
                return (cue["form_score_threshold"] is not None and 
                       form_score >= cue["form_score_threshold"])
        
        elif trigger_type == "rep_count":
            target_rep = int(trigger_condition.replace("rep_", ""))
            return rep_count == target_rep
        
        elif trigger_type == "time_interval":
            target_seconds = int(trigger_condition.replace("_seconds", ""))
            session_seconds = session_duration // 1000
            return session_seconds > 0 and session_seconds % target_seconds == 0
        
        return False
    
    def _cue_to_dict(self, cue: VoiceCue) -> Dict[str, Any]:
        """Convert VoiceCue model to dictionary"""
        return {
            "id": cue.id,
            "user_id": cue.user_id,
            "phrase": cue.phrase,
            "trigger_type": cue.trigger_type,
            "trigger_condition": cue.trigger_condition,
            "exercise_type": cue.exercise_type,
            "is_enabled": cue.is_enabled,
            "priority": cue.priority,
            "hip_angle_min": cue.hip_angle_min,
            "hip_angle_max": cue.hip_angle_max,
            "spine_angle_min": cue.spine_angle_min,
            "spine_angle_max": cue.spine_angle_max,
            "form_score_threshold": cue.form_score_threshold,
            "created_at": cue.created_at.isoformat() if cue.created_at else None,
            "updated_at": cue.updated_at.isoformat() if cue.updated_at else None
        }
    
    def seed_default_cues(self, user_id: str) -> List[Dict[str, Any]]:
        """Create default cues for a new user"""
        default_cues = [
            # Squat cues
            {
                "id": "squat_descent",
                "phrase": "Keep chest up, knees out",
                "trigger_type": "rep_phase",
                "trigger_condition": "descent",
                "exercise_type": "squat",
                "priority": 3,
                "hip_angle_min": 120,
                "hip_angle_max": 150
            },
            {
                "id": "squat_bottom",
                "phrase": "Drive through heels",
                "trigger_type": "rep_phase",
                "trigger_condition": "bottom",
                "exercise_type": "squat",
                "priority": 4,
                "hip_angle_min": 60,
                "hip_angle_max": 80
            },
            {
                "id": "squat_depth_warning",
                "phrase": "Go deeper, break parallel",
                "trigger_type": "form_issue",
                "trigger_condition": "insufficient_depth",
                "exercise_type": "squat",
                "priority": 4,
                "hip_angle_min": 90,
                "hip_angle_max": 110
            },
            
            # Deadlift cues
            {
                "id": "deadlift_setup",
                "phrase": "Tight lats, proud chest",
                "trigger_type": "rep_phase",
                "trigger_condition": "bottom",
                "exercise_type": "deadlift",
                "priority": 3,
                "spine_angle_min": 0,
                "spine_angle_max": 15
            },
            {
                "id": "deadlift_pull",
                "phrase": "Drive hips forward",
                "trigger_type": "rep_phase",
                "trigger_condition": "ascent",
                "exercise_type": "deadlift",
                "priority": 4,
                "hip_angle_min": 100,
                "hip_angle_max": 140
            },
            
            # General form cues
            {
                "id": "spine_forward_lean",
                "phrase": "Keep your chest up",
                "trigger_type": "form_issue",
                "trigger_condition": "forward_lean",
                "exercise_type": "all",
                "priority": 5,
                "spine_angle_min": 15,
                "spine_angle_max": 45
            },
            {
                "id": "poor_form_general",
                "phrase": "Check your form",
                "trigger_type": "form_issue",
                "trigger_condition": "poor_form",
                "exercise_type": "all",
                "priority": 4,
                "form_score_threshold": 60
            }
        ]
        
        created_cues = []
        for cue_data in default_cues:
            # Check if cue already exists
            existing = self.db.query(VoiceCue).filter(
                VoiceCue.user_id == user_id,
                VoiceCue.id.like(f"{user_id}_{cue_data['id']}")
            ).first()
            
            if not existing:
                created_cue = self.create_cue(user_id, cue_data)
                created_cues.append(created_cue)
        
        return created_cues 