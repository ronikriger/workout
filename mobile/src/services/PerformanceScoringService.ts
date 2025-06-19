import { PoseData } from './PoseDetectionService';
import { FormAnalysisResult } from './FormAnalysisEngine';
import { RepData } from './RepCountingAlgorithm';

// Performance scoring configuration
export interface ScoringWeights {
    jointAlignment: number;
    rangeOfMotion: number;
    tempo: number;
    stability: number;
    consistency: number;
}

export interface BodyTypeNormalization {
    height: number; // meters
    armSpan: number; // meters
    flexibility: 'low' | 'medium' | 'high';
    fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
    age: number;
    previousInjuries: string[];
}

export interface ExerciseCalibration {
    optimalTempoRange: [number, number]; // BPM
    minRangeOfMotion: number; // degrees
    maxRangeOfMotion: number; // degrees
    stabilityThreshold: number; // variance threshold
    perfectFormThreshold: number; // score threshold for "perfect"
}

export interface PerformanceScore {
    overall: number; // 0-100
    components: {
        jointAlignment: ComponentScore;
        rangeOfMotion: ComponentScore;
        tempo: ComponentScore;
        stability: ComponentScore;
        consistency: ComponentScore;
    };
    streakBonus: number;
    bodyTypeAdjustment: number;
    improvementAreas: ImprovementArea[];
    performanceGrade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
    trainerComparison: number; // % match with professional standards
    confidenceLevel: number; // how confident we are in this score
}

export interface ComponentScore {
    raw: number; // 0-100 before adjustments
    adjusted: number; // 0-100 after body type normalization
    weight: number; // importance weight
    contribution: number; // weighted contribution to overall score
    feedback: string;
    trend: 'improving' | 'stable' | 'declining';
}

export interface ImprovementArea {
    component: string;
    currentScore: number;
    targetScore: number;
    priority: 'high' | 'medium' | 'low';
    suggestion: string;
    estimatedTimeToImprove: number; // weeks
}

interface RepPerformanceHistory {
    scores: number[];
    timestamps: number[];
    streakCount: number;
    bestStreak: number;
    averageScore: number;
    recentTrend: number; // positive = improving
}

interface ExerciseSession {
    exerciseType: string;
    startTime: number;
    reps: RepData[];
    formAnalyses: FormAnalysisResult[];
    overallScore: number;
    duration: number;
}

class PerformanceScoringService {
    private exerciseCalibrations: { [key: string]: ExerciseCalibration } = {};
    private scoringWeights: { [key: string]: ScoringWeights } = {};
    private performanceHistory: { [key: string]: RepPerformanceHistory } = {};
    private currentSession: ExerciseSession | null = null;
    private userBodyType: BodyTypeNormalization | null = null;

    // Professional trainer benchmarks (based on fitness industry standards)
    private trainerBenchmarks = {
        squat: {
            jointAlignment: { excellent: 95, good: 85, fair: 70, poor: 50 },
            rangeOfMotion: { excellent: 90, good: 80, fair: 65, poor: 45 },
            tempo: { excellent: 88, good: 78, fair: 65, poor: 50 },
            stability: { excellent: 92, good: 82, fair: 70, poor: 55 }
        },
        pushup: {
            jointAlignment: { excellent: 93, good: 83, fair: 68, poor: 48 },
            rangeOfMotion: { excellent: 87, good: 77, fair: 62, poor: 42 },
            tempo: { excellent: 85, good: 75, fair: 60, poor: 45 },
            stability: { excellent: 90, good: 80, fair: 65, poor: 50 }
        },
        lunge: {
            jointAlignment: { excellent: 91, good: 81, fair: 66, poor: 46 },
            rangeOfMotion: { excellent: 85, good: 75, fair: 60, poor: 40 },
            tempo: { excellent: 83, good: 73, fair: 58, poor: 43 },
            stability: { excellent: 88, good: 78, fair: 63, poor: 48 }
        },
        plank: {
            jointAlignment: { excellent: 96, good: 86, fair: 71, poor: 51 },
            rangeOfMotion: { excellent: 95, good: 85, fair: 70, poor: 50 },
            tempo: { excellent: 90, good: 80, fair: 65, poor: 50 },
            stability: { excellent: 94, good: 84, fair: 69, poor: 49 }
        }
    };

    constructor() {
        this.initializeCalibrations();
        this.initializeScoringWeights();
    }

    private initializeCalibrations(): void {
        this.exerciseCalibrations = {
            squat: {
                optimalTempoRange: [30, 60], // 30-60 seconds per minute (0.5-1 rep per second)
                minRangeOfMotion: 90, // degrees knee flexion
                maxRangeOfMotion: 135, // full squat
                stabilityThreshold: 15, // max acceptable movement variance
                perfectFormThreshold: 92
            },
            pushup: {
                optimalTempoRange: [20, 45],
                minRangeOfMotion: 90, // elbow flexion
                maxRangeOfMotion: 120,
                stabilityThreshold: 12,
                perfectFormThreshold: 90
            },
            lunge: {
                optimalTempoRange: [25, 50],
                minRangeOfMotion: 85,
                maxRangeOfMotion: 130,
                stabilityThreshold: 18,
                perfectFormThreshold: 88
            },
            plank: {
                optimalTempoRange: [1, 5], // holds, not reps
                minRangeOfMotion: 170, // body alignment
                maxRangeOfMotion: 180,
                stabilityThreshold: 8,
                perfectFormThreshold: 94
            }
        };
    }

    private initializeScoringWeights(): void {
        this.scoringWeights = {
            // Weights based on injury prevention and movement quality importance
            squat: {
                jointAlignment: 0.35, // Most important for knee/back safety
                rangeOfMotion: 0.25,  // Functional mobility
                stability: 0.20,      // Core strength and balance
                tempo: 0.15,          // Control and muscle engagement
                consistency: 0.05     // Bonus for maintaining quality
            },
            pushup: {
                jointAlignment: 0.30,
                rangeOfMotion: 0.25,
                stability: 0.25,      // Core stability crucial for push-ups
                tempo: 0.15,
                consistency: 0.05
            },
            lunge: {
                jointAlignment: 0.40, // Critical for knee safety
                stability: 0.25,      // Balance challenge
                rangeOfMotion: 0.20,
                tempo: 0.10,
                consistency: 0.05
            },
            plank: {
                stability: 0.40,      // Primary focus of plank
                jointAlignment: 0.35, // Spine alignment critical
                rangeOfMotion: 0.15,  // Less relevant for isometric
                tempo: 0.05,          // Hold time, not rhythm
                consistency: 0.05
            }
        };
    }

    public setUserBodyType(bodyType: BodyTypeNormalization): void {
        this.userBodyType = bodyType;
    }

    public startSession(exerciseType: string): void {
        this.currentSession = {
            exerciseType,
            startTime: Date.now(),
            reps: [],
            formAnalyses: [],
            overallScore: 0,
            duration: 0
        };

        // Initialize performance history if needed
        if (!this.performanceHistory[exerciseType]) {
            this.performanceHistory[exerciseType] = {
                scores: [],
                timestamps: [],
                streakCount: 0,
                bestStreak: 0,
                averageScore: 0,
                recentTrend: 0
            };
        }
    }

    public endSession(): ExerciseSession | null {
        if (!this.currentSession) return null;

        this.currentSession.duration = Date.now() - this.currentSession.startTime;

        // Calculate overall session score
        if (this.currentSession.formAnalyses.length > 0) {
            const sessionScore = this.calculateSessionScore(this.currentSession);
            this.currentSession.overallScore = sessionScore.overall;
        }

        const session = { ...this.currentSession };
        this.currentSession = null;
        return session;
    }

    public scoreRepPerformance(
        repData: RepData,
        formAnalysis: FormAnalysisResult,
        poseData: PoseData
    ): PerformanceScore {
        if (!this.currentSession) {
            throw new Error('No active session. Call startSession() first.');
        }

        // Add to current session
        this.currentSession.reps.push(repData);
        this.currentSession.formAnalyses.push(formAnalysis);

        const exerciseType = this.currentSession.exerciseType;
        const calibration = this.exerciseCalibrations[exerciseType];
        const weights = this.scoringWeights[exerciseType];

        if (!calibration || !weights) {
            throw new Error(`Unsupported exercise type: ${exerciseType}`);
        }

        // Calculate component scores
        const components = {
            jointAlignment: this.scoreJointAlignment(repData, formAnalysis, exerciseType),
            rangeOfMotion: this.scoreRangeOfMotion(repData, formAnalysis, calibration),
            tempo: this.scoreTempo(repData, calibration),
            stability: this.scoreStability(repData, formAnalysis, calibration),
            consistency: this.scoreConsistency(exerciseType)
        };

        // Apply body type normalization
        Object.keys(components).forEach(key => {
            const component = components[key as keyof typeof components];
            component.adjusted = this.normalizeForBodyType(component.raw, key);
            component.weight = weights[key as keyof ScoringWeights];
            component.contribution = component.adjusted * component.weight;
        });

        // Calculate overall score
        const baseScore = Object.values(components).reduce(
            (sum, comp) => sum + comp.contribution, 0
        );

        // Calculate streak bonus
        const streakBonus = this.calculateStreakBonus(exerciseType, baseScore);

        // Calculate body type adjustment
        const bodyTypeAdjustment = this.calculateBodyTypeAdjustment();

        // Final overall score
        const overall = Math.min(100, Math.max(0, baseScore + streakBonus + bodyTypeAdjustment));

        // Update performance history
        this.updatePerformanceHistory(exerciseType, overall);

        // Calculate improvement areas
        const improvementAreas = this.identifyImprovementAreas(components, exerciseType);

        // Determine performance grade
        const performanceGrade = this.calculateGrade(overall);

        // Compare to trainer standards
        const trainerComparison = this.compareToTrainerStandards(components, exerciseType);

        // Calculate confidence level
        const confidenceLevel = this.calculateConfidenceLevel(formAnalysis, repData);

        const score: PerformanceScore = {
            overall,
            components,
            streakBonus,
            bodyTypeAdjustment,
            improvementAreas,
            performanceGrade,
            trainerComparison,
            confidenceLevel
        };

        return score;
    }

    private scoreJointAlignment(
        repData: RepData,
        formAnalysis: FormAnalysisResult,
        exerciseType: string
    ): ComponentScore {
        let raw = formAnalysis.componentScores.technique;

        // Exercise-specific adjustments
        switch (exerciseType) {
            case 'squat':
                // Penalize knee valgus heavily
                if (formAnalysis.riskFactors.some(risk => risk.includes('knee'))) {
                    raw *= 0.7;
                }
                break;
            case 'pushup':
                // Penalize elbow flare
                if (formAnalysis.feedback.some(f => f.message.includes('elbow'))) {
                    raw *= 0.8;
                }
                break;
            case 'lunge':
                // Critical for knee tracking
                if (formAnalysis.riskFactors.some(risk => risk.includes('knee'))) {
                    raw *= 0.6;
                }
                break;
        }

        return {
            raw: Math.max(0, Math.min(100, raw)),
            adjusted: 0, // Will be set later
            weight: 0, // Will be set later
            contribution: 0, // Will be set later
            feedback: this.generateJointAlignmentFeedback(raw, exerciseType),
            trend: this.calculateComponentTrend('jointAlignment', exerciseType)
        };
    }

    private scoreRangeOfMotion(
        repData: RepData,
        formAnalysis: FormAnalysisResult,
        calibration: ExerciseCalibration
    ): ComponentScore {
        const actualRange = repData.keyMetrics.rangeOfMotion;
        const minRange = calibration.minRangeOfMotion;
        const maxRange = calibration.maxRangeOfMotion;

        // Score based on percentage of optimal range achieved
        let raw = 0;
        if (actualRange >= maxRange) {
            raw = 100; // Perfect full range
        } else if (actualRange >= minRange) {
            // Linear scoring between min and max
            raw = 60 + (40 * (actualRange - minRange) / (maxRange - minRange));
        } else {
            // Below minimum acceptable range
            raw = Math.max(0, (actualRange / minRange) * 60);
        }

        // Bonus for exceeding expectations
        if (actualRange > maxRange) {
            raw = Math.min(100, raw + 5);
        }

        return {
            raw: Math.max(0, Math.min(100, raw)),
            adjusted: 0,
            weight: 0,
            contribution: 0,
            feedback: this.generateRangeOfMotionFeedback(raw, actualRange, minRange),
            trend: this.calculateComponentTrend('rangeOfMotion', this.currentSession?.exerciseType || '')
        };
    }

    private scoreTempo(repData: RepData, calibration: ExerciseCalibration): ComponentScore {
        const actualTempo = 60000 / repData.duration; // Convert to reps per minute
        const [minTempo, maxTempo] = calibration.optimalTempoRange;

        let raw = 0;
        if (actualTempo >= minTempo && actualTempo <= maxTempo) {
            // In optimal range
            raw = 100;
        } else if (actualTempo < minTempo) {
            // Too slow - could indicate weakness or fatigue
            raw = Math.max(30, 100 * (actualTempo / minTempo));
        } else {
            // Too fast - could indicate poor control
            raw = Math.max(20, 100 * (maxTempo / actualTempo));
        }

        return {
            raw: Math.max(0, Math.min(100, raw)),
            adjusted: 0,
            weight: 0,
            contribution: 0,
            feedback: this.generateTempoFeedback(raw, actualTempo, calibration.optimalTempoRange),
            trend: this.calculateComponentTrend('tempo', this.currentSession?.exerciseType || '')
        };
    }

    private scoreStability(
        repData: RepData,
        formAnalysis: FormAnalysisResult,
        calibration: ExerciseCalibration
    ): ComponentScore {
        let raw = formAnalysis.componentScores.stability;

        // Additional stability metrics from rep data
        const movementVariance = repData.keyMetrics.movementVariance || 0;
        if (movementVariance > calibration.stabilityThreshold) {
            raw *= (calibration.stabilityThreshold / movementVariance);
        }

        return {
            raw: Math.max(0, Math.min(100, raw)),
            adjusted: 0,
            weight: 0,
            contribution: 0,
            feedback: this.generateStabilityFeedback(raw, movementVariance),
            trend: this.calculateComponentTrend('stability', this.currentSession?.exerciseType || '')
        };
    }

    private scoreConsistency(exerciseType: string): ComponentScore {
        const history = this.performanceHistory[exerciseType];
        if (!history || history.scores.length < 2) {
            return {
                raw: 100, // No penalty for first reps
                adjusted: 0,
                weight: 0,
                contribution: 0,
                feedback: 'Keep maintaining this quality!',
                trend: 'stable'
            };
        }

        // Calculate coefficient of variation (lower is better)
        const recentScores = history.scores.slice(-5); // Last 5 reps
        const mean = recentScores.reduce((a, b) => a + b) / recentScores.length;
        const variance = recentScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / recentScores.length;
        const cv = Math.sqrt(variance) / mean;

        // Convert CV to score (lower CV = higher score)
        const raw = Math.max(0, 100 - (cv * 200));

        return {
            raw,
            adjusted: 0,
            weight: 0,
            contribution: 0,
            feedback: this.generateConsistencyFeedback(raw, cv),
            trend: this.calculateComponentTrend('consistency', exerciseType)
        };
    }

    private normalizeForBodyType(rawScore: number, component: string): number {
        if (!this.userBodyType) return rawScore;

        let adjustment = 0;

        // Age adjustments
        if (this.userBodyType.age > 60) {
            adjustment += 5; // Bonus for older adults
        } else if (this.userBodyType.age < 25) {
            adjustment -= 2; // Higher expectations for younger adults
        }

        // Flexibility adjustments
        if (component === 'rangeOfMotion') {
            switch (this.userBodyType.flexibility) {
                case 'low': adjustment += 10; break;
                case 'medium': adjustment += 0; break;
                case 'high': adjustment -= 5; break;
            }
        }

        // Fitness level adjustments
        switch (this.userBodyType.fitnessLevel) {
            case 'beginner': adjustment += 8; break;
            case 'intermediate': adjustment += 0; break;
            case 'advanced': adjustment -= 5; break;
        }

        // Previous injury considerations
        if (this.userBodyType.previousInjuries.length > 0) {
            adjustment += 5; // More lenient scoring
        }

        return Math.max(0, Math.min(100, rawScore + adjustment));
    }

    private calculateStreakBonus(exerciseType: string, currentScore: number): number {
        const history = this.performanceHistory[exerciseType];
        const calibration = this.exerciseCalibrations[exerciseType];

        if (currentScore >= calibration.perfectFormThreshold) {
            history.streakCount++;
            history.bestStreak = Math.max(history.bestStreak, history.streakCount);

            // Escalating bonus for perfect form streaks
            if (history.streakCount >= 10) return 5;
            if (history.streakCount >= 5) return 3;
            if (history.streakCount >= 3) return 2;
            return 1;
        } else {
            history.streakCount = 0;
            return 0;
        }
    }

    private calculateBodyTypeAdjustment(): number {
        // Small global adjustment based on user profile
        if (!this.userBodyType) return 0;

        let adjustment = 0;

        // Encourage beginners
        if (this.userBodyType.fitnessLevel === 'beginner') {
            adjustment += 2;
        }

        return adjustment;
    }

    private updatePerformanceHistory(exerciseType: string, score: number): void {
        const history = this.performanceHistory[exerciseType];
        history.scores.push(score);
        history.timestamps.push(Date.now());

        // Keep only recent history (last 50 reps)
        if (history.scores.length > 50) {
            history.scores = history.scores.slice(-50);
            history.timestamps = history.timestamps.slice(-50);
        }

        // Update average and trend
        history.averageScore = history.scores.reduce((a, b) => a + b) / history.scores.length;

        if (history.scores.length >= 5) {
            const recent = history.scores.slice(-5);
            const older = history.scores.slice(-10, -5);
            if (older.length > 0) {
                const recentAvg = recent.reduce((a, b) => a + b) / recent.length;
                const olderAvg = older.reduce((a, b) => a + b) / older.length;
                history.recentTrend = recentAvg - olderAvg;
            }
        }
    }

    private identifyImprovementAreas(
        components: PerformanceScore['components'],
        exerciseType: string
    ): ImprovementArea[] {
        const areas: ImprovementArea[] = [];

        Object.entries(components).forEach(([key, component]) => {
            if (component.adjusted < 75) {
                const priority = component.adjusted < 50 ? 'high' :
                    component.adjusted < 65 ? 'medium' : 'low';

                areas.push({
                    component: key,
                    currentScore: component.adjusted,
                    targetScore: Math.min(100, component.adjusted + 20),
                    priority,
                    suggestion: this.getImprovementSuggestion(key, component.adjusted, exerciseType),
                    estimatedTimeToImprove: this.estimateImprovementTime(component.adjusted, priority)
                });
            }
        });

        return areas.sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    }

    private calculateGrade(overall: number): PerformanceScore['performanceGrade'] {
        if (overall >= 97) return 'A+';
        if (overall >= 93) return 'A';
        if (overall >= 87) return 'B+';
        if (overall >= 83) return 'B';
        if (overall >= 77) return 'C+';
        if (overall >= 70) return 'C';
        if (overall >= 60) return 'D';
        return 'F';
    }

    private compareToTrainerStandards(
        components: PerformanceScore['components'],
        exerciseType: string
    ): number {
        const benchmarks = this.trainerBenchmarks[exerciseType as keyof typeof this.trainerBenchmarks];
        if (!benchmarks) return 0;

        let totalMatch = 0;
        let componentCount = 0;

        Object.entries(components).forEach(([key, component]) => {
            if (key === 'consistency') return; // Skip consistency for trainer comparison

            const benchmark = benchmarks[key as keyof typeof benchmarks];
            if (benchmark) {
                const score = component.adjusted;
                let match = 0;

                if (score >= benchmark.excellent) match = 100;
                else if (score >= benchmark.good) match = 85;
                else if (score >= benchmark.fair) match = 70;
                else if (score >= benchmark.poor) match = 50;
                else match = Math.max(0, score / benchmark.poor * 50);

                totalMatch += match;
                componentCount++;
            }
        });

        return componentCount > 0 ? totalMatch / componentCount : 0;
    }

    private calculateConfidenceLevel(formAnalysis: FormAnalysisResult, repData: RepData): number {
        let confidence = formAnalysis.confidence * 0.01;

        // Boost confidence for complete reps
        if (repData.isValid) {
            confidence = Math.min(1.0, confidence * 1.1);
        }

        // Reduce confidence for partial data
        if (repData.keyMetrics.rangeOfMotion < 30) {
            confidence *= 0.8;
        }

        return Math.round(confidence * 100);
    }

    // Helper methods for feedback generation
    private generateJointAlignmentFeedback(score: number, exerciseType: string): string {
        if (score >= 90) return 'Perfect joint alignment! 🎯';
        if (score >= 75) return 'Good alignment with minor adjustments needed';
        if (score >= 60) return 'Work on maintaining proper joint positioning';
        return 'Focus on correct joint alignment for safety';
    }

    private generateRangeOfMotionFeedback(score: number, actual: number, min: number): string {
        if (score >= 90) return 'Excellent range of motion! 📏';
        if (score >= 75) return 'Good depth, try to go a bit deeper';
        if (actual < min) return `Increase range of motion by ${Math.round(min - actual)}°`;
        return 'Work on achieving full range of motion';
    }

    private generateTempoFeedback(score: number, tempo: number, optimal: [number, number]): string {
        if (score >= 90) return 'Perfect tempo control! ⏱️';
        if (tempo < optimal[0]) return 'Try moving a bit faster with control';
        if (tempo > optimal[1]) return 'Slow down and focus on control';
        return 'Work on consistent movement tempo';
    }

    private generateStabilityFeedback(score: number, variance: number): string {
        if (score >= 90) return 'Rock-solid stability! 💪';
        if (score >= 75) return 'Good stability with minor wobbles';
        return 'Focus on core engagement for better stability';
    }

    private generateConsistencyFeedback(score: number, cv: number): string {
        if (score >= 90) return 'Incredibly consistent performance! 🎯';
        if (score >= 75) return 'Good consistency across reps';
        return 'Focus on maintaining quality throughout your set';
    }

    private calculateComponentTrend(component: string, exerciseType: string): ComponentScore['trend'] {
        // Simplified trend calculation - in a real app, you'd track component-specific history
        const history = this.performanceHistory[exerciseType];
        if (!history || history.recentTrend === 0) return 'stable';
        return history.recentTrend > 0 ? 'improving' : 'declining';
    }

    private getImprovementSuggestion(component: string, score: number, exerciseType: string): string {
        const suggestions = {
            jointAlignment: {
                squat: 'Practice wall squats to improve knee tracking',
                pushup: 'Focus on keeping elbows close to body',
                lunge: 'Step wider for better hip alignment',
                plank: 'Maintain neutral spine alignment'
            },
            rangeOfMotion: {
                squat: 'Work on ankle and hip mobility',
                pushup: 'Strengthen chest and shoulders',
                lunge: 'Practice deeper lunges gradually',
                plank: 'Focus on full body extension'
            },
            tempo: {
                squat: 'Count 2 seconds down, 1 second up',
                pushup: 'Control the descent phase',
                lunge: 'Take 2-3 seconds per rep',
                plank: 'Hold steady without rushing'
            },
            stability: {
                squat: 'Strengthen core and glutes',
                pushup: 'Practice planks to build stability',
                lunge: 'Start with stationary lunges',
                plank: 'Begin with shorter holds'
            },
            consistency: 'Focus on quality over quantity'
        };

        return suggestions[component as keyof typeof suggestions]?.[exerciseType as keyof typeof suggestions.jointAlignment] ||
            suggestions[component as keyof typeof suggestions] as string ||
            'Practice this movement regularly';
    }

    private estimateImprovementTime(score: number, priority: string): number {
        const baseWeeks = priority === 'high' ? 4 : priority === 'medium' ? 6 : 8;
        const scoreMultiplier = score < 50 ? 1.5 : score < 65 ? 1.2 : 1.0;
        return Math.round(baseWeeks * scoreMultiplier);
    }

    private calculateSessionScore(session: ExerciseSession): PerformanceScore {
        // Calculate average session performance
        if (session.formAnalyses.length === 0) {
            throw new Error('No form analyses in session');
        }

        // For session scoring, we'll use the last rep's detailed score
        // but incorporate session-wide consistency
        const lastRepIndex = session.reps.length - 1;
        const lastRepScore = this.scoreRepPerformance(
            session.reps[lastRepIndex],
            session.formAnalyses[lastRepIndex],
            {} as PoseData // Simplified for session scoring
        );

        // Adjust for session-wide performance
        const sessionAverage = session.formAnalyses.reduce(
            (sum, analysis) => sum + analysis.overallScore, 0
        ) / session.formAnalyses.length;

        lastRepScore.overall = (lastRepScore.overall + sessionAverage) / 2;

        return lastRepScore;
    }

    // Public API methods
    public getPerformanceHistory(exerciseType: string): RepPerformanceHistory | null {
        return this.performanceHistory[exerciseType] || null;
    }

    public getPersonalBests(): { [exercise: string]: number } {
        const bests: { [exercise: string]: number } = {};
        Object.entries(this.performanceHistory).forEach(([exercise, history]) => {
            bests[exercise] = Math.max(...history.scores, 0);
        });
        return bests;
    }

    public getCurrentSession(): ExerciseSession | null {
        return this.currentSession;
    }

    public resetHistory(exerciseType?: string): void {
        if (exerciseType) {
            delete this.performanceHistory[exerciseType];
        } else {
            this.performanceHistory = {};
        }
    }

    public exportPerformanceData(): string {
        return JSON.stringify({
            history: this.performanceHistory,
            bodyType: this.userBodyType,
            calibrations: this.exerciseCalibrations,
            timestamp: Date.now()
        }, null, 2);
    }
}

export default new PerformanceScoringService(); 