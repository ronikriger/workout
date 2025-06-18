/**
 * TypeScript definitions for RepRight Coach Dashboard
 * Comprehensive types for trainer management and client progress tracking
 */

export interface User {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    role: 'client' | 'trainer' | 'admin';
    createdAt: string;
    isActive: boolean;
    subscription?: 'free' | 'pro';
}

export interface Trainer extends User {
    role: 'trainer';
    certification: string;
    specialties: string[];
    experience: number; // years
    bio: string;
    rating: number;
    totalClients: number;
    verificationStatus: 'pending' | 'verified' | 'rejected';
    credentials: TrainerCredential[];
}

export interface TrainerCredential {
    id: string;
    type: 'certification' | 'education' | 'experience';
    title: string;
    organization: string;
    dateObtained: string;
    expiryDate?: string;
    documentUrl?: string;
    isVerified: boolean;
}

export interface Client extends User {
    role: 'client';
    trainerId?: string;
    goals: string[];
    fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
    injuries?: string[];
    preferences: ClientPreferences;
    stats: ClientStats;
}

export interface ClientPreferences {
    exerciseTypes: string[];
    workoutDuration: number; // minutes
    frequency: number; // per week
    notifications: boolean;
    publicProfile: boolean;
}

export interface ClientStats {
    totalWorkouts: number;
    totalReps: number;
    averageFormScore: number;
    currentStreak: number;
    longestStreak: number;
    favoriteExercise: string;
    totalTimeSpent: number; // minutes
    lastWorkout?: string;
}

export interface WorkoutSession {
    id: string;
    userId: string;
    trainerId?: string;
    exerciseType: 'squat' | 'deadlift';
    startTime: string;
    endTime: string;
    duration: number; // seconds
    reps: RepData[];
    averageFormScore: number;
    videoUri?: string;
    notes?: string;
    trainerFeedback?: TrainerFeedback;
    isReviewed: boolean;
    createdAt: string;
}

export interface RepData {
    repNumber: number;
    formScore: number;
    hipAngle: number;
    spineAngle: number;
    duration: number;
    phase: 'descent' | 'bottom' | 'ascent' | 'top';
    timestamp: number;
    issues: string[];
}

export interface TrainerFeedback {
    id: string;
    trainerId: string;
    sessionId: string;
    rating: number; // 1-5
    comments: string;
    suggestions: string[];
    annotatedVideoUrl?: string;
    createdAt: string;
    isRead: boolean;
}

export interface FormAlert {
    id: string;
    clientId: string;
    sessionId: string;
    alertType: 'poor_form' | 'injury_risk' | 'plateau' | 'regression';
    severity: 'low' | 'medium' | 'high';
    description: string;
    recommendations: string[];
    isResolved: boolean;
    createdAt: string;
    resolvedAt?: string;
}

export interface WorkoutPlan {
    id: string;
    trainerId: string;
    clientId: string;
    title: string;
    description: string;
    exercises: PlannedExercise[];
    duration: number; // weeks
    startDate: string;
    endDate: string;
    status: 'draft' | 'active' | 'completed' | 'paused';
    progress: number; // percentage
    createdAt: string;
}

export interface PlannedExercise {
    exerciseType: 'squat' | 'deadlift';
    sets: number;
    reps: number;
    targetFormScore: number;
    notes: string;
    completed: boolean;
    actualSets?: number;
    actualReps?: number;
    achievedFormScore?: number;
}

export interface ClientProgress {
    client: Client;
    recentSessions: WorkoutSession[];
    progressTrend: ProgressDataPoint[];
    currentPlan?: WorkoutPlan;
    alerts: FormAlert[];
    lastActivity: string;
    complianceRate: number; // percentage
    improvementRate: number; // percentage
}

export interface ProgressDataPoint {
    date: string;
    formScore: number;
    reps: number;
    duration: number;
    exerciseType: string;
}

export interface CoachDashboard {
    clients: ClientProgress[];
    recentWorkouts: WorkoutSession[];
    formAlerts: FormAlert[];
    assignments: WorkoutPlan[];
    statistics: CoachStatistics;
    notifications: Notification[];
}

export interface CoachStatistics {
    totalClients: number;
    activeClients: number;
    averageClientProgress: number;
    totalSessionsReviewed: number;
    averageResponseTime: number; // hours
    clientSatisfactionRating: number;
    revenueThisMonth: number;
    newClientsThisMonth: number;
}

export interface Notification {
    id: string;
    type: 'new_client' | 'session_review' | 'form_alert' | 'message' | 'plan_complete';
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    actionUrl?: string;
    priority: 'low' | 'medium' | 'high';
}

export interface VideoAnnotation {
    id: string;
    sessionId: string;
    trainerId: string;
    timestamp: number; // seconds
    type: 'text' | 'drawing' | 'highlight';
    content: string;
    position: {
        x: number;
        y: number;
    };
    color: string;
    size: number;
    createdAt: string;
}

export interface ClientInvitation {
    id: string;
    trainerId: string;
    email: string;
    firstName: string;
    lastName: string;
    message: string;
    status: 'pending' | 'accepted' | 'declined' | 'expired';
    sentAt: string;
    respondedAt?: string;
    expiresAt: string;
}

export interface Team {
    id: string;
    name: string;
    description: string;
    trainerId: string;
    members: Client[];
    totalMembers: number;
    createdAt: string;
    isActive: boolean;
    avatar?: string;
    stats: TeamStats;
}

export interface TeamStats {
    totalWorkouts: number;
    averageFormScore: number;
    totalReps: number;
    activeMembers: number;
    topPerformer: string;
    weeklyGoalCompletion: number;
}

export interface Leaderboard {
    id: string;
    name: string;
    type: 'team' | 'individual';
    metric: 'form_score' | 'total_reps' | 'consistency' | 'improvement';
    period: 'daily' | 'weekly' | 'monthly' | 'all_time';
    entries: LeaderboardEntry[];
    lastUpdated: string;
}

export interface LeaderboardEntry {
    rank: number;
    userId: string;
    username: string;
    avatar?: string;
    score: number;
    change: number; // rank change
    teamName?: string;
}

export interface ExerciseLibrary {
    id: string;
    name: string;
    type: 'squat' | 'deadlift';
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    description: string;
    instructions: string[];
    videoUrl: string;
    commonMistakes: string[];
    tips: string[];
    targetMuscles: string[];
    equipment: string[];
    variations: string[];
}

export interface SessionComparison {
    sessions: WorkoutSession[];
    metrics: ComparisonMetric[];
    improvements: string[];
    concerns: string[];
    recommendations: string[];
}

export interface ComparisonMetric {
    name: string;
    values: number[];
    trend: 'improving' | 'stable' | 'declining';
    change: number; // percentage
}

export interface BulkAnalysis {
    clientId: string;
    dateRange: {
        start: string;
        end: string;
    };
    totalSessions: number;
    averageFormScore: number;
    progressTrend: 'improving' | 'stable' | 'declining';
    keyInsights: string[];
    recommendations: string[];
    riskFactors: string[];
}

// API Response types
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    errors?: string[];
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// Form types
export interface LoginForm {
    email: string;
    password: string;
    rememberMe: boolean;
}

export interface TrainerRegistrationForm {
    email: string;
    password: string;
    confirmPassword: string;
    firstName: string;
    lastName: string;
    certification: string;
    experience: number;
    specialties: string[];
    bio: string;
    agreeToTerms: boolean;
}

export interface ClientInviteForm {
    email: string;
    firstName: string;
    lastName: string;
    message: string;
    initialPlan?: string;
}

export interface WorkoutPlanForm {
    title: string;
    description: string;
    clientId: string;
    duration: number;
    exercises: PlannedExercise[];
    startDate: string;
}

export interface FeedbackForm {
    rating: number;
    comments: string;
    suggestions: string[];
    nextSteps: string;
}

// Filter and search types
export interface ClientFilter {
    search?: string;
    fitnessLevel?: string;
    lastActivity?: 'today' | 'week' | 'month';
    planStatus?: string;
    sortBy?: 'name' | 'lastActivity' | 'progress' | 'formScore';
    sortOrder?: 'asc' | 'desc';
}

export interface SessionFilter {
    clientId?: string;
    exerciseType?: string;
    dateRange?: {
        start: string;
        end: string;
    };
    minFormScore?: number;
    hasVideo?: boolean;
    isReviewed?: boolean;
}

// Chart data types
export interface ChartDataPoint {
    label: string;
    value: number;
    date?: string;
    category?: string;
}

export interface TimeSeriesData {
    timestamp: string;
    value: number;
    label?: string;
}

export interface BarChartData {
    category: string;
    value: number;
    color?: string;
}

export interface PieChartData {
    name: string;
    value: number;
    percentage: number;
    color: string;
} 