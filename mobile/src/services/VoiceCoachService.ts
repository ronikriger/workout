/**
 * Voice coaching service for real-time audio feedback during workouts
 * Implements Text-to-Speech with configurable cues and timing
 */

import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExerciseType, RepMetrics } from '../types';

export interface AudioCue {
    id: string;
    phrase: string;
    trigger: CueTrigger;
    exerciseType: ExerciseType | 'all';
    isEnabled: boolean;
    priority: number; // 1-5, higher = more important
}

export interface CueTrigger {
    type: 'rep_phase' | 'form_issue' | 'rep_count' | 'time_interval';
    condition: string; // e.g., 'bottom', 'poor_form', 'rep_5', '30_seconds'
    hipAngleRange?: [number, number];
    spineAngleRange?: [number, number];
    formScoreThreshold?: number;
}

export interface VoiceSettings {
    isEnabled: boolean;
    volume: number; // 0.0 - 1.0
    rate: number; // 0.1 - 2.0 (speech rate)
    pitch: number; // 0.5 - 2.0
    language: string; // 'en-US', 'es-ES', etc.
    voice: string; // specific voice identifier
    enableHapticWithVoice: boolean;
    cueCooldown: number; // milliseconds between same cue
}

const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
    isEnabled: false,
    volume: 0.8,
    rate: 1.0,
    pitch: 1.0,
    language: 'en-US',
    voice: 'default',
    enableHapticWithVoice: true,
    cueCooldown: 3000, // 3 seconds
};

const DEFAULT_CUES: AudioCue[] = [
    // Squat cues
    {
        id: 'squat_descent',
        phrase: 'Keep chest up, knees out',
        trigger: {
            type: 'rep_phase',
            condition: 'descent',
            hipAngleRange: [120, 150]
        },
        exerciseType: 'squat',
        isEnabled: true,
        priority: 3
    },
    {
        id: 'squat_bottom',
        phrase: 'Drive through heels',
        trigger: {
            type: 'rep_phase',
            condition: 'bottom',
            hipAngleRange: [60, 80]
        },
        exerciseType: 'squat',
        isEnabled: true,
        priority: 4
    },
    {
        id: 'squat_ascent',
        phrase: 'Push the floor away',
        trigger: {
            type: 'rep_phase',
            condition: 'ascent',
            hipAngleRange: [90, 130]
        },
        exerciseType: 'squat',
        isEnabled: true,
        priority: 3
    },
    {
        id: 'squat_depth_warning',
        phrase: 'Go deeper, break parallel',
        trigger: {
            type: 'form_issue',
            condition: 'insufficient_depth',
            hipAngleRange: [90, 110]
        },
        exerciseType: 'squat',
        isEnabled: true,
        priority: 4
    },

    // Deadlift cues
    {
        id: 'deadlift_setup',
        phrase: 'Tight lats, proud chest',
        trigger: {
            type: 'rep_phase',
            condition: 'bottom',
            spineAngleRange: [0, 15]
        },
        exerciseType: 'deadlift',
        isEnabled: true,
        priority: 3
    },
    {
        id: 'deadlift_pull',
        phrase: 'Drive hips forward',
        trigger: {
            type: 'rep_phase',
            condition: 'ascent',
            hipAngleRange: [100, 140]
        },
        exerciseType: 'deadlift',
        isEnabled: true,
        priority: 4
    },
    {
        id: 'deadlift_lockout',
        phrase: 'Stand tall, squeeze glutes',
        trigger: {
            type: 'rep_phase',
            condition: 'top',
            hipAngleRange: [160, 180]
        },
        exerciseType: 'deadlift',
        isEnabled: true,
        priority: 3
    },

    // Form issue cues (all exercises)
    {
        id: 'spine_forward_lean',
        phrase: 'Keep your chest up',
        trigger: {
            type: 'form_issue',
            condition: 'forward_lean',
            spineAngleRange: [15, 45]
        },
        exerciseType: 'all',
        isEnabled: true,
        priority: 5
    },
    {
        id: 'poor_form_general',
        phrase: 'Check your form',
        trigger: {
            type: 'form_issue',
            condition: 'poor_form',
            formScoreThreshold: 60
        },
        exerciseType: 'all',
        isEnabled: true,
        priority: 4
    },

    // Motivational cues
    {
        id: 'rep_milestone_5',
        phrase: 'Great work! Five reps down',
        trigger: {
            type: 'rep_count',
            condition: 'rep_5'
        },
        exerciseType: 'all',
        isEnabled: true,
        priority: 2
    },
    {
        id: 'rep_milestone_10',
        phrase: 'Excellent! Ten solid reps',
        trigger: {
            type: 'rep_count',
            condition: 'rep_10'
        },
        exerciseType: 'all',
        isEnabled: true,
        priority: 2
    },
    {
        id: 'perfect_form',
        phrase: 'Perfect form! Keep it up',
        trigger: {
            type: 'form_issue',
            condition: 'excellent_form',
            formScoreThreshold: 95
        },
        exerciseType: 'all',
        isEnabled: true,
        priority: 1
    }
];

export class VoiceCoachService {
    private settings: VoiceSettings = DEFAULT_VOICE_SETTINGS;
    private cues: AudioCue[] = DEFAULT_CUES;
    private lastCueTime: Map<string, number> = new Map();
    private isInitialized: boolean = false;
    private availableVoices: Speech.Voice[] = [];

    constructor() {
        this.initializeService();
    }

    /**
     * Initialize the voice coaching service
     */
    private async initializeService(): Promise<void> {
        try {
            // Load saved settings
            await this.loadSettings();
            await this.loadCues();

            // Get available voices
            this.availableVoices = await Speech.getAvailableVoicesAsync();

            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize VoiceCoachService:', error);
        }
    }

    /**
     * Analyze current workout state and trigger appropriate cues
     */
    public async analyzeCueOpportunity(
        exerciseType: ExerciseType,
        repPhase: string,
        hipAngle: number,
        spineAngle: number,
        formScore: number,
        repCount: number,
        sessionDuration: number
    ): Promise<void> {
        if (!this.settings.isEnabled || !this.isInitialized) {
            return;
        }

        // Find matching cues
        const triggeredCues = this.cues.filter(cue =>
            this.shouldTriggerCue(cue, {
                exerciseType,
                repPhase,
                hipAngle,
                spineAngle,
                formScore,
                repCount,
                sessionDuration
            })
        );

        if (triggeredCues.length === 0) {
            return;
        }

        // Sort by priority (higher first) and select the most important
        const selectedCue = triggeredCues.sort((a, b) => b.priority - a.priority)[0];

        // Check cooldown period
        const lastTriggerTime = this.lastCueTime.get(selectedCue.id) || 0;
        const now = Date.now();

        if (now - lastTriggerTime < this.settings.cueCooldown) {
            return;
        }

        // Trigger the cue
        await this.speakCue(selectedCue);
        this.lastCueTime.set(selectedCue.id, now);
    }

    /**
     * Check if a cue should be triggered based on current conditions
     */
    private shouldTriggerCue(
        cue: AudioCue,
        conditions: {
            exerciseType: ExerciseType;
            repPhase: string;
            hipAngle: number;
            spineAngle: number;
            formScore: number;
            repCount: number;
            sessionDuration: number;
        }
    ): boolean {
        if (!cue.isEnabled) return false;

        // Check exercise type
        if (cue.exerciseType !== 'all' && cue.exerciseType !== conditions.exerciseType) {
            return false;
        }

        const { trigger } = cue;

        switch (trigger.type) {
            case 'rep_phase':
                return this.checkRepPhaseTrigger(trigger, conditions);

            case 'form_issue':
                return this.checkFormIssueTrigger(trigger, conditions);

            case 'rep_count':
                return this.checkRepCountTrigger(trigger, conditions);

            case 'time_interval':
                return this.checkTimeIntervalTrigger(trigger, conditions);

            default:
                return false;
        }
    }

    /**
     * Check rep phase trigger conditions
     */
    private checkRepPhaseTrigger(
        trigger: CueTrigger,
        conditions: any
    ): boolean {
        if (trigger.condition !== conditions.repPhase) {
            return false;
        }

        // Check angle ranges if specified
        if (trigger.hipAngleRange) {
            const [min, max] = trigger.hipAngleRange;
            if (conditions.hipAngle < min || conditions.hipAngle > max) {
                return false;
            }
        }

        if (trigger.spineAngleRange) {
            const [min, max] = trigger.spineAngleRange;
            if (conditions.spineAngle < min || conditions.spineAngle > max) {
                return false;
            }
        }

        return true;
    }

    /**
     * Check form issue trigger conditions
     */
    private checkFormIssueTrigger(
        trigger: CueTrigger,
        conditions: any
    ): boolean {
        switch (trigger.condition) {
            case 'forward_lean':
                return trigger.spineAngleRange &&
                    conditions.spineAngle >= trigger.spineAngleRange[0] &&
                    conditions.spineAngle <= trigger.spineAngleRange[1];

            case 'insufficient_depth':
                return trigger.hipAngleRange &&
                    conditions.hipAngle >= trigger.hipAngleRange[0] &&
                    conditions.hipAngle <= trigger.hipAngleRange[1] &&
                    conditions.repPhase === 'bottom';

            case 'poor_form':
                return trigger.formScoreThreshold &&
                    conditions.formScore < trigger.formScoreThreshold;

            case 'excellent_form':
                return trigger.formScoreThreshold &&
                    conditions.formScore >= trigger.formScoreThreshold;

            default:
                return false;
        }
    }

    /**
     * Check rep count trigger conditions
     */
    private checkRepCountTrigger(
        trigger: CueTrigger,
        conditions: any
    ): boolean {
        const targetRep = parseInt(trigger.condition.replace('rep_', ''));
        return conditions.repCount === targetRep;
    }

    /**
     * Check time interval trigger conditions
     */
    private checkTimeIntervalTrigger(
        trigger: CueTrigger,
        conditions: any
    ): boolean {
        const targetSeconds = parseInt(trigger.condition.replace('_seconds', ''));
        const sessionSeconds = Math.floor(conditions.sessionDuration / 1000);
        return sessionSeconds > 0 && sessionSeconds % targetSeconds === 0;
    }

    /**
     * Speak a cue using Text-to-Speech
     */
    private async speakCue(cue: AudioCue): Promise<void> {
        try {
            const options: Speech.SpeechOptions = {
                language: this.settings.language,
                pitch: this.settings.pitch,
                rate: this.settings.rate,
                volume: this.settings.volume,
            };

            // Use specific voice if available
            if (this.settings.voice !== 'default') {
                const voice = this.availableVoices.find(v => v.identifier === this.settings.voice);
                if (voice) {
                    options.voice = voice.identifier;
                }
            }

            await Speech.speak(cue.phrase, options);
        } catch (error) {
            console.error('Failed to speak cue:', error);
        }
    }

    /**
     * Update voice settings
     */
    public async updateSettings(newSettings: Partial<VoiceSettings>): Promise<void> {
        this.settings = { ...this.settings, ...newSettings };
        await this.saveSettings();
    }

    /**
     * Get current voice settings
     */
    public getSettings(): VoiceSettings {
        return { ...this.settings };
    }

    /**
     * Get available voices for the device
     */
    public getAvailableVoices(): Speech.Voice[] {
        return this.availableVoices;
    }

    /**
     * Add or update a custom cue
     */
    public async updateCue(cue: AudioCue): Promise<void> {
        const existingIndex = this.cues.findIndex(c => c.id === cue.id);

        if (existingIndex >= 0) {
            this.cues[existingIndex] = cue;
        } else {
            this.cues.push(cue);
        }

        await this.saveCues();
    }

    /**
     * Remove a custom cue
     */
    public async removeCue(cueId: string): Promise<void> {
        this.cues = this.cues.filter(c => c.id !== cueId);
        await this.saveCues();
    }

    /**
     * Get all cues for a specific exercise type
     */
    public getCues(exerciseType?: ExerciseType): AudioCue[] {
        if (!exerciseType) {
            return [...this.cues];
        }

        return this.cues.filter(c => c.exerciseType === exerciseType || c.exerciseType === 'all');
    }

    /**
     * Test a cue by speaking it immediately
     */
    public async testCue(cue: AudioCue): Promise<void> {
        await this.speakCue(cue);
    }

    /**
     * Stop any currently playing speech
     */
    public async stopSpeaking(): Promise<void> {
        await Speech.stop();
    }

    /**
     * Reset to default cues
     */
    public async resetToDefaults(): Promise<void> {
        this.cues = [...DEFAULT_CUES];
        this.settings = { ...DEFAULT_VOICE_SETTINGS };
        await this.saveCues();
        await this.saveSettings();
    }

    // Private storage methods
    private async loadSettings(): Promise<void> {
        try {
            const stored = await AsyncStorage.getItem('voice_settings');
            if (stored) {
                this.settings = { ...DEFAULT_VOICE_SETTINGS, ...JSON.parse(stored) };
            }
        } catch (error) {
            console.error('Failed to load voice settings:', error);
        }
    }

    private async saveSettings(): Promise<void> {
        try {
            await AsyncStorage.setItem('voice_settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Failed to save voice settings:', error);
        }
    }

    private async loadCues(): Promise<void> {
        try {
            const stored = await AsyncStorage.getItem('voice_cues');
            if (stored) {
                this.cues = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load voice cues:', error);
        }
    }

    private async saveCues(): Promise<void> {
        try {
            await AsyncStorage.setItem('voice_cues', JSON.stringify(this.cues));
        } catch (error) {
            console.error('Failed to save voice cues:', error);
        }
    }
} 