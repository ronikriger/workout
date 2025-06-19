import * as tf from '@tensorflow/tfjs';
import { PoseData, PoseKeypoint } from './PoseDetectionService';

// Exercise types supported by the recognition system
export type ExerciseType =
    | 'squat'
    | 'pushup'
    | 'lunge'
    | 'plank'
    | 'jumping_jack'
    | 'bicep_curl'
    | 'shoulder_press'
    | 'deadlift'
    | 'burpee'
    | 'mountain_climber'
    | 'high_knees'
    | 'butt_kicks'
    | 'standing'
    | 'transition'
    | 'unknown';

export interface ExerciseRecognition {
    exerciseType: ExerciseType;
    confidence: number;
    startTimestamp: number;
    endTimestamp?: number;
    duration?: number;
    isOngoing: boolean;
}

export interface ExerciseFeatures {
    // Joint angles
    leftKneeAngle: number;
    rightKneeAngle: number;
    leftElbowAngle: number;
    rightElbowAngle: number;
    leftHipAngle: number;
    rightHipAngle: number;
    leftShoulderAngle: number;
    rightShoulderAngle: number;

    // Body positions
    torsoAngle: number;
    headPosition: number;
    armSpread: number;
    legSpread: number;

    // Movement characteristics
    verticalMovement: number;
    horizontalMovement: number;
    overallMovement: number;

    // Stability metrics
    centerOfMass: { x: number; y: number };
    balanceScore: number;

    // Temporal features
    movementVelocity: number;
    accelerationMagnitude: number;
}

interface ExercisePattern {
    name: ExerciseType;
    features: ExerciseFeatures;
    weights: { [key in keyof ExerciseFeatures]: number };
    threshold: number;
    minDuration: number;
    maxDuration: number;
    transitionPatterns: string[];
}

interface PoseSequence {
    poses: PoseData[];
    features: ExerciseFeatures[];
    timestamps: number[];
    maxLength: number;
}

class ExerciseRecognitionService {
    private model: tf.LayersModel | null = null;
    private isInitialized = false;
    private exercisePatterns: { [key: string]: ExercisePattern } = {};

    // Pose sequence buffer for temporal analysis
    private poseSequence: PoseSequence;
    private readonly SEQUENCE_LENGTH = 30; // 1 second at 30 FPS
    private readonly FEATURE_WINDOW = 15; // 0.5 second window for feature extraction

    // Recognition state
    private currentExercise: ExerciseRecognition | null = null;
    private recognitionHistory: ExerciseRecognition[] = [];
    private lastPoseData: PoseData | null = null;
    private confidenceThreshold = 0.75;
    private transitionCooldown = 1000; // 1 second cooldown between transitions
    private lastTransitionTime = 0;

    // Performance tracking
    private recognitionTimes: number[] = [];
    private readonly MAX_RECOGNITION_TIME = 50; // 50ms target

    constructor() {
        this.initializeExercisePatterns();
        this.initializePoseSequence();
    }

    async initialize(): Promise<void> {
        console.log('Initializing Exercise Recognition Service...');

        // For demo purposes, skip TensorFlow model and use pattern matching only
        this.model = null;
        this.isInitialized = true;

        console.log('Exercise Recognition Service initialized (pattern-matching mode)');
    }

    private createDemoModel(): tf.LayersModel | null {
        try {
            // Create a simple neural network for exercise classification
            const model = tf.sequential({
                layers: [
                    tf.layers.dense({
                        inputShape: [22], // Number of features
                        units: 64,
                        activation: 'relu',
                        name: 'dense1'
                    }),
                    tf.layers.dropout({ rate: 0.3 }),
                    tf.layers.dense({
                        units: 32,
                        activation: 'relu',
                        name: 'dense2'
                    }),
                    tf.layers.dropout({ rate: 0.2 }),
                    tf.layers.dense({
                        units: 15, // Number of exercise classes
                        activation: 'softmax',
                        name: 'output'
                    })
                ]
            });

            model.compile({
                optimizer: 'adam',
                loss: 'categoricalCrossentropy',
                metrics: ['accuracy']
            });

            return model;
        } catch (error) {
            console.warn('Could not create TensorFlow model, using pattern-only recognition');
            return null;
        }
    }

    private initializeExercisePatterns(): void {
        this.exercisePatterns = {
            squat: {
                name: 'squat',
                features: {
                    leftKneeAngle: 90, rightKneeAngle: 90,
                    leftElbowAngle: 170, rightElbowAngle: 170,
                    leftHipAngle: 90, rightHipAngle: 90,
                    leftShoulderAngle: 160, rightShoulderAngle: 160,
                    torsoAngle: 75, headPosition: 0.7,
                    armSpread: 0.3, legSpread: 0.5,
                    verticalMovement: 0.8, horizontalMovement: 0.2, overallMovement: 0.6,
                    centerOfMass: { x: 0.5, y: 0.4 }, balanceScore: 0.8,
                    movementVelocity: 0.4, accelerationMagnitude: 0.3
                },
                weights: {
                    leftKneeAngle: 0.15, rightKneeAngle: 0.15,
                    leftElbowAngle: 0.05, rightElbowAngle: 0.05,
                    leftHipAngle: 0.12, rightHipAngle: 0.12,
                    leftShoulderAngle: 0.03, rightShoulderAngle: 0.03,
                    torsoAngle: 0.08, headPosition: 0.02,
                    armSpread: 0.02, legSpread: 0.08,
                    verticalMovement: 0.1, horizontalMovement: 0.02, overallMovement: 0.05,
                    centerOfMass: 0.02, balanceScore: 0.03,
                    movementVelocity: 0.05, accelerationMagnitude: 0.03
                },
                threshold: 0.8, minDuration: 2000, maxDuration: 30000,
                transitionPatterns: ['standing', 'transition']
            },

            pushup: {
                name: 'pushup',
                features: {
                    leftKneeAngle: 170, rightKneeAngle: 170,
                    leftElbowAngle: 90, rightElbowAngle: 90,
                    leftHipAngle: 170, rightHipAngle: 170,
                    leftShoulderAngle: 90, rightShoulderAngle: 90,
                    torsoAngle: 0, headPosition: 0.2,
                    armSpread: 0.6, legSpread: 0.2,
                    verticalMovement: 0.3, horizontalMovement: 0.1, overallMovement: 0.4,
                    centerOfMass: { x: 0.5, y: 0.3 }, balanceScore: 0.9,
                    movementVelocity: 0.5, accelerationMagnitude: 0.4
                },
                weights: {
                    leftKneeAngle: 0.08, rightKneeAngle: 0.08,
                    leftElbowAngle: 0.15, rightElbowAngle: 0.15,
                    leftHipAngle: 0.1, rightHipAngle: 0.1,
                    leftShoulderAngle: 0.12, rightShoulderAngle: 0.12,
                    torsoAngle: 0.15, headPosition: 0.03,
                    armSpread: 0.08, legSpread: 0.02,
                    verticalMovement: 0.1, horizontalMovement: 0.02, overallMovement: 0.05,
                    centerOfMass: 0.03, balanceScore: 0.05,
                    movementVelocity: 0.05, accelerationMagnitude: 0.04
                },
                threshold: 0.85, minDuration: 1500, maxDuration: 20000,
                transitionPatterns: ['plank', 'standing', 'transition']
            },

            lunge: {
                name: 'lunge',
                features: {
                    leftKneeAngle: 90, rightKneeAngle: 110,
                    leftElbowAngle: 160, rightElbowAngle: 160,
                    leftHipAngle: 120, rightHipAngle: 140,
                    leftShoulderAngle: 160, rightShoulderAngle: 160,
                    torsoAngle: 80, headPosition: 0.8,
                    armSpread: 0.3, legSpread: 0.8,
                    verticalMovement: 0.6, horizontalMovement: 0.4, overallMovement: 0.7,
                    centerOfMass: { x: 0.4, y: 0.5 }, balanceScore: 0.7,
                    movementVelocity: 0.4, accelerationMagnitude: 0.3
                },
                weights: {
                    leftKneeAngle: 0.12, rightKneeAngle: 0.12,
                    leftElbowAngle: 0.03, rightElbowAngle: 0.03,
                    leftHipAngle: 0.1, rightHipAngle: 0.1,
                    leftShoulderAngle: 0.03, rightShoulderAngle: 0.03,
                    torsoAngle: 0.08, headPosition: 0.03,
                    armSpread: 0.02, legSpread: 0.15,
                    verticalMovement: 0.1, horizontalMovement: 0.08, overallMovement: 0.05,
                    centerOfMass: 0.05, balanceScore: 0.06,
                    movementVelocity: 0.05, accelerationMagnitude: 0.04
                },
                threshold: 0.8, minDuration: 2000, maxDuration: 25000,
                transitionPatterns: ['standing', 'transition']
            },

            plank: {
                name: 'plank',
                features: {
                    leftKneeAngle: 180, rightKneeAngle: 180,
                    leftElbowAngle: 90, rightElbowAngle: 90,
                    leftHipAngle: 180, rightHipAngle: 180,
                    leftShoulderAngle: 90, rightShoulderAngle: 90,
                    torsoAngle: 0, headPosition: 0.2,
                    armSpread: 0.4, legSpread: 0.2,
                    verticalMovement: 0.1, horizontalMovement: 0.1, overallMovement: 0.1,
                    centerOfMass: { x: 0.5, y: 0.25 }, balanceScore: 0.95,
                    movementVelocity: 0.1, accelerationMagnitude: 0.1
                },
                weights: {
                    leftKneeAngle: 0.12, rightKneeAngle: 0.12,
                    leftElbowAngle: 0.1, rightElbowAngle: 0.1,
                    leftHipAngle: 0.15, rightHipAngle: 0.15,
                    leftShoulderAngle: 0.08, rightShoulderAngle: 0.08,
                    torsoAngle: 0.2, headPosition: 0.02,
                    armSpread: 0.03, legSpread: 0.02,
                    verticalMovement: 0.02, horizontalMovement: 0.02, overallMovement: 0.05,
                    centerOfMass: 0.05, balanceScore: 0.1,
                    movementVelocity: 0.02, accelerationMagnitude: 0.02
                },
                threshold: 0.9, minDuration: 5000, maxDuration: 300000,
                transitionPatterns: ['pushup', 'standing', 'transition']
            },

            jumping_jack: {
                name: 'jumping_jack',
                features: {
                    leftKneeAngle: 160, rightKneeAngle: 160,
                    leftElbowAngle: 160, rightElbowAngle: 160,
                    leftHipAngle: 160, rightHipAngle: 160,
                    leftShoulderAngle: 120, rightShoulderAngle: 120,
                    torsoAngle: 90, headPosition: 0.9,
                    armSpread: 0.8, legSpread: 0.7,
                    verticalMovement: 0.9, horizontalMovement: 0.6, overallMovement: 0.9,
                    centerOfMass: { x: 0.5, y: 0.6 }, balanceScore: 0.6,
                    movementVelocity: 0.8, accelerationMagnitude: 0.7
                },
                weights: {
                    leftKneeAngle: 0.08, rightKneeAngle: 0.08,
                    leftElbowAngle: 0.1, rightElbowAngle: 0.1,
                    leftHipAngle: 0.08, rightHipAngle: 0.08,
                    leftShoulderAngle: 0.12, rightShoulderAngle: 0.12,
                    torsoAngle: 0.05, headPosition: 0.02,
                    armSpread: 0.15, legSpread: 0.12,
                    verticalMovement: 0.15, horizontalMovement: 0.08, overallMovement: 0.1,
                    centerOfMass: 0.02, balanceScore: 0.03,
                    movementVelocity: 0.1, accelerationMagnitude: 0.08
                },
                threshold: 0.75, minDuration: 3000, maxDuration: 60000,
                transitionPatterns: ['standing', 'transition']
            },

            standing: {
                name: 'standing',
                features: {
                    leftKneeAngle: 170, rightKneeAngle: 170,
                    leftElbowAngle: 170, rightElbowAngle: 170,
                    leftHipAngle: 170, rightHipAngle: 170,
                    leftShoulderAngle: 160, rightShoulderAngle: 160,
                    torsoAngle: 90, headPosition: 0.9,
                    armSpread: 0.2, legSpread: 0.3,
                    verticalMovement: 0.1, horizontalMovement: 0.1, overallMovement: 0.1,
                    centerOfMass: { x: 0.5, y: 0.7 }, balanceScore: 0.9,
                    movementVelocity: 0.1, accelerationMagnitude: 0.1
                },
                weights: {
                    leftKneeAngle: 0.1, rightKneeAngle: 0.1,
                    leftElbowAngle: 0.08, rightElbowAngle: 0.08,
                    leftHipAngle: 0.1, rightHipAngle: 0.1,
                    leftShoulderAngle: 0.05, rightShoulderAngle: 0.05,
                    torsoAngle: 0.15, headPosition: 0.05,
                    armSpread: 0.05, legSpread: 0.05,
                    verticalMovement: 0.05, horizontalMovement: 0.05, overallMovement: 0.1,
                    centerOfMass: 0.05, balanceScore: 0.1,
                    movementVelocity: 0.05, accelerationMagnitude: 0.05
                },
                threshold: 0.7, minDuration: 1000, maxDuration: 600000,
                transitionPatterns: ['squat', 'lunge', 'jumping_jack', 'transition']
            }
        };
    }

    private initializePoseSequence(): void {
        this.poseSequence = {
            poses: [],
            features: [],
            timestamps: [],
            maxLength: this.SEQUENCE_LENGTH
        };
    }

    public async recognizeExercise(poseData: PoseData): Promise<ExerciseRecognition | null> {
        if (!this.isInitialized) {
            return null;
        }

        const startTime = performance.now();

        try {
            // Add pose to sequence buffer
            this.updatePoseSequence(poseData);

            // Extract features from current pose and sequence
            const features = this.extractFeatures(poseData);

            if (!features) {
                return null;
            }

            // Perform classification using pattern matching (and ML model if available)
            const patternPrediction = this.classifyWithPatterns(features);
            let combinedPrediction = patternPrediction;

            if (this.model) {
                const mlPrediction = await this.classifyWithModel(features);
                combinedPrediction = this.combinePredictions(patternPrediction, mlPrediction);
            }

            // Apply temporal filtering and state management
            const recognition = this.processRecognition(combinedPrediction, poseData.timestamp);

            // Track performance
            const processingTime = performance.now() - startTime;
            this.trackPerformance(processingTime);

            return recognition;

        } catch (error) {
            console.error('Exercise recognition error:', error);
            return null;
        }
    }

    private updatePoseSequence(poseData: PoseData): void {
        this.poseSequence.poses.push(poseData);
        this.poseSequence.timestamps.push(poseData.timestamp);

        // Maintain sequence length
        if (this.poseSequence.poses.length > this.poseSequence.maxLength) {
            this.poseSequence.poses.shift();
            this.poseSequence.timestamps.shift();
        }

        // Extract features for the new pose
        const features = this.extractFeatures(poseData);
        if (features) {
            this.poseSequence.features.push(features);
            if (this.poseSequence.features.length > this.poseSequence.maxLength) {
                this.poseSequence.features.shift();
            }
        }

        this.lastPoseData = poseData;
    }

    private extractFeatures(poseData: PoseData): ExerciseFeatures | null {
        const keypoints = this.getKeypointMap(poseData);

        // Check if we have enough keypoints for feature extraction
        const requiredKeypoints = [
            'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
            'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
            'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
        ];

        for (const kp of requiredKeypoints) {
            if (!keypoints[kp] || keypoints[kp].score < 0.5) {
                return null;
            }
        }

        // Calculate joint angles
        const leftKneeAngle = this.calculateAngle(keypoints.left_hip, keypoints.left_knee, keypoints.left_ankle);
        const rightKneeAngle = this.calculateAngle(keypoints.right_hip, keypoints.right_knee, keypoints.right_ankle);
        const leftElbowAngle = this.calculateAngle(keypoints.left_shoulder, keypoints.left_elbow, keypoints.left_wrist);
        const rightElbowAngle = this.calculateAngle(keypoints.right_shoulder, keypoints.right_elbow, keypoints.right_wrist);
        const leftHipAngle = this.calculateAngle(keypoints.left_shoulder, keypoints.left_hip, keypoints.left_knee);
        const rightHipAngle = this.calculateAngle(keypoints.right_shoulder, keypoints.right_hip, keypoints.right_knee);
        const leftShoulderAngle = this.calculateAngle(keypoints.left_elbow, keypoints.left_shoulder, keypoints.left_hip);
        const rightShoulderAngle = this.calculateAngle(keypoints.right_elbow, keypoints.right_shoulder, keypoints.right_hip);

        // Calculate body positions
        const torsoAngle = this.calculateTorsoAngle(keypoints.left_shoulder, keypoints.right_shoulder, keypoints.left_hip, keypoints.right_hip);
        const headPosition = keypoints.nose ? keypoints.nose.y / keypoints.left_hip.y : 0.5;
        const armSpread = this.calculateDistance(keypoints.left_wrist, keypoints.right_wrist) / this.calculateDistance(keypoints.left_shoulder, keypoints.right_shoulder);
        const legSpread = this.calculateDistance(keypoints.left_ankle, keypoints.right_ankle) / this.calculateDistance(keypoints.left_hip, keypoints.right_hip);

        // Calculate movement characteristics
        const movement = this.calculateMovementFeatures();

        // Calculate stability metrics
        const centerOfMass = this.calculateCenterOfMass(keypoints);
        const balanceScore = this.calculateBalanceScore(keypoints);

        return {
            leftKneeAngle, rightKneeAngle, leftElbowAngle, rightElbowAngle,
            leftHipAngle, rightHipAngle, leftShoulderAngle, rightShoulderAngle,
            torsoAngle, headPosition, armSpread, legSpread,
            verticalMovement: movement.vertical,
            horizontalMovement: movement.horizontal,
            overallMovement: movement.overall,
            centerOfMass, balanceScore,
            movementVelocity: movement.velocity,
            accelerationMagnitude: movement.acceleration
        };
    }

    private calculateMovementFeatures(): {
        vertical: number;
        horizontal: number;
        overall: number;
        velocity: number;
        acceleration: number;
    } {
        if (this.poseSequence.poses.length < 3) {
            return { vertical: 0, horizontal: 0, overall: 0, velocity: 0, acceleration: 0 };
        }

        const recentPoses = this.poseSequence.poses.slice(-this.FEATURE_WINDOW);
        const recentTimestamps = this.poseSequence.timestamps.slice(-this.FEATURE_WINDOW);

        let totalVertical = 0;
        let totalHorizontal = 0;
        let totalMovement = 0;
        let velocities: number[] = [];

        for (let i = 1; i < recentPoses.length; i++) {
            const prev = recentPoses[i - 1];
            const curr = recentPoses[i];
            const dt = (recentTimestamps[i] - recentTimestamps[i - 1]) / 1000; // Convert to seconds

            if (dt > 0) {
                // Calculate movement for key joints
                const prevCOM = this.calculateCenterOfMass(this.getKeypointMap(prev));
                const currCOM = this.calculateCenterOfMass(this.getKeypointMap(curr));

                const verticalDiff = Math.abs(currCOM.y - prevCOM.y);
                const horizontalDiff = Math.abs(currCOM.x - prevCOM.x);
                const totalDiff = Math.sqrt(verticalDiff ** 2 + horizontalDiff ** 2);

                totalVertical += verticalDiff;
                totalHorizontal += horizontalDiff;
                totalMovement += totalDiff;

                velocities.push(totalDiff / dt);
            }
        }

        const avgVertical = totalVertical / (recentPoses.length - 1);
        const avgHorizontal = totalHorizontal / (recentPoses.length - 1);
        const avgMovement = totalMovement / (recentPoses.length - 1);
        const avgVelocity = velocities.length > 0 ? velocities.reduce((a, b) => a + b, 0) / velocities.length : 0;

        // Calculate acceleration
        let acceleration = 0;
        if (velocities.length > 1) {
            const velDiffs = velocities.slice(1).map((v, i) => Math.abs(v - velocities[i]));
            acceleration = velDiffs.reduce((a, b) => a + b, 0) / velDiffs.length;
        }

        return {
            vertical: Math.min(avgVertical * 10, 1), // Normalize to 0-1
            horizontal: Math.min(avgHorizontal * 10, 1),
            overall: Math.min(avgMovement * 5, 1),
            velocity: Math.min(avgVelocity, 1),
            acceleration: Math.min(acceleration, 1)
        };
    }

    private classifyWithPatterns(features: ExerciseFeatures): { exercise: ExerciseType; confidence: number } {
        let bestMatch: ExerciseType = 'unknown';
        let bestScore = 0;

        for (const [exerciseName, pattern] of Object.entries(this.exercisePatterns)) {
            let score = 0;
            let totalWeight = 0;

            // Calculate weighted similarity score
            for (const [featureName, featureValue] of Object.entries(features)) {
                const patternValue = pattern.features[featureName as keyof ExerciseFeatures];
                const weight = pattern.weights[featureName as keyof ExerciseFeatures];

                if (typeof patternValue === 'number' && typeof featureValue === 'number') {
                    // Normalized similarity (closer to 1 means more similar)
                    const similarity = 1 - Math.abs(patternValue - featureValue) / Math.max(patternValue, featureValue, 1);
                    score += similarity * weight;
                    totalWeight += weight;
                }
            }

            const normalizedScore = totalWeight > 0 ? score / totalWeight : 0;

            if (normalizedScore > bestScore && normalizedScore >= pattern.threshold) {
                bestScore = normalizedScore;
                bestMatch = exerciseName as ExerciseType;
            }
        }

        return { exercise: bestMatch, confidence: bestScore };
    }

    private async classifyWithModel(features: ExerciseFeatures): Promise<{ exercise: ExerciseType; confidence: number }> {
        if (!this.model) {
            return { exercise: 'unknown', confidence: 0 };
        }

        try {
            // Convert features to tensor
            const featureArray = [
                features.leftKneeAngle / 180, features.rightKneeAngle / 180,
                features.leftElbowAngle / 180, features.rightElbowAngle / 180,
                features.leftHipAngle / 180, features.rightHipAngle / 180,
                features.leftShoulderAngle / 180, features.rightShoulderAngle / 180,
                features.torsoAngle / 180, features.headPosition,
                features.armSpread, features.legSpread,
                features.verticalMovement, features.horizontalMovement, features.overallMovement,
                features.centerOfMass.x, features.centerOfMass.y, features.balanceScore,
                features.movementVelocity, features.accelerationMagnitude,
                // Add padding to reach 22 features
                0, 0
            ];

            const inputTensor = tf.tensor2d([featureArray]);
            const prediction = this.model.predict(inputTensor) as tf.Tensor;
            const probabilities = await prediction.data();

            // Clean up tensors
            inputTensor.dispose();
            prediction.dispose();

            // Find best prediction
            const exerciseTypes: ExerciseType[] = [
                'squat', 'pushup', 'lunge', 'plank', 'jumping_jack',
                'bicep_curl', 'shoulder_press', 'deadlift', 'burpee',
                'mountain_climber', 'high_knees', 'butt_kicks',
                'standing', 'transition', 'unknown'
            ];

            let maxProb = 0;
            let predictedExercise: ExerciseType = 'unknown';

            for (let i = 0; i < probabilities.length && i < exerciseTypes.length; i++) {
                if (probabilities[i] > maxProb) {
                    maxProb = probabilities[i];
                    predictedExercise = exerciseTypes[i];
                }
            }

            return { exercise: predictedExercise, confidence: maxProb };

        } catch (error) {
            console.error('ML model prediction error:', error);
            return { exercise: 'unknown', confidence: 0 };
        }
    }

    private combinePredictions(
        patternPred: { exercise: ExerciseType; confidence: number },
        mlPred: { exercise: ExerciseType; confidence: number }
    ): { exercise: ExerciseType; confidence: number } {
        // Weight pattern matching higher for now since we have good patterns
        const patternWeight = 0.7;
        const mlWeight = 0.3;

        // If both agree, boost confidence
        if (patternPred.exercise === mlPred.exercise) {
            return {
                exercise: patternPred.exercise,
                confidence: Math.min(1.0, (patternPred.confidence * patternWeight + mlPred.confidence * mlWeight) * 1.2)
            };
        }

        // If they disagree, choose the one with higher confidence
        if (patternPred.confidence * patternWeight > mlPred.confidence * mlWeight) {
            return {
                exercise: patternPred.exercise,
                confidence: patternPred.confidence * patternWeight
            };
        } else {
            return {
                exercise: mlPred.exercise,
                confidence: mlPred.confidence * mlWeight
            };
        }
    }

    private processRecognition(
        prediction: { exercise: ExerciseType; confidence: number },
        timestamp: number
    ): ExerciseRecognition | null {
        const now = timestamp;

        // Check confidence threshold
        if (prediction.confidence < this.confidenceThreshold) {
            // If we have an ongoing exercise and confidence drops, consider ending it
            if (this.currentExercise && this.currentExercise.isOngoing) {
                const duration = now - this.currentExercise.startTimestamp;
                const pattern = this.exercisePatterns[this.currentExercise.exerciseType];

                if (duration >= pattern?.minDuration) {
                    // End current exercise
                    this.currentExercise.endTimestamp = now;
                    this.currentExercise.duration = duration;
                    this.currentExercise.isOngoing = false;

                    this.recognitionHistory.push({ ...this.currentExercise });
                    this.currentExercise = null;
                    this.lastTransitionTime = now;
                }
            }
            return null;
        }

        // Check transition cooldown
        if (now - this.lastTransitionTime < this.transitionCooldown) {
            return null;
        }

        // Handle exercise transitions
        if (this.currentExercise) {
            if (this.currentExercise.exerciseType === prediction.exercise) {
                // Same exercise continues - update confidence
                this.currentExercise.confidence = Math.max(this.currentExercise.confidence, prediction.confidence);
                return this.currentExercise;
            } else {
                // Different exercise detected - end current and start new
                const duration = now - this.currentExercise.startTimestamp;
                const currentPattern = this.exercisePatterns[this.currentExercise.exerciseType];

                if (duration >= currentPattern?.minDuration) {
                    // End current exercise
                    this.currentExercise.endTimestamp = now;
                    this.currentExercise.duration = duration;
                    this.currentExercise.isOngoing = false;
                    this.recognitionHistory.push({ ...this.currentExercise });

                    // Start new exercise
                    this.currentExercise = {
                        exerciseType: prediction.exercise,
                        confidence: prediction.confidence,
                        startTimestamp: now,
                        isOngoing: true
                    };

                    return this.currentExercise;
                }
            }
        } else {
            // No current exercise - start new one
            if (prediction.exercise !== 'standing' && prediction.exercise !== 'transition' && prediction.exercise !== 'unknown') {
                this.currentExercise = {
                    exerciseType: prediction.exercise,
                    confidence: prediction.confidence,
                    startTimestamp: now,
                    isOngoing: true
                };
                return this.currentExercise;
            }
        }

        return null;
    }

    // Utility methods
    private getKeypointMap(poseData: PoseData): { [key: string]: PoseKeypoint } {
        const map: { [key: string]: PoseKeypoint } = {};
        poseData.keypoints.forEach(kp => {
            if (kp.score > 0.3) {
                map[kp.name] = kp;
            }
        });
        return map;
    }

    private calculateAngle(p1: PoseKeypoint, p2: PoseKeypoint, p3: PoseKeypoint): number {
        const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
        const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

        const dot = v1.x * v2.x + v1.y * v2.y;
        const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
        const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);

        const cosAngle = dot / (mag1 * mag2);
        return (Math.acos(Math.max(-1, Math.min(1, cosAngle))) * 180) / Math.PI;
    }

    private calculateDistance(p1: PoseKeypoint, p2: PoseKeypoint): number {
        return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
    }

    private calculateTorsoAngle(leftShoulder: PoseKeypoint, rightShoulder: PoseKeypoint, leftHip: PoseKeypoint, rightHip: PoseKeypoint): number {
        const shoulderMid = { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2 };
        const hipMid = { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2 };

        const torsoVector = { x: shoulderMid.x - hipMid.x, y: shoulderMid.y - hipMid.y };
        const verticalVector = { x: 0, y: -1 };

        const dot = torsoVector.x * verticalVector.x + torsoVector.y * verticalVector.y;
        const mag1 = Math.sqrt(torsoVector.x ** 2 + torsoVector.y ** 2);
        const mag2 = 1;

        const cosAngle = dot / (mag1 * mag2);
        return (Math.acos(Math.max(-1, Math.min(1, cosAngle))) * 180) / Math.PI;
    }

    private calculateCenterOfMass(keypoints: { [key: string]: PoseKeypoint }): { x: number; y: number } {
        const mainJoints = ['left_shoulder', 'right_shoulder', 'left_hip', 'right_hip'];
        let totalX = 0, totalY = 0, count = 0;

        for (const joint of mainJoints) {
            if (keypoints[joint]) {
                totalX += keypoints[joint].x;
                totalY += keypoints[joint].y;
                count++;
            }
        }

        return count > 0 ? { x: totalX / count, y: totalY / count } : { x: 0.5, y: 0.5 };
    }

    private calculateBalanceScore(keypoints: { [key: string]: PoseKeypoint }): number {
        if (!keypoints.left_ankle || !keypoints.right_ankle || !keypoints.left_hip || !keypoints.right_hip) {
            return 0.5;
        }

        const ankleSpread = Math.abs(keypoints.left_ankle.x - keypoints.right_ankle.x);
        const hipSpread = Math.abs(keypoints.left_hip.x - keypoints.right_hip.x);
        const centerOfMass = this.calculateCenterOfMass(keypoints);

        // Balance is better when feet are spread appropriately and center of mass is centered
        const spreadRatio = ankleSpread / (hipSpread + 0.01);
        const centeredness = 1 - Math.abs(centerOfMass.x - 0.5) * 2;

        return Math.min(1, (spreadRatio * 0.4 + centeredness * 0.6));
    }

    private trackPerformance(processingTime: number): void {
        this.recognitionTimes.push(processingTime);
        if (this.recognitionTimes.length > 100) {
            this.recognitionTimes.shift();
        }
    }

    // Public API methods
    public getCurrentExercise(): ExerciseRecognition | null {
        return this.currentExercise;
    }

    public getRecognitionHistory(): ExerciseRecognition[] {
        return [...this.recognitionHistory];
    }

    public getPerformanceStats(): { avgProcessingTime: number; recognitionRate: number } {
        const avgTime = this.recognitionTimes.length > 0
            ? this.recognitionTimes.reduce((a, b) => a + b, 0) / this.recognitionTimes.length
            : 0;

        const recognitionRate = this.recognitionTimes.length > 0
            ? this.recognitionTimes.filter(t => t <= this.MAX_RECOGNITION_TIME).length / this.recognitionTimes.length
            : 1;

        return { avgProcessingTime: avgTime, recognitionRate };
    }

    public setConfidenceThreshold(threshold: number): void {
        this.confidenceThreshold = Math.max(0.1, Math.min(0.99, threshold));
    }

    public reset(): void {
        this.currentExercise = null;
        this.recognitionHistory = [];
        this.initializePoseSequence();
        this.lastTransitionTime = 0;
    }

    public dispose(): void {
        if (this.model) {
            this.model.dispose();
            this.model = null;
        }
        this.reset();
    }
}

export default new ExerciseRecognitionService(); 