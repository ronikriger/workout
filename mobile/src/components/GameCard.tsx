/**
 * GameCard - Animated card component for gamified elements
 * Features: Pulse animations, glow effects, celebration triggers
 */

import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface GameCardProps {
    title: string;
    value: string | number;
    icon: string;
    color: string;
    subtitle?: string;
    onPress?: () => void;
    animated?: boolean;
    glowEffect?: boolean;
    celebration?: boolean;
}

const { width } = Dimensions.get('window');

export default function GameCard({
    title,
    value,
    icon,
    color,
    subtitle,
    onPress,
    animated = false,
    glowEffect = false,
    celebration = false
}: GameCardProps): React.JSX.Element {
    const scaleAnimation = useRef(new Animated.Value(1)).current;
    const glowAnimation = useRef(new Animated.Value(0)).current;
    const pulseAnimation = useRef(new Animated.Value(1)).current;
    const celebrationAnimation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (animated) {
            startPulseAnimation();
        }
        if (glowEffect) {
            startGlowAnimation();
        }
        if (celebration) {
            startCelebrationAnimation();
        }
    }, [animated, glowEffect, celebration]);

    const startPulseAnimation = () => {
        const pulse = Animated.sequence([
            Animated.timing(pulseAnimation, {
                toValue: 1.05,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.timing(pulseAnimation, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            })
        ]);
        Animated.loop(pulse).start();
    };

    const startGlowAnimation = () => {
        const glow = Animated.sequence([
            Animated.timing(glowAnimation, {
                toValue: 1,
                duration: 1500,
                useNativeDriver: false,
            }),
            Animated.timing(glowAnimation, {
                toValue: 0,
                duration: 1500,
                useNativeDriver: false,
            })
        ]);
        Animated.loop(glow).start();
    };

    const startCelebrationAnimation = () => {
        Animated.sequence([
            Animated.timing(celebrationAnimation, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.spring(celebrationAnimation, {
                toValue: 0,
                friction: 4,
                tension: 100,
                useNativeDriver: true,
            })
        ]).start();
    };

    const handlePress = () => {
        if (onPress) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            // Scale animation on press
            Animated.sequence([
                Animated.timing(scaleAnimation, {
                    toValue: 0.95,
                    duration: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnimation, {
                    toValue: 1,
                    duration: 100,
                    useNativeDriver: true,
                })
            ]).start();

            onPress();
        }
    };

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={handlePress}
            activeOpacity={0.8}
            disabled={!onPress}
        >
            <Animated.View
                style={[
                    styles.card,
                    {
                        borderColor: color,
                        transform: [
                            { scale: scaleAnimation },
                            { scale: pulseAnimation },
                        ],
                    },
                    glowEffect && {
                        shadowColor: color,
                        shadowOpacity: glowAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.2, 0.8]
                        }),
                        shadowRadius: glowAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [4, 20]
                        }),
                        elevation: glowAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [3, 15]
                        }),
                    }
                ]}
            >
                {/* Celebration Confetti */}
                {celebration && (
                    <Animated.View
                        style={[
                            styles.confetti,
                            {
                                opacity: celebrationAnimation,
                                transform: [{
                                    translateY: celebrationAnimation.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0, -50]
                                    })
                                }]
                            }
                        ]}
                    >
                        <Text style={styles.confettiText}>🎉</Text>
                    </Animated.View>
                )}

                {/* Glow Overlay */}
                {glowEffect && (
                    <Animated.View
                        style={[
                            styles.glowOverlay,
                            {
                                backgroundColor: color,
                                opacity: glowAnimation.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, 0.1]
                                })
                            }
                        ]}
                    />
                )}

                <View style={styles.cardContent}>
                    <View style={styles.iconContainer}>
                        <Text style={[styles.icon, { color }]}>{icon}</Text>
                    </View>

                    <View style={styles.textContainer}>
                        <Text style={styles.title}>{title}</Text>
                        <Text style={[styles.value, { color }]}>{value}</Text>
                        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                    </View>
                </View>

                {/* Progress Indicator */}
                <View style={styles.progressIndicator}>
                    <View style={[styles.progressDot, { backgroundColor: color }]} />
                </View>
            </Animated.View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        width: (width - 60) / 2,
        marginBottom: 15,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        borderWidth: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        position: 'relative',
        overflow: 'hidden',
    },
    confetti: {
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 10,
    },
    confettiText: {
        fontSize: 24,
    },
    glowOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 14,
    },
    cardContent: {
        flexDirection: 'column',
        alignItems: 'center',
    },
    iconContainer: {
        marginBottom: 12,
    },
    icon: {
        fontSize: 32,
        textAlign: 'center',
    },
    textContainer: {
        alignItems: 'center',
    },
    title: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
        textAlign: 'center',
        marginBottom: 8,
    },
    value: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 10,
        color: '#999',
        textAlign: 'center',
    },
    progressIndicator: {
        position: 'absolute',
        bottom: 8,
        right: 8,
    },
    progressDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
}); 