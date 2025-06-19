/**
 * Gamification service for RepRight workout tracking
 * Handles achievements, levels, XP, badges, challenges, and rewards
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutSession } from '../types';

// Simplified UserStats for clarity and robustness
export interface UserStats {
    level: number;
    xp: number;
    workoutsCompleted: number;
    currentStreak: number;
    lastWorkoutDate: string | null;
}

export class GamificationService {
    private userStats: UserStats;
    private static readonly STORAGE_KEY = 'gamification_user_stats';

    // The isInitialized promise resolves when the service has loaded data from storage.
    public isInitialized: Promise<void>;

    constructor() {
        this.userStats = this.getDefaultStats();
        this.isInitialized = this.loadStats();
    }

    private getDefaultStats(): UserStats {
        return {
            level: 1,
            xp: 0,
            workoutsCompleted: 0,
            currentStreak: 0,
            lastWorkoutDate: null,
        };
    }

    private async loadStats(): Promise<void> {
        try {
            const statsJson = await AsyncStorage.getItem(GamificationService.STORAGE_KEY);
            if (statsJson) {
                // Merge loaded stats with defaults to handle any new properties
                this.userStats = { ...this.getDefaultStats(), ...JSON.parse(statsJson) };
            }
        } catch (error) {
            console.error('Failed to load gamification stats, using defaults.', error);
            this.userStats = this.getDefaultStats();
        }
    }

    private async saveStats(): Promise<void> {
        try {
            await AsyncStorage.setItem(GamificationService.STORAGE_KEY, JSON.stringify(this.userStats));
        } catch (error) {
            console.error('Failed to save gamification stats.', error);
        }
    }

    public getStats(): UserStats {
        return { ...this.userStats };
    }

    public getXpForNextLevel(level: number): number {
        return 100 * Math.pow(1.5, level - 1);
    }

    public async processWorkout(session: WorkoutSession): Promise<{ xpGained: number; leveledUp: boolean }> {
        let xpGained = 10; // Base XP
        xpGained += session.reps.length * 5; // Rep XP
        xpGained += Math.round(session.averageFormScore / 10); // Form XP

        this.updateStreak();
        if (this.userStats.currentStreak > 1) {
            xpGained += this.userStats.currentStreak * 10; // Streak Bonus
        }

        this.userStats.xp += xpGained;
        this.userStats.workoutsCompleted += 1;

        let leveledUp = false;
        let xpForNext = this.getXpForNextLevel(this.userStats.level);
        while (this.userStats.xp >= xpForNext) {
            this.userStats.level += 1;
            this.userStats.xp -= xpForNext;
            leveledUp = true;
            xpForNext = this.getXpForNextLevel(this.userStats.level);
        }

        await this.saveStats();
        return { xpGained, leveledUp };
    }

    private updateStreak() {
        const today = new Date().toISOString().split('T')[0];
        if (!this.userStats.lastWorkoutDate) {
            this.userStats.currentStreak = 1;
        } else {
            const lastWorkout = new Date(this.userStats.lastWorkoutDate);
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            if (lastWorkout.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0]) {
                this.userStats.currentStreak += 1;
            } else if (lastWorkout.toISOString().split('T')[0] !== today) {
                this.userStats.currentStreak = 1;
            }
        }
        this.userStats.lastWorkoutDate = today;
    }

    // A helper method for tests to reset the state
    public async _reset_for_testing(): Promise<void> {
        await AsyncStorage.clear();
        this.userStats = this.getDefaultStats();
    }
} 