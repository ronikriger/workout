/**
 * Amazing Leaderboard - Competitive ranking system with animations
 * Features: Real-time rankings, crown animations, rank changes, podium effects
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Animated,
    Dimensions,
    Image,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

export interface LeaderboardEntry {
    userId: string;
    username: string;
    level: number;
    xp: number;
    streak: number;
    formScore: number;
    rank: number;
    change: number;
    avatar?: string;
    isCurrentUser?: boolean;
}

interface AmazingLeaderboardProps {
    data: LeaderboardEntry[];
    type: 'xp' | 'streak' | 'form';
    onTypeChange: (type: 'xp' | 'streak' | 'form') => void;
    onUserPress?: (user: LeaderboardEntry) => void;
}

const { width } = Dimensions.get('window');

export default function AmazingLeaderboard({
    data,
    type,
    onTypeChange,
    onUserPress
}: AmazingLeaderboardProps): React.JSX.Element {
    const [selectedType, setSelectedType] = useState(type);
    const crownAnimation = useRef(new Animated.Value(0)).current;
    const rankAnimations = useRef(data.map(() => new Animated.Value(0))).current;

    useEffect(() => {
        startCrownAnimation();
        startRankAnimations();
    }, [data]);

    const startCrownAnimation = () => {
        const crown = Animated.sequence([
            Animated.timing(crownAnimation, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.timing(crownAnimation, {
                toValue: 0.8,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.timing(crownAnimation, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            })
        ]);
        Animated.loop(crown).start();
    };

    const startRankAnimations = () => {
        const animations = rankAnimations.map((anim, index) =>
            Animated.timing(anim, {
                toValue: 1,
                duration: 500 + (index * 100),
                useNativeDriver: true,
            })
        );
        Animated.stagger(100, animations).start();
    };

    const handleTypeChange = (newType: 'xp' | 'streak' | 'form') => {
        setSelectedType(newType);
        onTypeChange(newType);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const getRankIcon = (rank: number): string => {
        switch (rank) {
            case 1: return '👑';
            case 2: return '🥈';
            case 3: return '🥉';
            default: return `#${rank}`;
        }
    };

    const getRankColor = (rank: number): string => {
        switch (rank) {
            case 1: return '#FFD700';
            case 2: return '#C0C0C0';
            case 3: return '#CD7F32';
            default: return '#667eea';
        }
    };

    const getChangeIcon = (change: number): string => {
        if (change > 0) return '🔺';
        if (change < 0) return '🔻';
        return '➖';
    };

    const getValueByType = (user: LeaderboardEntry): string => {
        switch (selectedType) {
            case 'xp': return `${user.xp.toLocaleString()} XP`;
            case 'streak': return `${user.streak} days`;
            case 'form': return `${user.formScore.toFixed(1)}%`;
            default: return '';
        }
    };

    const renderTypeSelector = () => (
        <View style={styles.typeSelector}>
            {[
                { key: 'xp', label: 'Experience', icon: '⭐' },
                { key: 'streak', label: 'Streak', icon: '🔥' },
                { key: 'form', label: 'Form Score', icon: '💎' }
            ].map((typeOption) => (
                <TouchableOpacity
                    key={typeOption.key}
                    style={[
                        styles.typeButton,
                        selectedType === typeOption.key && styles.typeButtonActive
                    ]}
                    onPress={() => handleTypeChange(typeOption.key as any)}
                >
                    <Text style={styles.typeIcon}>{typeOption.icon}</Text>
                    <Text style={[
                        styles.typeLabel,
                        selectedType === typeOption.key && styles.typeLabelActive
                    ]}>
                        {typeOption.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    const renderPodium = () => {
        const topThree = data.slice(0, 3);
        if (topThree.length < 3) return null;

        return (
            <View style={styles.podiumContainer}>
                {/* Second Place */}
                <Animated.View style={[
                    styles.podiumPlace,
                    styles.secondPlace,
                    { opacity: rankAnimations[1] || 1 }
                ]}>
                    <View style={styles.podiumUser}>
                        <Text style={styles.podiumAvatar}>👤</Text>
                        <Text style={styles.podiumUsername}>{topThree[1]?.username}</Text>
                        <Text style={styles.podiumValue}>{getValueByType(topThree[1])}</Text>
                    </View>
                    <View style={[styles.podiumBase, styles.podiumBaseSilver]}>
                        <Text style={styles.podiumRank}>🥈</Text>
                    </View>
                </Animated.View>

                {/* First Place */}
                <Animated.View style={[
                    styles.podiumPlace,
                    styles.firstPlace,
                    {
                        opacity: rankAnimations[0] || 1,
                        transform: [{ scale: crownAnimation }]
                    }
                ]}>
                    <View style={styles.podiumUser}>
                        <View style={styles.crownContainer}>
                            <Text style={styles.crown}>👑</Text>
                        </View>
                        <Text style={styles.podiumAvatar}>👤</Text>
                        <Text style={[styles.podiumUsername, styles.firstPlaceText]}>
                            {topThree[0]?.username}
                        </Text>
                        <Text style={[styles.podiumValue, styles.firstPlaceText]}>
                            {getValueByType(topThree[0])}
                        </Text>
                    </View>
                    <View style={[styles.podiumBase, styles.podiumBaseGold]}>
                        <Text style={styles.podiumRank}>🏆</Text>
                    </View>
                </Animated.View>

                {/* Third Place */}
                <Animated.View style={[
                    styles.podiumPlace,
                    styles.thirdPlace,
                    { opacity: rankAnimations[2] || 1 }
                ]}>
                    <View style={styles.podiumUser}>
                        <Text style={styles.podiumAvatar}>👤</Text>
                        <Text style={styles.podiumUsername}>{topThree[2]?.username}</Text>
                        <Text style={styles.podiumValue}>{getValueByType(topThree[2])}</Text>
                    </View>
                    <View style={[styles.podiumBase, styles.podiumBaseBronze]}>
                        <Text style={styles.podiumRank}>🥉</Text>
                    </View>
                </Animated.View>
            </View>
        );
    };

    const renderLeaderboardItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
        if (index < 3) return null; // Skip top 3 as they're in podium

        return (
            <Animated.View
                style={[
                    styles.leaderboardItem,
                    item.isCurrentUser && styles.currentUserItem,
                    {
                        opacity: rankAnimations[index] || 1,
                        transform: [{
                            translateX: rankAnimations[index]?.interpolate({
                                inputRange: [0, 1],
                                outputRange: [50, 0]
                            }) || 0
                        }]
                    }
                ]}
            >
                <TouchableOpacity
                    style={styles.itemContent}
                    onPress={() => {
                        if (onUserPress) {
                            onUserPress(item);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                    }}
                >
                    {/* Rank */}
                    <View style={[styles.rankContainer, { borderColor: getRankColor(item.rank) }]}>
                        <Text style={[styles.rankText, { color: getRankColor(item.rank) }]}>
                            {getRankIcon(item.rank)}
                        </Text>
                    </View>

                    {/* User Info */}
                    <View style={styles.userInfo}>
                        <View style={styles.userHeader}>
                            <Text style={styles.username}>{item.username}</Text>
                            <View style={styles.levelBadge}>
                                <Text style={styles.levelText}>Lv.{item.level}</Text>
                            </View>
                        </View>
                        <Text style={styles.userValue}>{getValueByType(item)}</Text>
                    </View>

                    {/* Rank Change */}
                    {item.change !== 0 && (
                        <View style={styles.changeContainer}>
                            <Text style={[
                                styles.changeIcon,
                                { color: item.change > 0 ? '#4CAF50' : '#F44336' }
                            ]}>
                                {getChangeIcon(item.change)}
                            </Text>
                            <Text style={[
                                styles.changeText,
                                { color: item.change > 0 ? '#4CAF50' : '#F44336' }
                            ]}>
                                {Math.abs(item.change)}
                            </Text>
                        </View>
                    )}

                    {/* Achievement Indicator */}
                    {item.isCurrentUser && (
                        <View style={styles.currentUserIndicator}>
                            <Text style={styles.currentUserText}>YOU</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </Animated.View>
        );
    };

    return (
        <View style={styles.container}>
            {renderTypeSelector()}
            {renderPodium()}

            <View style={styles.listHeader}>
                <Text style={styles.listTitle}>🏆 Full Rankings</Text>
                <Text style={styles.listSubtitle}>Compete with {data.length} users worldwide!</Text>
            </View>

            <FlatList
                data={data}
                keyExtractor={(item) => item.userId}
                renderItem={renderLeaderboardItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContainer}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    typeSelector: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 4,
        margin: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    typeButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 8,
    },
    typeButtonActive: {
        backgroundColor: '#667eea',
    },
    typeIcon: {
        fontSize: 16,
        marginBottom: 4,
    },
    typeLabel: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    typeLabelActive: {
        color: '#fff',
    },
    podiumContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        marginBottom: 20,
        paddingHorizontal: 20,
    },
    podiumPlace: {
        alignItems: 'center',
        marginHorizontal: 8,
    },
    firstPlace: {
        zIndex: 3,
    },
    secondPlace: {
        zIndex: 2,
    },
    thirdPlace: {
        zIndex: 1,
    },
    podiumUser: {
        alignItems: 'center',
        marginBottom: 8,
    },
    crownContainer: {
        position: 'absolute',
        top: -20,
        zIndex: 10,
    },
    crown: {
        fontSize: 24,
    },
    podiumAvatar: {
        fontSize: 32,
        marginBottom: 8,
    },
    podiumUsername: {
        fontSize: 12,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
        marginBottom: 4,
    },
    firstPlaceText: {
        color: '#FFD700',
        fontWeight: 'bold',
    },
    podiumValue: {
        fontSize: 10,
        color: '#666',
        textAlign: 'center',
    },
    podiumBase: {
        width: 60,
        height: 80,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    podiumBaseGold: {
        backgroundColor: '#FFD700',
        height: 80,
    },
    podiumBaseSilver: {
        backgroundColor: '#C0C0C0',
        height: 60,
    },
    podiumBaseBronze: {
        backgroundColor: '#CD7F32',
        height: 40,
    },
    podiumRank: {
        fontSize: 20,
        color: '#fff',
    },
    listHeader: {
        paddingHorizontal: 20,
        marginBottom: 15,
    },
    listTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    listSubtitle: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    listContainer: {
        paddingHorizontal: 20,
    },
    leaderboardItem: {
        marginBottom: 8,
    },
    currentUserItem: {
        borderWidth: 2,
        borderColor: '#667eea',
        borderRadius: 12,
    },
    itemContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    rankContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    rankText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    userInfo: {
        flex: 1,
    },
    userHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    username: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        flex: 1,
    },
    levelBadge: {
        backgroundColor: '#667eea',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    levelText: {
        fontSize: 10,
        color: '#fff',
        fontWeight: '600',
    },
    userValue: {
        fontSize: 14,
        color: '#666',
    },
    changeContainer: {
        alignItems: 'center',
        marginRight: 8,
    },
    changeIcon: {
        fontSize: 12,
    },
    changeText: {
        fontSize: 10,
        fontWeight: '600',
    },
    currentUserIndicator: {
        backgroundColor: '#667eea',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    currentUserText: {
        fontSize: 10,
        color: '#fff',
        fontWeight: 'bold',
    },
}); 