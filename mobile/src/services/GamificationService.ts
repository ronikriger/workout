/**
 * Gamification service for RepRight workout tracking
 * Handles achievements, levels, XP, badges, challenges, and rewards
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutSession, ExerciseType } from '../types';

export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    category: 'form' | 'consistency' | 'volume' | 'streak' | 'milestone' | 'mastery';
    type: 'bronze' | 'silver' | 'gold' | 'platinum' | 'legendary';
    xpReward: number;
    unlocked: boolean;
    unlockedAt?: string;
    progress: number;
    target: number;
    hidden: boolean; // Secret achievements
}

export interface Badge {
    id: string;
    name: string;
    icon: string;
    description: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
    earnedAt?: string;
    count: number; // For stackable badges
}

export interface Challenge {
    id: string;
    title: string;
    description: string;
    icon: string;
    type: 'daily' | 'weekly' | 'monthly' | 'seasonal';
    startDate: string;
    endDate: string;
    isActive: boolean;
    progress: number;
    target: number;
    xpReward: number;
    badgeReward?: string;
    completed: boolean;
}

export interface Level {
    level: number;
    title: string;
    xpRequired: number;
    xpToNext: number;
    perks: string[];
    unlockMessage: string;
}

export interface UserStats {
    currentLevel: number;
    totalXP: number;
    currentLevelXP: number;
    xpToNextLevel: number;
    totalWorkouts: number;
    totalReps: number;
    perfectReps: number;
    currentStreak: number;
    longestStreak: number;
    formMasterPoints: number;
    consistencyRating: number;
    weeklyGoal: number;
    monthlyGoal: number;
}

export interface LeaderboardEntry {
    userId: string;
    username: string;
    level: number;
    xp: number;
    streak: number;
    formScore: number;
    rank: number;
    change: number; // +/- rank change
}

export class GamificationService {
    private achievements: Achievement[] = [];
    private badges: Badge[] = [];
    private challenges: Challenge[] = [];
    private userStats: UserStats = this.getDefaultStats();
    private isInitialized: boolean = false;

    constructor() {
        this.initializeService();
    }

    /**
     * Initialize gamification service
     */
    private async initializeService(): Promise<void> {
        try {
            await this.loadUserData();
            this.initializeAchievements();
            this.initializeChallenges();
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize GamificationService:', error);
        }
    }

    /**
     * Process workout session and award XP, check achievements, update challenges
     */
    public async processWorkoutSession(session: WorkoutSession): Promise<{
        xpGained: number;
        leveledUp: boolean;
        newLevel?: Level;
        achievementsUnlocked: Achievement[];
        badgesEarned: Badge[];
        challengesCompleted: Challenge[];
    }> {
        const result = {
            xpGained: 0,
            leveledUp: false,
            newLevel: undefined as Level | undefined,
            achievementsUnlocked: [] as Achievement[],
            badgesEarned: [] as Badge[],
            challengesCompleted: [] as Challenge[]
        };

        // Calculate XP gained
        const baseXP = session.reps.length * 10; // 10 XP per rep
        const formBonus = Math.floor(session.averageFormScore * 0.5); // Up to 50 XP for perfect form
        const streakBonus = this.userStats.currentStreak * 5; // 5 XP per streak day
        const timeBonus = this.calculateTimeBonus(session);

        result.xpGained = baseXP + formBonus + streakBonus + timeBonus;

        // Update user stats
        this.userStats.totalXP += result.xpGained;
        this.userStats.currentLevelXP += result.xpGained;
        this.userStats.totalWorkouts += 1;
        this.userStats.totalReps += session.reps.length;
        this.userStats.perfectReps += session.reps.filter(rep => rep.formScore >= 95).length;
        this.userStats.formMasterPoints += Math.floor(session.averageFormScore);

        // Check for level up
        const levelUpResult = this.checkLevelUp();
        if (levelUpResult.leveledUp) {
            result.leveledUp = true;
            result.newLevel = levelUpResult.newLevel;
        }

        // Check achievements
        result.achievementsUnlocked = await this.checkAchievements(session);

        // Update challenges
        result.challengesCompleted = await this.updateChallenges(session);

        // Check for new badges
        result.badgesEarned = await this.checkBadges(session, result.achievementsUnlocked);

        await this.saveUserData();
        return result;
    }

    /**
     * Get user's current gamification status
     */
    public getUserStats(): UserStats {
        return { ...this.userStats };
    }

    /**
     * Get user's current level info
     */
    public getCurrentLevel(): Level {
        return this.getLevelInfo(this.userStats.currentLevel);
    }

    /**
     * Get all achievements with progress
     */
    public getAchievements(category?: string): Achievement[] {
        let achievements = [...this.achievements];

        if (category) {
            achievements = achievements.filter(a => a.category === category);
        }

        // Sort by unlocked status, then by XP reward
        return achievements.sort((a, b) => {
            if (a.unlocked !== b.unlocked) {
                return a.unlocked ? -1 : 1;
            }
            return b.xpReward - a.xpReward;
        });
    }

    /**
     * Get active challenges
     */
    public getActiveChallenges(): Challenge[] {
        const now = new Date().toISOString();
        return this.challenges.filter(c =>
            c.isActive &&
            c.startDate <= now &&
            c.endDate >= now &&
            !c.completed
        );
    }

    /**
     * Get earned badges
     */
    public getBadges(): Badge[] {
        return this.badges
            .filter(b => b.earnedAt)
            .sort((a, b) => new Date(b.earnedAt!).getTime() - new Date(a.earnedAt!).getTime());
    }

    /**
     * Get weekly progress summary
     */
    public getWeeklyProgress(): {
        workoutsThisWeek: number;
        weeklyGoalProgress: number;
        xpGainedThisWeek: number;
        avgFormScoreThisWeek: number;
        streakThisWeek: number;
        challengesCompletedThisWeek: number;
    } {
        // This would be calculated from stored session data
        return {
            workoutsThisWeek: 5,
            weeklyGoalProgress: 83,
            xpGainedThisWeek: 1250,
            avgFormScoreThisWeek: 87.5,
            streakThisWeek: 5,
            challengesCompletedThisWeek: 2
        };
    }

    /**
     * Get leaderboard data (mock for now - would come from backend)
     */
    public getLeaderboard(type: 'xp' | 'streak' | 'form' = 'xp'): LeaderboardEntry[] {
        // Mock data - in real app would fetch from backend
        const mockData: LeaderboardEntry[] = [
            { userId: 'user1', username: 'FormMaster89', level: 12, xp: 15420, streak: 28, formScore: 94.2, rank: 1, change: 0 },
            { userId: 'user2', username: 'SquatKing', level: 11, xp: 14890, streak: 15, formScore: 91.8, rank: 2, change: 1 },
            { userId: 'current', username: 'You', level: this.userStats.currentLevel, xp: this.userStats.totalXP, streak: this.userStats.currentStreak, formScore: 88.5, rank: 3, change: -1 },
            { userId: 'user4', username: 'DeadliftDiva', level: 10, xp: 12100, streak: 42, formScore: 96.1, rank: 4, change: 2 },
            { userId: 'user5', username: 'IronLifter', level: 9, xp: 11750, streak: 8, formScore: 85.3, rank: 5, change: -1 }
        ];

        return mockData.sort((a, b) => {
            switch (type) {
                case 'xp': return b.xp - a.xp;
                case 'streak': return b.streak - a.streak;
                case 'form': return b.formScore - a.formScore;
                default: return b.xp - a.xp;
            }
        }).map((entry, index) => ({ ...entry, rank: index + 1 }));
    }

    /**
     * Predict next achievement unlock
     */
    public getNextAchievement(): Achievement | null {
        const unlockedAchievements = this.achievements.filter(a => !a.unlocked && !a.hidden);

        if (unlockedAchievements.length === 0) return null;

        // Find achievement closest to completion
        return unlockedAchievements.reduce((closest, current) => {
            const closestProgress = closest.progress / closest.target;
            const currentProgress = current.progress / current.target;
            return currentProgress > closestProgress ? current : closest;
        });
    }

    // Private helper methods

    private getDefaultStats(): UserStats {
        return {
            currentLevel: 1,
            totalXP: 0,
            currentLevelXP: 0,
            xpToNextLevel: 1000,
            totalWorkouts: 0,
            totalReps: 0,
            perfectReps: 0,
            currentStreak: 0,
            longestStreak: 0,
            formMasterPoints: 0,
            consistencyRating: 0,
            weeklyGoal: 3,
            monthlyGoal: 12
        };
    }

    private calculateTimeBonus(session: WorkoutSession): number {
        const duration = (session.endTime || session.startTime) - session.startTime;
        const minutes = duration / (1000 * 60);

        // Bonus for longer sessions, max 50 XP
        if (minutes >= 30) return 50;
        if (minutes >= 20) return 30;
        if (minutes >= 10) return 20;
        return 10;
    }

    private checkLevelUp(): { leveledUp: boolean; newLevel?: Level } {
        const currentLevel = this.getLevelInfo(this.userStats.currentLevel);

        if (this.userStats.currentLevelXP >= currentLevel.xpRequired) {
            this.userStats.currentLevel += 1;
            this.userStats.currentLevelXP -= currentLevel.xpRequired;

            const newLevel = this.getLevelInfo(this.userStats.currentLevel);
            this.userStats.xpToNextLevel = newLevel.xpRequired - this.userStats.currentLevelXP;

            return { leveledUp: true, newLevel };
        }

        this.userStats.xpToNextLevel = currentLevel.xpRequired - this.userStats.currentLevelXP;
        return { leveledUp: false };
    }

    private getLevelInfo(level: number): Level {
        const baseXP = 1000;
        const xpRequired = Math.floor(baseXP * Math.pow(1.5, level - 1));

        const levelTitles = [
            "Rookie", "Novice", "Apprentice", "Journeyman", "Expert",
            "Master", "Grandmaster", "Legend", "Champion", "Elite",
            "Virtuoso", "Prodigy", "Phenomenon", "Icon", "Mythic"
        ];

        const title = level <= levelTitles.length
            ? levelTitles[level - 1]
            : `Ascended ${level - levelTitles.length}`;

        return {
            level,
            title,
            xpRequired,
            xpToNext: Math.floor(baseXP * Math.pow(1.5, level)),
            perks: this.getLevelPerks(level),
            unlockMessage: `Congratulations! You've reached ${title} level!`
        };
    }

    private getLevelPerks(level: number): string[] {
        const perks = [];

        if (level >= 2) perks.push("Custom voice cues unlocked");
        if (level >= 3) perks.push("Advanced analytics");
        if (level >= 5) perks.push("Workout templates");
        if (level >= 7) perks.push("Video form analysis");
        if (level >= 10) perks.push("Personal trainer AI");
        if (level >= 15) perks.push("Legendary status");

        return perks;
    }

    private async checkAchievements(session: WorkoutSession): Promise<Achievement[]> {
        const newlyUnlocked: Achievement[] = [];

        for (const achievement of this.achievements) {
            if (achievement.unlocked) continue;

            const wasUnlocked = this.updateAchievementProgress(achievement, session);
            if (wasUnlocked) {
                achievement.unlocked = true;
                achievement.unlockedAt = new Date().toISOString();
                this.userStats.totalXP += achievement.xpReward;
                newlyUnlocked.push(achievement);
            }
        }

        return newlyUnlocked;
    }

    private updateAchievementProgress(achievement: Achievement, session: WorkoutSession): boolean {
        switch (achievement.id) {
            case 'first_workout':
                achievement.progress = this.userStats.totalWorkouts;
                break;
            case 'form_perfectionist':
                const perfectReps = session.reps.filter(rep => rep.formScore >= 95).length;
                achievement.progress += perfectReps;
                break;
            case 'hundred_reps':
                achievement.progress = this.userStats.totalReps;
                break;
            case 'consistency_king':
                achievement.progress = this.userStats.currentStreak;
                break;
            case 'form_master':
                if (session.averageFormScore >= 90) {
                    achievement.progress += 1;
                }
                break;
            // Add more achievement logic here
        }

        return achievement.progress >= achievement.target;
    }

    private async updateChallenges(session: WorkoutSession): Promise<Challenge[]> {
        const completedChallenges: Challenge[] = [];

        for (const challenge of this.challenges) {
            if (challenge.completed || !challenge.isActive) continue;

            // Update challenge progress based on type
            switch (challenge.type) {
                case 'daily':
                    if (this.isToday(session.createdAt)) {
                        challenge.progress += 1;
                    }
                    break;
                case 'weekly':
                    if (this.isThisWeek(session.createdAt)) {
                        challenge.progress += 1;
                    }
                    break;
            }

            if (challenge.progress >= challenge.target) {
                challenge.completed = true;
                this.userStats.totalXP += challenge.xpReward;
                completedChallenges.push(challenge);
            }
        }

        return completedChallenges;
    }

    private async checkBadges(session: WorkoutSession, newAchievements: Achievement[]): Promise<Badge[]> {
        const newBadges: Badge[] = [];

        // Award badges for achievements
        for (const achievement of newAchievements) {
            if (achievement.type === 'legendary') {
                const badge = this.awardBadge('legendary_achiever', 'legendary');
                if (badge) newBadges.push(badge);
            }
        }

        // Check for session-specific badges
        if (session.averageFormScore === 100) {
            const badge = this.awardBadge('perfect_form', 'epic');
            if (badge) newBadges.push(badge);
        }

        return newBadges;
    }

    private awardBadge(badgeId: string, rarity: Badge['rarity']): Badge | null {
        let badge = this.badges.find(b => b.id === badgeId);

        if (!badge) {
            badge = {
                id: badgeId,
                name: this.getBadgeName(badgeId),
                icon: this.getBadgeIcon(badgeId),
                description: this.getBadgeDescription(badgeId),
                rarity,
                count: 0
            };
            this.badges.push(badge);
        }

        badge.count += 1;
        badge.earnedAt = new Date().toISOString();

        return badge;
    }

    private getBadgeName(badgeId: string): string {
        const names: Record<string, string> = {
            'legendary_achiever': 'Legendary Achiever',
            'perfect_form': 'Perfect Form',
            'streak_master': 'Streak Master',
            'volume_king': 'Volume King'
        };
        return names[badgeId] || 'Unknown Badge';
    }

    private getBadgeIcon(badgeId: string): string {
        const icons: Record<string, string> = {
            'legendary_achiever': '👑',
            'perfect_form': '💎',
            'streak_master': '🔥',
            'volume_king': '💪'
        };
        return icons[badgeId] || '🏆';
    }

    private getBadgeDescription(badgeId: string): string {
        const descriptions: Record<string, string> = {
            'legendary_achiever': 'Unlocked a legendary achievement',
            'perfect_form': 'Achieved 100% form score in a session',
            'streak_master': 'Maintained workout streak for 30 days',
            'volume_king': 'Completed 1000+ reps'
        };
        return descriptions[badgeId] || 'Special achievement unlocked';
    }

    private initializeAchievements(): void {
        this.achievements = [
            {
                id: 'first_workout',
                title: 'First Steps',
                description: 'Complete your first workout',
                icon: '🌟',
                category: 'milestone',
                type: 'bronze',
                xpReward: 100,
                unlocked: false,
                progress: 0,
                target: 1,
                hidden: false
            },
            {
                id: 'form_perfectionist',
                title: 'Form Perfectionist',
                description: 'Achieve 100 perfect reps (95%+ form)',
                icon: '💎',
                category: 'form',
                type: 'gold',
                xpReward: 500,
                unlocked: false,
                progress: 0,
                target: 100,
                hidden: false
            },
            {
                id: 'consistency_king',
                title: 'Consistency King',
                description: 'Maintain a 30-day workout streak',
                icon: '🔥',
                category: 'streak',
                type: 'platinum',
                xpReward: 1000,
                unlocked: false,
                progress: 0,
                target: 30,
                hidden: false
            },
            {
                id: 'form_master',
                title: 'Form Master',
                description: 'Complete 50 sessions with 90%+ average form',
                icon: '🎯',
                category: 'mastery',
                type: 'legendary',
                xpReward: 2000,
                unlocked: false,
                progress: 0,
                target: 50,
                hidden: false
            }
            // Add more achievements...
        ];
    }

    private initializeChallenges(): void {
        const now = new Date();
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

        this.challenges = [
            {
                id: 'weekly_warrior',
                title: 'Weekly Warrior',
                description: 'Complete 5 workouts this week',
                icon: '⚔️',
                type: 'weekly',
                startDate: weekStart.toISOString(),
                endDate: weekEnd.toISOString(),
                isActive: true,
                progress: 0,
                target: 5,
                xpReward: 300,
                completed: false
            }
            // Add more challenges...
        ];
    }

    private isToday(timestamp: number): boolean {
        const today = new Date();
        const date = new Date(timestamp);
        return date.toDateString() === today.toDateString();
    }

    private isThisWeek(timestamp: number): boolean {
        const now = new Date();
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        const date = new Date(timestamp);
        return date >= weekStart && date <= now;
    }

    private async loadUserData(): Promise<void> {
        try {
            const [statsData, achievementsData, badgesData, challengesData] = await Promise.all([
                AsyncStorage.getItem('gamification_stats'),
                AsyncStorage.getItem('gamification_achievements'),
                AsyncStorage.getItem('gamification_badges'),
                AsyncStorage.getItem('gamification_challenges')
            ]);

            if (statsData) this.userStats = JSON.parse(statsData);
            if (achievementsData) this.achievements = JSON.parse(achievementsData);
            if (badgesData) this.badges = JSON.parse(badgesData);
            if (challengesData) this.challenges = JSON.parse(challengesData);
        } catch (error) {
            console.error('Failed to load gamification data:', error);
        }
    }

    private async saveUserData(): Promise<void> {
        try {
            await Promise.all([
                AsyncStorage.setItem('gamification_stats', JSON.stringify(this.userStats)),
                AsyncStorage.setItem('gamification_achievements', JSON.stringify(this.achievements)),
                AsyncStorage.setItem('gamification_badges', JSON.stringify(this.badges)),
                AsyncStorage.setItem('gamification_challenges', JSON.stringify(this.challenges))
            ]);
        } catch (error) {
            console.error('Failed to save gamification data:', error);
        }
    }
} 