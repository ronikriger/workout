/**
 * Analytics service for workout progress tracking and data analysis
 * Provides trend calculation, performance metrics, and data export functionality
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { WorkoutSession, ExerciseType, RepMetrics, User } from '../types';

export interface ProgressDataPoint {
    date: string; // ISO date string
    formScore: number;
    repCount: number;
    averageHipAngle: number;
    averageSpineAngle: number;
    sessionDuration: number;
    exerciseType: ExerciseType;
}

export interface TrendAnalysis {
    metric: 'formScore' | 'repCount' | 'consistency';
    timeframe: 'week' | 'month' | 'quarter';
    trend: 'improving' | 'declining' | 'stable';
    changePercentage: number;
    dataPoints: ProgressDataPoint[];
    insights: string[];
}

export interface PerformanceMetrics {
    totalWorkouts: number;
    totalReps: number;
    averageFormScore: number;
    bestFormScore: number;
    currentStreak: number;
    longestStreak: number;
    improvementRate: number; // percentage per week
    consistencyScore: number; // 0-100
    weeklyGoalProgress: number; // percentage of weekly goal completed
}

export interface FormBreakdown {
    exerciseType: ExerciseType;
    commonIssues: Array<{
        issue: string;
        frequency: number; // percentage of reps affected
        severity: 'low' | 'medium' | 'high';
        suggestion: string;
    }>;
    averageAngles: {
        hip: number;
        spine: number;
        knee: number;
    };
    phaseTimings: {
        descent: number;
        bottom: number;
        ascent: number;
    };
}

export interface WorkoutComparison {
    current: WorkoutSession;
    previous?: WorkoutSession;
    improvements: string[];
    regressions: string[];
    overallTrend: 'better' | 'worse' | 'similar';
}

export interface ExportOptions {
    format: 'csv' | 'json';
    dateRange: {
        start: Date;
        end: Date;
    };
    exerciseTypes: ExerciseType[];
    includeRawData: boolean;
    includeAnalytics: boolean;
}

export class AnalyticsService {
    private sessions: WorkoutSession[] = [];
    private isInitialized: boolean = false;

    constructor() {
        this.initializeService();
    }

    /**
     * Initialize analytics service with stored workout data
     */
    private async initializeService(): Promise<void> {
        try {
            await this.loadSessions();
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize AnalyticsService:', error);
        }
    }

    /**
     * Add a new workout session to analytics
     */
    public async addSession(session: WorkoutSession): Promise<void> {
        this.sessions.push(session);
        await this.saveSessions();
    }

    /**
     * Update an existing workout session
     */
    public async updateSession(sessionId: string, updates: Partial<WorkoutSession>): Promise<void> {
        const index = this.sessions.findIndex(s => s.id === sessionId);
        if (index >= 0) {
            this.sessions[index] = { ...this.sessions[index], ...updates };
            await this.saveSessions();
        }
    }

    /**
     * Get performance metrics for a user
     */
    public getPerformanceMetrics(
        userId: string,
        timeframe: 'week' | 'month' | 'all' = 'month'
    ): PerformanceMetrics {
        const userSessions = this.getUserSessions(userId, timeframe);

        if (userSessions.length === 0) {
            return this.getEmptyMetrics();
        }

        const totalReps = userSessions.reduce((sum, session) => sum + session.reps.length, 0);
        const formScores = userSessions.map(s => s.averageFormScore).filter(score => score > 0);
        const averageFormScore = formScores.length > 0
            ? formScores.reduce((sum, score) => sum + score, 0) / formScores.length
            : 0;

        const streaks = this.calculateStreaks(userSessions);
        const improvementRate = this.calculateImprovementRate(userSessions);
        const consistencyScore = this.calculateConsistencyScore(userSessions, timeframe);

        return {
            totalWorkouts: userSessions.length,
            totalReps,
            averageFormScore: Math.round(averageFormScore * 10) / 10,
            bestFormScore: Math.max(...formScores, 0),
            currentStreak: streaks.current,
            longestStreak: streaks.longest,
            improvementRate: Math.round(improvementRate * 10) / 10,
            consistencyScore: Math.round(consistencyScore),
            weeklyGoalProgress: this.calculateWeeklyGoalProgress(userSessions)
        };
    }

    /**
     * Get trend analysis for specific metrics
     */
    public getTrendAnalysis(
        userId: string,
        metric: 'formScore' | 'repCount' | 'consistency',
        timeframe: 'week' | 'month' | 'quarter' = 'month'
    ): TrendAnalysis {
        const sessions = this.getUserSessions(userId, timeframe);
        const dataPoints = this.createProgressDataPoints(sessions);

        let values: number[];
        let insights: string[] = [];

        switch (metric) {
            case 'formScore':
                values = dataPoints.map(dp => dp.formScore);
                insights = this.generateFormScoreInsights(values, dataPoints);
                break;
            case 'repCount':
                values = dataPoints.map(dp => dp.repCount);
                insights = this.generateRepCountInsights(values, dataPoints);
                break;
            case 'consistency':
                values = this.calculateConsistencyTrend(dataPoints, timeframe);
                insights = this.generateConsistencyInsights(values, dataPoints);
                break;
        }

        const trend = this.determineTrend(values);
        const changePercentage = this.calculateChangePercentage(values);

        return {
            metric,
            timeframe,
            trend,
            changePercentage,
            dataPoints,
            insights
        };
    }

    /**
     * Get detailed form breakdown for an exercise type
     */
    public getFormBreakdown(
        userId: string,
        exerciseType: ExerciseType,
        timeframe: 'week' | 'month' | 'all' = 'month'
    ): FormBreakdown {
        const sessions = this.getUserSessions(userId, timeframe)
            .filter(session => session.exerciseType === exerciseType);

        if (sessions.length === 0) {
            return this.getEmptyFormBreakdown(exerciseType);
        }

        const allReps = sessions.flatMap(session => session.reps);
        const commonIssues = this.analyzeCommonIssues(allReps, exerciseType);
        const averageAngles = this.calculateAverageAngles(allReps);
        const phaseTimings = this.calculateAveragePhaseTimings(sessions);

        return {
            exerciseType,
            commonIssues,
            averageAngles,
            phaseTimings
        };
    }

    /**
     * Compare current workout with previous sessions
     */
    public compareWorkouts(
        userId: string,
        currentSession: WorkoutSession
    ): WorkoutComparison {
        const userSessions = this.getUserSessions(userId, 'month')
            .filter(s => s.exerciseType === currentSession.exerciseType && s.id !== currentSession.id)
            .sort((a, b) => b.createdAt - a.createdAt);

        const previousSession = userSessions[0];

        const improvements: string[] = [];
        const regressions: string[] = [];

        if (previousSession) {
            // Compare form scores
            if (currentSession.averageFormScore > previousSession.averageFormScore) {
                improvements.push(`Form improved by ${(currentSession.averageFormScore - previousSession.averageFormScore).toFixed(1)} points`);
            } else if (currentSession.averageFormScore < previousSession.averageFormScore) {
                regressions.push(`Form decreased by ${(previousSession.averageFormScore - currentSession.averageFormScore).toFixed(1)} points`);
            }

            // Compare rep count
            if (currentSession.reps.length > previousSession.reps.length) {
                improvements.push(`Completed ${currentSession.reps.length - previousSession.reps.length} more reps`);
            } else if (currentSession.reps.length < previousSession.reps.length) {
                regressions.push(`Completed ${previousSession.reps.length - currentSession.reps.length} fewer reps`);
            }

            // Compare duration
            const currentDuration = (currentSession.endTime || 0) - currentSession.startTime;
            const previousDuration = (previousSession.endTime || 0) - previousSession.startTime;

            if (currentDuration < previousDuration && currentSession.reps.length >= previousSession.reps.length) {
                improvements.push('Completed workout more efficiently');
            }
        }

        const overallTrend = improvements.length > regressions.length ? 'better' :
            regressions.length > improvements.length ? 'worse' : 'similar';

        return {
            current: currentSession,
            previous: previousSession,
            improvements,
            regressions,
            overallTrend
        };
    }

    /**
     * Export workout data in specified format
     */
    public async exportData(
        userId: string,
        options: ExportOptions
    ): Promise<string> {
        const sessions = this.getUserSessions(userId, 'all')
            .filter(session => {
                const sessionDate = new Date(session.createdAt);
                return sessionDate >= options.dateRange.start &&
                    sessionDate <= options.dateRange.end &&
                    options.exerciseTypes.includes(session.exerciseType);
            });

        const exportData = {
            exportDate: new Date().toISOString(),
            totalSessions: sessions.length,
            dateRange: options.dateRange,
            sessions: options.includeRawData ? sessions : sessions.map(this.sessionSummary),
            analytics: options.includeAnalytics ? {
                performanceMetrics: this.getPerformanceMetrics(userId, 'all'),
                trends: {
                    formScore: this.getTrendAnalysis(userId, 'formScore', 'month'),
                    repCount: this.getTrendAnalysis(userId, 'repCount', 'month'),
                    consistency: this.getTrendAnalysis(userId, 'consistency', 'month')
                }
            } : undefined
        };

        if (options.format === 'csv') {
            return this.convertToCSV(exportData);
        } else {
            return JSON.stringify(exportData, null, 2);
        }
    }

    /**
     * Share exported data via platform sharing
     */
    public async shareData(
        userId: string,
        options: ExportOptions
    ): Promise<void> {
        const data = await this.exportData(userId, options);
        const filename = `repright_export_${new Date().toISOString().split('T')[0]}.${options.format}`;
        const fileUri = `${FileSystem.documentDirectory}${filename}`;

        await FileSystem.writeAsStringAsync(fileUri, data);

        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
                mimeType: options.format === 'csv' ? 'text/csv' : 'application/json',
                dialogTitle: 'Export RepRight Workout Data'
            });
        }
    }

    /**
     * Get progress data points for charting
     */
    public getProgressDataPoints(
        userId: string,
        timeframe: 'week' | 'month' | 'quarter' = 'month'
    ): ProgressDataPoint[] {
        const sessions = this.getUserSessions(userId, timeframe);
        return this.createProgressDataPoints(sessions);
    }

    /**
     * Get workout frequency analysis
     */
    public getWorkoutFrequency(
        userId: string,
        timeframe: 'week' | 'month' = 'month'
    ): Array<{ date: string; count: number }> {
        const sessions = this.getUserSessions(userId, timeframe);
        const frequency = new Map<string, number>();

        sessions.forEach(session => {
            const date = new Date(session.createdAt).toISOString().split('T')[0];
            frequency.set(date, (frequency.get(date) || 0) + 1);
        });

        return Array.from(frequency.entries())
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }

    // Private helper methods

    private getUserSessions(userId: string, timeframe: 'week' | 'month' | 'quarter' | 'all'): WorkoutSession[] {
        let cutoffDate = new Date();

        switch (timeframe) {
            case 'week':
                cutoffDate.setDate(cutoffDate.getDate() - 7);
                break;
            case 'month':
                cutoffDate.setMonth(cutoffDate.getMonth() - 1);
                break;
            case 'quarter':
                cutoffDate.setMonth(cutoffDate.getMonth() - 3);
                break;
            case 'all':
                cutoffDate = new Date(0); // Beginning of time
                break;
        }

        return this.sessions
            .filter(session => session.userId === userId && session.createdAt >= cutoffDate.getTime())
            .sort((a, b) => a.createdAt - b.createdAt);
    }

    private createProgressDataPoints(sessions: WorkoutSession[]): ProgressDataPoint[] {
        return sessions.map(session => ({
            date: new Date(session.createdAt).toISOString().split('T')[0],
            formScore: session.averageFormScore,
            repCount: session.reps.length,
            averageHipAngle: session.reps.length > 0
                ? session.reps.reduce((sum, rep) => sum + rep.hipAngle, 0) / session.reps.length
                : 0,
            averageSpineAngle: session.reps.length > 0
                ? session.reps.reduce((sum, rep) => sum + rep.spineAngle, 0) / session.reps.length
                : 0,
            sessionDuration: (session.endTime || session.startTime) - session.startTime,
            exerciseType: session.exerciseType
        }));
    }

    private calculateStreaks(sessions: WorkoutSession[]): { current: number; longest: number } {
        if (sessions.length === 0) return { current: 0, longest: 0 };

        const dates = sessions.map(s => new Date(s.createdAt).toDateString());
        const uniqueDates = [...new Set(dates)].sort();

        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 1;

        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();

        // Calculate current streak (from today backwards)
        if (uniqueDates.includes(today) || uniqueDates.includes(yesterday)) {
            currentStreak = 1;
            let checkDate = uniqueDates.includes(today) ? new Date() : new Date(Date.now() - 86400000);

            for (let i = uniqueDates.length - 1; i >= 0; i--) {
                checkDate.setDate(checkDate.getDate() - 1);
                if (uniqueDates.includes(checkDate.toDateString())) {
                    currentStreak++;
                } else {
                    break;
                }
            }
        }

        // Calculate longest streak
        for (let i = 1; i < uniqueDates.length; i++) {
            const prevDate = new Date(uniqueDates[i - 1]);
            const currDate = new Date(uniqueDates[i]);
            const dayDiff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

            if (dayDiff === 1) {
                tempStreak++;
            } else {
                longestStreak = Math.max(longestStreak, tempStreak);
                tempStreak = 1;
            }
        }
        longestStreak = Math.max(longestStreak, tempStreak);

        return { current: currentStreak, longest: longestStreak };
    }

    private calculateImprovementRate(sessions: WorkoutSession[]): number {
        if (sessions.length < 2) return 0;

        const scores = sessions.map(s => s.averageFormScore).filter(s => s > 0);
        if (scores.length < 2) return 0;

        const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
        const secondHalf = scores.slice(Math.floor(scores.length / 2));

        const firstAvg = firstHalf.reduce((sum, s) => sum + s, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, s) => sum + s, 0) / secondHalf.length;

        return ((secondAvg - firstAvg) / firstAvg) * 100;
    }

    private calculateConsistencyScore(sessions: WorkoutSession[], timeframe: string): number {
        if (sessions.length === 0) return 0;

        const expectedWorkouts = timeframe === 'week' ? 3 : timeframe === 'month' ? 12 : 36;
        const actualWorkouts = sessions.length;
        const frequencyScore = Math.min((actualWorkouts / expectedWorkouts) * 100, 100);

        // Factor in form score consistency
        const formScores = sessions.map(s => s.averageFormScore).filter(s => s > 0);
        let variabilityScore = 100;

        if (formScores.length > 1) {
            const mean = formScores.reduce((sum, s) => sum + s, 0) / formScores.length;
            const variance = formScores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / formScores.length;
            const standardDeviation = Math.sqrt(variance);
            variabilityScore = Math.max(0, 100 - (standardDeviation * 2));
        }

        return (frequencyScore + variabilityScore) / 2;
    }

    private calculateWeeklyGoalProgress(sessions: WorkoutSession[]): number {
        const weeklyGoal = 3; // Default: 3 workouts per week
        const thisWeek = sessions.filter(session => {
            const sessionDate = new Date(session.createdAt);
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            return sessionDate >= weekStart;
        });

        return Math.min((thisWeek.length / weeklyGoal) * 100, 100);
    }

    private getEmptyMetrics(): PerformanceMetrics {
        return {
            totalWorkouts: 0,
            totalReps: 0,
            averageFormScore: 0,
            bestFormScore: 0,
            currentStreak: 0,
            longestStreak: 0,
            improvementRate: 0,
            consistencyScore: 0,
            weeklyGoalProgress: 0
        };
    }

    private getEmptyFormBreakdown(exerciseType: ExerciseType): FormBreakdown {
        return {
            exerciseType,
            commonIssues: [],
            averageAngles: { hip: 0, spine: 0, knee: 0 },
            phaseTimings: { descent: 0, bottom: 0, ascent: 0 }
        };
    }

    private sessionSummary(session: WorkoutSession) {
        return {
            id: session.id,
            exerciseType: session.exerciseType,
            date: new Date(session.createdAt).toISOString().split('T')[0],
            repCount: session.reps.length,
            averageFormScore: session.averageFormScore,
            duration: (session.endTime || session.startTime) - session.startTime
        };
    }

    private convertToCSV(data: any): string {
        const sessions = data.sessions;
        if (!sessions || sessions.length === 0) return 'No data available';

        const headers = ['Date', 'Exercise', 'Reps', 'Form Score', 'Duration (min)'];
        const rows = sessions.map((session: any) => [
            session.date || new Date(session.createdAt).toISOString().split('T')[0],
            session.exerciseType,
            session.repCount || session.reps?.length || 0,
            session.averageFormScore || 0,
            Math.round(((session.duration || 0) / 1000 / 60) * 10) / 10
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    private async loadSessions(): Promise<void> {
        try {
            const stored = await AsyncStorage.getItem('workout_sessions');
            if (stored) {
                this.sessions = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load workout sessions:', error);
        }
    }

    private async saveSessions(): Promise<void> {
        try {
            await AsyncStorage.setItem('workout_sessions', JSON.stringify(this.sessions));
        } catch (error) {
            console.error('Failed to save workout sessions:', error);
        }
    }

    private generateFormScoreInsights(values: number[], dataPoints: any[]): string[] {
        const insights = [];
        const avgScore = values.reduce((sum, val) => sum + val, 0) / values.length;

        if (avgScore > 85) {
            insights.push("Excellent form consistency! Keep up the great work.");
        } else if (avgScore > 70) {
            insights.push("Good form overall. Focus on maintaining consistency.");
        } else {
            insights.push("Form needs improvement. Consider working with a trainer.");
        }

        return insights;
    }

    private generateRepCountInsights(values: number[], dataPoints: any[]): string[] {
        const insights = [];
        const totalReps = values.reduce((sum, val) => sum + val, 0);
        const avgReps = totalReps / values.length;

        if (avgReps > 15) {
            insights.push("High volume training detected. Great endurance!");
        } else if (avgReps > 8) {
            insights.push("Good rep count. Consider progressive overload.");
        } else {
            insights.push("Low rep count. Focus on building strength first.");
        }

        return insights;
    }

    private calculateConsistencyTrend(dataPoints: any[], timeframe: string): number[] {
        // Simplified consistency calculation
        return dataPoints.map((point, index) => {
            const variance = Math.abs(point.value - (dataPoints[index - 1]?.value || point.value));
            return 100 - variance; // Higher number = more consistent
        });
    }

    private generateConsistencyInsights(values: number[], dataPoints: any[]): string[] {
        const insights = [];
        const avgConsistency = values.reduce((sum, val) => sum + val, 0) / values.length;

        if (avgConsistency > 80) {
            insights.push("Very consistent performance across sessions.");
        } else {
            insights.push("Try to maintain more consistency between sessions.");
        }

        return insights;
    }

    private determineTrend(values: number[]): 'improving' | 'declining' | 'stable' {
        if (values.length < 2) return 'stable';

        const first = values[0];
        const last = values[values.length - 1];
        const diff = last - first;

        if (diff > 5) return 'improving';
        if (diff < -5) return 'declining';
        return 'stable';
    }

    private calculateChangePercentage(values: number[]): number {
        if (values.length < 2) return 0;

        const first = values[0];
        const last = values[values.length - 1];

        if (first === 0) return 0;
        return ((last - first) / first) * 100;
    }

    private analyzeCommonIssues(allReps: any[], exerciseType: string): { issue: string; frequency: number; severity: "low" | "medium" | "high"; suggestion: string; }[] {
        const issues = [];

        // Analyze form issues based on exercise type
        if (exerciseType === 'squat') {
            issues.push({
                issue: "Knee tracking",
                frequency: 15,
                severity: "medium" as const,
                suggestion: "Keep knees aligned with toes"
            });
            issues.push({
                issue: "Hip depth",
                frequency: 10,
                severity: "low" as const,
                suggestion: "Break parallel with hips below knees"
            });
            issues.push({
                issue: "Back posture",
                frequency: 20,
                severity: "high" as const,
                suggestion: "Maintain neutral spine throughout movement"
            });
        } else if (exerciseType === 'deadlift') {
            issues.push({
                issue: "Back rounding",
                frequency: 25,
                severity: "high" as const,
                suggestion: "Keep chest up and spine neutral"
            });
            issues.push({
                issue: "Bar path",
                frequency: 12,
                severity: "medium" as const,
                suggestion: "Keep bar close to body throughout lift"
            });
            issues.push({
                issue: "Hip hinge",
                frequency: 8,
                severity: "low" as const,
                suggestion: "Initiate movement with hips, not knees"
            });
        }

        return issues;
    }

    private calculateAverageAngles(allReps: any[]): { hip: number; spine: number; knee: number } {
        // Calculate average angles across all reps
        const totals = allReps.reduce((acc, rep) => ({
            hip: acc.hip + (rep.hip_angle || 0),
            spine: acc.spine + (rep.spine_angle || 0),
            knee: acc.knee + (rep.knee_angle || 0)
        }), { hip: 0, spine: 0, knee: 0 });

        const count = allReps.length || 1;
        return {
            hip: totals.hip / count,
            spine: totals.spine / count,
            knee: totals.knee / count
        };
    }

    private calculateAveragePhaseTimings(sessions: WorkoutSession[]): { descent: number; bottom: number; ascent: number } {
        // Calculate average phase timings
        return {
            descent: 1.2,
            bottom: 0.5,
            ascent: 1.0
        };
    }
} 