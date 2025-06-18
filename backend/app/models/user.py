"""
User model for authentication and profile management
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime
from typing import Optional

from app.models.base import Base


class User(Base):
    """User database model"""
    
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    is_pro = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # User preferences
    target_spine_angle = Column(Integer, default=5)  # degrees
    target_hip_angle = Column(Integer, default=70)   # degrees
    sync_enabled = Column(Boolean, default=True)
    haptic_feedback = Column(Boolean, default=True)
    voice_cues = Column(Boolean, default=False)
    units = Column(String(10), default="metric")  # metric or imperial
    
    # Relationships
    workout_sessions = relationship("WorkoutSession", back_populates="user")
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email})>"


# Pydantic models for API
from pydantic import BaseModel, EmailStr, ConfigDict
from pydantic import Field


class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)


class UserCreate(UserBase):
    """User creation schema"""
    password: str = Field(..., min_length=8, max_length=100)


class UserUpdate(BaseModel):
    """User update schema"""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    target_spine_angle: Optional[int] = Field(None, ge=0, le=45)
    target_hip_angle: Optional[int] = Field(None, ge=30, le=120)
    sync_enabled: Optional[bool] = None
    haptic_feedback: Optional[bool] = None
    voice_cues: Optional[bool] = None
    units: Optional[str] = Field(None, regex="^(metric|imperial)$")


class UserResponse(UserBase):
    """User response schema"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    is_active: bool
    is_pro: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    
    # Preferences
    target_spine_angle: int
    target_hip_angle: int
    sync_enabled: bool
    haptic_feedback: bool
    voice_cues: bool
    units: str


class UserProfile(BaseModel):
    """Extended user profile with stats"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    email: str
    first_name: str
    last_name: str
    is_pro: bool
    created_at: datetime
    
    # Workout statistics
    total_workouts: int = 0
    total_reps: int = 0
    average_form_score: float = 0.0
    best_form_score: float = 0.0
    streak_days: int = 0
    
    # Preferences
    target_spine_angle: int
    target_hip_angle: int
    sync_enabled: bool
    haptic_feedback: bool
    voice_cues: bool
    units: str


# Authentication schemas
class Token(BaseModel):
    """JWT token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenData(BaseModel):
    """Token data for validation"""
    email: Optional[str] = None
    user_id: Optional[int] = None


class LoginRequest(BaseModel):
    """Login request schema"""
    email: EmailStr
    password: str = Field(..., min_length=1)


class RefreshTokenRequest(BaseModel):
    """Refresh token request"""
    refresh_token: str


class PasswordReset(BaseModel):
    """Password reset schema"""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Password reset confirmation"""
    token: str
    new_password: str = Field(..., min_length=8, max_length=100) 