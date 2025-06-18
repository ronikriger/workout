"""
API routes for voice cue management and user voice settings
Provides endpoints for CRUD operations on voice cues and user preferences
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.database import get_db
from app.services.cue_manager import CueManager
from app.models.user import User
from app.auth.jwt_handler import decode_jwt

router = APIRouter(prefix="/api/cues", tags=["voice-cues"])
security = HTTPBearer()

# Pydantic models for request/response validation

class VoiceSettingsUpdate(BaseModel):
    is_enabled: Optional[bool] = None
    volume: Optional[float] = Field(None, ge=0.0, le=1.0)
    rate: Optional[float] = Field(None, ge=0.1, le=2.0)
    pitch: Optional[float] = Field(None, ge=0.5, le=2.0)
    language: Optional[str] = None
    voice: Optional[str] = None
    enable_haptic_with_voice: Optional[bool] = None
    cue_cooldown: Optional[int] = Field(None, ge=1000, le=10000)

class VoiceSettingsResponse(BaseModel):
    user_id: str
    is_enabled: bool
    volume: float
    rate: float
    pitch: float
    language: str
    voice: str
    enable_haptic_with_voice: bool
    cue_cooldown: int

class CueCreate(BaseModel):
    phrase: str = Field(..., min_length=1, max_length=200)
    trigger_type: str = Field(..., regex="^(rep_phase|form_issue|rep_count|time_interval)$")
    trigger_condition: str = Field(..., min_length=1, max_length=50)
    exercise_type: str = Field("all", regex="^(squat|deadlift|all)$")
    is_enabled: bool = True
    priority: int = Field(3, ge=1, le=5)
    hip_angle_min: Optional[float] = Field(None, ge=0, le=180)
    hip_angle_max: Optional[float] = Field(None, ge=0, le=180)
    spine_angle_min: Optional[float] = Field(None, ge=-90, le=90)
    spine_angle_max: Optional[float] = Field(None, ge=-90, le=90)
    form_score_threshold: Optional[float] = Field(None, ge=0, le=100)

class CueUpdate(BaseModel):
    phrase: Optional[str] = Field(None, min_length=1, max_length=200)
    trigger_type: Optional[str] = Field(None, regex="^(rep_phase|form_issue|rep_count|time_interval)$")
    trigger_condition: Optional[str] = Field(None, min_length=1, max_length=50)
    exercise_type: Optional[str] = Field(None, regex="^(squat|deadlift|all)$")
    is_enabled: Optional[bool] = None
    priority: Optional[int] = Field(None, ge=1, le=5)
    hip_angle_min: Optional[float] = Field(None, ge=0, le=180)
    hip_angle_max: Optional[float] = Field(None, ge=0, le=180)
    spine_angle_min: Optional[float] = Field(None, ge=-90, le=90)
    spine_angle_max: Optional[float] = Field(None, ge=-90, le=90)
    form_score_threshold: Optional[float] = Field(None, ge=0, le=100)

class CueResponse(BaseModel):
    id: str
    user_id: str
    phrase: str
    trigger_type: str
    trigger_condition: str
    exercise_type: str
    is_enabled: bool
    priority: int
    hip_angle_min: Optional[float]
    hip_angle_max: Optional[float]
    spine_angle_min: Optional[float]
    spine_angle_max: Optional[float]
    form_score_threshold: Optional[float]
    created_at: Optional[str]
    updated_at: Optional[str]

class CueTriggersRequest(BaseModel):
    exercise_type: str = Field(..., regex="^(squat|deadlift)$")
    rep_phase: str = Field(..., regex="^(descent|bottom|ascent|top)$")
    hip_angle: float = Field(..., ge=0, le=180)
    spine_angle: float = Field(..., ge=-90, le=90)
    form_score: float = Field(..., ge=0, le=100)
    rep_count: int = Field(..., ge=0)
    session_duration: int = Field(..., ge=0)

def get_current_user(token: str = Depends(security), db: Session = Depends(get_db)):
    """Get current user from JWT token"""
    try:
        payload = decode_jwt(token.credentials)
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        return user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

# Voice Settings Endpoints

@router.get("/settings", response_model=VoiceSettingsResponse)
async def get_voice_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's voice settings"""
    cue_manager = CueManager(db)
    settings = cue_manager.get_user_voice_settings(current_user.id)
    return VoiceSettingsResponse(**settings)

@router.put("/settings", response_model=VoiceSettingsResponse)
async def update_voice_settings(
    settings_update: VoiceSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user's voice settings"""
    cue_manager = CueManager(db)
    
    # Convert Pydantic model to dict, excluding None values
    update_data = settings_update.dict(exclude_none=True)
    
    updated_settings = cue_manager.update_user_voice_settings(
        current_user.id, 
        update_data
    )
    
    return VoiceSettingsResponse(**updated_settings)

# Voice Cues Endpoints

@router.get("/", response_model=List[CueResponse])
async def get_user_cues(
    exercise_type: Optional[str] = None,
    enabled_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all voice cues for the current user"""
    cue_manager = CueManager(db)
    cues = cue_manager.get_user_cues(
        current_user.id,
        exercise_type=exercise_type,
        enabled_only=enabled_only
    )
    
    return [CueResponse(**cue) for cue in cues]

@router.post("/", response_model=CueResponse, status_code=status.HTTP_201_CREATED)
async def create_cue(
    cue_data: CueCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new voice cue"""
    cue_manager = CueManager(db)
    
    # Convert Pydantic model to dict
    cue_dict = cue_data.dict()
    
    # Validate angle ranges
    if (cue_dict.get("hip_angle_min") is not None and 
        cue_dict.get("hip_angle_max") is not None and
        cue_dict["hip_angle_min"] >= cue_dict["hip_angle_max"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="hip_angle_min must be less than hip_angle_max"
        )
    
    if (cue_dict.get("spine_angle_min") is not None and 
        cue_dict.get("spine_angle_max") is not None and
        cue_dict["spine_angle_min"] >= cue_dict["spine_angle_max"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="spine_angle_min must be less than spine_angle_max"
        )
    
    created_cue = cue_manager.create_cue(current_user.id, cue_dict)
    return CueResponse(**created_cue)

@router.put("/{cue_id}", response_model=CueResponse)
async def update_cue(
    cue_id: str,
    cue_update: CueUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing voice cue"""
    cue_manager = CueManager(db)
    
    # Convert Pydantic model to dict, excluding None values
    update_data = cue_update.dict(exclude_none=True)
    
    # Validate angle ranges if both are provided
    if ("hip_angle_min" in update_data and "hip_angle_max" in update_data and
        update_data["hip_angle_min"] >= update_data["hip_angle_max"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="hip_angle_min must be less than hip_angle_max"
        )
    
    if ("spine_angle_min" in update_data and "spine_angle_max" in update_data and
        update_data["spine_angle_min"] >= update_data["spine_angle_max"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="spine_angle_min must be less than spine_angle_max"
        )
    
    updated_cue = cue_manager.update_cue(current_user.id, cue_id, update_data)
    
    if not updated_cue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cue not found"
        )
    
    return CueResponse(**updated_cue)

@router.delete("/{cue_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cue(
    cue_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a voice cue"""
    cue_manager = CueManager(db)
    success = cue_manager.delete_cue(current_user.id, cue_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cue not found"
        )

@router.post("/triggers", response_model=List[CueResponse])
async def get_triggered_cues(
    trigger_request: CueTriggersRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get cues that should be triggered based on current workout state"""
    cue_manager = CueManager(db)
    
    triggered_cues = cue_manager.get_triggered_cues(
        current_user.id,
        trigger_request.exercise_type,
        trigger_request.rep_phase,
        trigger_request.hip_angle,
        trigger_request.spine_angle,
        trigger_request.form_score,
        trigger_request.rep_count,
        trigger_request.session_duration
    )
    
    return [CueResponse(**cue) for cue in triggered_cues]

@router.post("/seed-defaults", response_model=List[CueResponse])
async def seed_default_cues(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create default voice cues for the user"""
    cue_manager = CueManager(db)
    created_cues = cue_manager.seed_default_cues(current_user.id)
    
    return [CueResponse(**cue) for cue in created_cues]

# Health check endpoint for cue service
@router.get("/health")
async def cue_service_health():
    """Health check for cue management service"""
    return {
        "service": "voice-cues",
        "status": "healthy",
        "features": [
            "voice_settings_management",
            "custom_cue_creation",
            "cue_triggering_logic",
            "default_cue_seeding"
        ]
    } 