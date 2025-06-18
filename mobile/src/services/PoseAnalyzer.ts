/**
 * Real-time pose analysis service for workout form detection
 * Implements MediaPipe BlazePose integration with rep counting logic
 */

import { PoseKeypoints, RepMetrics, FormAnalysis, ExerciseType, FeedbackOverlay } from '../types';

export class PoseAnalyzer {
    private repCount: number = 0;
    private isInBottomPosition: boolean = false;
    private lastHipAngle: number = 180;
    private targetSpineAngle: number;
    private targetHipAngle: number;
    private exerciseType: ExerciseType;
    private repStartTime: number = 0;

    constructor(
        exerciseType: ExerciseType,
        targetSpineAngle: number = 5,
        targetHipAngle: number = 70
    ) {
        this.exerciseType = exerciseType;
        this.targetSpineAngle = targetSpineAngle;
        this.targetHipAngle = targetHipAngle;
    }

    /**
     * Analyzes pose keypoints and returns real-time feedback
     */
    public analyzePose(keypoints: PoseKeypoints): FormAnalysis {
        const hipAngle = this.calculateHipAngle(keypoints);
        const spineAngle = this.calculateSpineAngle(keypoints);

        // Update rep counting logic
        this.updateRepCount(hipAngle);

        // Calculate form score (0-100)
        const formScore = this.calculateFormScore(hipAngle, spineAngle);

        // Determine if current form is good
        const isGoodForm = this.isGoodFormPosition(hipAngle, spineAngle);

        // Generate feedback messages
        const feedback = this.generateFeedback(hipAngle, spineAngle);

        return {
            isGoodForm,
            spineAngle,
            hipAngle,
            feedback,
            score: formScore
        };
    }

    /**
     * Calculates hip angle using hip, knee, and ankle landmarks
     */
    private calculateHipAngle(keypoints: PoseKeypoints): number {
        const { leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle } = keypoints;

        // Use average of left and right side for stability
        const avgHip = {
            x: (leftHip.x + rightHip.x) / 2,
            y: (leftHip.y + rightHip.y) / 2
        };

        const avgKnee = {
            x: (leftKnee.x + rightKnee.x) / 2,
            y: (leftKnee.y + rightKnee.y) / 2
        };

        const avgAnkle = {
            x: (leftAnkle.x + rightAnkle.x) / 2,
            y: (leftAnkle.y + rightAnkle.y) / 2
        };

        // Calculate vectors
        const thighVector = {
            x: avgKnee.x - avgHip.x,
            y: avgKnee.y - avgHip.y
        };

        const shinVector = {
            x: avgAnkle.x - avgKnee.x,
            y: avgAnkle.y - avgKnee.y
        };

        // Calculate angle between thigh and shin
        const dotProduct = thighVector.x * shinVector.x + thighVector.y * shinVector.y;
        const thighMagnitude = Math.sqrt(thighVector.x ** 2 + thighVector.y ** 2);
        const shinMagnitude = Math.sqrt(shinVector.x ** 2 + shinVector.y ** 2);

        const cosAngle = dotProduct / (thighMagnitude * shinMagnitude);
        const angleRad = Math.acos(Math.max(-1, Math.min(1, cosAngle)));

        return (angleRad * 180) / Math.PI;
    }

    /**
     * Calculates spine angle using shoulder and hip landmarks
     */
    private calculateSpineAngle(keypoints: PoseKeypoints): number {
        const { leftShoulder, rightShoulder, leftHip, rightHip } = keypoints;

        // Calculate average positions for stability
        const avgShoulder = {
            x: (leftShoulder.x + rightShoulder.x) / 2,
            y: (leftShoulder.y + rightShoulder.y) / 2
        };

        const avgHip = {
            x: (leftHip.x + rightHip.x) / 2,
            y: (leftHip.y + rightHip.y) / 2
        };

        // Calculate spine vector
        const spineVector = {
            x: avgShoulder.x - avgHip.x,
            y: avgShoulder.y - avgHip.y
        };

        // Calculate angle from vertical (positive y-axis)
        const verticalVector = { x: 0, y: -1 };

        const dotProduct = spineVector.x * verticalVector.x + spineVector.y * verticalVector.y;
        const spineMagnitude = Math.sqrt(spineVector.x ** 2 + spineVector.y ** 2);

        const cosAngle = dotProduct / spineMagnitude;
        const angleRad = Math.acos(Math.max(-1, Math.min(1, cosAngle)));

        return (angleRad * 180) / Math.PI;
    }

    /**
     * Updates rep count based on hip angle thresholds
     * Rep = hip angle < targetHipAngle then > 150°
     */
    private updateRepCount(currentHipAngle: number): void {
        if (this.exerciseType === 'squat') {
            // Bottom position: hip angle below threshold
            if (currentHipAngle < this.targetHipAngle && !this.isInBottomPosition) {
                this.isInBottomPosition = true;
                this.repStartTime = Date.now();
            }

            // Top position: hip angle above 150° after being in bottom
            if (currentHipAngle > 150 && this.isInBottomPosition) {
                this.isInBottomPosition = false;
                this.repCount++;
            }
        } else if (this.exerciseType === 'deadlift') {
            // Similar logic but adapted for deadlift movement pattern
            if (currentHipAngle < 100 && !this.isInBottomPosition) {
                this.isInBottomPosition = true;
                this.repStartTime = Date.now();
            }

            if (currentHipAngle > 160 && this.isInBottomPosition) {
                this.isInBottomPosition = false;
                this.repCount++;
            }
        }

        this.lastHipAngle = currentHipAngle;
    }

    /**
     * Calculates overall form score (0-100)
     */
    private calculateFormScore(hipAngle: number, spineAngle: number): number {
        let score = 100;

        // Penalize spine angle deviation
        const spineDeviation = Math.abs(spineAngle - this.targetSpineAngle);
        score -= Math.min(spineDeviation * 10, 50); // Max 50 point penalty

        // Penalize hip angle if in bottom position
        if (this.isInBottomPosition) {
            const hipDepthScore = Math.max(0, (this.targetHipAngle - hipAngle) / this.targetHipAngle * 30);
            score += hipDepthScore; // Bonus for good depth
        }

        return Math.max(0, Math.min(100, Math.round(score)));
    }

    /**
     * Determines if current position has good form
     */
    private isGoodFormPosition(hipAngle: number, spineAngle: number): boolean {
        const spineInRange = Math.abs(spineAngle - this.targetSpineAngle) <= 5;

        if (this.exerciseType === 'squat') {
            // Good form: spine upright and proper depth if in bottom position
            return spineInRange && (!this.isInBottomPosition || hipAngle <= this.targetHipAngle);
        } else {
            // Deadlift: spine neutral throughout movement
            return spineInRange;
        }
    }

    /**
     * Generates contextual feedback messages
     */
    private generateFeedback(hipAngle: number, spineAngle: number): string[] {
        const feedback: string[] = [];

        // Spine feedback
        if (spineAngle > this.targetSpineAngle + 10) {
            feedback.push("Keep chest up, shoulders back");
        } else if (spineAngle < this.targetSpineAngle - 10) {
            feedback.push("Don't lean too far forward");
        }

        // Exercise-specific feedback
        if (this.exerciseType === 'squat') {
            if (this.isInBottomPosition && hipAngle > this.targetHipAngle + 15) {
                feedback.push("Go deeper, break parallel");
            } else if (this.isInBottomPosition && hipAngle <= this.targetHipAngle) {
                feedback.push("Great depth! Drive through heels");
            }
        } else if (this.exerciseType === 'deadlift') {
            if (hipAngle < 90) {
                feedback.push("Drive hips forward");
            }
        }

        // Default encouragement if no issues
        if (feedback.length === 0) {
            feedback.push("Perfect form! Keep it up");
        }

        return feedback;
    }

    /**
     * Creates rep metrics for storage
     */
    public createRepMetrics(): RepMetrics {
        return {
            repNumber: this.repCount,
            timestamp: Date.now(),
            hipAngle: this.lastHipAngle,
            spineAngle: 0, // Will be updated by latest analysis
            formScore: 0, // Will be updated by latest analysis
            isGoodForm: false, // Will be updated by latest analysis
            depth: this.isInBottomPosition ? this.lastHipAngle : 0
        };
    }

    /**
     * Generates feedback overlay for UI
     */
    public getFeedbackOverlay(analysis: FormAnalysis): FeedbackOverlay {
        if (analysis.isGoodForm) {
            return {
                color: 'green',
                message: analysis.feedback[0] || 'Perfect form!',
                icon: 'checkmark'
            };
        } else if (analysis.score > 70) {
            return {
                color: 'yellow',
                message: analysis.feedback[0] || 'Minor form issue',
                icon: 'warning'
            };
        } else {
            return {
                color: 'red',
                message: analysis.feedback[0] || 'Check your form',
                icon: 'error'
            };
        }
    }

    /**
     * Resets rep counter for new workout session
     */
    public reset(): void {
        this.repCount = 0;
        this.isInBottomPosition = false;
        this.lastHipAngle = 180;
        this.repStartTime = 0;
    }

    // Getters
    public getRepCount(): number {
        return this.repCount;
    }

    public getIsInBottomPosition(): boolean {
        return this.isInBottomPosition;
    }
} 