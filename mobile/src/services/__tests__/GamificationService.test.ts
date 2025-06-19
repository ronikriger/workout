import { GamificationService } from '../GamificationService';
import { WorkoutSession } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage to control storage operations in tests
jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    clear: jest.fn(),
}));

// Helper to create a mock workout session
const createMockSession = (reps: number, score: number): WorkoutSession => ({
    id: `session-${Date.now()}`,
    userId: 'user1',
    exerciseType: 'squat',
    startTime: Date.now() - 5 * 60 * 1000,
    endTime: Date.now(),
    reps: Array.from({ length: reps }, (_, i) => ({
        repNumber: i + 1,
        timestamp: Date.now(),
        hipAngle: 90,
        spineAngle: 0,
        formScore: score,
        isGoodForm: true,
        depth: 90
    })),
    averageFormScore: score,
    isUploaded: false,
    createdAt: Date.now(),
});

describe('GamificationService', () => {
    let gamificationService: GamificationService;

    beforeEach(async () => {
        // Before each test, create a new service instance and wait for it to initialize
        // with clean data from our mocked storage.
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
        gamificationService = new GamificationService();
        await gamificationService.isInitialized;
    });

    afterEach(() => {
        // Clear all mocks after each test to ensure isolation
        jest.clearAllMocks();
    });

    it('should initialize with default stats', () => {
        const stats = gamificationService.getStats();
        expect(stats.level).toBe(1);
        expect(stats.xp).toBe(0);
        expect(stats.currentStreak).toBe(0);
    });

    it('should correctly calculate XP for a single workout', async () => {
        const session = createMockSession(10, 85); // 10 reps, 85 form score

        // Act
        const result = await gamificationService.processWorkout(session);
        const stats = gamificationService.getStats();

        // Assert
        // Base(10) + Reps(10*5=50) + Form(round(85/10)=9) = 69
        expect(result.xpGained).toBe(69);
        expect(stats.xp).toBe(69);
        expect(stats.workoutsCompleted).toBe(1);
    });

    it('should handle leveling up correctly', async () => {
        const session = createMockSession(15, 95); // 15 reps, 95 form score -> 10 + 75 + 10 = 95 XP

        // Act
        await gamificationService.processWorkout(session); // 95 XP
        let stats = gamificationService.getStats();
        expect(stats.level).toBe(1);

        await gamificationService.processWorkout(session); // 95 XP again. Total = 190.
        stats = gamificationService.getStats();

        // Assert
        // XP to level 2 is 100.
        // After 2 workouts (190 XP), user should be level 2 with 90 XP.
        expect(stats.level).toBe(2);
        expect(stats.xp).toBe(90);
    });

    it('should correctly calculate and apply streak bonuses', async () => {
        const session = createMockSession(10, 80); // 10 + 50 + 8 = 68 XP

        // Day 1: No streak bonus
        await gamificationService.processWorkout(session);
        let stats = gamificationService.getStats();
        expect(stats.currentStreak).toBe(1);
        expect(stats.xp).toBe(68);

        // Day 2: Streak bonus of 20 (2*10)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        stats.lastWorkoutDate = yesterday.toISOString().split('T')[0];
        // Manually set stats to simulate a workout yesterday
        (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(stats));
        const service2 = new GamificationService();
        await service2.isInitialized;

        const result = await service2.processWorkout(session);
        const finalStats = service2.getStats();

        // Assert
        // Initial XP (68) + Base XP (68) + Streak Bonus (2*10=20) = 156
        // The user levels up, so the final XP is 156 - 100 = 56
        expect(finalStats.level).toBe(2);
        expect(finalStats.currentStreak).toBe(2);
        expect(result.xpGained).toBe(68 + 20);
        expect(finalStats.xp).toBe(56);
    });

    it('should break a streak if a day is missed', async () => {
        const session = createMockSession(10, 80); // 68 XP

        // Arrange: Simulate a workout from 2 days ago
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        const initialStats = { ...gamificationService.getStats(), currentStreak: 5, lastWorkoutDate: twoDaysAgo.toISOString().split('T')[0] };
        (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(initialStats));
        const serviceWithStreak = new GamificationService();
        await serviceWithStreak.isInitialized;

        // Act: Process a new workout today
        await serviceWithStreak.processWorkout(session);
        const stats = serviceWithStreak.getStats();

        // Assert: Streak should reset to 1
        expect(stats.currentStreak).toBe(1);
    });
}); 