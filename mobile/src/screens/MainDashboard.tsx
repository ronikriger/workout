import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Dimensions,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const MainDashboard = ({ navigation }) => {
    const [userName, setUserName] = useState('');
    const [currentTime, setCurrentTime] = useState('');

    useEffect(() => {
        // Get user info and set greeting
        const loadUserInfo = async () => {
            try {
                const userStr = await AsyncStorage.getItem('user');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    setUserName('Champion'); // Simple greeting
                }
            } catch (error) {
                setUserName('Champion');
            }
        };

        const updateTime = () => {
            const now = new Date();
            const hour = now.getHours();
            let greeting = '';

            if (hour < 12) greeting = 'Good Morning';
            else if (hour < 17) greeting = 'Good Afternoon';
            else greeting = 'Good Evening';

            setCurrentTime(greeting);
        };

        loadUserInfo();
        updateTime();
        const timer = setInterval(updateTime, 60000); // Update every minute

        return () => clearInterval(timer);
    }, []);

    const quickActions = [
        {
            title: 'Start Workout',
            subtitle: 'Begin your training',
            icon: 'fitness',
            color: ['#FF6B6B', '#FF8E8E'],
            screen: 'Camera',
        },
        {
            title: 'View Progress',
            subtitle: 'Track your gains',
            icon: 'trending-up',
            color: ['#4ECDC4', '#6EDDD6'],
            screen: 'Analytics',
        },
        {
            title: 'Workout History',
            subtitle: 'Past sessions',
            icon: 'time',
            color: ['#45B7D1', '#96D9F0'],
            screen: 'History',
        },
        {
            title: 'Settings',
            subtitle: 'Customize app',
            icon: 'settings',
            color: ['#F7DC6F', '#F8E896'],
            screen: 'Settings',
        },
    ];

    const workoutStats = [
        { label: 'Workouts This Week', value: '3', icon: 'barbell' },
        { label: 'Total Sessions', value: '47', icon: 'trophy' },
        { label: 'Best Streak', value: '12 days', icon: 'flame' },
        { label: 'Calories Burned', value: '2,340', icon: 'flash' },
    ];

    const motivationalQuotes = [
        "The only bad workout is the one that didn't happen.",
        "Your body can do it. It's your mind you need to convince.",
        "Success isn't given. It's earned.",
        "Push yourself because no one else is going to do it for you.",
        "The pain you feel today will be the strength you feel tomorrow.",
    ];

    const todaysQuote = motivationalQuotes[new Date().getDate() % motivationalQuotes.length];

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header Section */}
                <LinearGradient
                    colors={['#1a1a2e', '#16213e', '#0f3460']}
                    style={styles.headerGradient}
                >
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.greeting}>{currentTime}</Text>
                            <Text style={styles.userName}>{userName}</Text>
                        </View>
                        <TouchableOpacity style={styles.profileButton}>
                            <Ionicons name="person-circle" size={40} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Today's Quote */}
                    <View style={styles.quoteContainer}>
                        <Ionicons name="chatbubble-ellipses" size={20} color="#FFD700" />
                        <Text style={styles.quote}>{todaysQuote}</Text>
                    </View>
                </LinearGradient>

                {/* Quick Stats */}
                <View style={styles.statsContainer}>
                    <Text style={styles.sectionTitle}>Your Progress</Text>
                    <View style={styles.statsGrid}>
                        {workoutStats.map((stat, index) => (
                            <View key={index} style={styles.statCard}>
                                <Ionicons name={stat.icon as any} size={24} color="#1e90ff" />
                                <Text style={styles.statValue}>{stat.value}</Text>
                                <Text style={styles.statLabel}>{stat.label}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.actionsContainer}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.actionsGrid}>
                        {quickActions.map((action, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.actionCard}
                                onPress={() => navigation.navigate(action.screen)}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={action.color as any}
                                    style={styles.actionGradient}
                                >
                                    <Ionicons name={action.icon as any} size={32} color="#fff" />
                                    <Text style={styles.actionTitle}>{action.title}</Text>
                                    <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Recent Activity */}
                <View style={styles.recentContainer}>
                    <Text style={styles.sectionTitle}>Recent Activity</Text>
                    <View style={styles.activityCard}>
                        <View style={styles.activityHeader}>
                            <Ionicons name="fitness" size={24} color="#1e90ff" />
                            <View style={styles.activityInfo}>
                                <Text style={styles.activityTitle}>Upper Body Strength</Text>
                                <Text style={styles.activityDate}>2 days ago • 45 min</Text>
                            </View>
                            <View style={styles.activityBadge}>
                                <Text style={styles.badgeText}>Great!</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.activityCard}>
                        <View style={styles.activityHeader}>
                            <Ionicons name="walk" size={24} color="#4ECDC4" />
                            <View style={styles.activityInfo}>
                                <Text style={styles.activityTitle}>Cardio Session</Text>
                                <Text style={styles.activityDate}>4 days ago • 30 min</Text>
                            </View>
                            <View style={[styles.activityBadge, { backgroundColor: '#4ECDC4' }]}>
                                <Text style={styles.badgeText}>Good</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Call to Action */}
                <View style={styles.ctaContainer}>
                    <LinearGradient
                        colors={['#FF6B6B', '#FF8E8E']}
                        style={styles.ctaGradient}
                    >
                        <Text style={styles.ctaTitle}>Ready for Today's Challenge?</Text>
                        <Text style={styles.ctaSubtitle}>Start your workout and crush your goals!</Text>
                        <TouchableOpacity
                            style={styles.ctaButton}
                            onPress={() => navigation.navigate('Camera')}
                        >
                            <Text style={styles.ctaButtonText}>Start Workout</Text>
                            <Ionicons name="arrow-forward" size={20} color="#FF6B6B" />
                        </TouchableOpacity>
                    </LinearGradient>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    headerGradient: {
        paddingBottom: 30,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    greeting: {
        fontSize: 16,
        color: '#B0B0B0',
        marginBottom: 4,
    },
    userName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
    },
    profileButton: {
        padding: 4,
    },
    quoteContainer: {
        marginHorizontal: 20,
        marginTop: 20,
        padding: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    quote: {
        flex: 1,
        fontSize: 14,
        color: '#fff',
        fontStyle: 'italic',
        marginLeft: 10,
        lineHeight: 20,
    },
    statsContainer: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 16,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    statCard: {
        width: (width - 60) / 2,
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginTop: 8,
    },
    statLabel: {
        fontSize: 12,
        color: '#7f8c8d',
        textAlign: 'center',
        marginTop: 4,
    },
    actionsContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    actionCard: {
        width: (width - 60) / 2,
        marginBottom: 12,
        borderRadius: 16,
        overflow: 'hidden',
    },
    actionGradient: {
        padding: 20,
        alignItems: 'center',
        minHeight: 120,
        justifyContent: 'center',
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 8,
        textAlign: 'center',
    },
    actionSubtitle: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 4,
        textAlign: 'center',
    },
    recentContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    activityCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    activityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    activityInfo: {
        flex: 1,
        marginLeft: 12,
    },
    activityTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
    },
    activityDate: {
        fontSize: 12,
        color: '#7f8c8d',
        marginTop: 2,
    },
    activityBadge: {
        backgroundColor: '#1e90ff',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '600',
    },
    ctaContainer: {
        margin: 20,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 40,
    },
    ctaGradient: {
        padding: 24,
        alignItems: 'center',
    },
    ctaTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
        textAlign: 'center',
    },
    ctaSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
        marginBottom: 20,
        textAlign: 'center',
    },
    ctaButton: {
        backgroundColor: '#fff',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 25,
        flexDirection: 'row',
        alignItems: 'center',
    },
    ctaButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FF6B6B',
        marginRight: 8,
    },
});

export default MainDashboard; 