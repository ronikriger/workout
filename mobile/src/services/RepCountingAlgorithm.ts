import { PoseData, PoseKeypoint } from './PoseDetectionService';

// Core data structures for rep counting
export interface RepData {
    repNumber: number;
    startTimestamp: number;
    endTimestamp: number;
    duration: number;
    quality: RepQuality;
    phase: RepPhase;
    keyMetrics: RepMetrics;
}

export interface RepQuality {
    score: number; // 0-100
    completeness: number; // 0-1 (1 = full range)
    consistency: number; // 0-1 (1 = consistent tempo)
    form: number; // 0-1 (1 = perfect form)
    isValid: boolean;
}

export interface RepMetrics {
    peakAngle: number;
    minAngle: number;
    rangeOfMotion: number;
    timeToBottom: number;
    timeToTop: number;
    tempo: number;
}

export type RepPhase = 'eccentric' | 'bottom' | 'concentric' | 'top' | 'transition';

export interface ExercisePattern {
    name: string;
    primaryJoint: string;
    secondaryJoints: string[];
    movementType: 'up-down' | 'in-out' | 'rotational' | 'bilateral';
    angleThresholds: {
        min: number;
        max: number;
        repStart: number;
        repEnd: number;
    };
    temporalFilters: {
        minRepDuration: number; // ms
        maxRepDuration: number; // ms
        minPauseDuration: number; // ms
    };
    qualityMetrics: {
        minRangeOfMotion: number;
        maxAsymmetry: number;
        tempoRange: { min: number; max: number };
    };
}

// Signal processing data structures
interface SignalWindow {
    data: number[];
    timestamps: number[];
    size: number;
    index: number;
}

interface PeakData {
    value: number;
    timestamp: number;
    index: number;
    type: 'peak' | 'valley';
    confidence: number;
}

class RepCountingAlgorithm {
    private exercisePatterns: { [key: string]: ExercisePattern } = {};
    private currentExercise: string = '';
    private repHistory: RepData[] = [];
    private currentRepCount: number = 0;

    // Signal processing components
    private signalWindow: SignalWindow;
    private smoothedSignal: number[] = [];
    private peaks: PeakData[] = [];
    private valleys: PeakData[] = [];

    // State machine for rep detection
    private currentPhase: RepPhase = 'transition';
    private lastPhaseChange: number = 0;
    private repStartTime: number = 0;
    private repInProgress: boolean = false;

    // Filtering and validation
    private readonly SMOOTHING_WINDOW = 5;
    private readonly PEAK_DETECTION_THRESHOLD = 0.1;
    private readonly MIN_PEAK_PROMINENCE = 5; // degrees
    private readonly NOISE_FILTER_SIGMA = 2.0;

    // Quality tracking
    private currentRepMetrics: Partial<RepMetrics> = {};
    private angleHistory: { angle: number; timestamp: number }[] = [];

    constructor() {
        this.initializeExercisePatterns();
        this.initializeSignalWindow();
    }

    private initializeExercisePatterns(): void {
        this.exercisePatterns = {
            squat: {
                name: 'Squat',
                primaryJoint: 'knee',
                secondaryJoints: ['hip', 'ankle'],
                movementType: 'up-down',
                angleThresholds: {
                    min: 60,
                    max: 180,
                    repStart: 160,
                    repEnd: 160
                },
                temporalFilters: {
                    minRepDuration: 1500, // 1.5 seconds
                    maxRepDuration: 8000, // 8 seconds
                    minPauseDuration: 300   // 0.3 seconds
                },
                qualityMetrics: {
                    minRangeOfMotion: 60, // degrees
                    maxAsymmetry: 15,     // degrees
                    tempoRange: { min: 0.5, max: 4.0 } // reps per second
                }
            },
            pushup: {
                name: 'Push-up',
                primaryJoint: 'elbow',
                secondaryJoints: ['shoulder'],
                movementType: 'up-down',
                angleThresholds: {
                    min: 45,
                    max: 180,
                    repStart: 160,
                    repEnd: 160
                },
                temporalFilters: {
                    minRepDuration: 1000,
                    maxRepDuration: 6000,
                    minPauseDuration: 200
                },
                qualityMetrics: {
                    minRangeOfMotion: 70,
                    maxAsymmetry: 10,
                    tempoRange: { min: 0.3, max: 3.0 }
                }
            },
            lunge: {
                name: 'Lunge',
                primaryJoint: 'front_knee',
                secondaryJoints: ['back_knee', 'hip'],
                movementType: 'up-down',
                angleThresholds: {
                    min: 70,
                    max: 170,
                    repStart: 150,
                    repEnd: 150
                },
                temporalFilters: {
                    minRepDuration: 2000,
                    maxRepDuration: 10000,
                    minPauseDuration: 500
                },
                qualityMetrics: {
                    minRangeOfMotion: 50,
                    maxAsymmetry: 20,
                    tempoRange: { min: 0.2, max: 2.0 }
                }
            },
            bicep_curl: {
                name: 'Bicep Curl',
                primaryJoint: 'elbow',
                secondaryJoints: ['shoulder'],
                movementType: 'in-out',
                angleThresholds: {
                    min: 30,
                    max: 170,
                    repStart: 150,
                    repEnd: 150
                },
                temporalFilters: {
                    minRepDuration: 1200,
                    maxRepDuration: 5000,
                    minPauseDuration: 200
                },
                qualityMetrics: {
                    minRangeOfMotion: 80,
                    maxAsymmetry: 15,
                    tempoRange: { min: 0.4, max: 2.5 }
                }
            }
        };
    }

    private initializeSignalWindow(): void {
        this.signalWindow = {
            data: new Array(30).fill(0), // 1 second at 30 FPS
            timestamps: new Array(30).fill(0),
            size: 30,
            index: 0
        };
    }

    public setExercise(exerciseType: string): void {
        this.currentExercise = exerciseType;
        this.resetRepCounting();
    }

    public processFrame(poseData: PoseData): RepData | null {
        if (!this.exercisePatterns[this.currentExercise]) {
            return null;
        }

        const pattern = this.exercisePatterns[this.currentExercise];

        // Extract primary joint angle
        const currentAngle = this.extractJointAngle(poseData, pattern.primaryJoint);
        if (currentAngle === null) {
            return null;
        }

        // Update signal processing
        this.updateSignalWindow(currentAngle, poseData.timestamp);
        this.smoothSignal();
        this.detectPeaksAndValleys();

        // Update angle history for quality assessment
        this.angleHistory.push({ angle: currentAngle, timestamp: poseData.timestamp });
        if (this.angleHistory.length > 100) { // Keep last 100 samples
            this.angleHistory.shift();
        }

        // Process rep detection
        const detectedRep = this.detectRepetition(currentAngle, poseData.timestamp, pattern);

        if (detectedRep) {
            this.repHistory.push(detectedRep);
            return detectedRep;
        }

        return null;
    }

    private updateSignalWindow(angle: number, timestamp: number): void {
        this.signalWindow.data[this.signalWindow.index] = angle;
        this.signalWindow.timestamps[this.signalWindow.index] = timestamp;
        this.signalWindow.index = (this.signalWindow.index + 1) % this.signalWindow.size;
    }

    private smoothSignal(): void {
        // Apply Gaussian smoothing to reduce noise
        const window = this.SMOOTHING_WINDOW;
        const sigma = this.NOISE_FILTER_SIGMA;

        this.smoothedSignal = [];

        for (let i = 0; i < this.signalWindow.data.length; i++) {
            let weightedSum = 0;
            let weightSum = 0;

            for (let j = -window; j <= window; j++) {
                const idx = (i + j + this.signalWindow.data.length) % this.signalWindow.data.length;
                const weight = Math.exp(-(j * j) / (2 * sigma * sigma));

                weightedSum += this.signalWindow.data[idx] * weight;
                weightSum += weight;
            }

            this.smoothedSignal[i] = weightedSum / weightSum;
        }
    }

    private detectPeaksAndValleys(): void {
        this.peaks = [];
        this.valleys = [];

        if (this.smoothedSignal.length < 3) return;

        for (let i = 1; i < this.smoothedSignal.length - 1; i++) {
            const prev = this.smoothedSignal[i - 1];
            const curr = this.smoothedSignal[i];
            const next = this.smoothedSignal[i + 1];

            // Peak detection
            if (curr > prev && curr > next && curr - Math.min(prev, next) > this.MIN_PEAK_PROMINENCE) {
                this.peaks.push({
                    value: curr,
                    timestamp: this.signalWindow.timestamps[i],
                    index: i,
                    type: 'peak',
                    confidence: this.calculatePeakConfidence(i, 'peak')
                });
            }

            // Valley detection
            if (curr < prev && curr < next && Math.max(prev, next) - curr > this.MIN_PEAK_PROMINENCE) {
                this.valleys.push({
                    value: curr,
                    timestamp: this.signalWindow.timestamps[i],
                    index: i,
                    type: 'valley',
                    confidence: this.calculatePeakConfidence(i, 'valley')
                });
            }
        }
    }

    private calculatePeakConfidence(index: number, type: 'peak' | 'valley'): number {
        const windowSize = 3;
        const center = this.smoothedSignal[index];
        let prominence = 0;

        // Calculate prominence compared to neighboring points
        for (let i = Math.max(0, index - windowSize); i <= Math.min(this.smoothedSignal.length - 1, index + windowSize); i++) {
            if (i !== index) {
                if (type === 'peak') {
                    prominence += Math.max(0, center - this.smoothedSignal[i]);
                } else {
                    prominence += Math.max(0, this.smoothedSignal[i] - center);
                }
            }
        }

        return Math.min(1.0, prominence / (this.MIN_PEAK_PROMINENCE * windowSize));
    }

    private detectRepetition(currentAngle: number, timestamp: number, pattern: ExercisePattern): RepData | null {
        const newPhase = this.determineRepPhase(currentAngle, pattern);

        // State machine for rep detection
        if (newPhase !== this.currentPhase) {
            const phaseChangeValid = this.validatePhaseChange(this.currentPhase, newPhase, timestamp);

            if (phaseChangeValid) {
                this.currentPhase = newPhase;
                this.lastPhaseChange = timestamp;

                // Check for rep completion
                if (this.isRepComplete(newPhase, pattern)) {
                    return this.finalizeRep(timestamp, pattern);
                }

                // Check for rep start
                if (this.isRepStart(newPhase, pattern)) {
                    this.startNewRep(timestamp, currentAngle);
                }
            }
        }

        // Update current rep metrics
        if (this.repInProgress) {
            this.updateCurrentRepMetrics(currentAngle, timestamp);
        }

        return null;
    }

    private determineRepPhase(angle: number, pattern: ExercisePattern): RepPhase {
        const { min, max, repStart } = pattern.angleThresholds;
        const midpoint = (min + max) / 2;

        // Determine phase based on angle and recent movement
        if (angle >= repStart) {
            return 'top';
        } else if (angle <= min + 10) {
            return 'bottom';
        } else if (angle > midpoint) {
            // Check movement direction to determine if going up or down
            const recentTrend = this.calculateMovementTrend();
            return recentTrend > 0 ? 'concentric' : 'eccentric';
        } else {
            const recentTrend = this.calculateMovementTrend();
            return recentTrend < 0 ? 'eccentric' : 'concentric';
        }
    }

    private calculateMovementTrend(): number {
        if (this.angleHistory.length < 5) return 0;

        const recent = this.angleHistory.slice(-5);
        let trend = 0;

        for (let i = 1; i < recent.length; i++) {
            trend += recent[i].angle - recent[i - 1].angle;
        }

        return trend / (recent.length - 1);
    }

    private validatePhaseChange(oldPhase: RepPhase, newPhase: RepPhase, timestamp: number): boolean {
        const timeSinceLastChange = timestamp - this.lastPhaseChange;
        const pattern = this.exercisePatterns[this.currentExercise];

        // Minimum time between phase changes to filter noise
        if (timeSinceLastChange < pattern.temporalFilters.minPauseDuration) {
            return false;
        }

        // Valid phase transitions
        const validTransitions: { [key: string]: RepPhase[] } = {
            'transition': ['top', 'eccentric', 'concentric'],
            'top': ['eccentric'],
            'eccentric': ['bottom', 'concentric'],
            'bottom': ['concentric'],
            'concentric': ['top', 'eccentric']
        };

        return validTransitions[oldPhase]?.includes(newPhase) || false;
    }

    private isRepStart(phase: RepPhase, pattern: ExercisePattern): boolean {
        return phase === 'eccentric' && !this.repInProgress;
    }

    private isRepComplete(phase: RepPhase, pattern: ExercisePattern): boolean {
        return phase === 'top' && this.repInProgress;
    }

    private startNewRep(timestamp: number, angle: number): void {
        this.repInProgress = true;
        this.repStartTime = timestamp;
        this.currentRepMetrics = {
            peakAngle: angle,
            minAngle: angle,
            timeToBottom: 0,
            timeToTop: 0
        };
    }

    private updateCurrentRepMetrics(angle: number, timestamp: number): void {
        if (!this.currentRepMetrics) return;

        // Update peak and min angles
        this.currentRepMetrics.peakAngle = Math.max(this.currentRepMetrics.peakAngle || 0, angle);
        this.currentRepMetrics.minAngle = Math.min(this.currentRepMetrics.minAngle || 180, angle);

        // Calculate range of motion
        this.currentRepMetrics.rangeOfMotion =
            (this.currentRepMetrics.peakAngle || 0) - (this.currentRepMetrics.minAngle || 0);
    }

    private finalizeRep(timestamp: number, pattern: ExercisePattern): RepData {
        const duration = timestamp - this.repStartTime;
        const quality = this.calculateRepQuality(duration, pattern);

        this.currentRepCount++;
        this.repInProgress = false;

        const repData: RepData = {
            repNumber: this.currentRepCount,
            startTimestamp: this.repStartTime,
            endTimestamp: timestamp,
            duration,
            quality,
            phase: this.currentPhase,
            keyMetrics: {
                peakAngle: this.currentRepMetrics.peakAngle || 0,
                minAngle: this.currentRepMetrics.minAngle || 0,
                rangeOfMotion: this.currentRepMetrics.rangeOfMotion || 0,
                timeToBottom: duration * 0.6, // Estimated
                timeToTop: duration * 0.4,    // Estimated
                tempo: 60000 / duration       // Reps per minute
            }
        };

        return repData;
    }

    private calculateRepQuality(duration: number, pattern: ExercisePattern): RepQuality {
        const metrics = this.currentRepMetrics;
        const rom = metrics.rangeOfMotion || 0;
        const tempo = 60000 / duration; // RPM

        // Completeness: Based on range of motion
        const completeness = Math.min(1.0, rom / pattern.qualityMetrics.minRangeOfMotion);

        // Consistency: Based on tempo being within acceptable range
        const tempoScore = this.isWithinRange(tempo, pattern.qualityMetrics.tempoRange) ? 1.0 : 0.7;

        // Duration validity
        const durationValid = duration >= pattern.temporalFilters.minRepDuration &&
            duration <= pattern.temporalFilters.maxRepDuration;

        // Form score (simplified - would integrate with form analysis)
        const formScore = 0.85; // Default good form

        // Overall quality score
        const score = (completeness * 0.4 + tempoScore * 0.2 + formScore * 0.4) * 100;

        return {
            score: Math.round(score),
            completeness,
            consistency: tempoScore,
            form: formScore,
            isValid: durationValid && completeness >= 0.7 && score >= 60
        };
    }

    private isWithinRange(value: number, range: { min: number; max: number }): boolean {
        return value >= range.min && value <= range.max;
    }

    private extractJointAngle(poseData: PoseData, jointName: string): number | null {
        const keypoints = this.getKeypointMap(poseData);

        switch (jointName) {
            case 'knee':
                return this.calculateAngle(keypoints.left_hip, keypoints.left_knee, keypoints.left_ankle);
            case 'elbow':
                return this.calculateAngle(keypoints.left_shoulder, keypoints.left_elbow, keypoints.left_wrist);
            case 'front_knee':
                return this.calculateAngle(keypoints.left_hip, keypoints.left_knee, keypoints.left_ankle);
            case 'hip':
                return this.calculateAngle(keypoints.left_shoulder, keypoints.left_hip, keypoints.left_knee);
            default:
                return null;
        }
    }

    private getKeypointMap(poseData: PoseData): { [key: string]: PoseKeypoint } {
        const map: { [key: string]: PoseKeypoint } = {};
        poseData.keypoints.forEach(kp => {
            if (kp.score > 0.3) {
                map[kp.name] = kp;
            }
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

        const cosAngle = dot / (mag1 * mag2);
        return (Math.acos(Math.max(-1, Math.min(1, cosAngle))) * 180) / Math.PI;
    }

    private resetRepCounting(): void {
        this.repHistory = [];
        this.currentRepCount = 0;
        this.currentPhase = 'transition';
        this.repInProgress = false;
        this.angleHistory = [];
        this.currentRepMetrics = {};
        this.initializeSignalWindow();
    }

    // Public methods
    public getCurrentRepCount(): number {
        return this.currentRepCount;
    }

    public getRepHistory(): RepData[] {
        return [...this.repHistory];
    }

    public getValidRepCount(): number {
        return this.repHistory.filter(rep => rep.quality.isValid).length;
    }

    public getAverageRepQuality(): number {
        if (this.repHistory.length === 0) return 0;
        const totalScore = this.repHistory.reduce((sum, rep) => sum + rep.quality.score, 0);
        return totalScore / this.repHistory.length;
    }

    public getLastRepData(): RepData | null {
        return this.repHistory.length > 0 ? this.repHistory[this.repHistory.length - 1] : null;
    }

    public getCurrentPhase(): RepPhase {
        return this.currentPhase;
    }

    public isRepInProgress(): boolean {
        return this.repInProgress;
    }

    // Advanced analytics
    public getRepTempo(): number {
        if (this.repHistory.length < 2) return 0;

        const recentReps = this.repHistory.slice(-5); // Last 5 reps
        const avgDuration = recentReps.reduce((sum, rep) => sum + rep.duration, 0) / recentReps.length;

        return 60000 / avgDuration; // Reps per minute
    }

    public getConsistencyScore(): number {
        if (this.repHistory.length < 3) return 100;

        const durations = this.repHistory.map(rep => rep.duration);
        const mean = durations.reduce((sum, d) => sum + d, 0) / durations.length;
        const variance = durations.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / durations.length;
        const stdDev = Math.sqrt(variance);

        // Consistency score based on coefficient of variation
        const cv = stdDev / mean;
        return Math.max(0, Math.min(100, 100 - cv * 200));
    }
}

export default new RepCountingAlgorithm(); 