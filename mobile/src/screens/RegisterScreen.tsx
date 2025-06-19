import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import AuthService from '../services/AuthService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RegisterScreen = ({ navigation, onAuthSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in email and password.');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters long.');
            return;
        }

        setLoading(true);
        try {
            const response = await AuthService.register({
                email,
                password,
                first_name: firstName,
                last_name: lastName,
            });

            if (response.access_token) {
                await AsyncStorage.setItem('user', JSON.stringify(response));
                Alert.alert('Success', 'Registration successful!');
                if (onAuthSuccess) {
                    onAuthSuccess();
                }
            }
        } catch (error) {
            console.log('Registration error:', error);
            Alert.alert('Registration Failed', 'Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.inner}>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Join RepRight to start your fitness journey</Text>

                <TextInput
                    style={styles.input}
                    placeholder="First Name"
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholderTextColor="#888"
                />
                <TextInput
                    style={styles.input}
                    placeholder="Last Name"
                    value={lastName}
                    onChangeText={setLastName}
                    placeholderTextColor="#888"
                />
                <TextInput
                    style={styles.input}
                    placeholder="Email Address"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor="#888"
                />
                <TextInput
                    style={styles.input}
                    placeholder="Password (min. 6 characters)"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholderTextColor="#888"
                />

                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleRegister}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Sign Up</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.linkText}>
                        Already have an account? <Text style={styles.link}>Sign In</Text>
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    inner: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#aaa',
        marginBottom: 32,
        textAlign: 'center',
    },
    input: {
        width: '100%',
        height: 50,
        backgroundColor: '#333',
        borderRadius: 8,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#fff',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#444',
    },
    button: {
        width: '100%',
        height: 50,
        backgroundColor: '#1e90ff',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        marginTop: 8,
    },
    buttonDisabled: {
        backgroundColor: '#555',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    linkText: {
        marginTop: 24,
        color: '#aaa',
        fontSize: 14,
    },
    link: {
        color: '#1e90ff',
        fontWeight: 'bold',
    },
});

export default RegisterScreen; 