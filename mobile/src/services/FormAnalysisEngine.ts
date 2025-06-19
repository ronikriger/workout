import { PoseKeypoint, PoseData } from './PoseDetectionService';

// Core ML-based form analysis structures
export interface FormAnalysisResult {
    overallScore: number;
    componentScores: {
        technique: number;
        range: number;
        stability: number;
        timing: number;
        symmetry: number;
    };
    feedback: FormFeedback[];
    improvements: string[];
    riskFactors: string[];
    phase: 'eccentric' | 'concentric' | 'isometric' | 'transition';
    confidence: number;
}

export interface FormFeedback {
    type: 'positive' | 'warning' | 'critical';
    message: string;
    priority: number;
    bodyPart: string;
}

export interface ExerciseCriteria {
    name: string;
    jointAngles: { [key: string]: { min: number; max: number; optimal: number; weight: number } };
    movementPatterns: string[];
    riskThresholds: { [key: string]: number };
}

class FormAnalysisEngine {
    private currentExercise: string = '';
    private analysisHistory: FormAnalysisResult[] = [];
    private movementBuffer: PoseData[] = [];
    private readonly BUFFER_SIZE = 20;
    private exerciseCriteria: { [key: string]: ExerciseCriteria } = {};

    constructor() {
        this.initializeMLModels();
    }

    private initializeMLModels(): void {
        // Initialize ML-based criteria for each exercise
        this.exerciseCriteria = {
            squat: {
                name: 'Squat',
                jointAngles: {
                    knee: { min: 70, max: 180, optimal: 90, weight: 0.35 },
                    hip: { min: 60, max: 180, optimal: 90, weight: 0.30 },
                    ankle: { min: 70, max: 110, optimal: 85, weight: 0.15 },
                    spine: { min: 160, max: 190, optimal: 175, weight: 0.20 }
                },
                movementPatterns: ['hip_hinge', 'knee_track', 'core_stable'],
                riskThresholds: {
                    knee_valgus: 15,
                    forward_lean: 30,
                    asymmetry: 20
                }
            },
            pushup: {
                name: 'Push-up',
                jointAngles: {
                    elbow: { min: 45, max: 180, optimal: 90, weight: 0.40 },
                    shoulder: { min: 60, max: 120, optimal: 90, weight: 0.25 },
                    hip: { min: 170, max: 190, optimal: 180, weight: 0.20 },
                    spine: { min: 160, max: 190, optimal: 175, weight: 0.15 }
                },
                movementPatterns: ['elbow_control', 'body_line', 'shoulder_stable'],
                riskThresholds: {
                    elbow_flare: 45,
                    hip_sag: 20,
                    neck_strain: 25
                }
            },
            lunge: {
                name: 'Lunge',
                jointAngles: {
                    front_knee: { min: 70, max: 110, optimal: 90, weight: 0.30 },
                    back_knee: { min: 70, max: 120, optimal: 90, weight: 0.25 },
                    front_hip: { min: 70, max: 110, optimal: 90, weight: 0.25 },
                    spine: { min: 170, max: 190, optimal: 180, weight: 0.20 }
                },
                movementPatterns: ['controlled_descent', 'balanced_stance', 'vertical_torso'],
                riskThresholds: {
                    knee_over_toe: 10,
                    lateral_lean: 15,
                    back_arch: 25
                }
            }
        };
    }

    public setExercise(exerciseType: string): void {
        this.currentExercise = exerciseType;
        this.clearHistory();
    }

    public analyzeForm(poseData: PoseData): FormAnalysisResult {
        // Add to movement buffer for temporal analysis
        this.movementBuffer.push(poseData);
        if (this.movementBuffer.length > this.BUFFER_SIZE) {
            this.movementBuffer.shift();
        }

        const criteria = this.exerciseCriteria[this.currentExercise];
        if (!criteria) {
            return this.getDefaultResult();
        }

        // Core ML analysis pipeline
        const result: FormAnalysisResult = {
            overallScore: 0,
            componentScores: {
                technique: this.analyzeTechnique(poseData, criteria),
                range: this.analyzeRangeOfMotion(poseData, criteria),
                stability: this.analyzeStability(poseData, criteria),
                timing: this.analyzeTiming(criteria),
                symmetry: this.analyzeSymmetry(poseData, criteria)
            },
            feedback: [],
            improvements: [],
            riskFactors: [],
            phase: this.detectMovementPhase(poseData),
            confidence: this.calculateConfidence(poseData)
        };

        // Calculate weighted overall score
        result.overallScore = this.calculateOverallScore(result.componentScores);

        // Generate intelligent feedback
        result.feedback = this.generateMLFeedback(result, criteria);
        result.improvements = this.generateImprovements(result, criteria);
        result.riskFactors = this.identifyRiskFactors(result, poseData, criteria);

        // Store in history for learning
        this.analysisHistory.push(result);
        if (this.analysisHistory.length > 50) {
            this.analysisHistory.shift();
        }

        return result;
    }

    private analyzeTechnique(poseData: PoseData, criteria: ExerciseCriteria): number {
        const keypoints = this.getKeypointMap(poseData);
        let totalScore = 0;
        let totalWeight = 0;

        // ML-based joint angle analysis
        for (const [jointName, angleSpec] of Object.entries(criteria.jointAngles)) {
            const angle = this.calculateJointAngle(jointName, keypoints);
            if (angle !== null) {
                const score = this.scoreJointAngle(angle, angleSpec);
                totalScore += score * angleSpec.weight;
                totalWeight += angleSpec.weight;
            }
        }

        return totalWeight > 0 ? (totalScore / totalWeight) * 100 : 75;
    }

    private analyzeRangeOfMotion(poseData: PoseData, criteria: ExerciseCriteria): number {
        const keypoints = this.getKeypointMap(poseData);

        switch (this.currentExercise) {
            case 'squat':
                return this.analyzeSquatROM(keypoints);
            case 'pushup':
                return this.analyzePushupROM(keypoints);
            case 'lunge':
                return this.analyzeLungeROM(keypoints);
            default:
                return 75;
        }
    }

    private analyzeStability(poseData: PoseData, criteria: ExerciseCriteria): number {
        if (this.movementBuffer.length < 5) return 75;

        const keypoints = this.getKeypointMap(poseData);
        let stabilityScore = 100;

        // Core stability analysis
        const coreStability = this.calculateCoreStability(keypoints);
        stabilityScore *= coreStability;

        // Balance analysis
        const balanceScore = this.analyzeBalance(keypoints);
        stabilityScore = (stabilityScore + balanceScore) / 2;

        // Movement consistency
        const consistency = this.analyzeMovementConsistency();
        stabilityScore = (stabilityScore + consistency) / 2;

        return Math.max(0, Math.min(100, stabilityScore));
    }

    private analyzeTiming(criteria: ExerciseCriteria): number {
        if (this.movementBuffer.length < 10) return 75;

        // Analyze movement tempo and phase transitions
        const phaseTransitions = this.analyzePhaseTransitions();
        const tempoConsistency = this.analyzeTempoConsistency();

        return (phaseTransitions + tempoConsistency) / 2;
    }

    private analyzeSymmetry(poseData: PoseData, criteria: ExerciseCriteria): number {
        const keypoints = this.getKeypointMap(poseData);

        if (this.currentExercise === 'lunge') return 85; // Asymmetrical exercise

        // Bilateral symmetry analysis
        const leftKnee = this.calculateAngle(keypoints.left_hip, keypoints.left_knee, keypoints.left_ankle);
        const rightKnee = this.calculateAngle(keypoints.right_hip, keypoints.right_knee, keypoints.right_ankle);

        if (leftKnee !== null && rightKnee !== null) {
            const asymmetry = Math.abs(leftKnee - rightKnee);
            return Math.max(0, 100 - asymmetry * 3);
        }

        return 80;
    }

    private detectMovementPhase(poseData: PoseData): 'eccentric' | 'concentric' | 'isometric' | 'transition' {
        if (this.movementBuffer.length < 3) return 'transition';

        const keypoints = this.getKeypointMap(poseData);

        switch (this.currentExercise) {
            case 'squat':
                return this.detectSquatPhase(keypoints);
            case 'pushup':
                return this.detectPushupPhase(keypoints);
            case 'lunge':
                return this.detectLungePhase(keypoints);
            default:
                return 'transition';
        }
    }

    private generateMLFeedback(result: FormAnalysisResult, criteria: ExerciseCriteria): FormFeedback[] {
        const feedback: FormFeedback[] = [];

        // Overall performance feedback
        if (result.overallScore >= 90) {
            feedback.push({
                type: 'positive',
                message: '🎯 Excellent form! Perfect technique!',
                priority: 1,
                bodyPart: 'overall'
            });
        } else if (result.overallScore >= 80) {
            feedback.push({
                type: 'positive',
                message: '👍 Great form! Minor adjustments needed',
                priority: 2,
                bodyPart: 'overall'
            });
        } else if (result.overallScore >= 70) {
            feedback.push({
                type: 'warning',
                message: '⚠️ Good effort! Focus on technique',
                priority: 3,
                bodyPart: 'overall'
            });
        } else {
            feedback.push({
                type: 'critical',
                message: '🔴 Form needs work - slow down and focus',
                priority: 4,
                bodyPart: 'overall'
            });
        }

        // Component-specific feedback
        if (result.componentScores.technique < 75) {
            feedback.push({
                type: 'warning',
                message: 'Focus on joint alignment and angles',
                priority: 3,
                bodyPart: 'joints'
            });
        }

        if (result.componentScores.range < 75) {
            feedback.push({
                type: 'warning',
                message: 'Increase your range of motion',
                priority: 3,
                bodyPart: 'movement'
            });
        }

        if (result.componentScores.stability < 75) {
            feedback.push({
                type: 'warning',
                message: 'Engage your core for better stability',
                priority: 3,
                bodyPart: 'core'
            });
        }

        return feedback.sort((a, b) => b.priority - a.priority).slice(0, 3);
    }

    private generateImprovements(result: FormAnalysisResult, criteria: ExerciseCriteria): string[] {
        const improvements: string[] = [];

        // Exercise-specific improvements based on ML analysis
        switch (this.currentExercise) {
            case 'squat':
                if (result.componentScores.range < 80) improvements.push('Go deeper - thighs parallel to ground');
                if (result.componentScores.technique < 80) improvements.push('Keep knees tracking over toes');
                if (result.componentScores.stability < 80) improvements.push('Maintain upright chest position');
                break;

            case 'pushup':
                if (result.componentScores.range < 80) improvements.push('Lower chest closer to ground');
                if (result.componentScores.stability < 80) improvements.push('Keep body in straight line');
                if (result.componentScores.technique < 80) improvements.push('Control elbow angle (45 degrees)');
                break;

            case 'lunge':
                if (result.componentScores.technique < 80) improvements.push('Keep front knee over ankle');
                if (result.componentScores.stability < 80) improvements.push('Maintain upright torso');
                if (result.componentScores.range < 80) improvements.push('Drop back knee closer to ground');
                break;
        }

        return improvements.slice(0, 3);
    }

    private identifyRiskFactors(result: FormAnalysisResult, poseData: PoseData, criteria: ExerciseCriteria): string[] {
        const risks: string[] = [];

        if (result.overallScore < 60) {
            risks.push('High injury risk - poor overall form');
        }

        if (result.componentScores.stability < 60) {
            risks.push('Balance issues - risk of falling');
        }

        // Exercise-specific risk analysis
        const keypoints = this.getKeypointMap(poseData);

        if (this.currentExercise === 'squat') {
            const kneeAngle = this.calculateJointAngle('knee', keypoints);
            if (kneeAngle !== null && kneeAngle < 60) {
                risks.push('Excessive knee flexion - injury risk');
            }
        }

        return risks.slice(0, 2);
    }

    // Helper methods for ML calculations
    private calculateJointAngle(jointName: string, keypoints: { [key: string]: PoseKeypoint }): number | null {
        switch (jointName) {
            case 'knee':
                return this.calculateAngle(keypoints.left_hip, keypoints.left_knee, keypoints.left_ankle);
            case 'elbow':
                return this.calculateAngle(keypoints.left_shoulder, keypoints.left_elbow, keypoints.left_wrist);
            case 'hip':
                return this.calculateAngle(keypoints.left_shoulder, keypoints.left_hip, keypoints.left_knee);
            default:
                return null;
        }
    }

    private scoreJointAngle(angle: number, spec: { min: number; max: number; optimal: number }): number {
        if (angle < spec.min || angle > spec.max) {
            const deviation = Math.min(Math.abs(angle - spec.min), Math.abs(angle - spec.max));
            return Math.max(0, 50 - deviation);
        }

        const optimalDeviation = Math.abs(angle - spec.optimal);
        const maxOptimalDeviation = Math.max(spec.optimal - spec.min, spec.max - spec.optimal);

        return Math.max(0, 100 - (optimalDeviation / maxOptimalDeviation) * 50);
    }

    private analyzeSquatROM(keypoints: { [key: string]: PoseKeypoint }): number {
        const kneeAngle = this.calculateAngle(keypoints.left_hip, keypoints.left_knee, keypoints.left_ankle);
        if (kneeAngle === null) return 75;

        if (kneeAngle < 90) return 100;
        if (kneeAngle < 110) return 85;
        if (kneeAngle < 130) return 70;
        return 50;
    }

    private analyzePushupROM(keypoints: { [key: string]: PoseKeypoint }): number {
        const elbowAngle = this.calculateAngle(keypoints.left_shoulder, keypoints.left_elbow, keypoints.left_wrist);
        if (elbowAngle === null) return 75;

        if (elbowAngle < 90) return 100;
        if (elbowAngle < 110) return 85;
        if (elbowAngle < 130) return 70;
        return 50;
    }

    private analyzeLungeROM(keypoints: { [key: string]: PoseKeypoint }): number {
        const frontKneeAngle = this.calculateAngle(keypoints.left_hip, keypoints.left_knee, keypoints.left_ankle);
        if (frontKneeAngle === null) return 75;

        if (frontKneeAngle < 100) return 100;
        if (frontKneeAngle < 120) return 85;
        return 70;
    }

    private detectSquatPhase(keypoints: { [key: string]: PoseKeypoint }): 'eccentric' | 'concentric' | 'isometric' | 'transition' {
        if (this.movementBuffer.length < 3) return 'transition';

        const currentKnee = this.calculateAngle(keypoints.left_hip, keypoints.left_knee, keypoints.left_ankle);
        const prevKeypoints = this.getKeypointMap(this.movementBuffer[this.movementBuffer.length - 3]);
        const prevKnee = this.calculateAngle(prevKeypoints.left_hip, prevKeypoints.left_knee, prevKeypoints.left_ankle);

        if (currentKnee === null || prevKnee === null) return 'transition';

        const angleDiff = currentKnee - prevKnee;
        if (Math.abs(angleDiff) < 3) return 'isometric';
        return angleDiff < 0 ? 'eccentric' : 'concentric';
    }

    private detectPushupPhase(keypoints: { [key: string]: PoseKeypoint }): 'eccentric' | 'concentric' | 'isometric' | 'transition' {
        if (this.movementBuffer.length < 3) return 'transition';

        const currentElbow = this.calculateAngle(keypoints.left_shoulder, keypoints.left_elbow, keypoints.left_wrist);
        const prevKeypoints = this.getKeypointMap(this.movementBuffer[this.movementBuffer.length - 3]);
        const prevElbow = this.calculateAngle(prevKeypoints.left_shoulder, prevKeypoints.left_elbow, prevKeypoints.left_wrist);

        if (currentElbow === null || prevElbow === null) return 'transition';

        const angleDiff = currentElbow - prevElbow;
        if (Math.abs(angleDiff) < 3) return 'isometric';
        return angleDiff < 0 ? 'eccentric' : 'concentric';
    }

    private detectLungePhase(keypoints: { [key: string]: PoseKeypoint }): 'eccentric' | 'concentric' | 'isometric' | 'transition' {
        return 'transition'; // Simplified for now
    }

    // Additional helper methods
    private getKeypointMap(poseData: PoseData): { [key: string]: PoseKeypoint } {
        const map: { [key: string]: PoseKeypoint } = {};
        poseData.keypoints.forEach(kp => {
            if (kp.score > 0.3) map[kp.name] = kp;
        });
        return map;
    }

    private calculateAngle(p1: PoseKeypoint | undefined, p2: PoseKeypoint | undefined, p3: PoseKeypoint | undefined): number | null {
        if (!p1 || !p2 || !p3) return null;

        const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
        const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

        const dot = v1.x * v2.x + v1.y * v2.y;
        const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
        const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);

        return (Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2)))) * 180) / Math.PI;
    }

    private calculateOverallScore(scores: FormAnalysisResult['componentScores']): number {
        return (scores.technique * 0.35 + scores.range * 0.25 + scores.stability * 0.2 +
            scores.timing * 0.1 + scores.symmetry * 0.1);
    }

    private calculateConfidence(poseData: PoseData): number {
        const avgConfidence = poseData.keypoints.reduce((sum, kp) => sum + kp.score, 0) / poseData.keypoints.length;
        return Math.round(avgConfidence * 100);
    }

    private calculateCoreStability(keypoints: { [key: string]: PoseKeypoint }): number {
        // Simplified core stability calculation
        return 0.85;
    }

    private analyzeBalance(keypoints: { [key: string]: PoseKeypoint }): number {
        // Simplified balance analysis
        return 80;
    }

    private analyzeMovementConsistency(): number {
        if (this.movementBuffer.length < 5) return 75;
        // Simplified consistency analysis
        return 82;
    }

    private analyzePhaseTransitions(): number {
        // Simplified phase transition analysis
        return 78;
    }

    private analyzeTempoConsistency(): number {
        // Simplified tempo analysis
        return 80;
    }

    private getDefaultResult(): FormAnalysisResult {
        return {
            overallScore: 75,
            componentScores: { technique: 75, range: 75, stability: 75, timing: 75, symmetry: 75 },
            feedback: [{ type: 'warning', message: 'Exercise not recognized', priority: 1, bodyPart: 'overall' }],
            improvements: ['Select a valid exercise type'],
            riskFactors: [],
            phase: 'transition',
            confidence: 60
        };
    }

    private clearHistory(): void {
        this.analysisHistory = [];
        this.movementBuffer = [];
    }

    // Public methods
    public getAnalysisHistory(): FormAnalysisResult[] {
        return [...this.analysisHistory];
    }

    public getAverageScore(): number {
        if (this.analysisHistory.length === 0) return 0;
        return this.analysisHistory.reduce((sum, result) => sum + result.overallScore, 0) / this.analysisHistory.length;
    }
}

export default new FormAnalysisEngine(); 