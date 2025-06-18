/**
 * Gamified Analytics Dashboard - The most amazing progress tracking experience
 * Features: XP system, achievements, leaderboards, challenges, streaks, and rewards
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    Animated,
    Modal,
    FlatList,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { LineChart, ProgressChart, BarChart } from 'react-native-chart-kit';
import { AnalyticsService } from '../services/AnalyticsService';
import { GamificationService } from '../services/GamificationService';
import { ExerciseType } from '../types';

interface AnalyticsScreenProps {
    navigation: any;
    userId: string;
}

const { width, height } = Dimensions.get('window');

export default function AnalyticsScreen({ navigation, userId }: AnalyticsScreenProps): JSX.Element {
    const [timeframe, setTimeframe] = useState<'week' | 'month' | 'quarter'>('month');
    const [selectedExercise, setSelectedExercise] = useState<ExerciseType>('squat');
    const [metrics, setMetrics] = useState<any>(null);

    const [userStats, setUserStats] = useState<any>(null);
    const [currentLevel, setCurrentLevel] = useState<any>(null);
    const [achievements, setAchievements] = useState<any[]>([]);
    const [activeChallenges, setActiveChallenges] = useState<any[]>([]);
    const [badges, setBadges] = useState<any[]>([]);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [selectedTab, setSelectedTab] = useState<'overview' | 'achievements' | 'leaderboard' | 'challenges'>('overview');
    const [showLevelUpModal, setShowLevelUpModal] = useState(false);
    const [showAchievementModal, setShowAchievementModal] = useState(false);
    const [newAchievement, setNewAchievement] = useState<any>(null);

    const xpBarAnimation = useRef(new Animated.Value(0)).current;
    const pulseAnimation = useRef(new Animated.Value(1)).current;
    const levelAnimation = useRef(new Animated.Value(1)).current;
    const confettiAnimation = useRef(new Animated.Value(0)).current;
    const sparkleAnimations = useRef([...Array(5)].map(() => new Animated.Value(0))).current;

    const analytics = new AnalyticsService();
    const gamificationService = new GamificationService();

    useEffect(() => {
        loadAnalytics();
        loadGamificationData();
        startAnimations();
    }, [timeframe, selectedExercise]);

    const loadAnalytics = async () => {
        try {
            const performanceMetrics = analytics.getPerformanceMetrics(userId, timeframe);
            setMetrics(performanceMetrics);
        } catch (error) {
            console.error('Failed to load analytics:', error);
        }
    };

    const loadGamificationData = async () => {
        try {
            const stats = gamificationService.getUserStats();
            const level = gamificationService.getCurrentLevel();
            const achievementsList = gamificationService.getAchievements();
            const challenges = gamificationService.getActiveChallenges();
            const userBadges = gamificationService.getBadges();
            const leaderboardData = gamificationService.getLeaderboard();

            setUserStats(stats);
            setCurrentLevel(level);
            setAchievements(achievementsList);
            setActiveChallenges(challenges);
            setBadges(userBadges);
            setLeaderboard(leaderboardData);
        } catch (error) {
            console.error('Failed to load gamification data:', error);
        }
    };

    const startAnimations = () => {
        Animated.timing(xpBarAnimation, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
        }).start();

        const pulseSequence = Animated.sequence([
            Animated.timing(pulseAnimation, {
                toValue: 1.2,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.timing(pulseAnimation, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            })
        ]);
        Animated.loop(pulseSequence).start();

        const sparkleSequences = sparkleAnimations.map((anim, index) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(index * 200),
                    Animated.timing(anim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim, {
                        toValue: 0,
                        duration: 1000,
                        useNativeDriver: true,
                    })
                ])
            )
        );
        sparkleSequences.forEach(seq => seq.start());
    };

    const triggerLevelUpCelebration = () => {
        setShowLevelUpModal(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        Animated.sequence([
            Animated.timing(levelAnimation, {
                toValue: 1.5,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.spring(levelAnimation, {
                toValue: 1,
                friction: 3,
                tension: 40,
                useNativeDriver: true,
            })
        ]).start();
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <StatusBar barStyle="light-content" />

            {sparkleAnimations.map((anim, index) => (
                <Animated.View
                    key={index}
                    style={[
                        styles.sparkle,
                        {
                            left: Math.random() * width,
                            top: Math.random() * 100,
                            opacity: anim,
                            transform: [{
                                scale: anim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, 1]
                                })
                            }]
                        }
                    ]}
                >
                    <Text style={styles.sparkleText}>✨</Text>
                </Animated.View>
            ))}

            <View style={styles.headerContent}>
                <TouchableOpacity
                    style={styles.levelBadge}
                    onPress={triggerLevelUpCelebration}
                >
                    <Animated.View style={[styles.levelBadgeInner, { transform: [{ scale: levelAnimation }] }]}>
                        <Text style={styles.levelNumber}>{userStats?.currentLevel || 1}</Text>
                        <View style={styles.levelGlow} />
                    </Animated.View>
                    <Text style={styles.levelTitle}>{currentLevel?.title || 'Rookie'}</Text>
                    {currentLevel?.perks && currentLevel.perks.length > 0 && (
                        <Text style={styles.levelPerks}>🎁 {currentLevel.perks.length} perks</Text>
                    )}
                </TouchableOpacity>

                <View style={styles.xpContainer}>
                    <View style={styles.xpHeader}>
                        <Text style={styles.xpLabel}>Experience Points</Text>
                        <Text style={styles.xpValue}>{userStats?.totalXP?.toLocaleString() || 0} XP</Text>
                    </View>

                    <View style={styles.xpBarContainer}>
                        <Animated.View
                            style={[
                                styles.xpBarFill,
                                {
                                    width: xpBarAnimation.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['0%', `${((userStats?.currentLevelXP || 0) / (currentLevel?.xpRequired || 1)) * 100}%`]
                                    })
                                }
                            ]}
                        >
                            <View style={styles.xpBarGlow} />
                        </Animated.View>
                    </View>

                    <View style={styles.xpProgressInfo}>
                        <Text style={styles.xpProgress}>
                            {userStats?.xpToNextLevel || 0} XP to {currentLevel?.title || 'Next Level'}
                        </Text>
                        <Text style={styles.xpBonus}>
                            🔥 +{Math.floor(userStats?.currentStreak * 5 || 0)} streak bonus
                        </Text>
                    </View>
                </View>

                <Animated.View style={[styles.streakContainer, { transform: [{ scale: pulseAnimation }] }]}>
                    <View style={styles.streakBadge}>
                        <Text style={styles.streakIcon}>🔥</Text>
                        <Text style={styles.streakNumber}>{userStats?.currentStreak || 0}</Text>
                    </View>
                    <Text style={styles.streakLabel}>Day Streak</Text>
                    <Text style={styles.streakSubLabel}>
                        Best: {userStats?.longestStreak || 0} days
                    </Text>
                </Animated.View>
            </View>
        </View>
    );

    const renderTabSelector = () => (
        <View style={styles.tabSelector}>
            {[
                { key: 'overview', label: 'Overview', icon: '📊' },
                { key: 'achievements', label: 'Achievements', icon: '🏆' },
                { key: 'leaderboard', label: 'Leaderboard', icon: '👑' },
                { key: 'challenges', label: 'Challenges', icon: '⚔️' }
            ].map((tab) => (
                <TouchableOpacity
                    key={tab.key}
                    style={[styles.tabButton, selectedTab === tab.key && styles.tabButtonActive]}
                    onPress={() => {
                        setSelectedTab(tab.key as any);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                >
                    <Text style={styles.tabIcon}>{tab.icon}</Text>
                    <Text style={[styles.tabLabel, selectedTab === tab.key && styles.tabLabelActive]}>
                        {tab.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    const renderExerciseSelector = () => (
        <View style={styles.selectorContainer}>
            {(['squat', 'deadlift'] as ExerciseType[]).map((exercise) => (
                <TouchableOpacity
                    key={exercise}
                    style={[
                        styles.selectorButton,
                        selectedExercise === exercise && styles.selectorButtonActive
                    ]}
                    onPress={() => setSelectedExercise(exercise)}
                >
                    <Text style={[
                        styles.selectorText,
                        selectedExercise === exercise && styles.selectorTextActive
                    ]}>
                        {exercise.charAt(0).toUpperCase() + exercise.slice(1)}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    const renderPerformanceMetrics = () => {
        if (!metrics) return null;

        return (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Performance Overview</Text>

                <View style={styles.metricsGrid}>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricValue}>{metrics.totalWorkouts}</Text>
                        <Text style={styles.metricLabel}>Total Workouts</Text>
                    </View>

                    <View style={styles.metricCard}>
                        <Text style={styles.metricValue}>{metrics.totalReps}</Text>
                        <Text style={styles.metricLabel}>Total Reps</Text>
                    </View>

                    <View style={styles.metricCard}>
                        <Text style={styles.metricValue}>{metrics.averageFormScore.toFixed(1)}</Text>
                        <Text style={styles.metricLabel}>Avg Form Score</Text>
                    </View>

                    <View style={styles.metricCard}>
                        <Text style={styles.metricValue}>{metrics.currentStreak}</Text>
                        <Text style={styles.metricLabel}>Current Streak</Text>
                    </View>
                </View>

                <View style={styles.progressBars}>
                    <View style={styles.progressBar}>
                        <Text style={styles.progressLabel}>Weekly Goal Progress</Text>
                        <View style={styles.progressTrack}>
                            <View
                                style={[
                                    styles.progressFill,
                                    { width: `${Math.min(metrics.weeklyGoalProgress, 100)}%` }
                                ]}
                            />
                        </View>
                        <Text style={styles.progressText}>{Math.round(metrics.weeklyGoalProgress)}%</Text>
                    </View>

                    <View style={styles.progressBar}>
                        <Text style={styles.progressLabel}>Consistency Score</Text>
                        <View style={styles.progressTrack}>
                            <View
                                style={[
                                    styles.progressFill,
                                    { width: `${Math.min(metrics.consistencyScore, 100)}%` }
                                ]}
                            />
                        </View>
                        <Text style={styles.progressText}>{Math.round(metrics.consistencyScore)}%</Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderProgressChart = () => {
        if (!metrics || metrics.labels.length === 0) {
            return (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Form Score Progress</Text>
                    <View style={styles.noDataContainer}>
                        <Text style={styles.noDataText}>No workout data available for this period</Text>
                    </View>
                </View>
            );
        }

        return (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Form Score Progress</Text>
                <LineChart
                    data={metrics}
                    width={width - 60}
                    height={220}
                    chartConfig={styles.chartConfig}
                    bezier
                    style={styles.chart}
                    fromZero
                />
            </View>
        );
    };

    const renderFormBreakdown = () => {
        if (!metrics) return null;

        const issueData = metrics.commonIssues.map((issue, index) => ({
            name: issue.issue.replace(/_/g, ' '),
            population: issue.frequency,
            color: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'][index % 5],
            legendFontColor: '#333333',
            legendFontSize: 12,
        }));

        return (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Form Analysis - {selectedExercise.charAt(0).toUpperCase() + selectedExercise.slice(1)}</Text>

                {issueData.length > 0 ? (
                    <>
                        <PieChart
                            data={issueData}
                            width={width - 60}
                            height={200}
                            chartConfig={styles.chartConfig}
                            accessor="population"
                            backgroundColor="transparent"
                            paddingLeft="15"
                            style={styles.chart}
                        />

                        <View style={styles.averageAngles}>
                            <Text style={styles.subsectionTitle}>Average Joint Angles</Text>
                            <View style={styles.angleRow}>
                                <Text style={styles.angleLabel}>Hip: </Text>
                                <Text style={styles.angleValue}>{metrics.averageAngles.hip.toFixed(1)}°</Text>
                            </View>
                            <View style={styles.angleRow}>
                                <Text style={styles.angleLabel}>Spine: </Text>
                                <Text style={styles.angleValue}>{metrics.averageAngles.spine.toFixed(1)}°</Text>
                            </View>
                            <View style={styles.angleRow}>
                                <Text style={styles.angleLabel}>Knee: </Text>
                                <Text style={styles.angleValue}>{metrics.averageAngles.knee.toFixed(1)}°</Text>
                            </View>
                        </View>
                    </>
                ) : (
                    <View style={styles.noDataContainer}>
                        <Text style={styles.noDataText}>No form data available for {selectedExercise}</Text>
                    </View>
                )}
            </View>
        );
    };

    const renderActionButtons = () => (
        <View style={styles.actionButtons}>
            <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('Settings')}
            >
                <Text style={styles.actionButtonText}>Export Data</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton]}
                onPress={() => navigation.navigate('Camera')}
            >
                <Text style={styles.primaryButtonText}>Start Workout</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.title}>Analytics</Text>

                {renderHeader()}
                {renderTimeframeSelector()}
                {renderPerformanceMetrics()}
                {renderProgressChart()}

                <Text style={styles.exerciseTitle}>Exercise Analysis</Text>
                {renderExerciseSelector()}
                {renderFormBreakdown()}

                {renderActionButtons()}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginBottom: 20,
        marginTop: 20,
    },
    exerciseTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: '#1A1A1A',
        marginTop: 30,
        marginBottom: 15,
    },
    selectorContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 4,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    selectorButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 6,
    },
    selectorButtonActive: {
        backgroundColor: '#4CAF50',
    },
    selectorText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#666666',
    },
    selectorTextActive: {
        color: '#FFFFFF',
    },
    section: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 15,
    },
    subsectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 10,
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    metricCard: {
        width: '48%',
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
        padding: 15,
        alignItems: 'center',
        marginBottom: 10,
    },
    metricValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#4CAF50',
        marginBottom: 4,
    },
    metricLabel: {
        fontSize: 12,
        color: '#666666',
        textAlign: 'center',
    },
    progressBars: {
        marginTop: 10,
    },
    progressBar: {
        marginBottom: 15,
    },
    progressLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333333',
        marginBottom: 8,
    },
    progressTrack: {
        height: 8,
        backgroundColor: '#E5E5E5',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#4CAF50',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 12,
        color: '#666666',
        marginTop: 4,
        textAlign: 'right',
    },
    chart: {
        marginVertical: 8,
        borderRadius: 16,
    },
    trendInsight: {
        marginTop: 15,
        padding: 15,
        backgroundColor: '#F0F8FF',
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#4CAF50',
    },
    trendText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 8,
    },
    insightText: {
        fontSize: 14,
        color: '#666666',
        marginBottom: 4,
    },
    averageAngles: {
        marginTop: 20,
        padding: 15,
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
    },
    angleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    angleLabel: {
        fontSize: 14,
        color: '#666666',
    },
    angleValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    noDataContainer: {
        padding: 40,
        alignItems: 'center',
    },
    noDataText: {
        fontSize: 16,
        color: '#666666',
        textAlign: 'center',
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 30,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 5,
        backgroundColor: '#E3F2FD',
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1976D2',
    },
    primaryButton: {
        backgroundColor: '#4CAF50',
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    header: {
        height: 100,
        backgroundColor: '#4CAF50',
        padding: 20,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    levelBadge: {
        padding: 10,
        borderWidth: 2,
        borderColor: '#FFFFFF',
        borderRadius: 8,
        marginRight: 20,
    },
    levelBadgeInner: {
        alignItems: 'center',
    },
    levelNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    levelGlow: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        opacity: 0.2,
    },
    levelTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#FFFFFF',
    },
    levelPerks: {
        fontSize: 12,
        color: '#FFFFFF',
    },
    xpContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    xpHeader: {
        marginRight: 20,
    },
    xpLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#FFFFFF',
    },
    xpValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    xpBarContainer: {
        flex: 1,
        height: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        overflow: 'hidden',
    },
    xpBarFill: {
        height: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
    },
    xpBarGlow: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        opacity: 0.2,
    },
    xpProgressInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    xpProgress: {
        fontSize: 12,
        color: '#FFFFFF',
    },
    xpBonus: {
        fontSize: 12,
        color: '#FFFFFF',
    },
    streakContainer: {
        marginTop: 20,
        padding: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        alignItems: 'center',
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    streakIcon: {
        fontSize: 16,
        color: '#4CAF50',
        marginRight: 4,
    },
    streakNumber: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    streakLabel: {
        fontSize: 14,
        color: '#666666',
    },
    streakSubLabel: {
        fontSize: 12,
        color: '#666666',
    },
    sparkle: {
        position: 'absolute',
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        opacity: 0.2,
    },
    sparkleText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
}); 