/**
 * Camera screen for real-time workout analysis
 * Integrates TensorFlow.js Pose Detection with rep counting and form feedback
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Dimensions,
    StatusBar,
    ActivityIndicator,
    SafeAreaView,
    Modal,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import * as tf from '@tensorflow/tfjs';

import PoseDetectionService, { PoseData, ExerciseAnalysis } from '../services/PoseDetectionService';
import FormAnalysisEngine from '../services/FormAnalysisEngine';
import RepCountingAlgorithm, { RepData, RepPhase } from '../services/RepCountingAlgorithm';
import ExerciseRecognitionService, { ExerciseRecognition, ExerciseType } from '../services/ExerciseRecognitionService';
import RealTimeFeedbackService from '../services/RealTimeFeedbackService';
import PoseOverlay from '../components/PoseOverlay';
import RealTimeCoach from '../components/RealTimeCoach';
import FrameCapture from '../utils/frameCapture';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Helper functions for rep counting UI
const getPhaseColor = (phase: RepPhase): string => {
    switch (phase) {
        case 'eccentric': return '#FF6B6B';
        case 'concentric': return '#4ECDC4';
        case 'bottom': return '#FFE66D';
        case 'top': return '#95E1D3';
        default: return '#A8E6CF';
    }
};

const getQualityColor = (quality: number): string => {
    if (quality >= 80) return '#00FF00';
    if (quality >= 60) return '#FFA500';
    return '#FF453A';
};

const CameraScreen = ({ navigation }) => {
    const [permission, requestPermission] = useCameraPermissions();
    const [isRecording, setIsRecording] = useState(false);
    const [workoutType, setWorkoutType] = useState<'squat' | 'pushup' | 'bicep_curl' | 'jumping_jack'>('squat');
    const [repCount, setRepCount] = useState(0);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showWorkoutSelector, setShowWorkoutSelector] = useState(false);
    const [facing, setFacing] = useState<'front' | 'back'>('front');
    const [cameraKey, setCameraKey] = useState(0);

    // Pose detection states
    const [isPoseDetectionReady, setIsPoseDetectionReady] = useState(false);
    const [currentPose, setCurrentPose] = useState<PoseData | null>(null);
    const [exerciseAnalysis, setExerciseAnalysis] = useState<ExerciseAnalysis | null>(null);
    const [showPoseOverlay, setShowPoseOverlay] = useState(true);
    const [processingFPS, setProcessingFPS] = useState(0);

    // Rep counting states
    const [validRepCount, setValidRepCount] = useState(0);
    const [lastRepData, setLastRepData] = useState<RepData | null>(null);
    const [currentPhase, setCurrentPhase] = useState<RepPhase>('transition');
    const [repInProgress, setRepInProgress] = useState(false);
    const [repTempo, setRepTempo] = useState(0);
    const [averageRepQuality, setAverageRepQuality] = useState(0);
    const [consistencyScore, setConsistencyScore] = useState(100);

    // Exercise recognition states
    const [currentRecognizedExercise, setCurrentRecognizedExercise] = useState<ExerciseRecognition | null>(null);
    const [exerciseHistory, setExerciseHistory] = useState<ExerciseRecognition[]>([]);
    const [autoDetectedExercise, setAutoDetectedExercise] = useState<ExerciseType | null>(null);
    const [recognitionConfidence, setRecognitionConfidence] = useState(0);
    const [isAutoDetectionEnabled, setIsAutoDetectionEnabled] = useState(true);

    // Real-time coaching states
    const [isCoachingEnabled, setIsCoachingEnabled] = useState(true);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);

    const cameraRef = useRef(null);
    const frameProcessingInterval = useRef<NodeJS.Timeout | null>(null);
    const isProcessingFrame = useRef(false);

    // Initialize TensorFlow.js and pose detection
    useEffect(() => {
        const initializePoseDetection = async () => {
            try {
                setIsAnalyzing(true);

                // Initialize TensorFlow.js for React Native (optional for demo)
                try {
                    await tf.ready();
                    console.log('TensorFlow.js ready');
                } catch (error) {
                    console.warn('TensorFlow.js not available, using demo mode');
                }

                // Initialize pose detection service
                await PoseDetectionService.initialize();
                console.log('Pose detection service initialized');

                // Initialize exercise recognition service
                await ExerciseRecognitionService.initialize();
                console.log('Exercise recognition service initialized');

                setIsPoseDetectionReady(true);
                setIsAnalyzing(false);
            } catch (error) {
                console.error('Failed to initialize pose detection:', error);
                setIsAnalyzing(false);
                Alert.alert(
                    'Initialization Error',
                    'Failed to initialize pose detection. Some features may not work properly.',
                    [{ text: 'OK' }]
                );
            }
        };

        initializePoseDetection();

        return () => {
            // Cleanup
            if (frameProcessingInterval.current) {
                clearInterval(frameProcessingInterval.current);
            }
            PoseDetectionService.dispose();
            ExerciseRecognitionService.dispose();
        };
    }, []);

    // Handle screen focus to reinitialize camera
    useFocusEffect(
        useCallback(() => {
            // Force camera to reinitialize by changing key
            setCameraKey(prev => prev + 1);

            return () => {
                // Reset states when leaving screen
                setIsRecording(false);
                setRepCount(0);
                setIsAnalyzing(false);
                if (frameProcessingInterval.current) {
                    clearInterval(frameProcessingInterval.current);
                }
            };
        }, [])
    );

    // Update exercise type in pose detection service and rep counting
    useEffect(() => {
        if (isPoseDetectionReady) {
            PoseDetectionService.setExerciseType(workoutType);
            RepCountingAlgorithm.setExercise(workoutType);

            // Reset rep counting stats
            setValidRepCount(0);
            setLastRepData(null);
            setCurrentPhase('transition');
            setRepInProgress(false);
            setRepTempo(0);
            setAverageRepQuality(0);
            setConsistencyScore(100);
        }
    }, [workoutType, isPoseDetectionReady]);

    const workoutTypes = [
        { id: 'squat', name: 'Squats', icon: 'fitness', color: ['#FF6B6B', '#FF8E8E'] },
        { id: 'pushup', name: 'Push-ups', icon: 'body', color: ['#4ECDC4', '#6EDDD6'] },
        { id: 'bicep_curl', name: 'Bicep Curls', icon: 'barbell', color: ['#45B7D1', '#96D9F0'] },
        { id: 'jumping_jack', name: 'Jumping Jacks', icon: 'walk', color: ['#F7DC6F', '#F8E896'] },
    ];

    const processFrame = async () => {
        if (!cameraRef.current || !isPoseDetectionReady || isProcessingFrame.current) {
            return;
        }

        isProcessingFrame.current = true;

        try {
            // Capture frame from camera
            const frameData = await FrameCapture.captureFrame(
                cameraRef.current,
                screenWidth,
                screenHeight
            );

            if (frameData) {
                // For development, use mock data
                // In production, you'd convert frameData.uri to proper image data
                const mockImageData = FrameCapture.getMockFrameData(screenWidth, screenHeight);

                // Detect pose
                const poseData = await PoseDetectionService.detectPose(
                    mockImageData,
                    screenWidth,
                    screenHeight
                );

                if (poseData) {
                    setCurrentPose(poseData);

                    // Process exercise recognition (always active)
                    const recognizedExercise = await ExerciseRecognitionService.recognizeExercise(poseData);

                    if (recognizedExercise) {
                        setCurrentRecognizedExercise(recognizedExercise);
                        setRecognitionConfidence(recognizedExercise.confidence);

                        // Auto-detect exercise type if enabled
                        if (isAutoDetectionEnabled && recognizedExercise.exerciseType !== 'standing' && recognizedExercise.exerciseType !== 'unknown') {
                            if (autoDetectedExercise !== recognizedExercise.exerciseType) {
                                setAutoDetectedExercise(recognizedExercise.exerciseType);
                                console.log('Auto-detected exercise:', recognizedExercise.exerciseType, 'with confidence:', recognizedExercise.confidence);
                            }
                        }

                        // Update exercise history
                        if (!recognizedExercise.isOngoing) {
                            const history = ExerciseRecognitionService.getRecognitionHistory();
                            setExerciseHistory(history);
                        }
                    }

                    // Analyze exercise if recording
                    if (isRecording) {
                        // Process form analysis
                        const formAnalysis = FormAnalysisEngine.analyzeForm(poseData);

                        // Process rep counting
                        const detectedRep = RepCountingAlgorithm.processFrame(poseData);

                        // Update rep counting states
                        const totalReps = RepCountingAlgorithm.getCurrentRepCount();
                        const validReps = RepCountingAlgorithm.getValidRepCount();
                        const phase = RepCountingAlgorithm.getCurrentPhase();
                        const inProgress = RepCountingAlgorithm.isRepInProgress();
                        const tempo = RepCountingAlgorithm.getRepTempo();
                        const avgQuality = RepCountingAlgorithm.getAverageRepQuality();
                        const consistency = RepCountingAlgorithm.getConsistencyScore();

                        setRepCount(totalReps);
                        setValidRepCount(validReps);
                        setCurrentPhase(phase);
                        setRepInProgress(inProgress);
                        setRepTempo(tempo);
                        setAverageRepQuality(avgQuality);
                        setConsistencyScore(consistency);

                        if (detectedRep) {
                            setLastRepData(detectedRep);
                            console.log('New rep detected:', detectedRep);
                        }

                        // Create combined analysis for display
                        const exerciseAnalysis: ExerciseAnalysis = {
                            repCount: totalReps,
                            formScore: formAnalysis.overallScore,
                            currentPhase: phase === 'eccentric' ? 'down' :
                                phase === 'concentric' ? 'up' : 'transition',
                            feedback: formAnalysis.feedback.map(f => f.message),
                            formAnalysis: formAnalysis
                        };

                        setExerciseAnalysis(exerciseAnalysis);

                        // Generate real-time coaching feedback
                        if (isCoachingEnabled) {
                            const exerciseContext = {
                                exerciseType: workoutType,
                                repCount: totalReps,
                                phase: phase,
                                duration: Date.now() - (lastRepData?.endTimestamp || Date.now()),
                                lastRep: detectedRep,
                                userLevel: 'intermediate' as const
                            };

                            try {
                                const coachingFeedback = await RealTimeFeedbackService.generateFeedback(
                                    formAnalysis,
                                    exerciseContext,
                                    detectedRep
                                );
                                // Feedback is automatically managed by the service
                            } catch (error) {
                                console.warn('Error generating coaching feedback:', error);
                            }
                        }
                    }
                }
            }

            // Update FPS
            const stats = PoseDetectionService.getPerformanceStats();
            setProcessingFPS(Math.round(stats.fps));

        } catch (error) {
            console.error('Frame processing error:', error);
        } finally {
            isProcessingFrame.current = false;
        }
    };

    const startRecording = async () => {
        if (!isPoseDetectionReady) {
            Alert.alert('Not Ready', 'Pose detection is still initializing. Please wait.');
            return;
        }

        setIsRecording(true);
        setRepCount(0);
        PoseDetectionService.resetExerciseState();

        // Start frame processing at ~30 FPS
        frameProcessingInterval.current = setInterval(processFrame, 33); // ~30 FPS
    };

    const stopRecording = async () => {
        if (isRecording) {
            setIsRecording(false);

            // Stop frame processing
            if (frameProcessingInterval.current) {
                clearInterval(frameProcessingInterval.current);
                frameProcessingInterval.current = null;
            }

            setIsAnalyzing(true);

            // Simulate analysis delay
            setTimeout(() => {
                setIsAnalyzing(false);
                const analysis = exerciseAnalysis;

                Alert.alert(
                    'Workout Complete! 🎉',
                    `Amazing work! You completed ${repCount} reps of ${workoutTypes.find(w => w.id === workoutType)?.name}.\n\nForm Score: ${analysis?.formScore || 0}%\n${analysis?.feedback?.join('\n') || 'Great job!'}`,
                    [
                        {
                            text: 'View History',
                            onPress: () => navigation.navigate('History')
                        },
                        {
                            text: 'Continue Training',
                            style: 'cancel'
                        }
                    ]
                );
                setRepCount(0);
                setExerciseAnalysis(null);
            }, 2000);
        }
    };

    const toggleCameraType = () => {
        setFacing(facing === 'back' ? 'front' : 'back');
    };

    const togglePoseOverlay = () => {
        setShowPoseOverlay(!showPoseOverlay);
    };

    const toggleCoaching = () => {
        setIsCoachingEnabled(!isCoachingEnabled);
        if (!isCoachingEnabled) {
            RealTimeFeedbackService.clearFeedback();
        }
    };

    const toggleAudio = () => {
        setIsAudioEnabled(!isAudioEnabled);
        RealTimeFeedbackService.setAudioEnabled(!isAudioEnabled);
    };

    const WorkoutSelector = () => (
        <Modal
            visible={showWorkoutSelector}
            transparent={true}
            animationType="slide"
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Choose Workout Type</Text>
                    {workoutTypes.map((workout) => (
                        <TouchableOpacity
                            key={workout.id}
                            style={styles.workoutOption}
                            onPress={() => {
                                setWorkoutType(workout.id as any);
                                setShowWorkoutSelector(false);
                            }}
                        >
                            <LinearGradient
                                colors={workout.color as any}
                                style={styles.workoutGradient}
                            >
                                <Ionicons name={workout.icon as any} size={24} color="#fff" />
                                <Text style={styles.workoutName}>{workout.name}</Text>
                                {workoutType === workout.id && (
                                    <Ionicons name="checkmark-circle" size={24} color="#fff" />
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setShowWorkoutSelector(false)}
                    >
                        <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    if (!permission) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1e90ff" />
                <Text style={styles.loadingText}>Requesting camera permissions...</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="camera" size={64} color="#ff453a" />
                <Text style={styles.errorText}>No access to camera</Text>
                <Text style={styles.errorSubtext}>Please enable camera permissions to use this feature</Text>
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={requestPermission}
                >
                    <Text style={styles.retryButtonText}>Grant Camera Access</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar hidden />

            {/* Real Camera Feed - key forces recreation on navigation */}
            <CameraView
                key={`camera-${cameraKey}-${facing}`}
                style={styles.camera}
                facing={facing}
                ref={cameraRef}
            />

            {/* Pose Overlay */}
            {showPoseOverlay && currentPose && (
                <PoseOverlay
                    poseData={currentPose}
                    width={screenWidth}
                    height={screenHeight}
                    cameraFacing={facing}
                />
            )}

            {/* Real-Time AI Coach */}
            <RealTimeCoach
                isActive={isRecording && isCoachingEnabled}
                isAudioEnabled={isAudioEnabled}
                onToggleAudio={toggleAudio}
            />

            {/* Top Controls */}
            <SafeAreaView style={styles.topControls}>
                <TouchableOpacity
                    style={styles.topButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.topButton}
                    onPress={() => setShowWorkoutSelector(true)}
                >
                    <Text style={styles.workoutTypeText}>
                        {workoutTypes.find(w => w.id === workoutType)?.name}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.topButton}
                    onPress={toggleCameraType}
                >
                    <Ionicons name="camera-reverse" size={28} color="#fff" />
                </TouchableOpacity>
            </SafeAreaView>

            {/* Pose Detection Status */}
            <View style={styles.poseStatus}>
                <View style={[styles.statusIndicator, {
                    backgroundColor: isPoseDetectionReady ? '#00ff00' : '#ff453a'
                }]} />
                <Text style={styles.statusText}>
                    {isPoseDetectionReady ? `AI Ready (${processingFPS} FPS)` : 'Initializing AI...'}
                </Text>
                <View style={styles.statusControls}>
                    <TouchableOpacity onPress={toggleCoaching} style={styles.overlayToggle}>
                        <Ionicons
                            name={isCoachingEnabled ? "chatbubble" : "chatbubble-outline"}
                            size={20}
                            color={isCoachingEnabled ? "#4ECDC4" : "#fff"}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={togglePoseOverlay} style={styles.overlayToggle}>
                        <Ionicons
                            name={showPoseOverlay ? "eye" : "eye-off"}
                            size={20}
                            color="#fff"
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Exercise Recognition Panel */}
            {currentRecognizedExercise && (
                <View style={styles.exerciseRecognitionPanel}>
                    <LinearGradient
                        colors={['rgba(76, 175, 80, 0.9)', 'rgba(139, 195, 74, 0.8)']}
                        style={styles.recognitionGradient}
                    >
                        <View style={styles.recognitionHeader}>
                            <Ionicons name="fitness" size={20} color="#fff" />
                            <Text style={styles.recognitionTitle}>AI Detection</Text>
                            <TouchableOpacity
                                onPress={() => setIsAutoDetectionEnabled(!isAutoDetectionEnabled)}
                                style={styles.autoToggle}
                            >
                                <Text style={styles.autoToggleText}>
                                    {isAutoDetectionEnabled ? 'AUTO ON' : 'AUTO OFF'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.detectedExercise}>
                            {currentRecognizedExercise.exerciseType.toUpperCase().replace('_', ' ')}
                        </Text>

                        <View style={styles.confidenceBar}>
                            <View style={styles.confidenceBarBg}>
                                <View
                                    style={[
                                        styles.confidenceBarFill,
                                        { width: `${recognitionConfidence * 100}%` }
                                    ]}
                                />
                            </View>
                            <Text style={styles.recognitionConfidenceText}>
                                {Math.round(recognitionConfidence * 100)}% confidence
                            </Text>
                        </View>

                        {currentRecognizedExercise.isOngoing && (
                            <View style={styles.durationContainer}>
                                <Text style={styles.durationText}>
                                    Duration: {Math.round((Date.now() - currentRecognizedExercise.startTimestamp) / 1000)}s
                                </Text>
                            </View>
                        )}

                        {autoDetectedExercise && isAutoDetectionEnabled && autoDetectedExercise !== workoutType && (
                            <TouchableOpacity
                                style={styles.switchExerciseButton}
                                onPress={() => {
                                    setWorkoutType(autoDetectedExercise as any);
                                    setAutoDetectedExercise(null);
                                }}
                            >
                                <Text style={styles.switchExerciseText}>
                                    Switch to {autoDetectedExercise.replace('_', ' ')}?
                                </Text>
                            </TouchableOpacity>
                        )}
                    </LinearGradient>
                </View>
            )}

            {/* Rep Counter */}
            {(isRecording || repCount > 0) && (
                <View style={styles.repCounter}>
                    <LinearGradient
                        colors={['#1e90ff', '#4169e1']}
                        style={styles.repCounterGradient}
                    >
                        <Text style={styles.repCountText}>{repCount}</Text>
                        <Text style={styles.repLabel}>TOTAL REPS</Text>
                        <Text style={styles.validRepsText}>{validRepCount} Valid</Text>
                        {exerciseAnalysis && (
                            <Text style={styles.formScore}>
                                Form: {exerciseAnalysis.formScore}%
                            </Text>
                        )}
                    </LinearGradient>
                </View>
            )}

            {/* Advanced Rep Statistics */}
            {isRecording && (
                <View style={styles.repStatsContainer}>
                    <LinearGradient
                        colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.6)']}
                        style={styles.repStatsGradient}
                    >
                        <View style={styles.repStatsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Phase</Text>
                                <Text style={[styles.statValue, { color: getPhaseColor(currentPhase) }]}>
                                    {currentPhase.toUpperCase()}
                                </Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Quality</Text>
                                <Text style={[styles.statValue, { color: getQualityColor(averageRepQuality) }]}>
                                    {Math.round(averageRepQuality)}%
                                </Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Tempo</Text>
                                <Text style={styles.statValue}>
                                    {repTempo.toFixed(1)} RPM
                                </Text>
                            </View>
                        </View>
                        <View style={styles.repStatsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Rep Status</Text>
                                <Text style={[styles.statValue, { color: repInProgress ? '#FFA500' : '#00FF00' }]}>
                                    {repInProgress ? 'IN PROGRESS' : 'READY'}
                                </Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Consistency</Text>
                                <Text style={[styles.statValue, { color: getQualityColor(consistencyScore) }]}>
                                    {Math.round(consistencyScore)}%
                                </Text>
                            </View>
                        </View>
                        {lastRepData && (
                            <View style={styles.lastRepInfo}>
                                <Text style={styles.lastRepLabel}>Last Rep:</Text>
                                <Text style={styles.lastRepText}>
                                    {lastRepData.duration}ms • {Math.round(lastRepData.quality.score)}% quality • {lastRepData.keyMetrics.rangeOfMotion.toFixed(0)}° ROM
                                </Text>
                            </View>
                        )}
                    </LinearGradient>
                </View>
            )}

            {/* Advanced Form Analysis */}
            {isRecording && exerciseAnalysis && exerciseAnalysis.formAnalysis && (
                <View style={styles.formAnalysisContainer}>
                    <View style={styles.formScoreHeader}>
                        <Text style={styles.formScoreTitle}>AI Form Analysis</Text>
                        <Text style={styles.confidenceText}>
                            {exerciseAnalysis.formAnalysis.confidence}% Confidence
                        </Text>
                    </View>

                    {/* Component Scores */}
                    <View style={styles.componentScores}>
                        <View style={styles.scoreItem}>
                            <Text style={styles.scoreLabel}>Technique</Text>
                            <Text style={styles.scoreValue}>
                                {Math.round(exerciseAnalysis.formAnalysis.componentScores.technique)}%
                            </Text>
                        </View>
                        <View style={styles.scoreItem}>
                            <Text style={styles.scoreLabel}>Range</Text>
                            <Text style={styles.scoreValue}>
                                {Math.round(exerciseAnalysis.formAnalysis.componentScores.range)}%
                            </Text>
                        </View>
                        <View style={styles.scoreItem}>
                            <Text style={styles.scoreLabel}>Stability</Text>
                            <Text style={styles.scoreValue}>
                                {Math.round(exerciseAnalysis.formAnalysis.componentScores.stability)}%
                            </Text>
                        </View>
                    </View>

                    {/* Primary Feedback */}
                    {exerciseAnalysis.formAnalysis.feedback.length > 0 && (
                        <View style={styles.feedbackSection}>
                            <Text style={styles.primaryFeedback}>
                                {exerciseAnalysis.formAnalysis.feedback[0].message}
                            </Text>
                        </View>
                    )}

                    {/* Improvements */}
                    {exerciseAnalysis.formAnalysis.improvements.length > 0 && (
                        <View style={styles.improvementsSection}>
                            <Text style={styles.improvementText}>
                                💡 {exerciseAnalysis.formAnalysis.improvements[0]}
                            </Text>
                        </View>
                    )}

                    {/* Risk Factors */}
                    {exerciseAnalysis.formAnalysis.riskFactors.length > 0 && (
                        <View style={styles.riskSection}>
                            <Text style={styles.riskText}>
                                ⚠️ {exerciseAnalysis.formAnalysis.riskFactors[0]}
                            </Text>
                        </View>
                    )}
                </View>
            )}

            {/* Recording Status */}
            {isRecording && (
                <View style={styles.recordingStatus}>
                    <View style={styles.recordingDot} />
                    <Text style={styles.recordingText}>AI ANALYZING</Text>
                </View>
            )}

            {/* Bottom Controls */}
            <View style={styles.bottomControls}>
                {!isRecording && !isAnalyzing && (
                    <TouchableOpacity
                        style={styles.recordButton}
                        onPress={startRecording}
                    >
                        <LinearGradient
                            colors={['#ff453a', '#ff6b6b']}
                            style={styles.recordButtonGradient}
                        >
                            <Ionicons name="radio-button-on" size={32} color="#fff" />
                        </LinearGradient>
                    </TouchableOpacity>
                )}

                {isRecording && (
                    <TouchableOpacity
                        style={styles.stopButton}
                        onPress={stopRecording}
                    >
                        <View style={styles.stopButtonInner} />
                    </TouchableOpacity>
                )}

                {!isRecording && !isAnalyzing && (
                    <View style={styles.bottomButtonsContainer}>
                        <TouchableOpacity
                            style={styles.bottomButton}
                            onPress={() => navigation.navigate('History')}
                        >
                            <Ionicons name="list" size={24} color="#fff" />
                            <Text style={styles.bottomButtonText}>History</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.bottomButton}
                            onPress={() => navigation.navigate('Analytics')}
                        >
                            <Ionicons name="stats-chart" size={24} color="#fff" />
                            <Text style={styles.bottomButtonText}>Stats</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Analysis Status */}
            {isAnalyzing && (
                <View style={styles.analysisOverlay}>
                    <LinearGradient
                        colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.9)']}
                        style={styles.analysisContainer}
                    >
                        <ActivityIndicator size="large" color="#1e90ff" />
                        <Text style={styles.analysisText}>Analyzing your workout...</Text>
                        <Text style={styles.analysisSubtext}>AI is reviewing your form and counting reps</Text>
                    </LinearGradient>
                </View>
            )}

            <WorkoutSelector />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    loadingText: {
        color: '#fff',
        marginTop: 16,
        fontSize: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
        padding: 40,
    },
    errorText: {
        color: '#ff453a',
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 16,
        textAlign: 'center',
    },
    errorSubtext: {
        color: '#666',
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: '#1e90ff',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 25,
        marginTop: 20,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    topControls: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        zIndex: 1000,
    },
    topButton: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 25,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    workoutTypeText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginRight: 8,
    },
    repCounter: {
        position: 'absolute',
        top: 100,
        right: 20,
        zIndex: 1000,
    },
    repCounterGradient: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 20,
        alignItems: 'center',
    },
    repCountText: {
        color: '#fff',
        fontSize: 32,
        fontWeight: 'bold',
    },
    repLabel: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
    },
    recordingStatus: {
        position: 'absolute',
        top: 100,
        left: 20,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 69, 58, 0.9)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        zIndex: 1000,
    },
    recordingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#fff',
        marginRight: 8,
    },
    recordingText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    analysisOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2000,
    },
    analysisContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    analysisText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 20,
        textAlign: 'center',
    },
    analysisSubtext: {
        color: '#ccc',
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
    },
    bottomControls: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: 40,
        paddingHorizontal: 20,
        alignItems: 'center',
        zIndex: 1000,
    },
    recordButton: {
        marginBottom: 20,
    },
    recordButtonGradient: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stopButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#ff453a',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    stopButtonInner: {
        width: 24,
        height: 24,
        backgroundColor: '#fff',
        borderRadius: 4,
    },
    bottomButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
    },
    bottomButton: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        alignItems: 'center',
        minWidth: 80,
    },
    bottomButtonText: {
        color: '#fff',
        fontSize: 12,
        marginTop: 4,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        width: '80%',
        maxHeight: '70%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        color: '#333',
    },
    workoutOption: {
        marginBottom: 12,
        borderRadius: 12,
        overflow: 'hidden',
    },
    workoutGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    workoutName: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 12,
    },
    closeButton: {
        backgroundColor: '#f0f0f0',
        padding: 16,
        borderRadius: 12,
        marginTop: 10,
    },
    closeButtonText: {
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    poseStatus: {
        position: 'absolute',
        top: 100,
        left: 20,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        zIndex: 1000,
    },
    statusIndicator: {
        width: 20,
        height: 20,
        borderRadius: 10,
        marginRight: 8,
    },
    statusText: {
        color: '#333',
        fontSize: 12,
        fontWeight: 'bold',
    },
    overlayToggle: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    statusControls: {
        flexDirection: 'row',
        gap: 8,
        marginLeft: 10,
    },
    feedbackContainer: {
        position: 'absolute',
        top: 100,
        left: 20,
        padding: 16,
        backgroundColor: 'rgba(0,0,0,0.8)',
        borderRadius: 20,
        zIndex: 1000,
    },
    feedbackText: {
        color: '#fff',
        fontSize: 12,
        marginBottom: 4,
    },
    formScore: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 4,
    },
    formAnalysisContainer: {
        position: 'absolute',
        top: 150,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderRadius: 15,
        padding: 16,
        zIndex: 1000,
    },
    formScoreHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    formScoreTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    confidenceText: {
        color: '#00ff00',
        fontSize: 12,
        fontWeight: '600',
    },
    componentScores: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    scoreItem: {
        alignItems: 'center',
        flex: 1,
    },
    scoreLabel: {
        color: '#ccc',
        fontSize: 10,
        marginBottom: 2,
    },
    scoreValue: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    feedbackSection: {
        marginBottom: 8,
    },
    primaryFeedback: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    improvementsSection: {
        marginBottom: 8,
    },
    improvementText: {
        color: '#4ECDC4',
        fontSize: 12,
        fontStyle: 'italic',
    },
    riskSection: {
        marginBottom: 4,
    },
    riskText: {
        color: '#FF6B6B',
        fontSize: 12,
        fontWeight: '600',
    },
    // Rep counting styles
    validRepsText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
        marginTop: 2,
    },
    repStatsContainer: {
        position: 'absolute',
        top: 200,
        right: 20,
        zIndex: 1000,
        maxWidth: 200,
    },
    repStatsGradient: {
        padding: 12,
        borderRadius: 15,
    },
    repStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statLabel: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '500',
        opacity: 0.8,
    },
    statValue: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 2,
    },
    lastRepInfo: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.2)',
    },
    lastRepLabel: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
        marginBottom: 4,
    },
    lastRepText: {
        color: '#fff',
        fontSize: 9,
        opacity: 0.9,
    },
    // Exercise recognition styles
    exerciseRecognitionPanel: {
        position: 'absolute',
        top: 160,
        left: 20,
        zIndex: 1000,
        maxWidth: 250,
    },
    recognitionGradient: {
        padding: 12,
        borderRadius: 15,
    },
    recognitionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    recognitionTitle: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 6,
        flex: 1,
    },
    autoToggle: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    autoToggleText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    detectedExercise: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    confidenceBar: {
        marginBottom: 8,
    },
    confidenceBarBg: {
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 2,
        marginBottom: 4,
    },
    confidenceBarFill: {
        height: '100%',
        backgroundColor: '#fff',
        borderRadius: 2,
    },
    recognitionConfidenceText: {
        color: '#fff',
        fontSize: 10,
        textAlign: 'center',
    },
    durationContainer: {
        alignItems: 'center',
        marginTop: 4,
    },
    durationText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
    },
    switchExerciseButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 8,
        borderRadius: 10,
        marginTop: 8,
    },
    switchExerciseText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
        textAlign: 'center',
    },
});

export default CameraScreen; 