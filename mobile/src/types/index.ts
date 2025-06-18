/**
 * Core type definitions for RepRight mobile application
 */

// Pose Detection Types
export interface PoseLandmark {
    x: number;
    y: number;
    z: number;
    visibility: number;
}

export interface PoseKeypoints {
    leftShoulder: PoseLandmark;
    rightShoulder: PoseLandmark;
    leftHip: PoseLandmark;
    rightHip: PoseLandmark;
    leftKnee: PoseLandmark;
    rightKnee: PoseLandmark;
    leftAnkle: PoseLandmark;
    rightAnkle: PoseLandmark;
    nose: PoseLandmark;
}

// Workout Types
export type ExerciseType = 'squat' | 'deadlift';

export interface RepMetrics {
    repNumber: number;
    timestamp: number;
    hipAngle: number;
    spineAngle: number;
    formScore: number; // 0-100
    isGoodForm: boolean;
    depth: number; // for squats
}

export interface WorkoutSession {
    id: string;
    userId: string;
    exerciseType: ExerciseType;
    startTime: number;
    endTime?: number;
    reps: RepMetrics[];
    averageFormScore: number;
    videoUri?: string;
    isUploaded: boolean;
    createdAt: number;
}

// User & Auth Types
export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isPro: boolean;
    createdAt: number;
    settings: UserSettings;
}

export interface UserSettings {
    syncEnabled: boolean;
    hapticFeedback: boolean;
    voiceCues: boolean;
    targetSpineAngle: number; // degrees, default 5
    targetHipAngle: number; // degrees, default 70
    units: 'metric' | 'imperial';
}

// API Response Types
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    error?: string;
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: User;
}

export interface UploadResponse {
    uploadUrl: string;
    sessionId: string;
}

// Navigation Types
export type RootStackParamList = {
    Home: undefined;
    Camera: {
        exerciseType: ExerciseType;
    };
    History: undefined;
    Settings: undefined;
    Auth: undefined;
    WorkoutDetail: {
        sessionId: string;
    };
};

// Form Analysis Types
export interface FormAnalysis {
    isGoodForm: boolean;
    spineAngle: number;
    hipAngle: number;
    feedback: string[];
    score: number;
}

// Real-time Feedback Types
export interface FeedbackOverlay {
    color: 'green' | 'red' | 'yellow';
    message: string;
    icon: 'checkmark' | 'warning' | 'error';
}

// Storage Types
export interface LocalStorageData {
    user?: User;
    authTokens?: {
        accessToken: string;
        refreshToken: string;
    };
    workoutSessions: WorkoutSession[];
    settings: UserSettings;
    lastSync: number;
}

// Error Types
export interface AppError extends Error {
    code: string;
    statusCode?: number;
    retryable?: boolean;
}

// Component Props Types
export interface CameraScreenProps {
    exerciseType: ExerciseType;
    onSessionComplete: (session: WorkoutSession) => void;
}

export interface PoseOverlayProps {
    keypoints: PoseKeypoints;
    feedback: FeedbackOverlay;
    repCount: number;
    currentFormScore: number;
}

export interface WorkoutHistoryProps {
    sessions: WorkoutSession[];
    onSessionSelect: (sessionId: string) => void;
    isLoading: boolean;
}

// Analytics Types
export interface SessionAnalytics {
    totalReps: number;
    averageFormScore: number;
    goodFormPercentage: number;
    improvementTrend: number; // percentage change from last session
    commonIssues: string[];
} 