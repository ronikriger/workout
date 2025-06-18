/**
 * Gamified Dashboard - The most amazing progress tracking experience
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
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LineChart, ProgressChart } from 'react-native-chart-kit';
import { GamificationService, Achievement, Badge, Challenge, UserStats, Level, LeaderboardEntry } from '../services/GamificationService';

interface GamifiedDashboardProps {
    navigation: any;
    userId: string;
}

const { width, height } = Dimensions.get('window');

export default function GamifiedDashboard({ navigation, userId }: GamifiedDashboardProps): JSX.Element {
    const [userStats, setUserStats] = useState<UserStats | null>(null);
    const [currentLevel, setCurrentLevel] = useState<Level | null>(null);
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([]);
    const [badges, setBadges] = useState<Badge[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [selectedTab, setSelectedTab] = useState<'overview' | 'achievements' | 'leaderboard' | 'challenges'>('overview');
    const [showRewardModal, setShowRewardModal] = useState(false);
    const [recentRewards, setRecentRewards] = useState<any[]>([]);

    // Animation refs
    const xpBarAnimation = useRef(new Animated.Value(0)).current;
    const streakAnimation = useRef(new Animated.Value(0)).current;
    const levelAnimation = useRef(new Animated.Value(1)).current;
    const pulseAnimation = useRef(new Animated.Value(1)).current;

    const gamificationService = new GamificationService();

    useEffect(() => {
        loadGamificationData();
        startAnimations();
    }, []);

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
        // XP bar animation
        Animated.timing(xpBarAnimation, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
        }).start();

        // Streak pulse animation
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

        // Level celebration animation
        if (userStats?.currentLevel && userStats.currentLevel > 1) {
            Animated.spring(levelAnimation, {
                toValue: 1.1,
                friction: 3,
                tension: 40,
                useNativeDriver: true,
            }).start();
        }
    };

    const renderHeader = () => (
        <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.header}
        >
            <StatusBar barStyle="light-content" />
            <View style={styles.headerContent}>
                <View style={styles.levelBadge}>
                    <Animated.View style={[styles.levelBadgeInner, { transform: [{ scale: levelAnimation }] }]}>
                        <Text style={styles.levelNumber}>{userStats?.currentLevel || 1}</Text>
                    </Animated.View>
                    <Text style={styles.levelTitle}>{currentLevel?.title || 'Rookie'}</Text>
                </View>

                <View style={styles.xpContainer}>
                    <Text style={styles.xpLabel}>Experience Points</Text>
                    <Text style={styles.xpValue}>{userStats?.totalXP.toLocaleString() || 0} XP</Text>

                    {/* XP Progress Bar */}
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
                        />
                    </View>

                    <Text style={styles.xpProgress}>
                        {userStats?.xpToNextLevel || 0} XP to {currentLevel?.title || 'Next Level'}
                    </Text>
                </View>

                <Animated.View style={[styles.streakContainer, { transform: [{ scale: pulseAnimation }] }]}>
                    <Text style={styles.streakIcon}>🔥</Text>
                    <Text style={styles.streakNumber}>{userStats?.currentStreak || 0}</Text>
                    <Text style={styles.streakLabel}>Day Streak</Text>
                </Animated.View>
            </View>
        </LinearGradient>
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

    const renderOverview = () => (
        <View style={styles.content}>
            {/* Quick Stats Grid */}
            <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                    <Text style={styles.statIcon}>💪</Text>
                    <Text style={styles.statValue}>{userStats?.totalWorkouts || 0}</Text>
                    <Text style={styles.statLabel}>Workouts</Text>
                </View>

                <View style={styles.statCard}>
                    <Text style={styles.statIcon}>🎯</Text>
                    <Text style={styles.statValue}>{userStats?.totalReps || 0}</Text>
                    <Text style={styles.statLabel}>Total Reps</Text>
                </View>

                <View style={styles.statCard}>
                    <Text style={styles.statIcon}>💎</Text>
                    <Text style={styles.statValue}>{userStats?.perfectReps || 0}</Text>
                    <Text style={styles.statLabel}>Perfect Reps</Text>
                </View>

                <View style={styles.statCard}>
                    <Text style={styles.statIcon}>⭐</Text>
                    <Text style={styles.statValue}>{achievements.filter(a => a.unlocked).length}</Text>
                    <Text style={styles.statLabel}>Achievements</Text>
                </View>
            </View>

            {/* Recent Achievements */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>🏆 Recent Achievements</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {achievements.filter(a => a.unlocked).slice(0, 5).map((achievement) => (
                        <TouchableOpacity
                            key={achievement.id}
                            style={[styles.achievementCard, styles[`${achievement.type}Achievement`]]}
                            onPress={() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)}
                        >
                            <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                            <Text style={styles.achievementTitle}>{achievement.title}</Text>
                            <Text style={styles.achievementXP}>+{achievement.xpReward} XP</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Active Challenges */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>⚔️ Active Challenges</Text>
                {activeChallenges.slice(0, 3).map((challenge) => (
                    <View key={challenge.id} style={styles.challengeCard}>
                        <View style={styles.challengeHeader}>
                            <Text style={styles.challengeIcon}>{challenge.icon}</Text>
                            <View style={styles.challengeInfo}>
                                <Text style={styles.challengeTitle}>{challenge.title}</Text>
                                <Text style={styles.challengeDescription}>{challenge.description}</Text>
                            </View>
                            <Text style={styles.challengeReward}>+{challenge.xpReward} XP</Text>
                        </View>

                        <View style={styles.challengeProgress}>
                            <View style={styles.challengeProgressBar}>
                                <View
                                    style={[
                                        styles.challengeProgressFill,
                                        { width: `${(challenge.progress / challenge.target) * 100}%` }
                                    ]}
                                />
                            </View>
                            <Text style={styles.challengeProgressText}>
                                {challenge.progress}/{challenge.target}
                            </Text>
                        </View>
                    </View>
                ))}
            </View>

            {/* Weekly Progress Chart */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>📈 Weekly Progress</Text>
                <View style={styles.chartContainer}>
                    <ProgressChart
                        data={{
                            labels: ["Workouts", "Form", "Consistency"],
                            data: [0.8, 0.87, 0.75]
                        }}
                        width={width - 40}
                        height={220}
                        chartConfig={{
                            backgroundColor: '#ffffff',
                            backgroundGradientFrom: '#ffffff',
                            backgroundGradientTo: '#ffffff',
                            color: (opacity = 1) => `rgba(102, 126, 234, ${opacity})`,
                            strokeWidth: 2,
                        }}
                        hideLegend={false}
                        style={styles.chart}
                    />
                </View>
            </View>
        </View>
    );

    const renderAchievements = () => (
        <View style={styles.content}>
            <FlatList
                data={achievements}
                keyExtractor={(item) => item.id}
                renderItem={({ item: achievement }) => (
                    <TouchableOpacity
                        style={[
                            styles.achievementListCard,
                            achievement.unlocked && styles.achievementUnlocked,
                            styles[`${achievement.type}Achievement`]
                        ]}
                        onPress={() => {
                            if (achievement.unlocked) {
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            }
                        }}
                    >
                        <View style={styles.achievementListIcon}>
                            <Text style={styles.achievementListIconText}>
                                {achievement.unlocked ? achievement.icon : '🔒'}
                            </Text>
                        </View>

                        <View style={styles.achievementListInfo}>
                            <Text style={[
                                styles.achievementListTitle,
                                !achievement.unlocked && styles.achievementLocked
                            ]}>
                                {achievement.title}
                            </Text>
                            <Text style={[
                                styles.achievementListDescription,
                                !achievement.unlocked && styles.achievementLocked
                            ]}>
                                {achievement.description}
                            </Text>

                            {!achievement.unlocked && (
                                <View style={styles.achievementProgressContainer}>
                                    <View style={styles.achievementProgressBar}>
                                        <View
                                            style={[
                                                styles.achievementProgressFill,
                                                { width: `${(achievement.progress / achievement.target) * 100}%` }
                                            ]}
                                        />
                                    </View>
                                    <Text style={styles.achievementProgressText}>
                                        {achievement.progress}/{achievement.target}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.achievementListReward}>
                            <Text style={styles.achievementListXP}>+{achievement.xpReward}</Text>
                            <Text style={styles.achievementListXPLabel}>XP</Text>
                        </View>
                    </TouchableOpacity>
                )}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );

    const renderLeaderboard = () => (
        <View style={styles.content}>
            <View style={styles.leaderboardTabs}>
                {['XP', 'Streak', 'Form'].map((type) => (
                    <TouchableOpacity
                        key={type}
                        style={styles.leaderboardTab}
                        onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                    >
                        <Text style={styles.leaderboardTabText}>{type}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <FlatList
                data={leaderboard}
                keyExtractor={(item) => item.userId}
                renderItem={({ item: user, index }) => (
                    <View style={[
                        styles.leaderboardCard,
                        user.userId === 'current' && styles.leaderboardCurrentUser
                    ]}>
                        <View style={styles.leaderboardRank}>
                            <Text style={styles.leaderboardRankText}>
                                {index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${user.rank}`}
                            </Text>
                        </View>

                        <View style={styles.leaderboardUserInfo}>
                            <Text style={styles.leaderboardUsername}>{user.username}</Text>
                            <Text style={styles.leaderboardLevel}>Level {user.level}</Text>
                        </View>

                        <View style={styles.leaderboardStats}>
                            <Text style={styles.leaderboardXP}>{user.xp.toLocaleString()} XP</Text>
                            <Text style={styles.leaderboardStreak}>🔥 {user.streak}</Text>
                        </View>

                        {user.change !== 0 && (
                            <View style={styles.leaderboardChange}>
                                <Text style={[
                                    styles.leaderboardChangeText,
                                    user.change > 0 ? styles.leaderboardChangeUp : styles.leaderboardChangeDown
                                ]}>
                                    {user.change > 0 ? '↗️' : '↘️'} {Math.abs(user.change)}
                                </Text>
                            </View>
                        )}
                    </View>
                )}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );

    const renderChallenges = () => (
        <View style={styles.content}>
            <FlatList
                data={activeChallenges}
                keyExtractor={(item) => item.id}
                renderItem={({ item: challenge }) => (
                    <View style={styles.challengeDetailCard}>
                        <LinearGradient
                            colors={['#667eea', '#764ba2']}
                            style={styles.challengeGradient}
                        >
                            <View style={styles.challengeDetailHeader}>
                                <Text style={styles.challengeDetailIcon}>{challenge.icon}</Text>
                                <View style={styles.challengeDetailInfo}>
                                    <Text style={styles.challengeDetailTitle}>{challenge.title}</Text>
                                    <Text style={styles.challengeDetailDescription}>{challenge.description}</Text>
                                    <Text style={styles.challengeDetailType}>
                                        {challenge.type.toUpperCase()} CHALLENGE
                                    </Text>
                                </View>
                                <Text style={styles.challengeDetailReward}>+{challenge.xpReward} XP</Text>
                            </View>

                            <View style={styles.challengeDetailProgress}>
                                <View style={styles.challengeDetailProgressBar}>
                                    <View
                                        style={[
                                            styles.challengeDetailProgressFill,
                                            { width: `${(challenge.progress / challenge.target) * 100}%` }
                                        ]}
                                    />
                                </View>
                                <Text style={styles.challengeDetailProgressText}>
                                    {challenge.progress}/{challenge.target} completed
                                </Text>
                            </View>
                        </LinearGradient>
                    </View>
                )}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );

    const renderRewardModal = () => (
        <Modal
            visible={showRewardModal}
            transparent
            animationType="fade"
        >
            <BlurView intensity={20} style={styles.modalOverlay}>
                <View style={styles.rewardModal}>
                    <LinearGradient
                        colors={['#FFD700', '#FFA500']}
                        style={styles.rewardModalContent}
                    >
                        <Text style={styles.rewardModalTitle}>🎉 Congratulations!</Text>
                        <Text style={styles.rewardModalSubtitle}>You've earned new rewards!</Text>

                        {/* Show recent rewards here */}

                        <TouchableOpacity
                            style={styles.rewardModalButton}
                            onPress={() => {
                                setShowRewardModal(false);
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            }}
                        >
                            <Text style={styles.rewardModalButtonText}>Awesome!</Text>
                        </TouchableOpacity>
                    </LinearGradient>
                </View>
            </BlurView>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.container}>
            {renderHeader()}
            {renderTabSelector()}

            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                {selectedTab === 'overview' && renderOverview()}
                {selectedTab === 'achievements' && renderAchievements()}
                {selectedTab === 'leaderboard' && renderLeaderboard()}
                {selectedTab === 'challenges' && renderChallenges()}
            </ScrollView>

            {renderRewardModal()}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        paddingVertical: 30,
        paddingHorizontal: 20,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    levelBadge: {
        alignItems: 'center',
    },
    levelBadgeInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    levelNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    levelTitle: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '600',
    },
    xpContainer: {
        flex: 1,
        marginHorizontal: 20,
    },
    xpLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 4,
    },
    xpValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    xpBarContainer: {
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 4,
    },
    xpBarFill: {
        height: '100%',
        backgroundColor: '#FFD700',
        borderRadius: 4,
    },
    xpProgress: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.8)',
    },
    streakContainer: {
        alignItems: 'center',
    },
    streakIcon: {
        fontSize: 30,
        marginBottom: 4,
    },
    streakNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    streakLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
    },
    tabSelector: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e1e8ed',
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 8,
    },
    tabButtonActive: {
        backgroundColor: '#667eea',
    },
    tabIcon: {
        fontSize: 18,
        marginBottom: 2,
    },
    tabLabel: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    tabLabelActive: {
        color: '#fff',
    },
    scrollContainer: {
        flex: 1,
    },
    content: {
        padding: 20,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    statCard: {
        width: '48%',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        alignItems: 'center',
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    statIcon: {
        fontSize: 24,
        marginBottom: 8,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
    },
    section: {
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
    },
    achievementCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        alignItems: 'center',
        marginRight: 15,
        width: 120,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    bronzeAchievement: {
        borderLeftWidth: 4,
        borderLeftColor: '#CD7F32',
    },
    silverAchievement: {
        borderLeftWidth: 4,
        borderLeftColor: '#C0C0C0',
    },
    goldAchievement: {
        borderLeftWidth: 4,
        borderLeftColor: '#FFD700',
    },
    platinumAchievement: {
        borderLeftWidth: 4,
        borderLeftColor: '#E5E4E2',
    },
    legendaryAchievement: {
        borderLeftWidth: 4,
        borderLeftColor: '#9932CC',
    },
    achievementIcon: {
        fontSize: 30,
        marginBottom: 8,
    },
    achievementTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
        marginBottom: 4,
    },
    achievementXP: {
        fontSize: 10,
        color: '#667eea',
        fontWeight: '500',
    },
    challengeCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    challengeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    challengeIcon: {
        fontSize: 24,
        marginRight: 12,
    },
    challengeInfo: {
        flex: 1,
    },
    challengeTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    challengeDescription: {
        fontSize: 14,
        color: '#666',
    },
    challengeReward: {
        fontSize: 12,
        color: '#667eea',
        fontWeight: '600',
    },
    challengeProgress: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    challengeProgressBar: {
        flex: 1,
        height: 8,
        backgroundColor: '#e1e8ed',
        borderRadius: 4,
        overflow: 'hidden',
        marginRight: 10,
    },
    challengeProgressFill: {
        height: '100%',
        backgroundColor: '#667eea',
        borderRadius: 4,
    },
    challengeProgressText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    chartContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    chart: {
        borderRadius: 8,
    },
    achievementListCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    achievementUnlocked: {
        borderWidth: 2,
        borderColor: '#FFD700',
    },
    achievementListIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#f8f9fa',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    achievementListIconText: {
        fontSize: 24,
    },
    achievementListInfo: {
        flex: 1,
    },
    achievementListTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    achievementListDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    achievementLocked: {
        opacity: 0.6,
    },
    achievementProgressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    achievementProgressBar: {
        flex: 1,
        height: 6,
        backgroundColor: '#e1e8ed',
        borderRadius: 3,
        overflow: 'hidden',
        marginRight: 10,
    },
    achievementProgressFill: {
        height: '100%',
        backgroundColor: '#667eea',
        borderRadius: 3,
    },
    achievementProgressText: {
        fontSize: 12,
        color: '#666',
    },
    achievementListReward: {
        alignItems: 'center',
    },
    achievementListXP: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#667eea',
    },
    achievementListXPLabel: {
        fontSize: 10,
        color: '#666',
    },
    leaderboardTabs: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 4,
        marginBottom: 20,
    },
    leaderboardTab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6,
        backgroundColor: '#667eea',
    },
    leaderboardTabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    leaderboardCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    leaderboardCurrentUser: {
        borderWidth: 2,
        borderColor: '#667eea',
        backgroundColor: '#f0f4ff',
    },
    leaderboardRank: {
        width: 40,
        alignItems: 'center',
    },
    leaderboardRankText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    leaderboardUserInfo: {
        flex: 1,
        marginLeft: 15,
    },
    leaderboardUsername: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    leaderboardLevel: {
        fontSize: 12,
        color: '#666',
    },
    leaderboardStats: {
        alignItems: 'flex-end',
    },
    leaderboardXP: {
        fontSize: 14,
        fontWeight: '600',
        color: '#667eea',
    },
    leaderboardStreak: {
        fontSize: 12,
        color: '#666',
    },
    leaderboardChange: {
        marginLeft: 10,
    },
    leaderboardChangeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    leaderboardChangeUp: {
        color: '#4CAF50',
    },
    leaderboardChangeDown: {
        color: '#F44336',
    },
    challengeDetailCard: {
        marginBottom: 15,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    challengeGradient: {
        padding: 20,
    },
    challengeDetailHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    challengeDetailIcon: {
        fontSize: 30,
        marginRight: 15,
    },
    challengeDetailInfo: {
        flex: 1,
    },
    challengeDetailTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    challengeDetailDescription: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 4,
    },
    challengeDetailType: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '600',
        letterSpacing: 1,
    },
    challengeDetailReward: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFD700',
    },
    challengeDetailProgress: {
        marginTop: 10,
    },
    challengeDetailProgressBar: {
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    challengeDetailProgressFill: {
        height: '100%',
        backgroundColor: '#FFD700',
        borderRadius: 4,
    },
    challengeDetailProgressText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rewardModal: {
        width: width * 0.9,
        borderRadius: 20,
        overflow: 'hidden',
    },
    rewardModalContent: {
        padding: 30,
        alignItems: 'center',
    },
    rewardModalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
    },
    rewardModalSubtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 20,
    },
    rewardModalButton: {
        backgroundColor: '#fff',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 25,
    },
    rewardModalButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#667eea',
    },
}); 