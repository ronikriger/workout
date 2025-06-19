/**
 * This file contains the core data types for the RepRight application,
 * focusing on the user and their personal workout data.
 */

import { Keypoint } from '@tensorflow-models/pose-detection';

/**
 * Represents a single user of the application.
 */
export interface User {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    createdAt: string;
    is_active: boolean;
    fitness_level?: string;
    goals?: string[];
}

/**
 * Represents the data required to create a new user.
 * Used for the registration form.
 */
export interface UserCreate {
    email: string;
    password: str;
    first_name?: string;
    last_name?: string;
    fitness_level?: string;
    goals?: string[];
}

/**
 * Represents a single repetition from a workout, including form analysis.
 */
export interface RepData {
    repNumber: number;
    formScore: number; // Score from 0-100
    issues: string[]; // List of detected form issues
    duration: number; // Duration of the rep in seconds
    phase: 'ascent' | 'descent' | 'pause' | 'full_rep';
    hipAngle: number;
    spineAngle: number;
    kneeAngle: number;
    keypoints: Keypoint[];
}

/**
 * Represents a complete workout session.
 */
export interface WorkoutSession {
    id: string;
    userId: string;
    createdAt: string;
    exerciseType: string;
    reps: RepData[];
    duration: number; // Total duration in seconds
    averageFormScore: number;
    videoUri?: string; // URI to the session video
    notes?: string;
}

/**
 * Basic API response structure.
 */
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
} 