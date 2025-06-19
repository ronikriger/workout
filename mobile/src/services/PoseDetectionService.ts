import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';
import FormAnalysisEngine, { FormAnalysisResult } from './FormAnalysisEngine';

export interface PoseKeypoint {
    x: number;
    y: number;
    score: number;
    name: string;
}

export interface PoseData {
    keypoints: PoseKeypoint[];
    score: number;
    timestamp: number;
}

export interface ExerciseAnalysis {
    repCount: number;
    formScore: number;
    currentPhase: 'up' | 'down' | 'transition';
    feedback: string[];
    formAnalysis?: FormAnalysisResult;
}

class PoseDetectionService {
    private detector: poseDetection.PoseDetector | null = null;
    private isInitialized = false;
    private isProcessing = false;
    private lastPoseData: PoseData | null = null;

    // Exercise analysis state
    private repCount = 0;
    private lastRepPhase: 'up' | 'down' = 'up';
    private exerciseType: 'squat' | 'pushup' | 'bicep_curl' | 'jumping_jack' = 'squat';

    // Performance tracking
    private frameProcessingTimes: number[] = [];
    private readonly MAX_PROCESSING_TIME = 100; // 100ms target

    async initialize(): Promise<void> {
        try {
            // Wait for TensorFlow.js to be ready
            await tf.ready();
            console.log('Pose detection service initialized (demo mode)');
            this.isInitialized = true;
        } catch (error) {
            console.warn('Pose detection service: Falling back to demo mode without TensorFlow');
            this.isInitialized = true;
        }
    }

    async detectPose(imageData: any, width: number, height: number): Promise<PoseData | null> {
        if (!this.isInitialized || !this.detector || this.isProcessing) {
            return null;
        }

        const startTime = performance.now();
        this.isProcessing = true;

        try {
            let tensor;

            // Handle different input types
            if (imageData && imageData.data) {
                // Create tensor from RGBA data - ensure it's a number array
                const dataArray = new Float32Array(imageData.data);
                tensor = tf.tensor3d(
                    dataArray,
                    [height, width, 4]
                ).slice([0, 0, 0], [height, width, 3]); // Remove alpha channel
            } else {
                // For demo purposes, return mock pose data
                this.isProcessing = false;
                return this.generateMockPoseData(width, height);
            }

            // Detect poses
            const poses = await this.detector.estimatePoses(tensor);

            // Clean up tensor
            tensor.dispose();

            if (poses && poses.length > 0) {
                const pose = poses[0];
                const poseData: PoseData = {
                    keypoints: pose.keypoints.map(kp => ({
                        x: kp.x,
                        y: kp.y,
                        score: kp.score || 0,
                        name: kp.name || ''
                    })),
                    score: pose.score || 0,
                    timestamp: Date.now()
                };

                this.lastPoseData = poseData;

                // Track processing time
                const processingTime = performance.now() - startTime;
                this.trackPerformance(processingTime);

                return poseData;
            }
        } catch (error) {
            console.error('Pose detection error:', error);
        } finally {
            this.isProcessing = false;
        }

        return null;
    }

    setExerciseType(exerciseType: 'squat' | 'pushup' | 'bicep_curl' | 'jumping_jack'): void {
        this.exerciseType = exerciseType;
        this.resetExerciseState();
        // Map exercise type for form analysis engine
        const mappedType = exerciseType === 'bicep_curl' ? 'lunge' : exerciseType;
        FormAnalysisEngine.setExercise(mappedType);
    }

    resetExerciseState(): void {
        this.repCount = 0;
        this.lastRepPhase = 'up';
    }

    analyzeExercise(poseData: PoseData): ExerciseAnalysis {
        // Get detailed form analysis from ML engine
        const formAnalysis = FormAnalysisEngine.analyzeForm(poseData);

        // Perform basic rep counting based on exercise type
        const basicAnalysis = this.performBasicAnalysis(poseData);

        return {
            repCount: basicAnalysis.repCount,
            formScore: formAnalysis.overallScore,
            currentPhase: this.mapPhase(formAnalysis.phase),
            feedback: formAnalysis.feedback.map(f => f.message),
            formAnalysis: formAnalysis
        };
    }

    private performBasicAnalysis(poseData: PoseData) {
        switch (this.exerciseType) {
            case 'squat':
                return this.analyzeSquat(poseData);
            case 'pushup':
                return this.analyzePushup(poseData);
            case 'bicep_curl':
                return this.analyzeBicepCurl(poseData);
            case 'jumping_jack':
                return this.analyzeJumpingJack(poseData);
            default:
                return {
                    repCount: this.repCount,
                    formScore: 0,
                    currentPhase: 'up' as const,
                    feedback: []
                };
        }
    }

    private mapPhase(mlPhase: 'eccentric' | 'concentric' | 'isometric' | 'transition'): 'up' | 'down' | 'transition' {
        switch (mlPhase) {
            case 'eccentric':
                return 'down';
            case 'concentric':
                return 'up';
            case 'isometric':
            case 'transition':
            default:
                return 'transition';
        }
    }

    private analyzeSquat(poseData: PoseData): ExerciseAnalysis {
        const keypoints = this.getKeypoints(poseData);
        const feedback: string[] = [];
        let formScore = 100;

        if (!keypoints.leftHip || !keypoints.rightHip || !keypoints.leftKnee || !keypoints.rightKnee) {
            return {
                repCount: this.repCount,
                formScore: 0,
                currentPhase: 'up',
                feedback: ['Body not fully visible']
            };
        }

        // Calculate hip and knee angles
        const leftKneeAngle = this.calculateAngle(
            keypoints.leftHip,
            keypoints.leftKnee,
            keypoints.leftAnkle || keypoints.leftKnee
        );

        const rightKneeAngle = this.calculateAngle(
            keypoints.rightHip,
            keypoints.rightKnee,
            keypoints.rightAnkle || keypoints.rightKnee
        );

        const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;

        // Determine current phase
        let currentPhase: 'up' | 'down' | 'transition' = 'up';
        if (avgKneeAngle < 100) {
            currentPhase = 'down';
        } else if (avgKneeAngle < 130) {
            currentPhase = 'transition';
        }

        // Count reps
        if (this.lastRepPhase === 'up' && currentPhase === 'down') {
            this.repCount++;
            this.lastRepPhase = 'down';
        } else if (this.lastRepPhase === 'down' && currentPhase === 'up') {
            this.lastRepPhase = 'up';
        }

        // Form feedback
        if (avgKneeAngle < 70) {
            feedback.push('Great depth!');
        } else if (avgKneeAngle < 90) {
            feedback.push('Good depth');
        } else if (currentPhase === 'down') {
            feedback.push('Try to go deeper');
            formScore -= 20;
        }

        // Check knee alignment
        const kneeAlignment = Math.abs(leftKneeAngle - rightKneeAngle);
        if (kneeAlignment > 20) {
            feedback.push('Keep knees aligned');
            formScore -= 15;
        }

        return {
            repCount: this.repCount,
            formScore: Math.max(0, formScore),
            currentPhase,
            feedback
        };
    }

    private analyzePushup(poseData: PoseData): ExerciseAnalysis {
        const keypoints = this.getKeypoints(poseData);
        const feedback: string[] = [];
        let formScore = 100;

        if (!keypoints.leftShoulder || !keypoints.rightShoulder || !keypoints.leftElbow || !keypoints.rightElbow) {
            return {
                repCount: this.repCount,
                formScore: 0,
                currentPhase: 'up',
                feedback: ['Upper body not fully visible']
            };
        }

        // Calculate elbow angles
        const leftElbowAngle = this.calculateAngle(
            keypoints.leftShoulder,
            keypoints.leftElbow,
            keypoints.leftWrist || keypoints.leftElbow
        );

        const rightElbowAngle = this.calculateAngle(
            keypoints.rightShoulder,
            keypoints.rightElbow,
            keypoints.rightWrist || keypoints.rightElbow
        );

        const avgElbowAngle = (leftElbowAngle + rightElbowAngle) / 2;

        // Determine current phase
        let currentPhase: 'up' | 'down' | 'transition' = 'up';
        if (avgElbowAngle < 100) {
            currentPhase = 'down';
        } else if (avgElbowAngle < 140) {
            currentPhase = 'transition';
        }

        // Count reps
        if (this.lastRepPhase === 'up' && currentPhase === 'down') {
            this.repCount++;
            this.lastRepPhase = 'down';
        } else if (this.lastRepPhase === 'down' && currentPhase === 'up') {
            this.lastRepPhase = 'up';
        }

        // Form feedback
        if (avgElbowAngle < 80) {
            feedback.push('Excellent range!');
        } else if (avgElbowAngle < 100) {
            feedback.push('Good depth');
        } else if (currentPhase === 'down') {
            feedback.push('Go lower');
            formScore -= 20;
        }

        return {
            repCount: this.repCount,
            formScore: Math.max(0, formScore),
            currentPhase,
            feedback
        };
    }

    private analyzeBicepCurl(poseData: PoseData): ExerciseAnalysis {
        const keypoints = this.getKeypoints(poseData);
        const feedback: string[] = [];
        let formScore = 100;

        // Similar implementation for bicep curls
        // Focus on elbow position and arm movement

        return {
            repCount: this.repCount,
            formScore,
            currentPhase: 'up',
            feedback
        };
    }

    private analyzeJumpingJack(poseData: PoseData): ExerciseAnalysis {
        const keypoints = this.getKeypoints(poseData);
        const feedback: string[] = [];
        let formScore = 100;

        // Implementation for jumping jacks
        // Focus on arm and leg coordination

        return {
            repCount: this.repCount,
            formScore,
            currentPhase: 'up',
            feedback
        };
    }

    private getKeypoints(poseData: PoseData): { [key: string]: PoseKeypoint } {
        const keypointMap: { [key: string]: PoseKeypoint } = {};

        poseData.keypoints.forEach(kp => {
            if (kp.score > 0.3) { // Confidence threshold
                keypointMap[kp.name] = kp;
            }
        });

        return keypointMap;
    }

    private calculateAngle(point1: PoseKeypoint, point2: PoseKeypoint, point3: PoseKeypoint): number {
        const vector1 = { x: point1.x - point2.x, y: point1.y - point2.y };
        const vector2 = { x: point3.x - point2.x, y: point3.y - point2.y };

        const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y;
        const magnitude1 = Math.sqrt(vector1.x ** 2 + vector1.y ** 2);
        const magnitude2 = Math.sqrt(vector2.x ** 2 + vector2.y ** 2);

        const cosAngle = dotProduct / (magnitude1 * magnitude2);
        const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));

        return (angle * 180) / Math.PI;
    }

    private trackPerformance(processingTime: number): void {
        this.frameProcessingTimes.push(processingTime);

        // Keep only last 10 measurements
        if (this.frameProcessingTimes.length > 10) {
            this.frameProcessingTimes.shift();
        }

        // Log performance if too slow
        if (processingTime > this.MAX_PROCESSING_TIME) {
            console.warn(`Slow pose detection: ${processingTime.toFixed(1)}ms`);
        }
    }

    getPerformanceStats(): { avgProcessingTime: number; fps: number } {
        if (this.frameProcessingTimes.length === 0) {
            return { avgProcessingTime: 0, fps: 0 };
        }

        const avgTime = this.frameProcessingTimes.reduce((a, b) => a + b, 0) / this.frameProcessingTimes.length;
        const fps = avgTime > 0 ? 1000 / avgTime : 0;

        return { avgProcessingTime: avgTime, fps };
    }

    private generateMockPoseData(width: number, height: number): PoseData {
        // Generate realistic mock pose keypoints for demonstration
        const centerX = width / 2;
        const centerY = height / 2;

        // Simulate a person standing upright
        const keypoints: PoseKeypoint[] = [
            { x: centerX, y: centerY - 100, score: 0.9, name: 'nose' },
            { x: centerX - 20, y: centerY - 80, score: 0.8, name: 'left_eye' },
            { x: centerX + 20, y: centerY - 80, score: 0.8, name: 'right_eye' },
            { x: centerX - 30, y: centerY - 75, score: 0.7, name: 'left_ear' },
            { x: centerX + 30, y: centerY - 75, score: 0.7, name: 'right_ear' },
            { x: centerX - 60, y: centerY - 20, score: 0.9, name: 'left_shoulder' },
            { x: centerX + 60, y: centerY - 20, score: 0.9, name: 'right_shoulder' },
            { x: centerX - 80, y: centerY + 40, score: 0.8, name: 'left_elbow' },
            { x: centerX + 80, y: centerY + 40, score: 0.8, name: 'right_elbow' },
            { x: centerX - 90, y: centerY + 100, score: 0.7, name: 'left_wrist' },
            { x: centerX + 90, y: centerY + 100, score: 0.7, name: 'right_wrist' },
            { x: centerX - 40, y: centerY + 80, score: 0.9, name: 'left_hip' },
            { x: centerX + 40, y: centerY + 80, score: 0.9, name: 'right_hip' },
            { x: centerX - 45, y: centerY + 180, score: 0.8, name: 'left_knee' },
            { x: centerX + 45, y: centerY + 180, score: 0.8, name: 'right_knee' },
            { x: centerX - 50, y: centerY + 280, score: 0.7, name: 'left_ankle' },
            { x: centerX + 50, y: centerY + 280, score: 0.7, name: 'right_ankle' },
        ];

        // Add some animation to the mock data
        const time = Date.now() * 0.001;
        keypoints.forEach(kp => {
            kp.x += Math.sin(time + kp.y * 0.01) * 5;
            kp.y += Math.cos(time + kp.x * 0.01) * 3;
        });

        return {
            keypoints,
            score: 0.85,
            timestamp: Date.now()
        };
    }

    dispose(): void {
        if (this.detector) {
            this.detector = null;
        }
        this.isInitialized = false;
        this.isProcessing = false;
    }
}

export default new PoseDetectionService(); 