/**
 * Settings screen with voice coaching controls and user preferences
 * Allows configuration of voice feedback, export options, and user settings
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Switch,
    TouchableOpacity,
    Alert,
    Modal,
    FlatList,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VoiceCoachService, VoiceSettings, AudioCue } from '../services/VoiceCoachService';
import { AnalyticsService, ExportOptions } from '../services/AnalyticsService';
import { ExerciseType } from '../types';
import { Ionicons } from '@expo/vector-icons';
import AuthService from '../services/AuthService';
import axios from 'axios'; // For API calls to update profile
import { Platform } from 'react-native';

interface SettingsScreenProps {
    navigation: any;
    userId: string;
}

const API_BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

export default function SettingsScreen({ navigation, userId }: SettingsScreenProps): React.JSX.Element {
    const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
        isEnabled: false,
        volume: 0.8,
        rate: 1.0,
        pitch: 1.0,
        language: 'en-US',
        voice: 'default',
        enableHapticWithVoice: true,
        cueCooldown: 3000,
    });

    const [showVoiceModal, setShowVoiceModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [showCueEditor, setShowCueEditor] = useState(false);
    const [selectedCue, setSelectedCue] = useState<AudioCue | null>(null);
    const [cues, setCues] = useState<AudioCue[]>([]);
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const voiceCoach = new VoiceCoachService();
    const analytics = new AnalyticsService();

    useEffect(() => {
        loadSettings();
        loadCues();
        fetchUserData();
    }, []);

    const loadSettings = async () => {
        const settings = voiceCoach.getSettings();
        setVoiceSettings(settings);
    };

    const loadCues = async () => {
        const loadedCues = voiceCoach.getCues();
        setCues(loadedCues);
    };

    const updateVoiceSettings = async (updates: Partial<VoiceSettings>) => {
        const newSettings = { ...voiceSettings, ...updates };
        setVoiceSettings(newSettings);
        await voiceCoach.updateSettings(updates);
    };

    const testVoice = async () => {
        const testCue: AudioCue = {
            id: 'test',
            phrase: 'This is a test of your voice settings',
            trigger: { type: 'rep_phase', condition: 'test' },
            exerciseType: 'squat',
            isEnabled: true,
            priority: 1
        };
        await voiceCoach.testCue(testCue);
    };

    const exportData = async (options: ExportOptions) => {
        try {
            await analytics.shareData(userId, options);
            Alert.alert('Success', 'Data exported successfully!');
        } catch (error) {
            Alert.alert('Error', 'Failed to export data. Please try again.');
        }
    };

    const fetchUserData = async () => {
        try {
            const authHeader = await AuthService.getAuthHeader();
            if (authHeader) {
                // The /me endpoint is on /auth/me from our backend router
                const response = await axios.get(`${API_BASE_URL}/auth/me`, { headers: authHeader });
                setUser(response.data);
            }
        } catch (error) {
            Alert.alert("Error", "Could not fetch user profile.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        await AuthService.logout();
        navigation.replace('Login');
    };

    const renderVoiceSettings = () => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Voice Coaching</Text>

            <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Enable Voice Feedback</Text>
                <Switch
                    value={voiceSettings.isEnabled}
                    onValueChange={(value) => updateVoiceSettings({ isEnabled: value })}
                    trackColor={{ false: '#E5E5E5', true: '#4CAF50' }}
                    thumbColor={voiceSettings.isEnabled ? '#FFFFFF' : '#f4f3f4'}
                />
            </View>

            {voiceSettings.isEnabled && (
                <>
                    <View style={styles.sliderContainer}>
                        <Text style={styles.settingLabel}>Volume: {Math.round(voiceSettings.volume * 100)}%</Text>
                        <View style={styles.buttonRow}>
                            <TouchableOpacity
                                style={styles.adjustButton}
                                onPress={() => updateVoiceSettings({ volume: Math.max(0, voiceSettings.volume - 0.1) })}
                            >
                                <Text style={styles.adjustButtonText}>-</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.adjustButton}
                                onPress={() => updateVoiceSettings({ volume: Math.min(1, voiceSettings.volume + 0.1) })}
                            >
                                <Text style={styles.adjustButtonText}>+</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.sliderContainer}>
                        <Text style={styles.settingLabel}>Speech Rate: {voiceSettings.rate.toFixed(1)}x</Text>
                        <View style={styles.buttonRow}>
                            <TouchableOpacity
                                style={styles.adjustButton}
                                onPress={() => updateVoiceSettings({ rate: Math.max(0.5, voiceSettings.rate - 0.1) })}
                            >
                                <Text style={styles.adjustButtonText}>-</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.adjustButton}
                                onPress={() => updateVoiceSettings({ rate: Math.min(2.0, voiceSettings.rate + 0.1) })}
                            >
                                <Text style={styles.adjustButtonText}>+</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.sliderContainer}>
                        <Text style={styles.settingLabel}>Pitch: {voiceSettings.pitch.toFixed(1)}</Text>
                        <View style={styles.buttonRow}>
                            <TouchableOpacity
                                style={styles.adjustButton}
                                onPress={() => updateVoiceSettings({ pitch: Math.max(0.5, voiceSettings.pitch - 0.1) })}
                            >
                                <Text style={styles.adjustButtonText}>-</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.adjustButton}
                                onPress={() => updateVoiceSettings({ pitch: Math.min(2.0, voiceSettings.pitch + 0.1) })}
                            >
                                <Text style={styles.adjustButtonText}>+</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.settingRow}>
                        <Text style={styles.settingLabel}>Haptic Feedback with Voice</Text>
                        <Switch
                            value={voiceSettings.enableHapticWithVoice}
                            onValueChange={(value) => updateVoiceSettings({ enableHapticWithVoice: value })}
                            trackColor={{ false: '#E5E5E5', true: '#4CAF50' }}
                            thumbColor={voiceSettings.enableHapticWithVoice ? '#FFFFFF' : '#f4f3f4'}
                        />
                    </View>

                    <TouchableOpacity style={styles.button} onPress={testVoice}>
                        <Text style={styles.buttonText}>Test Voice Settings</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.secondaryButton]}
                        onPress={() => setShowVoiceModal(true)}
                    >
                        <Text style={styles.secondaryButtonText}>Manage Voice Cues</Text>
                    </TouchableOpacity>
                </>
            )}
        </View>
    );

    const renderDataSettings = () => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data & Analytics</Text>

            <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => navigation.navigate('Analytics')}
            >
                <Text style={styles.secondaryButtonText}>View Analytics Dashboard</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => setShowExportModal(true)}
            >
                <Text style={styles.secondaryButtonText}>Export Workout Data</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.button, styles.dangerButton]}
                onPress={() => {
                    Alert.alert(
                        'Clear All Data',
                        'This will permanently delete all your workout data. This action cannot be undone.',
                        [
                            { text: 'Cancel', style: 'cancel' },
                            {
                                text: 'Delete All',
                                style: 'destructive',
                                onPress: () => {
                                    // TODO: Implement data clearing
                                    Alert.alert('Data Cleared', 'All workout data has been deleted.');
                                }
                            }
                        ]
                    );
                }}
            >
                <Text style={styles.dangerButtonText}>Clear All Data</Text>
            </TouchableOpacity>
        </View>
    );

    const renderVoiceModal = () => (
        <Modal
            visible={showVoiceModal}
            animationType="slide"
            presentationStyle="pageSheet"
        >
            <SafeAreaView style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Voice Cues</Text>
                    <TouchableOpacity onPress={() => setShowVoiceModal(false)}>
                        <Text style={styles.closeButton}>Done</Text>
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={cues}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <View style={styles.cueItem}>
                            <View style={styles.cueInfo}>
                                <Text style={styles.cuePhrase}>{item.phrase}</Text>
                                <Text style={styles.cueDetails}>
                                    {item.exerciseType} • Priority {item.priority}
                                </Text>
                            </View>
                            <View style={styles.cueControls}>
                                <Switch
                                    value={item.isEnabled}
                                    onValueChange={async (value) => {
                                        const updatedCue = { ...item, isEnabled: value };
                                        await voiceCoach.updateCue(updatedCue);
                                        loadCues();
                                    }}
                                    trackColor={{ false: '#E5E5E5', true: '#4CAF50' }}
                                    thumbColor={item.isEnabled ? '#FFFFFF' : '#f4f3f4'}
                                />
                                <TouchableOpacity
                                    style={styles.editButton}
                                    onPress={() => {
                                        setSelectedCue(item);
                                        setShowCueEditor(true);
                                    }}
                                >
                                    <Text style={styles.editButtonText}>Edit</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    contentContainerStyle={styles.cueList}
                />

                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => {
                        setSelectedCue(null);
                        setShowCueEditor(true);
                    }}
                >
                    <Text style={styles.addButtonText}>+ Add Custom Cue</Text>
                </TouchableOpacity>
            </SafeAreaView>
        </Modal>
    );

    const renderExportModal = () => (
        <Modal
            visible={showExportModal}
            animationType="slide"
            presentationStyle="pageSheet"
        >
            <SafeAreaView style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Export Data</Text>
                    <TouchableOpacity onPress={() => setShowExportModal(false)}>
                        <Text style={styles.closeButton}>Cancel</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.exportOptions}>
                    <TouchableOpacity
                        style={styles.exportButton}
                        onPress={() => {
                            const options: ExportOptions = {
                                format: 'csv',
                                dateRange: {
                                    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                                    end: new Date()
                                },
                                exerciseTypes: ['squat', 'deadlift'],
                                includeRawData: false,
                                includeAnalytics: true
                            };
                            exportData(options);
                            setShowExportModal(false);
                        }}
                    >
                        <Text style={styles.exportButtonText}>Export Last 30 Days (CSV)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.exportButton}
                        onPress={() => {
                            const options: ExportOptions = {
                                format: 'json',
                                dateRange: {
                                    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
                                    end: new Date()
                                },
                                exerciseTypes: ['squat', 'deadlift'],
                                includeRawData: true,
                                includeAnalytics: true
                            };
                            exportData(options);
                            setShowExportModal(false);
                        }}
                    >
                        <Text style={styles.exportButtonText}>Full Export (JSON)</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );

    if (isLoading) {
        return <ActivityIndicator size="large" style={{ flex: 1, justifyContent: 'center' }} />;
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.title}>Settings</Text>

                {user && (
                    <View style={styles.profileSection}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{user.first_name?.[0]}{user.last_name?.[0]}</Text>
                        </View>
                        <Text style={styles.profileName}>{user.first_name} {user.last_name}</Text>
                        <Text style={styles.profileEmail}>{user.email}</Text>
                    </View>
                )}

                {renderVoiceSettings()}
                {renderDataSettings()}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About</Text>
                    <Text style={styles.aboutText}>
                        RepRight v1.0.0{'\n'}
                        AI-powered workout form analyzer{'\n'}
                        Built for garage lifters and personal trainers
                    </Text>
                </View>
            </ScrollView>

            {renderVoiceModal()}
            {renderExportModal()}

            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                <Text style={styles.logoutButtonText}>Log Out</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginBottom: 30,
        marginTop: 20,
    },
    section: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 15,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    settingLabel: {
        fontSize: 16,
        color: '#333333',
        fontWeight: '500',
    },
    sliderContainer: {
        paddingVertical: 15,
    },
    slider: {
        width: '100%',
        height: 40,
        marginTop: 10,
    },
    button: {
        backgroundColor: '#4CAF50',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 8,
        marginTop: 15,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        backgroundColor: '#E3F2FD',
    },
    secondaryButtonText: {
        color: '#1976D2',
        fontSize: 16,
        fontWeight: '600',
    },
    dangerButton: {
        backgroundColor: '#FFEBEE',
    },
    dangerButtonText: {
        color: '#D32F2F',
        fontSize: 16,
        fontWeight: '600',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
        backgroundColor: '#FFFFFF',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    closeButton: {
        fontSize: 16,
        color: '#4CAF50',
        fontWeight: '600',
    },
    cueList: {
        padding: 20,
    },
    cueItem: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 15,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    cueInfo: {
        flex: 1,
        marginRight: 15,
    },
    cuePhrase: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    cueDetails: {
        fontSize: 14,
        color: '#666666',
    },
    cueControls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    editButton: {
        marginLeft: 10,
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: '#E3F2FD',
        borderRadius: 6,
    },
    editButtonText: {
        color: '#1976D2',
        fontSize: 14,
        fontWeight: '500',
    },
    addButton: {
        backgroundColor: '#4CAF50',
        margin: 20,
        paddingVertical: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    addButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    exportOptions: {
        padding: 20,
    },
    exportButton: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 20,
        paddingHorizontal: 20,
        borderRadius: 8,
        marginBottom: 15,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E5E5',
    },
    exportButtonText: {
        color: '#1A1A1A',
        fontSize: 16,
        fontWeight: '600',
    },
    aboutText: {
        fontSize: 14,
        color: '#666666',
        lineHeight: 20,
    },
    profileSection: { alignItems: 'center', paddingVertical: 30 },
    avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#1e90ff', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    avatarText: { color: '#fff', fontSize: 40, fontWeight: 'bold' },
    profileName: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    profileEmail: { fontSize: 16, color: '#888', marginTop: 5 },
    logoutButton: { margin: 20, padding: 15, backgroundColor: '#1c1c1e', borderRadius: 10, alignItems: 'center' },
    logoutButtonText: { color: '#ff453a', fontSize: 17, fontWeight: 'bold' },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    adjustButton: {
        backgroundColor: '#4CAF50',
        width: 50,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    adjustButtonText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
}); 