"""
Video processing service for workout analysis
Uses OpenCV and MediaPipe to analyze uploaded workout videos
"""

import cv2
import mediapipe as mp
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
import logging
from pathlib import Path
import json
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class PoseLandmark:
    """Single pose landmark with coordinates and visibility"""
    x: float
    y: float
    z: float
    visibility: float


@dataclass
class FrameAnalysis:
    """Analysis results for a single frame"""
    frame_number: int
    timestamp: float
    hip_angle: float
    spine_angle: float
    knee_angle: float
    form_score: int
    is_good_form: bool
    rep_phase: str  # 'descent', 'bottom', 'ascent', 'top'


@dataclass
class RepAnalysis:
    """Complete rep analysis"""
    rep_number: int
    start_frame: int
    end_frame: int
    duration: float
    max_depth_angle: float
    average_form_score: float
    form_issues: List[str]
    phase_timings: Dict[str, float]


@dataclass
class VideoAnalysisResult:
    """Complete video analysis result"""
    video_id: str
    exercise_type: str
    total_frames: int
    fps: float
    duration: float
    total_reps: int
    average_form_score: float
    reps: List[RepAnalysis]
    frame_analyses: List[FrameAnalysis]
    summary: Dict[str, Any]


class WorkoutVideoProcessor:
    """
    Video processor for analyzing workout form using MediaPipe and OpenCV
    """
    
    def __init__(self):
        """Initialize MediaPipe pose detection"""
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=2,
            smooth_landmarks=True,
            enable_segmentation=False,
            smooth_segmentation=False,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.mp_drawing = mp.solutions.drawing_utils
        
        # Rep counting state
        self.reset_rep_counter()
    
    def reset_rep_counter(self):
        """Reset rep counting state"""
        self.current_rep = 0
        self.is_in_bottom_position = False
        self.rep_start_frame = 0
        self.last_hip_angle = 180.0
        self.rep_analyses: List[RepAnalysis] = []
        self.current_rep_frames: List[FrameAnalysis] = []
    
    async def process_video(
        self, 
        video_path: str, 
        exercise_type: str = "squat",
        video_id: str = None
    ) -> VideoAnalysisResult:
        """
        Process complete workout video and return analysis
        
        Args:
            video_path: Path to video file
            exercise_type: Type of exercise ('squat' or 'deadlift')
            video_id: Unique identifier for the video
            
        Returns:
            VideoAnalysisResult with complete analysis
        """
        logger.info(f"Starting video analysis for {video_path}")
        
        if not Path(video_path).exists():
            raise FileNotFoundError(f"Video file not found: {video_path}")
        
        # Open video
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video file: {video_path}")
        
        # Get video properties
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps > 0 else 0
        
        logger.info(f"Video properties: {total_frames} frames, {fps} FPS, {duration:.2f}s")
        
        # Reset state
        self.reset_rep_counter()
        frame_analyses: List[FrameAnalysis] = []
        
        frame_number = 0
        
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Process frame
                timestamp = frame_number / fps if fps > 0 else 0
                analysis = await self._process_frame(
                    frame, frame_number, timestamp, exercise_type
                )
                
                if analysis:
                    frame_analyses.append(analysis)
                
                frame_number += 1
                
                # Log progress every 30 frames
                if frame_number % 30 == 0:
                    progress = (frame_number / total_frames) * 100
                    logger.info(f"Processing progress: {progress:.1f}%")
        
        finally:
            cap.release()
        
        # Finalize any incomplete rep
        if self.current_rep_frames:
            self._finalize_current_rep(frame_number, fps)
        
        # Calculate summary statistics
        summary = self._calculate_summary(frame_analyses, self.rep_analyses)
        
        result = VideoAnalysisResult(
            video_id=video_id or f"video_{datetime.now().timestamp()}",
            exercise_type=exercise_type,
            total_frames=total_frames,
            fps=fps,
            duration=duration,
            total_reps=len(self.rep_analyses),
            average_form_score=summary["average_form_score"],
            reps=self.rep_analyses,
            frame_analyses=frame_analyses,
            summary=summary
        )
        
        logger.info(f"Video analysis complete: {len(self.rep_analyses)} reps detected")
        return result
    
    async def _process_frame(
        self, 
        frame: np.ndarray, 
        frame_number: int, 
        timestamp: float,
        exercise_type: str
    ) -> Optional[FrameAnalysis]:
        """Process single frame and return analysis"""
        
        # Convert BGR to RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Process with MediaPipe
        results = self.pose.process(rgb_frame)
        
        if not results.pose_landmarks:
            return None
        
        # Extract keypoints
        landmarks = results.pose_landmarks.landmark
        keypoints = self._extract_keypoints(landmarks)
        
        # Calculate angles
        hip_angle = self._calculate_hip_angle(keypoints)
        spine_angle = self._calculate_spine_angle(keypoints)
        knee_angle = self._calculate_knee_angle(keypoints)
        
        # Determine rep phase and update counting
        rep_phase = self._determine_rep_phase(hip_angle, exercise_type)
        
        # Calculate form score
        form_score = self._calculate_form_score(hip_angle, spine_angle, exercise_type)
        is_good_form = form_score >= 70
        
        # Create frame analysis
        analysis = FrameAnalysis(
            frame_number=frame_number,
            timestamp=timestamp,
            hip_angle=hip_angle,
            spine_angle=spine_angle,
            knee_angle=knee_angle,
            form_score=form_score,
            is_good_form=is_good_form,
            rep_phase=rep_phase
        )
        
        # Update rep tracking
        self._update_rep_tracking(analysis, exercise_type)
        
        return analysis
    
    def _extract_keypoints(self, landmarks) -> Dict[str, PoseLandmark]:
        """Extract relevant keypoints from MediaPipe landmarks"""
        keypoint_indices = {
            'nose': 0,
            'left_shoulder': 11,
            'right_shoulder': 12,
            'left_hip': 23,
            'right_hip': 24,
            'left_knee': 25,
            'right_knee': 26,
            'left_ankle': 27,
            'right_ankle': 28
        }
        
        keypoints = {}
        for name, idx in keypoint_indices.items():
            landmark = landmarks[idx]
            keypoints[name] = PoseLandmark(
                x=landmark.x,
                y=landmark.y,
                z=landmark.z,
                visibility=landmark.visibility
            )
        
        return keypoints
    
    def _calculate_hip_angle(self, keypoints: Dict[str, PoseLandmark]) -> float:
        """Calculate hip angle using hip, knee, and ankle landmarks"""
        try:
            # Use average of left and right side
            hip = self._average_point(keypoints['left_hip'], keypoints['right_hip'])
            knee = self._average_point(keypoints['left_knee'], keypoints['right_knee'])
            ankle = self._average_point(keypoints['left_ankle'], keypoints['right_ankle'])
            
            # Calculate vectors
            thigh_vector = np.array([knee.x - hip.x, knee.y - hip.y])
            shin_vector = np.array([ankle.x - knee.x, ankle.y - knee.y])
            
            # Calculate angle
            angle_rad = np.arccos(
                np.clip(
                    np.dot(thigh_vector, shin_vector) / 
                    (np.linalg.norm(thigh_vector) * np.linalg.norm(shin_vector)),
                    -1.0, 1.0
                )
            )
            
            return np.degrees(angle_rad)
            
        except (ZeroDivisionError, ValueError):
            return 180.0  # Default to straight leg
    
    def _calculate_spine_angle(self, keypoints: Dict[str, PoseLandmark]) -> float:
        """Calculate spine angle from vertical"""
        try:
            shoulder = self._average_point(
                keypoints['left_shoulder'], 
                keypoints['right_shoulder']
            )
            hip = self._average_point(keypoints['left_hip'], keypoints['right_hip'])
            
            # Vector from hip to shoulder
            spine_vector = np.array([shoulder.x - hip.x, shoulder.y - hip.y])
            vertical_vector = np.array([0, -1])  # Pointing up
            
            # Calculate angle from vertical
            angle_rad = np.arccos(
                np.clip(
                    np.dot(spine_vector, vertical_vector) / np.linalg.norm(spine_vector),
                    -1.0, 1.0
                )
            )
            
            return np.degrees(angle_rad)
            
        except (ZeroDivisionError, ValueError):
            return 0.0  # Default to vertical
    
    def _calculate_knee_angle(self, keypoints: Dict[str, PoseLandmark]) -> float:
        """Calculate knee angle"""
        try:
            hip = self._average_point(keypoints['left_hip'], keypoints['right_hip'])
            knee = self._average_point(keypoints['left_knee'], keypoints['right_knee'])
            ankle = self._average_point(keypoints['left_ankle'], keypoints['right_ankle'])
            
            # Vectors
            thigh_vector = np.array([hip.x - knee.x, hip.y - knee.y])
            shin_vector = np.array([ankle.x - knee.x, ankle.y - knee.y])
            
            # Angle
            angle_rad = np.arccos(
                np.clip(
                    np.dot(thigh_vector, shin_vector) / 
                    (np.linalg.norm(thigh_vector) * np.linalg.norm(shin_vector)),
                    -1.0, 1.0
                )
            )
            
            return np.degrees(angle_rad)
            
        except (ZeroDivisionError, ValueError):
            return 180.0
    
    def _average_point(self, p1: PoseLandmark, p2: PoseLandmark) -> PoseLandmark:
        """Calculate average of two landmarks"""
        return PoseLandmark(
            x=(p1.x + p2.x) / 2,
            y=(p1.y + p2.y) / 2,
            z=(p1.z + p2.z) / 2,
            visibility=(p1.visibility + p2.visibility) / 2
        )
    
    def _determine_rep_phase(self, hip_angle: float, exercise_type: str) -> str:
        """Determine current phase of the rep"""
        if exercise_type == "squat":
            if hip_angle > 150:
                return "top"
            elif hip_angle < 90:
                return "bottom"
            elif hip_angle < self.last_hip_angle:
                return "descent"
            else:
                return "ascent"
        else:  # deadlift
            if hip_angle > 160:
                return "top"
            elif hip_angle < 100:
                return "bottom"
            elif hip_angle < self.last_hip_angle:
                return "descent"
            else:
                return "ascent"
        
        self.last_hip_angle = hip_angle
    
    def _calculate_form_score(
        self, hip_angle: float, spine_angle: float, exercise_type: str
    ) -> int:
        """Calculate form score (0-100)"""
        score = 100
        
        # Penalize spine deviation from vertical (5 degrees tolerance)
        spine_penalty = max(0, abs(spine_angle) - 5) * 2
        score -= min(spine_penalty, 40)
        
        # Exercise-specific scoring
        if exercise_type == "squat":
            # Reward depth in bottom position
            if hip_angle < 90:
                depth_bonus = max(0, (90 - hip_angle) / 20 * 10)
                score += min(depth_bonus, 10)
        
        return max(0, min(100, int(score)))
    
    def _update_rep_tracking(self, analysis: FrameAnalysis, exercise_type: str):
        """Update rep counting based on current frame analysis"""
        self.current_rep_frames.append(analysis)
        
        # Rep detection logic
        threshold = 70 if exercise_type == "squat" else 100
        
        if analysis.hip_angle < threshold and not self.is_in_bottom_position:
            # Entering bottom position
            self.is_in_bottom_position = True
            self.rep_start_frame = analysis.frame_number
            
        elif analysis.hip_angle > 150 and self.is_in_bottom_position:
            # Completing rep
            self.is_in_bottom_position = False
            self._finalize_current_rep(analysis.frame_number, 30.0)  # Assume 30 FPS
    
    def _finalize_current_rep(self, end_frame: int, fps: float):
        """Finalize the current rep and add to analysis"""
        if not self.current_rep_frames:
            return
        
        self.current_rep += 1
        
        # Calculate rep statistics
        duration = len(self.current_rep_frames) / fps
        form_scores = [f.form_score for f in self.current_rep_frames]
        average_form_score = sum(form_scores) / len(form_scores)
        
        # Find max depth
        min_hip_angle = min(f.hip_angle for f in self.current_rep_frames)
        
        # Identify form issues
        form_issues = []
        spine_angles = [f.spine_angle for f in self.current_rep_frames]
        if max(spine_angles) > 15:
            form_issues.append("Excessive forward lean")
        if min_hip_angle > 90:
            form_issues.append("Insufficient depth")
        
        # Calculate phase timings
        phase_timings = self._calculate_phase_timings(self.current_rep_frames, fps)
        
        rep_analysis = RepAnalysis(
            rep_number=self.current_rep,
            start_frame=self.rep_start_frame,
            end_frame=end_frame,
            duration=duration,
            max_depth_angle=min_hip_angle,
            average_form_score=average_form_score,
            form_issues=form_issues,
            phase_timings=phase_timings
        )
        
        self.rep_analyses.append(rep_analysis)
        self.current_rep_frames = []
    
    def _calculate_phase_timings(
        self, frames: List[FrameAnalysis], fps: float
    ) -> Dict[str, float]:
        """Calculate timing for each phase of the rep"""
        phase_frames = {"descent": 0, "bottom": 0, "ascent": 0, "top": 0}
        
        for frame in frames:
            phase_frames[frame.rep_phase] += 1
        
        return {
            phase: count / fps for phase, count in phase_frames.items()
        }
    
    def _calculate_summary(
        self, 
        frames: List[FrameAnalysis], 
        reps: List[RepAnalysis]
    ) -> Dict[str, Any]:
        """Calculate summary statistics"""
        if not frames:
            return {"average_form_score": 0, "good_form_percentage": 0}
        
        total_form_score = sum(f.form_score for f in frames)
        average_form_score = total_form_score / len(frames)
        
        good_form_frames = sum(1 for f in frames if f.is_good_form)
        good_form_percentage = (good_form_frames / len(frames)) * 100
        
        rep_form_scores = [r.average_form_score for r in reps]
        average_rep_score = sum(rep_form_scores) / len(rep_form_scores) if reps else 0
        
        return {
            "average_form_score": round(average_form_score, 1),
            "good_form_percentage": round(good_form_percentage, 1),
            "average_rep_score": round(average_rep_score, 1),
            "total_frames_analyzed": len(frames),
            "frames_with_pose": len(frames)
        } 