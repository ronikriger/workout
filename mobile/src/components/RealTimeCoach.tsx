import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RealTimeFeedbackService, { CoachingFeedback, VisualCue } from '../services/RealTimeFeedbackService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface RealTimeCoachProps {
    isActive: boolean;
    isAudioEnabled: boolean;
    onToggleAudio: () => void;
    onDismissFeedback?: (feedbackId: string) => void;
}

const RealTimeCoach: React.FC<RealTimeCoachProps> = ({
    isActive,
    isAudioEnabled,
    onToggleAudio,
    onDismissFeedback
}) => {
    const [activeFeedback, setActiveFeedback] = useState<CoachingFeedback[]>([]);
    const [feedbackAnimations, setFeedbackAnimations] = useState<{ [key: string]: Animated.Value }>({});
    const [visualCues, setVisualCues] = useState<VisualCue[]>([]);

    useEffect(() => {
        if (!isActive) return;

        const updateInterval = setInterval(() => {
            const feedback = RealTimeFeedbackService.getActiveFeedback();
            setActiveFeedback(feedback);

            // Extract visual cues
            const cues = feedback
                .filter(f => f.visualCue)
                .map(f => f.visualCue!)
                .filter(Boolean);
            setVisualCues(cues);

            // Create animations for new feedback
            feedback.forEach(f => {
                if (!feedbackAnimations[f.id]) {
                    const animation = new Animated.Value(0);
                    setFeedbackAnimations(prev => ({
                        ...prev,
                        [f.id]: animation
                    }));

                    // Animate feedback in
                    Animated.sequence([
                        Animated.timing(animation, {
                            toValue: 1,
                            duration: 300,
                            useNativeDriver: true,
                        }),
                        Animated.delay(f.duration - 600), // Keep visible for duration minus fade out time
                        Animated.timing(animation, {
                            toValue: 0,
                            duration: 300,
                            useNativeDriver: true,
                        })
                    ]).start(() => {
                        // Clean up animation
                        setFeedbackAnimations(prev => {
                            const newAnimations = { ...prev };
                            delete newAnimations[f.id];
                            return newAnimations;
                        });
                    });
                }
            });
        }, 500); // Update every 500ms

        return () => clearInterval(updateInterval);
    }, [isActive, feedbackAnimations]);

    const getPriorityColor = (priority: CoachingFeedback['priority']): string => {
        switch (priority) {
            case 'critical': return '#FF6B6B';
            case 'important': return '#FFA500';
            case 'suggestion': return '#4ECDC4';
            case 'encouragement': return '#45B7D1';
            default: return '#45B7D1';
        }
    };

    const getPriorityIcon = (priority: CoachingFeedback['priority']): any => {
        switch (priority) {
            case 'critical': return 'warning';
            case 'important': return 'information-circle';
            case 'suggestion': return 'bulb';
            case 'encouragement': return 'thumbs-up';
            default: return 'information-circle';
        }
    };

    const getCategoryEmoji = (category: CoachingFeedback['category']): string => {
        switch (category) {
            case 'form_correction': return '🎯';
            case 'safety_warning': return '⚠️';
            case 'encouragement': return '💪';
            case 'rep_guidance': return '🔄';
            case 'breathing': return '🫁';
            case 'pace_adjustment': return '⏱️';
            case 'range_of_motion': return '📏';
            case 'motivation': return '🔥';
            default: return '💡';
        }
    };

    const renderVisualCue = (cue: VisualCue, index: number) => {
        const position = {
            left: cue.position.x * screenWidth - cue.size / 2,
            top: cue.position.y * screenHeight - cue.size / 2,
        };

        const animationStyle = getAnimationStyle(cue.animation);

        return (
            <Animated.View
                key={`cue-${index}`}
                style={[
                    styles.visualCue,
                    position,
                    {
                        width: cue.size,
                        height: cue.size,
                        backgroundColor: cue.color,
                    },
                    animationStyle
                ]}
            >
                {cue.type === 'arrow' && (
                    <Ionicons
                        name={getArrowIcon(cue.direction)}
                        size={cue.size * 0.6}
                        color="white"
                    />
                )}
                {cue.type === 'warning' && (
                    <Ionicons
                        name="warning"
                        size={cue.size * 0.6}
                        color="white"
                    />
                )}
                {cue.type === 'target' && (
                    <View style={styles.targetRing} />
                )}
            </Animated.View>
        );
    };

    const getArrowIcon = (direction?: string): any => {
        switch (direction) {
            case 'up': return 'arrow-up';
            case 'down': return 'arrow-down';
            case 'left': return 'arrow-back';
            case 'right': return 'arrow-forward';
            default: return 'arrow-up';
        }
    };

    const getAnimationStyle = (animation?: string) => {
        // In a real implementation, you'd create actual animated values
        // For demo, we'll just return basic styles
        switch (animation) {
            case 'pulse':
                return { opacity: 0.8 };
            case 'bounce':
                return { transform: [{ scale: 1.1 }] };
            case 'glow':
                return { shadowOpacity: 0.8, shadowRadius: 10 };
            default:
                return {};
        }
    };

    const handleDismissFeedback = (feedbackId: string) => {
        RealTimeFeedbackService.dismissFeedback(feedbackId);
        onDismissFeedback?.(feedbackId);
    };

    const stats = RealTimeFeedbackService.getFeedbackStats();

    if (!isActive) return null;

    return (
        <View style={styles.container}>
            {/* Visual Cues Overlay */}
            <View style={styles.visualCuesContainer}>
                {visualCues.map((cue, index) => renderVisualCue(cue, index))}
            </View>

            {/* Coach Status Bar */}
            <View style={styles.statusBar}>
                <View style={styles.statusLeft}>
                    <View style={styles.coachIndicator}>
                        <Text style={styles.coachIcon}>🤖</Text>
                        <Text style={styles.statusText}>AI Coach Active</Text>
                    </View>
                </View>

                <View style={styles.statusRight}>
                    <TouchableOpacity
                        style={[styles.audioButton, { backgroundColor: isAudioEnabled ? '#45B7D1' : '#666' }]}
                        onPress={onToggleAudio}
                    >
                        <Ionicons
                            name={isAudioEnabled ? 'volume-high' : 'volume-mute'}
                            size={16}
                            color="white"
                        />
                    </TouchableOpacity>

                    <View style={styles.statsContainer}>
                        <Text style={styles.statsText}>
                            ✓ {stats.encouragements} 🚨 {stats.criticalIssues}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Active Feedback Messages */}
            <View style={styles.feedbackContainer}>
                {activeFeedback.map((feedback) => {
                    const animation = feedbackAnimations[feedback.id];
                    if (!animation) return null;

                    return (
                        <Animated.View
                            key={feedback.id}
                            style={[
                                styles.feedbackCard,
                                {
                                    borderLeftColor: getPriorityColor(feedback.priority),
                                    opacity: animation,
                                    transform: [{
                                        translateY: animation.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [50, 0]
                                        })
                                    }]
                                }
                            ]}
                        >
                            <View style={styles.feedbackHeader}>
                                <View style={styles.feedbackIcon}>
                                    <Ionicons
                                        name={getPriorityIcon(feedback.priority)}
                                        size={16}
                                        color={getPriorityColor(feedback.priority)}
                                    />
                                    <Text style={styles.categoryEmoji}>
                                        {getCategoryEmoji(feedback.category)}
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    style={styles.dismissButton}
                                    onPress={() => handleDismissFeedback(feedback.id)}
                                >
                                    <Ionicons name="close" size={16} color="#666" />
                                </TouchableOpacity>
                            </View>

                            <Text style={[
                                styles.feedbackMessage,
                                { color: getPriorityColor(feedback.priority) }
                            ]}>
                                {feedback.message}
                            </Text>

                            <View style={styles.feedbackFooter}>
                                <Text style={styles.feedbackMeta}>
                                    {feedback.priority.toUpperCase()} • {Math.round(feedback.confidence * 100)}% confident
                                </Text>
                                {feedback.isAudioEnabled && (
                                    <Ionicons name="volume-high" size={12} color="#666" />
                                )}
                            </View>
                        </Animated.View>
                    );
                })}
            </View>

            {/* Empty State */}
            {activeFeedback.length === 0 && (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                        🎯 AI Coach is watching your form...
                    </Text>
                    <Text style={styles.emptyStateSubtext}>
                        Start exercising to receive real-time feedback!
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'box-none',
    },
    visualCuesContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
    },
    visualCue: {
        position: 'absolute',
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    targetRing: {
        width: '80%',
        height: '80%',
        borderRadius: 50,
        borderWidth: 2,
        borderColor: 'white',
        backgroundColor: 'transparent',
    },
    statusBar: {
        position: 'absolute',
        top: 60,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 8,
    },
    statusLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    coachIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    coachIcon: {
        fontSize: 16,
        marginRight: 8,
    },
    statusText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    statusRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    audioButton: {
        borderRadius: 15,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    statsContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    statsText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '500',
    },
    feedbackContainer: {
        position: 'absolute',
        bottom: 120,
        left: 20,
        right: 20,
        maxHeight: 300,
    },
    feedbackCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 12,
        borderLeftWidth: 4,
        marginBottom: 10,
        padding: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    feedbackHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    feedbackIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    categoryEmoji: {
        fontSize: 16,
    },
    dismissButton: {
        padding: 4,
        borderRadius: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
    },
    feedbackMessage: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        lineHeight: 22,
    },
    feedbackFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    feedbackMeta: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    emptyState: {
        position: 'absolute',
        bottom: 200,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 15,
        padding: 20,
        alignItems: 'center',
    },
    emptyStateText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 5,
    },
    emptyStateSubtext: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 14,
        textAlign: 'center',
    },
});

export default RealTimeCoach; 