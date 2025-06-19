import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    SafeAreaView,
    TouchableOpacity,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const WorkoutHistoryScreen = ({ navigation }) => {
    const [workouts, setWorkouts] = useState([]);
    const [loading, setLoading] = useState(false);

    // Mock workout data for demonstration
    const mockWorkouts = [
        {
            id: 1,
            type: 'Upper Body Strength',
            date: '2024-01-15',
            duration: 45,
            exercises: 8,
            calories: 320,
            performance: 'Great',
            icon: 'fitness',
            color: ['#FF6B6B', '#FF8E8E'],
        },
        {
            id: 2,
            type: 'Cardio Blast',
            date: '2024-01-13',
            duration: 30,
            exercises: 5,
            calories: 280,
            performance: 'Good',
            icon: 'heart',
            color: ['#4ECDC4', '#6EDDD6'],
        },
        {
            id: 3,
            type: 'Leg Day',
            date: '2024-01-11',
            duration: 50,
            exercises: 10,
            calories: 400,
            performance: 'Excellent',
            icon: 'walk',
            color: ['#45B7D1', '#96D9F0'],
        },
        {
            id: 4,
            type: 'Core & Flexibility',
            date: '2024-01-09',
            duration: 25,
            exercises: 6,
            calories: 150,
            performance: 'Good',
            icon: 'body',
            color: ['#F7DC6F', '#F8E896'],
        },
    ];

    useEffect(() => {
        // Simulate some workout data
        setWorkouts(mockWorkouts);
        setLoading(false);
    }, []);

    const getPerformanceColor = (performance) => {
        switch (performance) {
            case 'Excellent': return '#27ae60';
            case 'Great': return '#1e90ff';
            case 'Good': return '#f39c12';
            default: return '#95a5a6';
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return 'Yesterday';
        if (diffDays <= 7) return `${diffDays} days ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const renderWorkoutCard = ({ item }) => (
        <TouchableOpacity style={styles.workoutCard} activeOpacity={0.8}>
            <LinearGradient
                colors={item.color as any}
                style={styles.workoutGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <View style={styles.workoutHeader}>
                    <Ionicons name={item.icon as any} size={24} color="#fff" />
                    <View style={styles.workoutInfo}>
                        <Text style={styles.workoutType}>{item.type}</Text>
                        <Text style={styles.workoutDate}>{formatDate(item.date)}</Text>
                    </View>
                    <View style={[styles.performanceBadge, { backgroundColor: getPerformanceColor(item.performance) }]}>
                        <Text style={styles.performanceText}>{item.performance}</Text>
                    </View>
                </View>
            </LinearGradient>

            <View style={styles.workoutStats}>
                <View style={styles.statItem}>
                    <Ionicons name="time" size={16} color="#7f8c8d" />
                    <Text style={styles.statText}>{item.duration} min</Text>
                </View>
                <View style={styles.statItem}>
                    <Ionicons name="list" size={16} color="#7f8c8d" />
                    <Text style={styles.statText}>{item.exercises} exercises</Text>
                </View>
                <View style={styles.statItem}>
                    <Ionicons name="flame" size={16} color="#7f8c8d" />
                    <Text style={styles.statText}>{item.calories} cal</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.emptyGradient}
            >
                <Ionicons name="fitness" size={64} color="#fff" />
                <Text style={styles.emptyTitle}>Start Your Fitness Journey</Text>
                <Text style={styles.emptySubtitle}>
                    No workouts yet, but every champion starts somewhere!
                </Text>
                <TouchableOpacity
                    style={styles.startButton}
                    onPress={() => navigation?.navigate('Camera')}
                >
                    <Text style={styles.startButtonText}>Start First Workout</Text>
                    <Ionicons name="arrow-forward" size={20} color="#667eea" />
                </TouchableOpacity>
            </LinearGradient>
        </View>
    );

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>Workout History</Text>
            <Text style={styles.headerSubtitle}>Track your fitness progress</Text>

            {workouts.length > 0 && (
                <View style={styles.summaryContainer}>
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryValue}>{workouts.length}</Text>
                        <Text style={styles.summaryLabel}>Total Workouts</Text>
                    </View>
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryValue}>
                            {workouts.reduce((total, workout) => total + workout.duration, 0)}
                        </Text>
                        <Text style={styles.summaryLabel}>Minutes Trained</Text>
                    </View>
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryValue}>
                            {workouts.reduce((total, workout) => total + workout.calories, 0)}
                        </Text>
                        <Text style={styles.summaryLabel}>Calories Burned</Text>
                    </View>
                </View>
            )}
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1e90ff" />
                <Text style={styles.loadingText}>Loading your workouts...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={workouts}
                renderItem={renderWorkoutCard}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmptyState}
                contentContainerStyle={styles.scrollContent}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#7f8c8d',
    },
    headerContainer: {
        padding: 20,
        paddingTop: 10,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#7f8c8d',
        marginBottom: 20,
    },
    summaryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    summaryCard: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        flex: 1,
        marginHorizontal: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    summaryValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1e90ff',
    },
    summaryLabel: {
        fontSize: 12,
        color: '#7f8c8d',
        marginTop: 4,
        textAlign: 'center',
    },
    workoutCard: {
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: 16,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        overflow: 'hidden',
    },
    workoutGradient: {
        padding: 16,
    },
    workoutHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    workoutInfo: {
        flex: 1,
        marginLeft: 12,
    },
    workoutType: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    workoutDate: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 2,
    },
    performanceBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    performanceText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '600',
    },
    workoutStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 16,
        backgroundColor: '#fff',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statText: {
        fontSize: 14,
        color: '#2c3e50',
        marginLeft: 6,
        fontWeight: '500',
    },
    emptyContainer: {
        flex: 1,
        margin: 20,
        borderRadius: 20,
        overflow: 'hidden',
        minHeight: 400,
    },
    emptyGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 20,
        marginBottom: 12,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.9)',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 30,
    },
    startButton: {
        backgroundColor: '#fff',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 25,
        flexDirection: 'row',
        alignItems: 'center',
    },
    startButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#667eea',
        marginRight: 8,
    },
});

export default WorkoutHistoryScreen;