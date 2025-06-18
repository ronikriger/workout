"""
Trainer and Team Models - Extended user system for coaching features
SQLAlchemy models and Pydantic schemas for trainers, teams, and relationships
"""

from datetime import datetime, date
from typing import List, Optional
from enum import Enum

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Float, Table, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from pydantic import BaseModel, Field, validator
import uuid

from .user import Base, User, UserSchema


# Association tables
trainer_client_association = Table(
    'trainer_clients',
    Base.metadata,
    Column('trainer_id', UUID(as_uuid=True), ForeignKey('trainers.id'), primary_key=True),
    Column('client_id', UUID(as_uuid=True), ForeignKey('users.id'), primary_key=True),
    Column('created_at', DateTime, default=datetime.utcnow),
    Column('is_active', Boolean, default=True)
)

team_members_association = Table(
    'team_members',
    Base.metadata,
    Column('team_id', UUID(as_uuid=True), ForeignKey('teams.id'), primary_key=True),
    Column('member_id', UUID(as_uuid=True), ForeignKey('users.id'), primary_key=True),
    Column('joined_at', DateTime, default=datetime.utcnow),
    Column('is_active', Boolean, default=True),
    Column('role', String(50), default='member')  # member, captain, co-leader
)

challenge_participants_association = Table(
    'challenge_participants',
    Base.metadata,
    Column('challenge_id', UUID(as_uuid=True), ForeignKey('challenges.id'), primary_key=True),
    Column('participant_id', UUID(as_uuid=True), ForeignKey('users.id'), primary_key=True),
    Column('joined_at', DateTime, default=datetime.utcnow),
    Column('current_progress', Float, default=0.0),
    Column('is_completed', Boolean, default=False),
    Column('completed_at', DateTime, nullable=True)
)


# Enums
class VerificationStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class CredentialType(str, Enum):
    CERTIFICATION = "certification"
    EDUCATION = "education"
    EXPERIENCE = "experience"


class ChallengeType(str, Enum):
    INDIVIDUAL = "individual"
    TEAM = "team"


class ChallengeMetric(str, Enum):
    FORM_SCORE = "form_score"
    TOTAL_REPS = "total_reps"
    CONSISTENCY = "consistency"
    IMPROVEMENT = "improvement"


class ChallengeStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class InvitationStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"


# SQLAlchemy Models
class TrainerCredential(Base):
    __tablename__ = "trainer_credentials"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trainer_id = Column(UUID(as_uuid=True), ForeignKey('trainers.id'), nullable=False)
    type = Column(SQLEnum(CredentialType), nullable=False)
    title = Column(String(200), nullable=False)
    organization = Column(String(200), nullable=False)
    date_obtained = Column(DateTime, nullable=False)
    expiry_date = Column(DateTime, nullable=True)
    document_url = Column(String(500), nullable=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    trainer = relationship("Trainer", back_populates="credentials")


class Trainer(Base):
    __tablename__ = "trainers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, unique=True)
    certification = Column(String(200), nullable=False)
    specialties = Column(ARRAY(String), default=[])
    experience_years = Column(Integer, default=0)
    bio = Column(Text, default="")
    rating = Column(Float, default=0.0)
    total_clients = Column(Integer, default=0)
    verification_status = Column(SQLEnum(VerificationStatus), default=VerificationStatus.PENDING)
    hourly_rate = Column(Float, nullable=True)
    timezone = Column(String(50), default="UTC")
    availability = Column(Text, nullable=True)  # JSON string for complex scheduling
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="trainer_profile")
    credentials = relationship("TrainerCredential", back_populates="trainer", cascade="all, delete-orphan")
    clients = relationship("User", secondary=trainer_client_association, back_populates="trainers")
    teams = relationship("Team", back_populates="trainer")
    workout_plans = relationship("WorkoutPlan", back_populates="trainer")
    feedback_given = relationship("TrainerFeedback", back_populates="trainer")
    form_alerts = relationship("FormAlert", back_populates="trainer")
    challenges_created = relationship("Challenge", back_populates="created_by_trainer")


class Team(Base):
    __tablename__ = "teams"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    description = Column(Text, default="")
    trainer_id = Column(UUID(as_uuid=True), ForeignKey('trainers.id'), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    is_public = Column(Boolean, default=False)
    max_members = Column(Integer, default=50)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    trainer = relationship("Trainer", back_populates="teams")
    members = relationship("User", secondary=team_members_association, back_populates="teams")
    invitations = relationship("TeamInvitation", back_populates="team", cascade="all, delete-orphan")
    leaderboards = relationship("Leaderboard", back_populates="team")
    challenges = relationship("Challenge", back_populates="team")


class TeamInvitation(Base):
    __tablename__ = "team_invitations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(UUID(as_uuid=True), ForeignKey('teams.id'), nullable=False)
    trainer_id = Column(UUID(as_uuid=True), ForeignKey('trainers.id'), nullable=False)
    invitee_email = Column(String(255), nullable=False)
    invitee_name = Column(String(200), nullable=True)
    message = Column(Text, default="")
    status = Column(SQLEnum(InvitationStatus), default=InvitationStatus.PENDING)
    expires_at = Column(DateTime, nullable=False)
    sent_at = Column(DateTime, default=datetime.utcnow)
    responded_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    team = relationship("Team", back_populates="invitations")
    trainer = relationship("Trainer")


class Challenge(Base):
    __tablename__ = "challenges"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(200), nullable=False)
    description = Column(Text, default="")
    type = Column(SQLEnum(ChallengeType), nullable=False)
    metric = Column(SQLEnum(ChallengeMetric), nullable=False)
    target_value = Column(Float, nullable=False)
    duration_days = Column(Integer, nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    status = Column(SQLEnum(ChallengeStatus), default=ChallengeStatus.DRAFT)
    rewards = Column(ARRAY(String), default=[])
    rules = Column(Text, default="")
    
    # Foreign Keys
    created_by_trainer_id = Column(UUID(as_uuid=True), ForeignKey('trainers.id'), nullable=False)
    team_id = Column(UUID(as_uuid=True), ForeignKey('teams.id'), nullable=True)  # Optional for individual challenges
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    created_by_trainer = relationship("Trainer", back_populates="challenges_created")
    team = relationship("Team", back_populates="challenges")
    participants = relationship("User", secondary=challenge_participants_association, back_populates="challenges")
    progress_entries = relationship("ChallengeProgress", back_populates="challenge", cascade="all, delete-orphan")


class ChallengeProgress(Base):
    __tablename__ = "challenge_progress"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    challenge_id = Column(UUID(as_uuid=True), ForeignKey('challenges.id'), nullable=False)
    participant_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    current_value = Column(Float, default=0.0)
    target_value = Column(Float, nullable=False)
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    rank = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    challenge = relationship("Challenge", back_populates="progress_entries")
    participant = relationship("User")


class Leaderboard(Base):
    __tablename__ = "leaderboards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    description = Column(Text, default="")
    type = Column(String(50), nullable=False)  # team, individual, global
    metric = Column(SQLEnum(ChallengeMetric), nullable=False)
    period = Column(String(50), nullable=False)  # daily, weekly, monthly, all_time
    team_id = Column(UUID(as_uuid=True), ForeignKey('teams.id'), nullable=True)
    is_active = Column(Boolean, default=True)
    last_updated = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    team = relationship("Team", back_populates="leaderboards")
    entries = relationship("LeaderboardEntry", back_populates="leaderboard", cascade="all, delete-orphan")


class LeaderboardEntry(Base):
    __tablename__ = "leaderboard_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    leaderboard_id = Column(UUID(as_uuid=True), ForeignKey('leaderboards.id'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    rank = Column(Integer, nullable=False)
    score = Column(Float, nullable=False)
    rank_change = Column(Integer, default=0)  # Change from previous period
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    leaderboard = relationship("Leaderboard", back_populates="entries")
    user = relationship("User")


class WorkoutPlan(Base):
    __tablename__ = "workout_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(200), nullable=False)
    description = Column(Text, default="")
    trainer_id = Column(UUID(as_uuid=True), ForeignKey('trainers.id'), nullable=False)
    client_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    duration_weeks = Column(Integer, nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    status = Column(String(50), default="draft")  # draft, active, completed, paused
    progress_percentage = Column(Float, default=0.0)
    exercises_data = Column(Text)  # JSON string for exercise details
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    trainer = relationship("Trainer", back_populates="workout_plans")
    client = relationship("User", back_populates="workout_plans")


class TrainerFeedback(Base):
    __tablename__ = "trainer_feedback"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trainer_id = Column(UUID(as_uuid=True), ForeignKey('trainers.id'), nullable=False)
    session_id = Column(UUID(as_uuid=True), nullable=False)  # References workout_sessions
    client_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5 stars
    comments = Column(Text, default="")
    suggestions = Column(ARRAY(String), default=[])
    next_steps = Column(Text, default="")
    annotated_video_url = Column(String(500), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    trainer = relationship("Trainer", back_populates="feedback_given")
    client = relationship("User")


class FormAlert(Base):
    __tablename__ = "form_alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trainer_id = Column(UUID(as_uuid=True), ForeignKey('trainers.id'), nullable=False)
    client_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    session_id = Column(UUID(as_uuid=True), nullable=False)  # References workout_sessions
    alert_type = Column(String(50), nullable=False)  # poor_form, injury_risk, plateau, regression
    severity = Column(String(20), nullable=False)  # low, medium, high
    description = Column(Text, nullable=False)
    recommendations = Column(ARRAY(String), default=[])
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    trainer = relationship("Trainer", back_populates="form_alerts")
    client = relationship("User")


# Pydantic Schemas
class TrainerCredentialSchema(BaseModel):
    id: Optional[str] = None
    type: CredentialType
    title: str
    organization: str
    date_obtained: datetime
    expiry_date: Optional[datetime] = None
    document_url: Optional[str] = None
    is_verified: bool = False

    class Config:
        from_attributes = True


class TrainerCreateSchema(BaseModel):
    certification: str = Field(..., min_length=1, max_length=200)
    specialties: List[str] = Field(default=[])
    experience_years: int = Field(ge=0, le=50)
    bio: str = Field(default="", max_length=2000)
    hourly_rate: Optional[float] = Field(None, ge=0)
    timezone: str = Field(default="UTC")
    credentials: List[TrainerCredentialSchema] = Field(default=[])

    @validator('specialties')
    def validate_specialties(cls, v):
        if len(v) > 10:
            raise ValueError('Too many specialties (max 10)')
        return v


class TrainerUpdateSchema(BaseModel):
    certification: Optional[str] = None
    specialties: Optional[List[str]] = None
    experience_years: Optional[int] = Field(None, ge=0, le=50)
    bio: Optional[str] = Field(None, max_length=2000)
    hourly_rate: Optional[float] = Field(None, ge=0)
    timezone: Optional[str] = None
    availability: Optional[str] = None

    class Config:
        from_attributes = True


class TrainerSchema(BaseModel):
    id: str
    user: UserSchema
    certification: str
    specialties: List[str]
    experience_years: int
    bio: str
    rating: float
    total_clients: int
    verification_status: VerificationStatus
    hourly_rate: Optional[float] = None
    timezone: str
    credentials: List[TrainerCredentialSchema] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TeamCreateSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(default="", max_length=1000)
    is_public: bool = Field(default=False)
    max_members: int = Field(default=50, ge=2, le=200)


class TeamUpdateSchema(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    is_public: Optional[bool] = None
    max_members: Optional[int] = Field(None, ge=2, le=200)
    is_active: Optional[bool] = None

    class Config:
        from_attributes = True


class TeamStatsSchema(BaseModel):
    total_workouts: int
    average_form_score: float
    total_reps: int
    active_members: int
    top_performer: str
    weekly_goal_completion: float

    class Config:
        from_attributes = True


class TeamSchema(BaseModel):
    id: str
    name: str
    description: str
    trainer_id: str
    is_active: bool
    is_public: bool
    max_members: int
    member_count: int
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TeamInvitationCreateSchema(BaseModel):
    team_id: str
    invitee_email: str = Field(..., regex=r'^[^@]+@[^@]+\.[^@]+$')
    invitee_name: Optional[str] = None
    message: str = Field(default="", max_length=500)


class TeamInvitationSchema(BaseModel):
    id: str
    team_id: str
    trainer_id: str
    invitee_email: str
    invitee_name: Optional[str] = None
    message: str
    status: InvitationStatus
    expires_at: datetime
    sent_at: datetime
    responded_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ChallengeCreateSchema(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(default="", max_length=1000)
    type: ChallengeType
    metric: ChallengeMetric
    target_value: float = Field(..., gt=0)
    duration_days: int = Field(..., ge=1, le=365)
    team_id: Optional[str] = None
    rewards: List[str] = Field(default=[])
    rules: str = Field(default="", max_length=2000)

    @validator('team_id')
    def validate_team_challenge(cls, v, values):
        if values.get('type') == ChallengeType.TEAM and not v:
            raise ValueError('Team challenges must specify a team_id')
        return v


class ChallengeUpdateSchema(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    status: Optional[ChallengeStatus] = None
    rewards: Optional[List[str]] = None
    rules: Optional[str] = Field(None, max_length=2000)

    class Config:
        from_attributes = True


class ChallengeProgressSchema(BaseModel):
    id: str
    participant_id: str
    current_value: float
    target_value: float
    is_completed: bool
    completed_at: Optional[datetime] = None
    rank: Optional[int] = None

    class Config:
        from_attributes = True


class ChallengeSchema(BaseModel):
    id: str
    title: str
    description: str
    type: ChallengeType
    metric: ChallengeMetric
    target_value: float
    duration_days: int
    start_date: datetime
    end_date: datetime
    status: ChallengeStatus
    rewards: List[str]
    rules: str
    created_by_trainer_id: str
    team_id: Optional[str] = None
    participant_count: int
    progress: List[ChallengeProgressSchema] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LeaderboardEntrySchema(BaseModel):
    id: str
    user_id: str
    username: str
    avatar_url: Optional[str] = None
    rank: int
    score: float
    rank_change: int
    team_name: Optional[str] = None

    class Config:
        from_attributes = True


class LeaderboardSchema(BaseModel):
    id: str
    name: str
    description: str
    type: str
    metric: ChallengeMetric
    period: str
    team_id: Optional[str] = None
    is_active: bool
    last_updated: datetime
    entries: List[LeaderboardEntrySchema] = []

    class Config:
        from_attributes = True


class WorkoutPlanCreateSchema(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(default="", max_length=1000)
    client_id: str
    duration_weeks: int = Field(..., ge=1, le=52)
    start_date: datetime
    exercises_data: str  # JSON string

    @validator('start_date')
    def validate_start_date(cls, v):
        if v < datetime.utcnow():
            raise ValueError('Start date must be in the future')
        return v


class WorkoutPlanSchema(BaseModel):
    id: str
    title: str
    description: str
    trainer_id: str
    client_id: str
    duration_weeks: int
    start_date: datetime
    end_date: datetime
    status: str
    progress_percentage: float
    exercises_data: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TrainerFeedbackCreateSchema(BaseModel):
    session_id: str
    client_id: str
    rating: int = Field(..., ge=1, le=5)
    comments: str = Field(default="", max_length=2000)
    suggestions: List[str] = Field(default=[])
    next_steps: str = Field(default="", max_length=1000)
    annotated_video_url: Optional[str] = None


class TrainerFeedbackSchema(BaseModel):
    id: str
    trainer_id: str
    session_id: str
    client_id: str
    rating: int
    comments: str
    suggestions: List[str]
    next_steps: str
    annotated_video_url: Optional[str] = None
    is_read: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FormAlertCreateSchema(BaseModel):
    client_id: str
    session_id: str
    alert_type: str = Field(..., regex=r'^(poor_form|injury_risk|plateau|regression)$')
    severity: str = Field(..., regex=r'^(low|medium|high)$')
    description: str = Field(..., min_length=1, max_length=1000)
    recommendations: List[str] = Field(default=[])


class FormAlertSchema(BaseModel):
    id: str
    trainer_id: str
    client_id: str
    session_id: str
    alert_type: str
    severity: str
    description: str
    recommendations: List[str]
    is_resolved: bool
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Additional relationship updates for User model
# These would be added to the existing User model in user.py
"""
Add these relationships to the User model:

trainer_profile = relationship("Trainer", back_populates="user", uselist=False)
trainers = relationship("Trainer", secondary=trainer_client_association, back_populates="clients")
teams = relationship("Team", secondary=team_members_association, back_populates="members")
challenges = relationship("Challenge", secondary=challenge_participants_association, back_populates="participants")
workout_plans = relationship("WorkoutPlan", back_populates="client")
""" 