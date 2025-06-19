import { FormAnalysisResult, FormFeedback } from './FormAnalysisEngine';
import { ExerciseRecognition } from './ExerciseRecognitionService';
import { RepData } from './RepCountingAlgorithm';
import { Audio } from 'expo-av';

// User experience levels for adaptive feedback
export type UserLevel = 'beginner' | 'intermediate' | 'advanced';

// Feedback priorities for coaching
export type FeedbackPriority = 'critical' | 'important' | 'suggestion' | 'encouragement';

// Feedback categories for organization
export type FeedbackCategory =
    | 'form_correction'
    | 'safety_warning'
    | 'encouragement'
    | 'rep_guidance'
    | 'breathing'
    | 'pace_adjustment'
    | 'range_of_motion'
    | 'motivation';

export interface CoachingFeedback {
    id: string;
    message: string;
    priority: FeedbackPriority;
    category: FeedbackCategory;
    timestamp: number;
    exerciseType: string;
    isAudioEnabled: boolean;
    visualCue?: VisualCue;
    duration: number; // How long to show the feedback
    confidence: number; // How confident we are in this feedback
}

export interface VisualCue {
    type: 'arrow' | 'highlight' | 'warning' | 'success' | 'target';
    position: { x: number; y: number };
    direction?: 'up' | 'down' | 'left' | 'right';
    color: string;
    size: number;
    animation?: 'pulse' | 'bounce' | 'shake' | 'glow';
}

interface UserProfile {
    level: UserLevel;
    workoutCount: number;
    strengths: string[];
    improvementAreas: string[];
    preferredFeedbackStyle: 'detailed' | 'concise' | 'encouraging';
    audioEnabled: boolean;
    language: string;
}

interface FeedbackTemplate {
    condition: (analysis: FormAnalysisResult, context: ExerciseContext) => boolean;
    message: (data: any) => string;
    priority: FeedbackPriority;
    category: FeedbackCategory;
    visualCue?: (data: any) => VisualCue;
    audioDelay?: number; // Delay before speaking
}

interface ExerciseContext {
    exerciseType: string;
    repCount: number;
    phase: string;
    duration: number;
    lastRep?: RepData;
    userLevel: UserLevel;
}

class RealTimeFeedbackService {
    private userProfile: UserProfile;
    private feedbackHistory: CoachingFeedback[] = [];
    private activeFeedback: CoachingFeedback[] = [];
    private lastFeedbackTime: { [key: string]: number } = {};
    private audioQueue: string[] = [];
    private isProcessingAudio = false;

    // Feedback templates for different exercises and situations
    private feedbackTemplates: { [key: string]: FeedbackTemplate[] } = {};

    // Timing controls to prevent spam
    private readonly MIN_FEEDBACK_INTERVAL = 2000; // 2 seconds
    private readonly MAX_ACTIVE_FEEDBACK = 2;
    private readonly FEEDBACK_COOLDOWN = 1000; // 1 second between similar feedback

    // Motivational phrases for different situations
    private motivationalPhrases = {
        good_form: [
            "Perfect form! 💪",
            "Excellent technique!",
            "That's exactly right!",
            "Beautiful movement!",
            "You're nailing it!",
            "Textbook execution!",
            "Outstanding form!"
        ],
        improvement: [
            "You're getting stronger with each rep!",
            "Great progress today!",
            "I can see you improving!",
            "Your form is getting better!",
            "Keep pushing - you've got this!",
            "Every rep counts!",
            "You're on fire today!"
        ],
        encouragement: [
            "Keep going, you're doing great!",
            "Push through - you've got this!",
            "Strong work!",
            "Don't give up now!",
            "You're stronger than you think!",
            "One more rep!",
            "Feel that strength building!"
        ],
        milestone: [
            "Awesome! 10 reps completed!",
            "Halfway there - keep it up!",
            "Great set! Take a breath.",
            "You crushed that set!",
            "New personal best!",
            "Look at you go!",
            "That's the spirit!"
        ]
    };

    constructor() {
        this.userProfile = {
            level: 'intermediate',
            workoutCount: 0,
            strengths: [],
            improvementAreas: [],
            preferredFeedbackStyle: 'encouraging',
            audioEnabled: true,
            language: 'en'
        };

        this.initializeFeedbackTemplates();
    }

    private initializeFeedbackTemplates(): void {
        this.feedbackTemplates = {
            squat: [
                // Critical form issues
                {
                    condition: (analysis, context) =>
                        analysis.componentScores.technique < 60 &&
                        analysis.riskFactors.some(risk => risk.includes('knee')),
                    message: (data) => "Watch your knees! Keep them aligned with your toes",
                    priority: 'critical',
                    category: 'safety_warning',
                    visualCue: (data) => ({
                        type: 'warning',
                        position: { x: 0.5, y: 0.6 },
                        color: '#FF6B6B',
                        size: 30,
                        animation: 'pulse'
                    })
                },
                {
                    condition: (analysis, context) =>
                        analysis.componentScores.technique < 70 &&
                        analysis.feedback.some(f => f.message.includes('back')),
                    message: (data) => "Keep your chest up and back straight! 📐",
                    priority: 'critical',
                    category: 'form_correction',
                    visualCue: (data) => ({
                        type: 'arrow',
                        position: { x: 0.5, y: 0.4 },
                        direction: 'up',
                        color: '#FFA500',
                        size: 25,
                        animation: 'bounce'
                    })
                },

                // Important improvements
                {
                    condition: (analysis, context) =>
                        analysis.componentScores.range < 75,
                    message: (data) => "Go a little deeper - aim for 90 degrees! 💪",
                    priority: 'important',
                    category: 'range_of_motion'
                },
                {
                    condition: (analysis, context) =>
                        analysis.componentScores.stability < 70,
                    message: (data) => "Engage your core for better stability! 🎯",
                    priority: 'important',
                    category: 'form_correction'
                },

                // Encouragement and suggestions
                {
                    condition: (analysis, context) =>
                        analysis.overallScore > 85 && context.repCount % 5 === 0,
                    message: (data) => this.getRandomPhrase('good_form'),
                    priority: 'encouragement',
                    category: 'encouragement'
                },
                {
                    condition: (analysis, context) =>
                        context.repCount > 0 && context.repCount % 10 === 0,
                    message: (data) => `${context.repCount} reps! ${this.getRandomPhrase('milestone')}`,
                    priority: 'encouragement',
                    category: 'motivation'
                }
            ],

            pushup: [
                {
                    condition: (analysis, context) =>
                        analysis.componentScores.technique < 65 &&
                        analysis.feedback.some(f => f.message.includes('elbow')),
                    message: (data) => "Keep elbows at 45-degree angle to your body! 📏",
                    priority: 'critical',
                    category: 'form_correction',
                    visualCue: (data) => ({
                        type: 'target',
                        position: { x: 0.7, y: 0.4 },
                        color: '#4ECDC4',
                        size: 20,
                        animation: 'glow'
                    })
                },
                {
                    condition: (analysis, context) =>
                        analysis.componentScores.stability < 70,
                    message: (data) => "Maintain a straight line from head to heels! ➡️",
                    priority: 'important',
                    category: 'form_correction'
                },
                {
                    condition: (analysis, context) =>
                        analysis.componentScores.range < 75,
                    message: (data) => "Lower your chest closer to the ground! ⬇️",
                    priority: 'important',
                    category: 'range_of_motion'
                },
                {
                    condition: (analysis, context) =>
                        analysis.overallScore > 80,
                    message: (data) => "Solid push-up form! Keep it up! 🔥",
                    priority: 'encouragement',
                    category: 'encouragement'
                }
            ],

            plank: [
                {
                    condition: (analysis, context) =>
                        analysis.componentScores.stability < 70,
                    message: (data) => "Keep your hips level - no sagging! 📏",
                    priority: 'critical',
                    category: 'form_correction'
                },
                {
                    condition: (analysis, context) =>
                        context.duration > 30000 && analysis.overallScore > 75,
                    message: (data) => `${Math.round(context.duration / 1000)}s hold! You're crushing it! 💪`,
                    priority: 'encouragement',
                    category: 'motivation'
                },
                {
                    condition: (analysis, context) =>
                        context.duration > 60000,
                    message: (data) => "1 minute plank! You're a champion! 🏆",
                    priority: 'encouragement',
                    category: 'milestone'
                }
            ],

            lunge: [
                {
                    condition: (analysis, context) =>
                        analysis.componentScores.technique < 70,
                    message: (data) => "Front knee over ankle, back knee drops down! 🎯",
                    priority: 'critical',
                    category: 'form_correction'
                },
                {
                    condition: (analysis, context) =>
                        analysis.componentScores.stability < 70,
                    message: (data) => "Keep your torso upright and core engaged! 📐",
                    priority: 'important',
                    category: 'form_correction'
                }
            ],

            jumping_jack: [
                {
                    condition: (analysis, context) =>
                        analysis.componentScores.technique > 80,
                    message: (data) => "Great coordination! Keep that energy up! ⚡",
                    priority: 'encouragement',
                    category: 'encouragement'
                },
                {
                    condition: (analysis, context) =>
                        context.repCount > 20,
                    message: (data) => "Cardio warrior! Your heart is getting stronger! ❤️",
                    priority: 'encouragement',
                    category: 'motivation'
                }
            ],

            // General feedback for all exercises
            general: [
                {
                    condition: (analysis, context) =>
                        context.repCount === 1,
                    message: (data) => "Let's go! Focus on your form! 🎯",
                    priority: 'encouragement',
                    category: 'motivation'
                },
                {
                    condition: (analysis, context) =>
                        analysis.overallScore < 50,
                    message: (data) => "Take your time - quality over quantity! 🐌",
                    priority: 'important',
                    category: 'pace_adjustment'
                },
                {
                    condition: (analysis, context) =>
                        context.phase === 'transition' && context.repCount > 5,
                    message: (data) => "Remember to breathe! Exhale on effort! 🫁",
                    priority: 'suggestion',
                    category: 'breathing'
                }
            ]
        };
    }

    public async generateFeedback(
        formAnalysis: FormAnalysisResult,
        exerciseContext: ExerciseContext,
        currentRepData?: RepData
    ): Promise<CoachingFeedback[]> {
        const now = Date.now();
        const newFeedback: CoachingFeedback[] = [];

        // Get exercise-specific and general templates
        const exerciseTemplates = this.feedbackTemplates[exerciseContext.exerciseType] || [];
        const generalTemplates = this.feedbackTemplates.general || [];
        const allTemplates = [...exerciseTemplates, ...generalTemplates];

        // Evaluate each template
        for (const template of allTemplates) {
            try {
                if (template.condition(formAnalysis, exerciseContext)) {
                    // Check if we've given this type of feedback recently
                    const feedbackKey = `${template.category}_${template.priority}`;
                    const lastTime = this.lastFeedbackTime[feedbackKey] || 0;

                    if (now - lastTime < this.MIN_FEEDBACK_INTERVAL) {
                        continue;
                    }

                    // Generate the feedback
                    const feedback: CoachingFeedback = {
                        id: `feedback_${now}_${Math.random().toString(36).substr(2, 9)}`,
                        message: template.message({ formAnalysis, exerciseContext, currentRepData }),
                        priority: template.priority,
                        category: template.category,
                        timestamp: now,
                        exerciseType: exerciseContext.exerciseType,
                        isAudioEnabled: this.userProfile.audioEnabled,
                        visualCue: template.visualCue?.({ formAnalysis, exerciseContext }),
                        duration: this.getFeedbackDuration(template.priority),
                        confidence: this.calculateFeedbackConfidence(formAnalysis, template)
                    };

                    newFeedback.push(feedback);
                    this.lastFeedbackTime[feedbackKey] = now;
                }
            } catch (error) {
                console.warn('Error evaluating feedback template:', error);
            }
        }

        // Prioritize and limit feedback
        const prioritizedFeedback = this.prioritizeFeedback(newFeedback);
        const limitedFeedback = prioritizedFeedback.slice(0, this.MAX_ACTIVE_FEEDBACK);

        // Add to active feedback and history
        this.activeFeedback.push(...limitedFeedback);
        this.feedbackHistory.push(...limitedFeedback);

        // Clean up old feedback
        this.cleanupFeedback();

        // Queue audio feedback
        for (const feedback of limitedFeedback) {
            if (feedback.isAudioEnabled && feedback.priority !== 'suggestion') {
                await this.queueAudioFeedback(feedback.message);
            }
        }

        return limitedFeedback;
    }

    private prioritizeFeedback(feedback: CoachingFeedback[]): CoachingFeedback[] {
        const priorityOrder = { 'critical': 0, 'important': 1, 'suggestion': 2, 'encouragement': 3 };

        return feedback.sort((a, b) => {
            // First sort by priority
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (priorityDiff !== 0) return priorityDiff;

            // Then by confidence
            return b.confidence - a.confidence;
        });
    }

    private getFeedbackDuration(priority: FeedbackPriority): number {
        switch (priority) {
            case 'critical': return 5000; // 5 seconds
            case 'important': return 4000; // 4 seconds
            case 'suggestion': return 3000; // 3 seconds
            case 'encouragement': return 2000; // 2 seconds
            default: return 3000;
        }
    }

    private calculateFeedbackConfidence(analysis: FormAnalysisResult, template: FeedbackTemplate): number {
        // Base confidence on analysis confidence and specificity
        let confidence = analysis.confidence * 0.01; // Convert percentage to decimal

        // Boost confidence for critical issues
        if (template.priority === 'critical') {
            confidence = Math.min(1.0, confidence * 1.2);
        }

        // Reduce confidence for encouragement (always okay to encourage)
        if (template.category === 'encouragement') {
            confidence = Math.max(0.8, confidence);
        }

        return confidence;
    }

    private cleanupFeedback(): void {
        const now = Date.now();

        // Remove expired feedback
        this.activeFeedback = this.activeFeedback.filter(
            feedback => now - feedback.timestamp < feedback.duration
        );

        // Keep only recent feedback history (last 50 items)
        if (this.feedbackHistory.length > 50) {
            this.feedbackHistory = this.feedbackHistory.slice(-50);
        }
    }

    private getRandomPhrase(category: keyof typeof this.motivationalPhrases): string {
        const phrases = this.motivationalPhrases[category];
        return phrases[Math.floor(Math.random() * phrases.length)];
    }

    private async queueAudioFeedback(message: string): Promise<void> {
        if (!this.userProfile.audioEnabled) return;

        // Clean message for TTS (remove emojis and special characters)
        const cleanMessage = message.replace(/[^\w\s!,.?-]/g, '').trim();

        this.audioQueue.push(cleanMessage);

        if (!this.isProcessingAudio) {
            this.processAudioQueue();
        }
    }

    private async processAudioQueue(): Promise<void> {
        if (this.audioQueue.length === 0) {
            this.isProcessingAudio = false;
            return;
        }

        this.isProcessingAudio = true;

        try {
            const message = this.audioQueue.shift();
            if (message) {
                await this.speakMessage(message);
            }
        } catch (error) {
            console.warn('TTS error:', error);
        }

        // Continue processing queue
        setTimeout(() => this.processAudioQueue(), 1000);
    }

    private async speakMessage(message: string): Promise<void> {
        try {
            // In a real app, you'd use Expo Speech or a TTS service
            // For demo, we'll just log the message
            console.log(`🎙️ Coach says: "${message}"`);

            // Simulate TTS delay
            await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (error) {
            console.warn('Speech synthesis error:', error);
        }
    }

    // Adaptive feedback based on user level
    private adaptFeedbackToUser(message: string, userLevel: UserLevel): string {
        switch (userLevel) {
            case 'beginner':
                // More detailed, patient explanations
                if (message.includes('Keep')) {
                    return message + ' Take your time to get it right!';
                }
                break;
            case 'advanced':
                // More concise, technical feedback
                return message.replace(/[!💪🎯📐⬇️➡️🔥]/g, '');
            case 'intermediate':
            default:
                return message;
        }
        return message;
    }

    // Public API methods
    public getActiveFeedback(): CoachingFeedback[] {
        this.cleanupFeedback();
        return [...this.activeFeedback];
    }

    public getFeedbackHistory(): CoachingFeedback[] {
        return [...this.feedbackHistory];
    }

    public setUserProfile(profile: Partial<UserProfile>): void {
        this.userProfile = { ...this.userProfile, ...profile };
    }

    public getUserProfile(): UserProfile {
        return { ...this.userProfile };
    }

    public clearFeedback(): void {
        this.activeFeedback = [];
        this.lastFeedbackTime = {};
    }

    public setAudioEnabled(enabled: boolean): void {
        this.userProfile.audioEnabled = enabled;
        if (!enabled) {
            this.audioQueue = [];
        }
    }

    public dismissFeedback(feedbackId: string): void {
        this.activeFeedback = this.activeFeedback.filter(f => f.id !== feedbackId);
    }

    // Performance analytics
    public getFeedbackStats(): {
        totalFeedback: number;
        criticalIssues: number;
        encouragements: number;
        averageConfidence: number;
    } {
        const total = this.feedbackHistory.length;
        const critical = this.feedbackHistory.filter(f => f.priority === 'critical').length;
        const encouragements = this.feedbackHistory.filter(f => f.category === 'encouragement').length;
        const avgConfidence = total > 0
            ? this.feedbackHistory.reduce((sum, f) => sum + f.confidence, 0) / total
            : 0;

        return {
            totalFeedback: total,
            criticalIssues: critical,
            encouragements,
            averageConfidence: Math.round(avgConfidence * 100)
        };
    }
}

export default new RealTimeFeedbackService(); 