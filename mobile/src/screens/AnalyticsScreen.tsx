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
    ActivityIndicator,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const API_BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface AnalyticsScreenProps {
    navigation: any;
    route?: {
        params?: {
            sessionId?: string;
        };
    };
}

const AnalyticsScreen = ({ navigation, route }: AnalyticsScreenProps) => {
    // Animated values for epic animations
    const fadeAnim = useRef(new Animated.Value(1)).current; // Start visible
    const scaleAnim = useRef(new Animated.Value(1)).current; // Start at full scale
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const xpBarAnim = useRef(new Animated.Value(0.88)).current; // Start at 88%
    const sparkleAnim = useRef(new Animated.Value(1)).current; // Start visible

    // Game state
    const [currentXP, setCurrentXP] = useState(2847);
    const [currentLevel, setCurrentLevel] = useState(12);
    const [currentStreak, setCurrentStreak] = useState(23);
    const [totalWorkouts, setTotalWorkouts] = useState(156);
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [showAchievement, setShowAchievement] = useState(false);
    const [selectedTab, setSelectedTab] = useState('overview');
    const [showRewardChest, setShowRewardChest] = useState(false);

    // Epic user stats
    const userStats = {
        level: currentLevel,
        xp: currentXP,
        xpToNext: 3200,
        streak: currentStreak,
        totalWorkouts: totalWorkouts,
        perfectSessions: 89,
        timeTraining: "127h 32m",
        rank: "#1 in Friends",
        title: "Fitness Warrior",
        badges: 47,
        achievements: 23,
    };

    // Recent achievements
    const achievements = [
        { id: 1, title: "Streak Master", description: "Complete 20 days in a row", icon: "flame", unlocked: true, rarity: "legendary" },
        { id: 2, title: "Perfect Form", description: "Get 95%+ form score 10 times", icon: "trophy", unlocked: true, rarity: "epic" },
        { id: 3, title: "Iron Will", description: "Complete 100 workouts", icon: "barbell", unlocked: true, rarity: "rare" },
        { id: 4, title: "Speed Demon", description: "Complete workout in under 30s", icon: "flash", unlocked: false, rarity: "common" },
        { id: 5, title: "Consistency King", description: "Train every day for a month", icon: "calendar", unlocked: false, rarity: "legendary" },
    ];

    // Weekly progress data
    const weeklyProgress = [
        { day: 'Mon', workouts: 3, xp: 450, streak: true },
        { day: 'Tue', workouts: 2, xp: 320, streak: true },
        { day: 'Wed', workouts: 4, xp: 580, streak: true },
        { day: 'Thu', workouts: 1, xp: 180, streak: true },
        { day: 'Fri', workouts: 3, xp: 420, streak: true },
        { day: 'Sat', workouts: 5, xp: 750, streak: true },
        { day: 'Sun', workouts: 2, xp: 310, streak: true },
    ];

    // Leaderboard data
    const leaderboard = [
        { rank: 1, name: "You", xp: 2847, avatar: "💪", streak: 23 },
        { rank: 2, name: "Alex", xp: 2721, avatar: "🔥", streak: 18 },
        { rank: 3, name: "Sarah", xp: 2556, avatar: "⚡", streak: 15 },
        { rank: 4, name: "Mike", xp: 2334, avatar: "🚀", streak: 12 },
        { rank: 5, name: "Emma", xp: 2178, avatar: "✨", streak: 21 },
    ];

    useEffect(() => {
        console.log('Analytics screen mounted!');

        // Start the animations after a small delay to ensure the component is mounted
        setTimeout(() => {
            // Epic entrance animation
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }),
            ]).start();

            // Continuous sparkle animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(sparkleAnim, {
                        toValue: 1,
                        duration: 2000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(sparkleAnim, {
                        toValue: 0.5,
                        duration: 2000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            // XP bar animation
            Animated.timing(xpBarAnim, {
                toValue: (currentXP % 1000) / 1000,
                duration: 2000,
                useNativeDriver: false,
            }).start();
        }, 100);
    }, []);

    const triggerLevelUp = () => {
        console.log('Level up triggered!');
        setShowLevelUp(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        Animated.sequence([
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.timing(rotateAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }),
        ]).start();

        setTimeout(() => setShowLevelUp(false), 3000);
    };

    const getRarityColor = (rarity: string) => {
        switch (rarity) {
            case 'legendary': return ['#FFD700', '#FF6B35'] as const;
            case 'epic': return ['#9D4EDD', '#C77DFF'] as const;
            case 'rare': return ['#4361EE', '#7209B7'] as const;
            default: return ['#06FFA5', '#4ECDC4'] as const;
        }
    };

    const getXPBarColor = () => {
        return ['#00F5FF', '#0080FF', '#0040FF'] as const;
    };

    const OverviewTab = () => (
        <ScrollView showsVerticalScrollIndicator={false}>
            {/* Hero Stats Section */}
            <View style={styles.heroSection}>
                <LinearGradient
                    colors={['#667eea', '#764ba2', '#f093fb']}
                    style={styles.heroGradient}
                >
                    <View style={styles.levelBadge}>
                        <Text style={styles.levelText}>LVL {userStats.level}</Text>
                    </View>

                    <Text style={styles.heroTitle}>{userStats.title}</Text>
                    <Text style={styles.heroSubtitle}>{userStats.rank}</Text>

                    {/* XP Progress Ring */}
                    <View style={styles.xpRingContainer}>
                        <Animated.View style={[styles.xpRing, { opacity: sparkleAnim }]}>
                            <LinearGradient
                                colors={getXPBarColor()}
                                style={styles.xpRingGradient}
                            >
                                <Text style={styles.xpText}>{userStats.xp}</Text>
                                <Text style={styles.xpLabel}>XP</Text>
                            </LinearGradient>
                        </Animated.View>
                    </View>

                    {/* XP Progress Bar */}
                    <View style={styles.xpBarContainer}>
                        <Animated.View
                            style={[
                                styles.xpBarFill,
                                {
                                    width: xpBarAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['0%', '88%']
                                    })
                                }
                            ]}
                        >
                            <LinearGradient
                                colors={getXPBarColor()}
                                style={styles.xpBarGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            />
                        </Animated.View>
                        <Text style={styles.xpBarText}>{userStats.xp} / {userStats.xpToNext} XP</Text>
                    </View>
                </LinearGradient>
            </View>

            {/* Quick Stats Grid */}
            <View style={styles.quickStatsGrid}>
                <TouchableOpacity style={styles.statCard} onPress={() => setCurrentStreak(currentStreak + 1)}>
                    <LinearGradient colors={['#FF6B6B', '#FF8E8E']} style={styles.statGradient}>
                        <Ionicons name="flame" size={32} color="#fff" />
                        <Text style={styles.statNumber}>{userStats.streak}</Text>
                        <Text style={styles.statLabel}>Day Streak</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.statCard} onPress={triggerLevelUp}>
                    <LinearGradient colors={['#4ECDC4', '#44A08D']} style={styles.statGradient}>
                        <Ionicons name="trophy" size={32} color="#fff" />
                        <Text style={styles.statNumber}>{userStats.achievements}</Text>
                        <Text style={styles.statLabel}>Achievements</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.statCard} onPress={() => setShowRewardChest(true)}>
                    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.statGradient}>
                        <Ionicons name="medal" size={32} color="#fff" />
                        <Text style={styles.statNumber}>{userStats.badges}</Text>
                        <Text style={styles.statLabel}>Badges</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.statCard}>
                    <LinearGradient colors={['#ffecd2', '#fcb69f']} style={styles.statGradient}>
                        <Ionicons name="time" size={32} color="#fff" />
                        <Text style={styles.statNumber}>{userStats.timeTraining}</Text>
                        <Text style={styles.statLabel}>Training Time</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* Weekly Progress Chart */}
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>🔥 This Week's Domination</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weeklyChart}>
                    {weeklyProgress.map((day, index) => (
                        <TouchableOpacity key={index} style={styles.dayCard}>
                            <LinearGradient
                                colors={day.streak ? ['#00f2fe', '#4facfe'] : ['#434343', '#000000']}
                                style={styles.dayGradient}
                            >
                                <Text style={styles.dayLabel}>{day.day}</Text>
                                <View style={styles.workoutDots}>
                                    {Array.from({ length: Math.min(day.workouts, 5) }).map((_, i) => (
                                        <View key={i} style={styles.workoutDot} />
                                    ))}
                                </View>
                                <Text style={styles.dayXP}>+{day.xp}</Text>
                                {day.streak && <Ionicons name="flame" size={16} color="#FFD700" />}
                            </LinearGradient>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Recent Achievements */}
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>🏆 Achievement Gallery</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {achievements.slice(0, 3).map((achievement, index) => (
                        <TouchableOpacity
                            key={achievement.id}
                            style={styles.achievementCard}
                            onPress={() => setShowAchievement(true)}
                        >
                            <LinearGradient
                                colors={getRarityColor(achievement.rarity)}
                                style={styles.achievementGradient}
                            >
                                <Ionicons
                                    name={achievement.icon as any}
                                    size={40}
                                    color="#fff"
                                    style={!achievement.unlocked && styles.lockedIcon}
                                />
                                <Text style={styles.achievementTitle}>{achievement.title}</Text>
                                <Text style={styles.achievementDesc}>{achievement.description}</Text>
                                {!achievement.unlocked && (
                                    <View style={styles.lockedOverlay}>
                                        <Ionicons name="lock-closed" size={20} color="#666" />
                                    </View>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </ScrollView>
    );

    const LeaderboardTab = () => (
        <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>🥇 Global Leaderboard</Text>
            {leaderboard.map((player, index) => (
                <TouchableOpacity key={index} style={styles.leaderboardCard}>
                    <LinearGradient
                        colors={index === 0 ? ['#FFD700', '#FFA500'] : ['#2C2C2C', '#1C1C1C']}
                        style={styles.leaderboardGradient}
                    >
                        <View style={styles.leaderboardRank}>
                            <Text style={styles.rankNumber}>{player.rank}</Text>
                            {index < 3 && <Ionicons name="trophy" size={20} color={index === 0 ? '#FFD700' : '#C0C0C0'} />}
                        </View>

                        <View style={styles.playerInfo}>
                            <Text style={styles.playerAvatar}>{player.avatar}</Text>
                            <View>
                                <Text style={styles.playerName}>{player.name}</Text>
                                <View style={styles.playerStats}>
                                    <Ionicons name="flame" size={14} color="#FF6B6B" />
                                    <Text style={styles.playerStreak}>{player.streak}</Text>
                                </View>
                            </View>
                        </View>

                        <Text style={styles.playerXP}>{player.xp.toLocaleString()} XP</Text>
                    </LinearGradient>
                </TouchableOpacity>
            ))}
        </View>
    );

    const AchievementsTab = () => (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>🎖️ Achievement Hunter</Text>
            <View style={styles.achievementGrid}>
                {achievements.map((achievement, index) => (
                    <TouchableOpacity
                        key={achievement.id}
                        style={styles.fullAchievementCard}
                        onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
                    >
                        <LinearGradient
                            colors={achievement.unlocked ? getRarityColor(achievement.rarity) : ['#2C2C2C', '#1C1C1C']}
                            style={styles.fullAchievementGradient}
                        >
                            <Ionicons
                                name={achievement.icon as any}
                                size={32}
                                color={achievement.unlocked ? "#fff" : "#666"}
                            />
                            <Text style={[styles.fullAchievementTitle, !achievement.unlocked && styles.lockedText]}>
                                {achievement.title}
                            </Text>
                            <Text style={[styles.fullAchievementDesc, !achievement.unlocked && styles.lockedText]}>
                                {achievement.description}
                            </Text>
                            <View style={[styles.rarityBadge, { backgroundColor: achievement.unlocked ? getRarityColor(achievement.rarity)[0] : '#666' }]}>
                                <Text style={styles.rarityText}>{achievement.rarity.toUpperCase()}</Text>
                            </View>
                            {!achievement.unlocked && (
                                <View style={styles.achievementLockedOverlay}>
                                    <Ionicons name="lock-closed" size={24} color="#666" />
                                </View>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    );

    console.log('Rendering Analytics screen with tab:', selectedTab);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />

            {/* Animated Background */}
            <LinearGradient
                colors={['#0f0c29', '#302b63', '#24243e']}
                style={styles.backgroundGradient}
            />

            {/* Header */}
            <SafeAreaView style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Fitness Empire</Text>
                <TouchableOpacity onPress={() => setShowRewardChest(true)}>
                    <Ionicons name="gift" size={24} color="#FFD700" />
                </TouchableOpacity>
            </SafeAreaView>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
                {['overview', 'leaderboard', 'achievements'].map((tab, index) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, selectedTab === tab && styles.activeTab]}
                        onPress={() => {
                            console.log('Tab pressed:', tab);
                            setSelectedTab(tab);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                    >
                        <LinearGradient
                            colors={selectedTab === tab ? ['#667eea', '#764ba2'] : ['transparent', 'transparent']}
                            style={styles.tabGradient}
                        >
                            <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Content */}
            <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                {selectedTab === 'overview' && <OverviewTab />}
                {selectedTab === 'leaderboard' && <LeaderboardTab />}
                {selectedTab === 'achievements' && <AchievementsTab />}
            </Animated.View>

            {/* Level Up Modal */}
            <Modal
                visible={showLevelUp}
                transparent={true}
                animationType="fade"
            >
                <View style={styles.modalOverlay}>
                    <Animated.View style={[styles.levelUpModal, {
                        transform: [{
                            rotate: rotateAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0deg', '360deg']
                            })
                        }]
                    }]}>
                        <LinearGradient colors={['#FFD700', '#FF6B35']} style={styles.levelUpGradient}>
                            <Text style={styles.levelUpText}>LEVEL UP!</Text>
                            <Text style={styles.levelUpNumber}>LEVEL {currentLevel + 1}</Text>
                            <Ionicons name="trophy" size={64} color="#fff" />
                            <Text style={styles.levelUpReward}>+500 XP Bonus!</Text>
                        </LinearGradient>
                    </Animated.View>
                </View>
            </Modal>

            {/* Achievement Unlock Modal */}
            <Modal
                visible={showAchievement}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowAchievement(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.achievementModal}>
                        <LinearGradient colors={['#9D4EDD', '#C77DFF']} style={styles.achievementModalGradient}>
                            <Text style={styles.achievementModalTitle}>🎉 ACHIEVEMENT UNLOCKED!</Text>
                            <Ionicons name="trophy" size={80} color="#FFD700" />
                            <Text style={styles.achievementModalName}>Perfect Form</Text>
                            <Text style={styles.achievementModalDesc}>Get 95%+ form score 10 times</Text>
                            <TouchableOpacity
                                style={styles.achievementCloseButton}
                                onPress={() => setShowAchievement(false)}
                            >
                                <Text style={styles.achievementCloseText}>CLAIM REWARD</Text>
                            </TouchableOpacity>
                        </LinearGradient>
                    </View>
                </View>
            </Modal>

            {/* Reward Chest Modal */}
            <Modal
                visible={showRewardChest}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowRewardChest(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.rewardChestModal}>
                        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.rewardChestGradient}>
                            <Text style={styles.rewardChestTitle}>🎁 Daily Reward</Text>
                            <Ionicons name="gift" size={100} color="#FFD700" />
                            <Text style={styles.rewardChestContent}>+250 XP</Text>
                            <Text style={styles.rewardChestContent}>+1 Rare Badge</Text>
                            <TouchableOpacity
                                style={styles.rewardClaimButton}
                                onPress={() => {
                                    setShowRewardChest(false);
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                }}
                            >
                                <Text style={styles.rewardClaimText}>OPEN CHEST</Text>
                            </TouchableOpacity>
                        </LinearGradient>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    backgroundGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    tab: {
        flex: 1,
        marginHorizontal: 5,
        borderRadius: 25,
        overflow: 'hidden',
    },
    activeTab: {
        transform: [{ scale: 1.05 }],
    },
    tabGradient: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    tabText: {
        color: '#888',
        fontWeight: '600',
        fontSize: 14,
    },
    activeTabText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    heroSection: {
        marginBottom: 30,
        borderRadius: 20,
        overflow: 'hidden',
    },
    heroGradient: {
        padding: 30,
        alignItems: 'center',
    },
    levelBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 10,
    },
    levelText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    heroTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 5,
    },
    heroSubtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 20,
    },
    xpRingContainer: {
        marginBottom: 20,
    },
    xpRing: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    xpRingGradient: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    xpText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    xpLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
    },
    xpBarContainer: {
        width: '100%',
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 4,
        overflow: 'hidden',
        position: 'relative',
    },
    xpBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    xpBarGradient: {
        flex: 1,
    },
    xpBarText: {
        position: 'absolute',
        top: 12,
        alignSelf: 'center',
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    quickStatsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    statCard: {
        width: '48%',
        marginBottom: 15,
        borderRadius: 15,
        overflow: 'hidden',
    },
    statGradient: {
        padding: 20,
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 10,
    },
    statLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 5,
    },
    sectionContainer: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 15,
    },
    weeklyChart: {
        paddingVertical: 10,
    },
    dayCard: {
        marginRight: 15,
        borderRadius: 15,
        overflow: 'hidden',
    },
    dayGradient: {
        padding: 15,
        alignItems: 'center',
        width: 80,
    },
    dayLabel: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
        marginBottom: 8,
    },
    workoutDots: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    workoutDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#fff',
        marginHorizontal: 1,
    },
    dayXP: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
    },
    achievementCard: {
        width: 150,
        marginRight: 15,
        borderRadius: 15,
        overflow: 'hidden',
    },
    achievementGradient: {
        padding: 20,
        alignItems: 'center',
        height: 180,
        justifyContent: 'center',
        position: 'relative',
    },
    achievementTitle: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
        marginTop: 10,
        textAlign: 'center',
    },
    achievementDesc: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 10,
        marginTop: 5,
        textAlign: 'center',
    },
    lockedIcon: {
        opacity: 0.3,
    },
    lockedOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabContent: {
        flex: 1,
    },
    leaderboardCard: {
        marginBottom: 15,
        borderRadius: 15,
        overflow: 'hidden',
    },
    leaderboardGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
    },
    leaderboardRank: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 20,
    },
    rankNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginRight: 5,
    },
    playerInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    playerAvatar: {
        fontSize: 24,
        marginRight: 15,
    },
    playerName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    playerStats: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    playerStreak: {
        fontSize: 12,
        color: '#FF6B6B',
        marginLeft: 5,
    },
    playerXP: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#00F5FF',
    },
    achievementGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    fullAchievementCard: {
        width: '48%',
        marginBottom: 15,
        borderRadius: 15,
        overflow: 'hidden',
    },
    fullAchievementGradient: {
        padding: 20,
        alignItems: 'center',
        height: 180,
        justifyContent: 'center',
        position: 'relative',
    },
    fullAchievementTitle: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
        marginTop: 10,
        textAlign: 'center',
    },
    fullAchievementDesc: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 10,
        marginTop: 5,
        textAlign: 'center',
    },
    lockedText: {
        color: '#666',
    },
    rarityBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    rarityText: {
        color: '#fff',
        fontSize: 8,
        fontWeight: 'bold',
    },
    achievementLockedOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    levelUpModal: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    levelUpGradient: {
        padding: 40,
        alignItems: 'center',
    },
    levelUpText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
    },
    levelUpNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 20,
    },
    levelUpReward: {
        fontSize: 18,
        color: '#fff',
        marginTop: 20,
    },
    achievementModal: {
        borderRadius: 20,
        overflow: 'hidden',
        maxWidth: '80%',
    },
    achievementModalGradient: {
        padding: 40,
        alignItems: 'center',
    },
    achievementModalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 20,
        textAlign: 'center',
    },
    achievementModalName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 20,
    },
    achievementModalDesc: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 10,
        textAlign: 'center',
    },
    achievementCloseButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 25,
        marginTop: 30,
    },
    achievementCloseText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    rewardChestModal: {
        borderRadius: 20,
        overflow: 'hidden',
        maxWidth: '80%',
    },
    rewardChestGradient: {
        padding: 40,
        alignItems: 'center',
    },
    rewardChestTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 20,
    },
    rewardChestContent: {
        fontSize: 18,
        color: '#fff',
        marginTop: 10,
    },
    rewardClaimButton: {
        backgroundColor: '#FFD700',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 25,
        marginTop: 30,
    },
    rewardClaimText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 16,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#121212',
    },
    errorText: { color: '#ff453a', fontSize: 16 },
});

export default AnalyticsScreen; 