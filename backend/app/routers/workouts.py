from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
import shutil
import os
import asyncio

from app.db.session import get_db
from app.models.user import User
from app.models.workout import WorkoutSession, WorkoutSessionCreate, WorkoutSessionRead
from app.services.auth_service import auth_service, get_current_active_user
from app.services.video_processor import WorkoutVideoProcessor

router = APIRouter()

# Ensure the directory for video uploads exists
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

async def process_and_update_session(session_id: int, video_path: str, exercise_type: str, db: Session):
    """
    Processes the video and updates the session in the database.
    """
    processor = WorkoutVideoProcessor()
    try:
        analysis_results = await processor.process_video(video_path, exercise_type, video_id=str(session_id))
        
        session = db.query(WorkoutSession).filter(WorkoutSession.id == session_id).first()
        if session:
            session.duration = analysis_results.duration
            session.total_reps = analysis_results.total_reps
            session.average_form_score = analysis_results.average_form_score
            session.analysis_data = analysis_results.summary
            session.status = "completed"
            db.commit()

    except Exception as e:
        session = db.query(WorkoutSession).filter(WorkoutSession.id == session_id).first()
        if session:
            session.status = "failed"
            session.analysis_data = {"error": str(e)}
            db.commit()
    finally:
        # Clean up the uploaded file
        if os.path.exists(video_path):
            os.remove(video_path)


@router.post("/upload", response_model=WorkoutSessionRead, status_code=status.HTTP_202_ACCEPTED)
async def upload_workout_video(
    background_tasks: BackgroundTasks,
    exercise_type: str = Form(...),
    video: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Upload a workout video, save it, and start background processing.
    """
    file_path = os.path.join(UPLOAD_DIR, video.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)

    # Create and save the workout session
    new_session = WorkoutSession(
        user_id=current_user.id,
        exercise_type=exercise_type,
        video_path=file_path,
        status="processing"
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    background_tasks.add_task(process_and_update_session, new_session.id, file_path, exercise_type, db)

    return new_session

@router.get("/", response_model=List[WorkoutSessionRead])
def get_user_workouts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Retrieve all workout sessions for the current user.
    """
    return db.query(WorkoutSession).filter(WorkoutSession.user_id == current_user.id).order_by(WorkoutSession.created_at.desc()).all()


@router.get("/{session_id}", response_model=WorkoutSessionRead)
def get_workout_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Retrieve a single workout session by its ID.
    """
    session = db.query(WorkoutSession).filter(WorkoutSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout session not found")
    
    if session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this session")

    return session 