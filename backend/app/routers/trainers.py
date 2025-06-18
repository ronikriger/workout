"""
Trainer API Routes - Professional coaching features
Endpoints for trainer dashboard, client management, team features, and analytics
"""

from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc

from ..database import get_db
from ..models.user import User
from ..models.trainer import (
    Trainer, Team, Challenge, Leaderboard, WorkoutPlan, TrainerFeedback, FormAlert,
    TeamInvitation, ChallengeProgress, LeaderboardEntry,
    TrainerCreateSchema, TrainerUpdateSchema, TrainerSchema,
    TeamCreateSchema, TeamUpdateSchema, TeamSchema,
    ChallengeCreateSchema, ChallengeUpdateSchema, ChallengeSchema,
    LeaderboardSchema, WorkoutPlanCreateSchema, WorkoutPlanSchema,
    TrainerFeedbackCreateSchema, TrainerFeedbackSchema,
    FormAlertCreateSchema, FormAlertSchema,
    TeamInvitationCreateSchema, TeamInvitationSchema,
    VerificationStatus, ChallengeStatus, InvitationStatus
)
from ..auth import get_current_user
from ..services.notifications import NotificationService
from ..services.analytics import AnalyticsService

router = APIRouter(prefix="/trainers", tags=["trainers"])


# Trainer Profile Management
@router.post("/register", response_model=TrainerSchema)
async def register_trainer(
    trainer_data: TrainerCreateSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Register as a professional trainer"""
    
    # Check if user is already a trainer
    existing_trainer = db.query(Trainer).filter(Trainer.user_id == current_user.id).first()
    if existing_trainer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already registered as a trainer"
        )
    
    # Create trainer profile
    trainer = Trainer(
        user_id=current_user.id,
        certification=trainer_data.certification,
        specialties=trainer_data.specialties,
        experience_years=trainer_data.experience_years,
        bio=trainer_data.bio,
        hourly_rate=trainer_data.hourly_rate,
        timezone=trainer_data.timezone
    )
    
    db.add(trainer)
    db.commit()
    db.refresh(trainer)
    
    # Add credentials if provided
    for cred_data in trainer_data.credentials:
        from ..models.trainer import TrainerCredential
        credential = TrainerCredential(
            trainer_id=trainer.id,
            type=cred_data.type,
            title=cred_data.title,
            organization=cred_data.organization,
            date_obtained=cred_data.date_obtained,
            expiry_date=cred_data.expiry_date,
            document_url=cred_data.document_url
        )
        db.add(credential)
    
    db.commit()
    
    # Load trainer with relationships
    trainer = db.query(Trainer).options(
        joinedload(Trainer.user),
        joinedload(Trainer.credentials)
    ).filter(Trainer.id == trainer.id).first()
    
    return trainer


@router.get("/profile", response_model=TrainerSchema)
async def get_trainer_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current trainer profile"""
    trainer = db.query(Trainer).options(
        joinedload(Trainer.user),
        joinedload(Trainer.credentials)
    ).filter(Trainer.user_id == current_user.id).first()
    
    if not trainer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trainer profile not found"
        )
    
    return trainer


@router.put("/profile", response_model=TrainerSchema)
async def update_trainer_profile(
    trainer_data: TrainerUpdateSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update trainer profile"""
    trainer = db.query(Trainer).filter(Trainer.user_id == current_user.id).first()
    
    if not trainer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trainer profile not found"
        )
    
    # Update fields
    update_data = trainer_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(trainer, field, value)
    
    trainer.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(trainer)
    
    return trainer


# Dashboard Data
@router.get("/dashboard")
async def get_trainer_dashboard(
    time_range: str = Query("week", regex="^(week|month|quarter)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive trainer dashboard data"""
    trainer = db.query(Trainer).filter(Trainer.user_id == current_user.id).first()
    
    if not trainer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trainer profile not found"
        )
    
    # Calculate date range
    now = datetime.utcnow()
    if time_range == "week":
        start_date = now - timedelta(days=7)
    elif time_range == "month":
        start_date = now - timedelta(days=30)
    else:  # quarter
        start_date = now - timedelta(days=90)
    
    # Get analytics service
    analytics = AnalyticsService(db)
    
    # Get dashboard data
    dashboard_data = await analytics.get_trainer_dashboard(trainer.id, start_date, now)
    
    return dashboard_data


# Client Management
@router.get("/clients")
async def get_trainer_clients(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    fitness_level: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get trainer's clients with filtering"""
    trainer = db.query(Trainer).filter(Trainer.user_id == current_user.id).first()
    
    if not trainer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trainer profile not found"
        )
    
    # Build query
    query = db.query(User).join(
        trainer.clients
    )
    
    # Apply filters
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                User.first_name.ilike(search_term),
                User.last_name.ilike(search_term),
                User.email.ilike(search_term)
            )
        )
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    clients = query.offset(skip).limit(limit).all()
    
    return {
        "clients": clients,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.post("/clients/{client_id}/feedback", response_model=TrainerFeedbackSchema)
async def add_client_feedback(
    client_id: str,
    feedback_data: TrainerFeedbackCreateSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add feedback for a client's workout session"""
    trainer = db.query(Trainer).filter(Trainer.user_id == current_user.id).first()
    
    if not trainer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trainer profile not found"
        )
    
    # Verify client relationship
    client = db.query(User).filter(User.id == client_id).first()
    if not client or client not in trainer.clients:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found or not associated with trainer"
        )
    
    # Create feedback
    feedback = TrainerFeedback(
        trainer_id=trainer.id,
        client_id=client_id,
        session_id=feedback_data.session_id,
        rating=feedback_data.rating,
        comments=feedback_data.comments,
        suggestions=feedback_data.suggestions,
        next_steps=feedback_data.next_steps,
        annotated_video_url=feedback_data.annotated_video_url
    )
    
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    
    # Send notification to client
    notification_service = NotificationService(db)
    await notification_service.send_feedback_notification(client_id, trainer.id, feedback.id)
    
    return feedback


# Team Management
@router.post("/teams", response_model=TeamSchema)
async def create_team(
    team_data: TeamCreateSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new team"""
    trainer = db.query(Trainer).filter(Trainer.user_id == current_user.id).first()
    
    if not trainer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trainer profile not found"
        )
    
    # Check team limit (optional business rule)
    team_count = db.query(Team).filter(Team.trainer_id == trainer.id, Team.is_active == True).count()
    if team_count >= 10:  # Limit to 10 active teams per trainer
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum number of teams reached"
        )
    
    team = Team(
        name=team_data.name,
        description=team_data.description,
        trainer_id=trainer.id,
        is_public=team_data.is_public,
        max_members=team_data.max_members
    )
    
    db.add(team)
    db.commit()
    db.refresh(team)
    
    return team


@router.get("/teams", response_model=List[TeamSchema])
async def get_trainer_teams(
    include_inactive: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get trainer's teams"""
    trainer = db.query(Trainer).filter(Trainer.user_id == current_user.id).first()
    
    if not trainer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trainer profile not found"
        )
    
    query = db.query(Team).filter(Team.trainer_id == trainer.id)
    
    if not include_inactive:
        query = query.filter(Team.is_active == True)
    
    teams = query.order_by(desc(Team.created_at)).all()
    
    # Add member count to each team
    for team in teams:
        team.member_count = len(team.members)
    
    return teams


@router.post("/teams/{team_id}/invite", response_model=TeamInvitationSchema)
async def invite_to_team(
    team_id: str,
    invitation_data: TeamInvitationCreateSchema,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Invite members to a team"""
    trainer = db.query(Trainer).filter(Trainer.user_id == current_user.id).first()
    
    if not trainer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trainer profile not found"
        )
    
    team = db.query(Team).filter(
        Team.id == team_id,
        Team.trainer_id == trainer.id
    ).first()
    
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )
    
    # Check if invitation already exists
    existing = db.query(TeamInvitation).filter(
        TeamInvitation.team_id == team_id,
        TeamInvitation.invitee_email == invitation_data.invitee_email,
        TeamInvitation.status == InvitationStatus.PENDING
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation already sent to this email"
        )
    
    # Create invitation
    invitation = TeamInvitation(
        team_id=team_id,
        trainer_id=trainer.id,
        invitee_email=invitation_data.invitee_email,
        invitee_name=invitation_data.invitee_name,
        message=invitation_data.message,
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    
    # Send invitation email
    notification_service = NotificationService(db)
    background_tasks.add_task(
        notification_service.send_team_invitation,
        invitation.id
    )
    
    return invitation


# Challenge Management
@router.post("/challenges", response_model=ChallengeSchema)
async def create_challenge(
    challenge_data: ChallengeCreateSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new challenge"""
    trainer = db.query(Trainer).filter(Trainer.user_id == current_user.id).first()
    
    if not trainer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trainer profile not found"
        )
    
    # Validate team if team challenge
    if challenge_data.type.value == "team" and challenge_data.team_id:
        team = db.query(Team).filter(
            Team.id == challenge_data.team_id,
            Team.trainer_id == trainer.id
        ).first()
        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Team not found"
            )
    
    # Calculate dates
    start_date = datetime.utcnow()
    end_date = start_date + timedelta(days=challenge_data.duration_days)
    
    challenge = Challenge(
        title=challenge_data.title,
        description=challenge_data.description,
        type=challenge_data.type,
        metric=challenge_data.metric,
        target_value=challenge_data.target_value,
        duration_days=challenge_data.duration_days,
        start_date=start_date,
        end_date=end_date,
        rewards=challenge_data.rewards,
        rules=challenge_data.rules,
        created_by_trainer_id=trainer.id,
        team_id=challenge_data.team_id
    )
    
    db.add(challenge)
    db.commit()
    db.refresh(challenge)
    
    # Add participant count
    challenge.participant_count = 0
    
    return challenge


@router.get("/challenges", response_model=List[ChallengeSchema])
async def get_trainer_challenges(
    status_filter: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get trainer's challenges"""
    trainer = db.query(Trainer).filter(Trainer.user_id == current_user.id).first()
    
    if not trainer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trainer profile not found"
        )
    
    query = db.query(Challenge).filter(Challenge.created_by_trainer_id == trainer.id)
    
    if status_filter:
        query = query.filter(Challenge.status == status_filter)
    
    challenges = query.order_by(desc(Challenge.created_at)).all()
    
    # Add participant count
    for challenge in challenges:
        challenge.participant_count = len(challenge.participants)
    
    return challenges


@router.put("/challenges/{challenge_id}/status")
async def update_challenge_status(
    challenge_id: str,
    new_status: ChallengeStatus,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update challenge status (start, complete, cancel)"""
    trainer = db.query(Trainer).filter(Trainer.user_id == current_user.id).first()
    
    if not trainer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trainer profile not found"
        )
    
    challenge = db.query(Challenge).filter(
        Challenge.id == challenge_id,
        Challenge.created_by_trainer_id == trainer.id
    ).first()
    
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found"
        )
    
    # Validate status transition
    valid_transitions = {
        ChallengeStatus.DRAFT: [ChallengeStatus.ACTIVE, ChallengeStatus.CANCELLED],
        ChallengeStatus.ACTIVE: [ChallengeStatus.COMPLETED, ChallengeStatus.CANCELLED],
        ChallengeStatus.COMPLETED: [],
        ChallengeStatus.CANCELLED: []
    }
    
    if new_status not in valid_transitions.get(challenge.status, []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition from {challenge.status} to {new_status}"
        )
    
    challenge.status = new_status
    challenge.updated_at = datetime.utcnow()
    
    # If activating, ensure start date is now
    if new_status == ChallengeStatus.ACTIVE:
        challenge.start_date = datetime.utcnow()
        challenge.end_date = challenge.start_date + timedelta(days=challenge.duration_days)
    
    db.commit()
    
    return {"message": f"Challenge status updated to {new_status}"}


# Form Alerts
@router.post("/alerts", response_model=FormAlertSchema)
async def create_form_alert(
    alert_data: FormAlertCreateSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a form alert for a client"""
    trainer = db.query(Trainer).filter(Trainer.user_id == current_user.id).first()
    
    if not trainer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trainer profile not found"
        )
    
    # Verify client relationship
    client = db.query(User).filter(User.id == alert_data.client_id).first()
    if not client or client not in trainer.clients:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found or not associated with trainer"
        )
    
    alert = FormAlert(
        trainer_id=trainer.id,
        client_id=alert_data.client_id,
        session_id=alert_data.session_id,
        alert_type=alert_data.alert_type,
        severity=alert_data.severity,
        description=alert_data.description,
        recommendations=alert_data.recommendations
    )
    
    db.add(alert)
    db.commit()
    db.refresh(alert)
    
    # Send notification to client
    notification_service = NotificationService(db)
    await notification_service.send_form_alert_notification(
        alert_data.client_id, trainer.id, alert.id
    )
    
    return alert


@router.get("/alerts")
async def get_form_alerts(
    unresolved_only: bool = Query(True),
    severity: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get form alerts for trainer's clients"""
    trainer = db.query(Trainer).filter(Trainer.user_id == current_user.id).first()
    
    if not trainer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trainer profile not found"
        )
    
    query = db.query(FormAlert).filter(FormAlert.trainer_id == trainer.id)
    
    if unresolved_only:
        query = query.filter(FormAlert.is_resolved == False)
    
    if severity:
        query = query.filter(FormAlert.severity == severity)
    
    # Get total count
    total = query.count()
    
    # Apply pagination and ordering
    alerts = query.order_by(desc(FormAlert.created_at)).offset(skip).limit(limit).all()
    
    return {
        "alerts": alerts,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.put("/alerts/{alert_id}/resolve")
async def resolve_form_alert(
    alert_id: str,
    resolution_notes: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resolve a form alert"""
    trainer = db.query(Trainer).filter(Trainer.user_id == current_user.id).first()
    
    if not trainer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trainer profile not found"
        )
    
    alert = db.query(FormAlert).filter(
        FormAlert.id == alert_id,
        FormAlert.trainer_id == trainer.id
    ).first()
    
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
    
    alert.is_resolved = True
    alert.resolved_at = datetime.utcnow()
    alert.resolution_notes = resolution_notes
    
    db.commit()
    
    return {"message": "Alert resolved successfully"}


# Analytics
@router.get("/analytics/overview")
async def get_trainer_analytics(
    period: str = Query("month", regex="^(week|month|quarter|year)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive trainer analytics"""
    trainer = db.query(Trainer).filter(Trainer.user_id == current_user.id).first()
    
    if not trainer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trainer profile not found"
        )
    
    analytics = AnalyticsService(db)
    
    # Calculate date range
    now = datetime.utcnow()
    if period == "week":
        start_date = now - timedelta(days=7)
    elif period == "month":
        start_date = now - timedelta(days=30)
    elif period == "quarter":
        start_date = now - timedelta(days=90)
    else:  # year
        start_date = now - timedelta(days=365)
    
    analytics_data = await analytics.get_trainer_analytics(trainer.id, start_date, now)
    
    return analytics_data


# Leaderboards
@router.get("/leaderboards", response_model=List[LeaderboardSchema])
async def get_trainer_leaderboards(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get leaderboards for trainer's teams"""
    trainer = db.query(Trainer).filter(Trainer.user_id == current_user.id).first()
    
    if not trainer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trainer profile not found"
        )
    
    # Get leaderboards for trainer's teams
    leaderboards = db.query(Leaderboard).join(Team).filter(
        Team.trainer_id == trainer.id,
        Leaderboard.is_active == True
    ).options(
        joinedload(Leaderboard.entries).joinedload(LeaderboardEntry.user)
    ).all()
    
    return leaderboards


# Statistics
@router.get("/statistics")
async def get_trainer_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get key trainer statistics"""
    trainer = db.query(Trainer).filter(Trainer.user_id == current_user.id).first()
    
    if not trainer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trainer profile not found"
        )
    
    # Get various statistics
    total_clients = len(trainer.clients)
    active_teams = db.query(Team).filter(
        Team.trainer_id == trainer.id,
        Team.is_active == True
    ).count()
    
    active_challenges = db.query(Challenge).filter(
        Challenge.created_by_trainer_id == trainer.id,
        Challenge.status == ChallengeStatus.ACTIVE
    ).count()
    
    unresolved_alerts = db.query(FormAlert).filter(
        FormAlert.trainer_id == trainer.id,
        FormAlert.is_resolved == False
    ).count()
    
    # Calculate average client rating (from feedback)
    avg_rating = db.query(func.avg(TrainerFeedback.rating)).filter(
        TrainerFeedback.trainer_id == trainer.id
    ).scalar() or 0.0
    
    return {
        "total_clients": total_clients,
        "active_teams": active_teams,
        "active_challenges": active_challenges,
        "unresolved_alerts": unresolved_alerts,
        "average_rating": round(avg_rating, 2),
        "verification_status": trainer.verification_status,
        "experience_years": trainer.experience_years,
        "specialties": trainer.specialties
    } 