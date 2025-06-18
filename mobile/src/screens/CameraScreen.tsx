/**
 * Camera screen for real-time workout analysis
 * Integrates MediaPipe BlazePose with rep counting and form feedback
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Dimensions,
    StatusBar
} from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { PoseAnalyzer } from '../services/PoseAnalyzer';
import { WorkoutSession, ExerciseType, PoseKeypoints, FormAnalysis, FeedbackOverlay } from '../types';
import { PoseOverlay } from '../components/PoseOverlay';
import { StorageService } from '../services/StorageService';

interface CameraScreenProps {
    route: {
        params: {
            exerciseType: ExerciseType;
        };
    };
    navigation: any;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const CameraScreen: React.FC<CameraScreenProps> = ({ route, navigation }) => {
    const { exerciseType } = route.params;

    // State management
    const [permission, requestPermission] = useCameraPermissions();
    const [isRecording, setIsRecording] = useState(false);
    const [repCount, setRepCount] = useState(0);
    const [currentFormScore, setCurrentFormScore] = useState(100);
    const [feedback, setFeedback] = useState<FeedbackOverlay>({
        color: 'green',
        message: 'Position yourself in frame',
        icon: 'checkmark'
    });
    const [sessionStartTime, setSessionStartTime] = useState<number>(0);
    const [poseKeypoints, setPoseKeypoints] = useState<PoseKeypoints | null>(null);

    // Refs and services
    const cameraRef = useRef<CameraView>(null);
    const poseAnalyzer = useRef(new PoseAnalyzer(exerciseType)).current;
    const storageService = new StorageService();

    // Animation values
    const feedbackOpacity = useSharedValue(1);
    const repCountScale = useSharedValue(1);

    useEffect(() => {
        if (!permission) {
            requestPermission();
        }
    }, [permission, requestPermission]);

    /**
     * Handles MediaPipe pose detection results
     */
    const handlePoseDetection = (results: any) => {
        if (!results || !results.landmarks || results.landmarks.length === 0) {
            return;
        }

        try {
            // Extract pose keypoints from MediaPipe results
            const landmarks = results.landmarks[0];
            const keypoints: PoseKeypoints = {
                leftShoulder: landmarks[11],
                rightShoulder: landmarks[12],
                leftHip: landmarks[23],
                rightHip: landmarks[24],
                leftKnee: landmarks[25],
                rightKnee: landmarks[26],
                leftAnkle: landmarks[27],
                rightAnkle: landmarks[28],
                nose: landmarks[0]
            };

            setPoseKeypoints(keypoints);

            // Analyze pose and get feedback
            const analysis: FormAnalysis = poseAnalyzer.analyzePose(keypoints);
            const feedbackOverlay = poseAnalyzer.getFeedbackOverlay(analysis);

            // Update UI state
            setCurrentFormScore(analysis.score);
            setFeedback(feedbackOverlay);

            // Update rep count with animation
            const newRepCount = poseAnalyzer.getRepCount();
            if (newRepCount > repCount) {
                setRepCount(newRepCount);
                repCountScale.value = withSpring(1.2, { duration: 200 }, () => {
                    repCountScale.value = withSpring(1);
                });

                // Haptic feedback on rep completion
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }

            // Animate feedback changes
            if (feedbackOverlay.color !== feedback.color) {
                feedbackOpacity.value = withSpring(0.8, { duration: 100 }, () => {
                    feedbackOpacity.value = withSpring(1);
                });
            }

        } catch (error) {
            console.error('Pose detection error:', error);
        }
    };

    /**
     * Starts workout session
     */
    const startWorkout = async () => {
        try {
            setIsRecording(true);
            setSessionStartTime(Date.now());
            poseAnalyzer.reset();
            setRepCount(0);
            setCurrentFormScore(100);

            // Start camera recording if needed
            if (cameraRef.current) {
                // Note: Actual video recording would be implemented here
                console.log('Starting workout session');
            }

        } catch (error) {
            Alert.alert('Error', 'Failed to start workout session');
            setIsRecording(false);
        }
    };

    /**
     * Stops workout session and saves data
     */
    const stopWorkout = async () => {
        try {
            setIsRecording(false);

            if (repCount === 0) {
                Alert.alert('No Reps Detected', 'Complete at least one rep to save your workout.');
                return;
            }

            // Create workout session
            const session: WorkoutSession = {
                id: `session_${Date.now()}`,
                userId: 'current_user', // Would come from auth context
                exerciseType,
                startTime: sessionStartTime,
                endTime: Date.now(),
                reps: [], // Would be populated with detailed rep metrics
                averageFormScore: currentFormScore,
                videoUri: undefined, // Would be set if video recording enabled
                isUploaded: false,
                createdAt: Date.now()
            };

            // Save session locally
            await storageService.saveWorkoutSession(session);

            Alert.alert(
                'Workout Complete!',
                `${repCount} reps completed with ${currentFormScore}% average form score`,
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.navigate('History')
                    }
                ]
            );

        } catch (error) {
            Alert.alert('Error', 'Failed to save workout session');
        }
    };

    // Animated styles
    const feedbackAnimatedStyle = useAnimatedStyle(() => ({
        opacity: feedbackOpacity.value
    }));

    const repCountAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: repCountScale.value }]
    }));

    if (!permission) {
        return (
            <View style={styles.container}>
                <Text style={styles.message}>Camera permission required</Text>
                <TouchableOpacity style={styles.button} onPress={requestPermission}>
                    <Text style={styles.buttonText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={styles.message}>Camera access denied</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar hidden />

            {/* Camera View */}
            <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing="front"
            // MediaPipe integration would be added here
            // onPoseDetected={handlePoseDetection}
            >
                {/* Pose Overlay */}
                {poseKeypoints && (
                    <PoseOverlay
                        keypoints={poseKeypoints}
                        feedback={feedback}
                        repCount={repCount}
                        currentFormScore={currentFormScore}
                    />
                )}

                {/* Top UI Bar */}
                <View style={styles.topBar}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>

                    <Text style={styles.exerciseTitle}>
                        {exerciseType.toUpperCase()}
                    </Text>

                    <View style={styles.placeholder} />
                </View>

                {/* Feedback Overlay */}
                <Animated.View style={[styles.feedbackContainer, feedbackAnimatedStyle]}>
                    <View style={[styles.feedbackBubble, { backgroundColor: getFeedbackColor(feedback.color) }]}>
                        <Ionicons
                            name={getFeedbackIcon(feedback.icon)}
                            size={20}
                            color="white"
                        />
                        <Text style={styles.feedbackText}>{feedback.message}</Text>
                    </View>
                </Animated.View>

                {/* Rep Counter */}
                <Animated.View style={[styles.repCounter, repCountAnimatedStyle]}>
                    <Text style={styles.repCountText}>{repCount}</Text>
                    <Text style={styles.repLabel}>REPS</Text>
                </Animated.View>

                {/* Form Score */}
                <View style={styles.formScoreContainer}>
                    <Text style={styles.formScoreText}>{currentFormScore}%</Text>
                    <Text style={styles.formScoreLabel}>FORM</Text>
                </View>

                {/* Control Buttons */}
                <View style={styles.controlsContainer}>
                    {!isRecording ? (
                        <TouchableOpacity style={styles.startButton} onPress={startWorkout}>
                            <Ionicons name="play-circle" size={60} color="#4CAF50" />
                            <Text style={styles.startButtonText}>START</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.stopButton} onPress={stopWorkout}>
                            <Ionicons name="stop-circle" size={60} color="#F44336" />
                            <Text style={styles.stopButtonText}>STOP</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </CameraView>
        </View>
    );
};

// Helper functions
const getFeedbackColor = (color: string): string => {
    switch (color) {
        case 'green': return '#4CAF50';
        case 'yellow': return '#FF9800';
        case 'red': return '#F44336';
        default: return '#4CAF50';
    }
};

const getFeedbackIcon = (icon: string): any => {
    switch (icon) {
        case 'checkmark': return 'checkmark-circle';
        case 'warning': return 'warning';
        case 'error': return 'close-circle';
        default: return 'checkmark-circle';
    }
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000'
    },
    camera: {
        flex: 1
    },
    message: {
        textAlign: 'center',
        paddingBottom: 10,
        color: 'white',
        fontSize: 16
    },
    button: {
        backgroundColor: '#4CAF50',
        padding: 15,
        borderRadius: 8,
        margin: 20
    },
    buttonText: {
        color: 'white',
        textAlign: 'center',
        fontSize: 16,
        fontWeight: 'bold'
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20
    },
    backButton: {
        padding: 10
    },
    exerciseTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold'
    },
    placeholder: {
        width: 44
    },
    feedbackContainer: {
        position: 'absolute',
        top: 150,
        left: 20,
        right: 20,
        alignItems: 'center'
    },
    feedbackBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5
    },
    feedbackText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8
    },
    repCounter: {
        position: 'absolute',
        top: 200,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.7)',
        borderRadius: 50,
        width: 80,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center'
    },
    repCountText: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold'
    },
    repLabel: {
        color: 'white',
        fontSize: 10,
        fontWeight: '600'
    },
    formScoreContainer: {
        position: 'absolute',
        top: 200,
        left: 20,
        backgroundColor: 'rgba(0,0,0,0.7)',
        borderRadius: 50,
        width: 80,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center'
    },
    formScoreText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold'
    },
    formScoreLabel: {
        color: 'white',
        fontSize: 10,
        fontWeight: '600'
    },
    controlsContainer: {
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
        alignItems: 'center'
    },
    startButton: {
        alignItems: 'center'
    },
    startButtonText: {
        color: '#4CAF50',
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 5
    },
    stopButton: {
        alignItems: 'center'
    },
    stopButtonText: {
        color: '#F44336',
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 5
    }
}); 