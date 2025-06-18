"""
Unit tests for video processing service
Tests video analysis, pose detection, and rep counting logic
"""

import pytest
import numpy as np
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path
import tempfile
import cv2
from dataclasses import asdict

from app.services.video_processor import (
    WorkoutVideoProcessor,
    PoseLandmark,
    FrameAnalysis,
    RepAnalysis,
    VideoAnalysisResult
)


class TestWorkoutVideoProcessor:
    """Test suite for WorkoutVideoProcessor"""
    
    @pytest.fixture
    def processor(self):
        """Create processor instance for testing"""
        return WorkoutVideoProcessor()
    
    @pytest.fixture
    def mock_pose_landmarks(self):
        """Mock MediaPipe pose landmarks"""
        landmarks = []
        # Create 33 landmarks (MediaPipe pose model has 33 landmarks)
        for i in range(33):
            landmark = Mock()
            landmark.x = 0.5 + (i * 0.01)  # Slight variation
            landmark.y = 0.5 + (i * 0.01)
            landmark.z = 0.0
            landmark.visibility = 0.9
            landmarks.append(landmark)
        return landmarks
    
    @pytest.fixture
    def sample_keypoints(self):
        """Sample keypoints for testing"""
        return {
            'nose': PoseLandmark(x=0.5, y=0.3, z=0.0, visibility=0.9),
            'left_shoulder': PoseLandmark(x=0.4, y=0.4, z=0.0, visibility=0.9),
            'right_shoulder': PoseLandmark(x=0.6, y=0.4, z=0.0, visibility=0.9),
            'left_hip': PoseLandmark(x=0.4, y=0.6, z=0.0, visibility=0.9),
            'right_hip': PoseLandmark(x=0.6, y=0.6, z=0.0, visibility=0.9),
            'left_knee': PoseLandmark(x=0.4, y=0.8, z=0.0, visibility=0.9),
            'right_knee': PoseLandmark(x=0.6, y=0.8, z=0.0, visibility=0.9),
            'left_ankle': PoseLandmark(x=0.4, y=1.0, z=0.0, visibility=0.9),
            'right_ankle': PoseLandmark(x=0.6, y=1.0, z=0.0, visibility=0.9),
        }
    
    def test_initialization(self, processor):
        """Test processor initialization"""
        assert processor.mp_pose is not None
        assert processor.pose is not None
        assert processor.current_rep == 0
        assert not processor.is_in_bottom_position
        assert processor.rep_analyses == []
    
    def test_reset_rep_counter(self, processor):
        """Test rep counter reset functionality"""
        # Set some state
        processor.current_rep = 5
        processor.is_in_bottom_position = True
        processor.rep_start_frame = 100
        processor.rep_analyses = [Mock()]
        
        # Reset
        processor.reset_rep_counter()
        
        # Verify reset
        assert processor.current_rep == 0
        assert not processor.is_in_bottom_position
        assert processor.rep_start_frame == 0
        assert processor.rep_analyses == []
        assert processor.current_rep_frames == []
    
    def test_extract_keypoints(self, processor, mock_pose_landmarks):
        """Test keypoint extraction from MediaPipe landmarks"""
        keypoints = processor._extract_keypoints(mock_pose_landmarks)
        
        # Check that all expected keypoints are extracted
        expected_keypoints = [
            'nose', 'left_shoulder', 'right_shoulder', 'left_hip', 'right_hip',
            'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
        ]
        
        for keypoint_name in expected_keypoints:
            assert keypoint_name in keypoints
            assert isinstance(keypoints[keypoint_name], PoseLandmark)
            assert 0 <= keypoints[keypoint_name].x <= 1
            assert 0 <= keypoints[keypoint_name].y <= 1
    
    def test_calculate_hip_angle(self, processor, sample_keypoints):
        """Test hip angle calculation"""
        # Test with straight leg (should be close to 180 degrees)
        straight_keypoints = sample_keypoints.copy()
        angle = processor._calculate_hip_angle(straight_keypoints)
        assert 170 <= angle <= 180
        
        # Test with bent leg (modify knee position)
        bent_keypoints = sample_keypoints.copy()
        bent_keypoints['left_knee'] = PoseLandmark(x=0.3, y=0.7, z=0.0, visibility=0.9)
        bent_keypoints['right_knee'] = PoseLandmark(x=0.7, y=0.7, z=0.0, visibility=0.9)
        angle = processor._calculate_hip_angle(bent_keypoints)
        assert 90 <= angle <= 170
    
    def test_calculate_spine_angle(self, processor, sample_keypoints):
        """Test spine angle calculation"""
        # Test with upright spine (should be close to 0 degrees)
        upright_keypoints = sample_keypoints.copy()
        angle = processor._calculate_spine_angle(upright_keypoints)
        assert -5 <= angle <= 5
        
        # Test with forward lean
        leaning_keypoints = sample_keypoints.copy()
        leaning_keypoints['left_shoulder'] = PoseLandmark(x=0.3, y=0.4, z=0.0, visibility=0.9)
        leaning_keypoints['right_shoulder'] = PoseLandmark(x=0.5, y=0.4, z=0.0, visibility=0.9)
        angle = processor._calculate_spine_angle(leaning_keypoints)
        assert angle > 10  # Should show forward lean
    
    def test_calculate_knee_angle(self, processor, sample_keypoints):
        """Test knee angle calculation"""
        angle = processor._calculate_knee_angle(sample_keypoints)
        assert 0 <= angle <= 180
    
    def test_average_point(self, processor):
        """Test point averaging utility"""
        p1 = PoseLandmark(x=0.0, y=0.0, z=0.0, visibility=1.0)
        p2 = PoseLandmark(x=1.0, y=1.0, z=1.0, visibility=0.8)
        
        avg = processor._average_point(p1, p2)
        
        assert avg.x == 0.5
        assert avg.y == 0.5
        assert avg.z == 0.5
        assert avg.visibility == 0.9
    
    def test_determine_rep_phase_squat(self, processor):
        """Test rep phase determination for squats"""
        processor.last_hip_angle = 150
        
        # Test top position
        phase = processor._determine_rep_phase(160, "squat")
        assert phase == "top"
        
        # Test bottom position
        phase = processor._determine_rep_phase(80, "squat")
        assert phase == "bottom"
        
        # Test descent
        processor.last_hip_angle = 140
        phase = processor._determine_rep_phase(120, "squat")
        assert phase == "descent"
        
        # Test ascent
        processor.last_hip_angle = 100
        phase = processor._determine_rep_phase(120, "squat")
        assert phase == "ascent"
    
    def test_determine_rep_phase_deadlift(self, processor):
        """Test rep phase determination for deadlifts"""
        processor.last_hip_angle = 150
        
        # Test top position
        phase = processor._determine_rep_phase(170, "deadlift")
        assert phase == "top"
        
        # Test bottom position
        phase = processor._determine_rep_phase(90, "deadlift")
        assert phase == "bottom"
    
    def test_calculate_form_score(self, processor):
        """Test form score calculation"""
        # Perfect form (upright spine, good depth)
        score = processor._calculate_form_score(hip_angle=70, spine_angle=2, exercise_type="squat")
        assert score >= 90
        
        # Poor form (forward lean)
        score = processor._calculate_form_score(hip_angle=70, spine_angle=20, exercise_type="squat")
        assert score <= 70
        
        # Deadlift scoring
        score = processor._calculate_form_score(hip_angle=100, spine_angle=3, exercise_type="deadlift")
        assert score >= 90
    
    def test_update_rep_tracking_squat(self, processor):
        """Test rep tracking for squats"""
        processor.exercise_type = "squat"
        
        # Create frame analysis for bottom position
        bottom_analysis = FrameAnalysis(
            frame_number=10,
            timestamp=0.33,
            hip_angle=65,  # Below threshold
            spine_angle=5,
            knee_angle=60,
            form_score=85,
            is_good_form=True,
            rep_phase="bottom"
        )
        
        processor._update_rep_tracking(bottom_analysis, "squat")
        assert processor.is_in_bottom_position
        assert processor.rep_start_frame == 10
        
        # Create frame analysis for top position (completing rep)
        top_analysis = FrameAnalysis(
            frame_number=30,
            timestamp=1.0,
            hip_angle=160,  # Above threshold
            spine_angle=3,
            knee_angle=170,
            form_score=90,
            is_good_form=True,
            rep_phase="top"
        )
        
        processor._update_rep_tracking(top_analysis, "squat")
        assert not processor.is_in_bottom_position
        assert processor.current_rep == 1
    
    def test_finalize_current_rep(self, processor):
        """Test rep finalization"""
        # Setup current rep frames
        processor.current_rep_frames = [
            FrameAnalysis(1, 0.1, 150, 5, 150, 90, True, "descent"),
            FrameAnalysis(2, 0.2, 100, 6, 100, 85, True, "bottom"),
            FrameAnalysis(3, 0.3, 80, 7, 80, 80, True, "bottom"),
            FrameAnalysis(4, 0.4, 120, 5, 120, 88, True, "ascent"),
            FrameAnalysis(5, 0.5, 160, 4, 160, 92, True, "top"),
        ]
        processor.rep_start_frame = 1
        
        processor._finalize_current_rep(end_frame=5, fps=30.0)
        
        assert len(processor.rep_analyses) == 1
        rep = processor.rep_analyses[0]
        assert rep.rep_number == 1
        assert rep.start_frame == 1
        assert rep.end_frame == 5
        assert rep.max_depth_angle == 80  # Min hip angle
        assert rep.average_form_score == 87  # Average of form scores
        assert processor.current_rep_frames == []  # Should be cleared
    
    def test_calculate_phase_timings(self, processor):
        """Test phase timing calculations"""
        frames = [
            FrameAnalysis(1, 0.1, 150, 5, 150, 90, True, "descent"),
            FrameAnalysis(2, 0.2, 100, 6, 100, 85, True, "descent"),
            FrameAnalysis(3, 0.3, 80, 7, 80, 80, True, "bottom"),
            FrameAnalysis(4, 0.4, 120, 5, 120, 88, True, "ascent"),
            FrameAnalysis(5, 0.5, 160, 4, 160, 92, True, "ascent"),
        ]
        
        timings = processor._calculate_phase_timings(frames, fps=30.0)
        
        assert timings["descent"] == 2 / 30.0  # 2 frames
        assert timings["bottom"] == 1 / 30.0   # 1 frame
        assert timings["ascent"] == 2 / 30.0   # 2 frames
        assert timings["top"] == 0 / 30.0      # 0 frames
    
    def test_calculate_summary(self, processor):
        """Test summary statistics calculation"""
        frame_analyses = [
            FrameAnalysis(1, 0.1, 150, 5, 150, 90, True, "descent"),
            FrameAnalysis(2, 0.2, 100, 6, 100, 70, False, "bottom"),
            FrameAnalysis(3, 0.3, 80, 7, 80, 85, True, "bottom"),
            FrameAnalysis(4, 0.4, 120, 5, 120, 95, True, "ascent"),
        ]
        
        rep_analyses = [
            RepAnalysis(1, 1, 4, 0.133, 80, 85.0, [], {})
        ]
        
        summary = processor._calculate_summary(frame_analyses, rep_analyses)
        
        assert summary["average_form_score"] == 85.0  # (90+70+85+95)/4
        assert summary["good_form_percentage"] == 75.0  # 3 out of 4 frames
        assert summary["average_rep_score"] == 85.0
        assert summary["total_frames_analyzed"] == 4
        assert summary["frames_with_pose"] == 4
    
    @pytest.mark.asyncio
    async def test_process_frame_no_landmarks(self, processor):
        """Test frame processing with no pose landmarks detected"""
        # Create a mock frame
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        
        with patch.object(processor.pose, 'process') as mock_process:
            # Mock no landmarks detected
            mock_result = Mock()
            mock_result.pose_landmarks = None
            mock_process.return_value = mock_result
            
            result = await processor._process_frame(frame, 1, 0.033, "squat")
            assert result is None
    
    @pytest.mark.asyncio
    async def test_process_frame_with_landmarks(self, processor, mock_pose_landmarks):
        """Test frame processing with valid pose landmarks"""
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        
        with patch.object(processor.pose, 'process') as mock_process:
            # Mock successful landmark detection
            mock_result = Mock()
            mock_result.pose_landmarks = Mock()
            mock_result.pose_landmarks.landmark = mock_pose_landmarks
            mock_process.return_value = mock_result
            
            result = await processor._process_frame(frame, 1, 0.033, "squat")
            
            assert result is not None
            assert isinstance(result, FrameAnalysis)
            assert result.frame_number == 1
            assert result.timestamp == 0.033
            assert 0 <= result.hip_angle <= 180
            assert 0 <= result.spine_angle <= 180
            assert 0 <= result.form_score <= 100
            assert result.rep_phase in ["descent", "bottom", "ascent", "top"]
    
    @pytest.mark.asyncio
    async def test_process_video_file_not_found(self, processor):
        """Test video processing with non-existent file"""
        with pytest.raises(FileNotFoundError):
            await processor.process_video("/nonexistent/video.mp4", "squat")
    
    @pytest.mark.asyncio
    async def test_process_video_invalid_file(self, processor):
        """Test video processing with invalid video file"""
        # Create a temporary non-video file
        with tempfile.NamedTemporaryFile(suffix='.txt', delete=False) as tmp:
            tmp.write(b"not a video file")
            tmp_path = tmp.name
        
        try:
            with pytest.raises(ValueError):
                await processor.process_video(tmp_path, "squat")
        finally:
            Path(tmp_path).unlink()  # Clean up
    
    def test_edge_cases_angle_calculation(self, processor):
        """Test edge cases in angle calculations"""
        # Test with zero vectors (should not crash)
        zero_keypoints = {
            'left_hip': PoseLandmark(x=0.5, y=0.5, z=0.0, visibility=0.9),
            'right_hip': PoseLandmark(x=0.5, y=0.5, z=0.0, visibility=0.9),
            'left_knee': PoseLandmark(x=0.5, y=0.5, z=0.0, visibility=0.9),
            'right_knee': PoseLandmark(x=0.5, y=0.5, z=0.0, visibility=0.9),
            'left_ankle': PoseLandmark(x=0.5, y=0.5, z=0.0, visibility=0.9),
            'right_ankle': PoseLandmark(x=0.5, y=0.5, z=0.0, visibility=0.9),
            'left_shoulder': PoseLandmark(x=0.5, y=0.5, z=0.0, visibility=0.9),
            'right_shoulder': PoseLandmark(x=0.5, y=0.5, z=0.0, visibility=0.9),
        }
        
        # Should return default values without crashing
        hip_angle = processor._calculate_hip_angle(zero_keypoints)
        spine_angle = processor._calculate_spine_angle(zero_keypoints)
        knee_angle = processor._calculate_knee_angle(zero_keypoints)
        
        assert isinstance(hip_angle, float)
        assert isinstance(spine_angle, float)
        assert isinstance(knee_angle, float)
    
    def test_form_score_bounds(self, processor):
        """Test that form scores are always within bounds"""
        # Test extreme values
        extreme_scores = [
            processor._calculate_form_score(-100, -100, "squat"),
            processor._calculate_form_score(500, 500, "squat"),
            processor._calculate_form_score(0, 0, "deadlift"),
            processor._calculate_form_score(180, 90, "deadlift"),
        ]
        
        for score in extreme_scores:
            assert 0 <= score <= 100
    
    def test_rep_counting_edge_cases(self, processor):
        """Test rep counting with edge cases"""
        # Test rapid angle changes
        angles = [180, 60, 180, 50, 180, 70, 180]
        
        for i, angle in enumerate(angles):
            analysis = FrameAnalysis(
                frame_number=i,
                timestamp=i * 0.033,
                hip_angle=angle,
                spine_angle=5,
                knee_angle=angle,
                form_score=85,
                is_good_form=True,
                rep_phase="unknown"
            )
            processor._update_rep_tracking(analysis, "squat")
        
        # Should count valid reps without overcounting
        assert processor.current_rep >= 0
        assert processor.current_rep <= 3  # Maximum possible from sequence 