import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import WorkoutHistoryScreen from './src/screens/WorkoutHistoryScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import CameraScreen from './src/screens/CameraScreen';

// Create a new main dashboard screen
import MainDashboard from './src/screens/MainDashboard';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Main app tabs after authentication
const MainTabs = () => {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    if (route.name === 'Home') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Camera') {
                        iconName = focused ? 'camera' : 'camera-outline';
                    } else if (route.name === 'History') {
                        iconName = focused ? 'list' : 'list-outline';
                    } else if (route.name === 'Analytics') {
                        iconName = focused ? 'stats-chart' : 'stats-chart-outline';
                    } else if (route.name === 'Settings') {
                        iconName = focused ? 'settings' : 'settings-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#1e90ff',
                tabBarInactiveTintColor: '#8e8e93',
                tabBarStyle: {
                    backgroundColor: '#1c1c1e',
                    borderTopColor: '#333',
                    height: 90,
                    paddingBottom: 25,
                    paddingTop: 10,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                },
            })}
        >
            <Tab.Screen name="Home" component={MainDashboard} />
            <Tab.Screen name="Camera" component={CameraScreen} />
            <Tab.Screen name="History" component={WorkoutHistoryScreen} />
            <Tab.Screen name="Analytics" component={AnalyticsScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
    );
};

const App = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const initApp = async () => {
            // Clear any cached auth data to start fresh
            await AsyncStorage.removeItem('user');
            // Always start with login screen
            setIsAuthenticated(false);
            setIsLoading(false);
        };
        initApp();
    }, []);

    const handleAuthSuccess = () => {
        setIsAuthenticated(true);
    };

    if (isLoading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#1e90ff" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                }}
            >
                {isAuthenticated ? (
                    <Stack.Screen name="MainTabs" component={MainTabs} />
                ) : (
                    <>
                        <Stack.Screen name="Login">
                            {(props) => <LoginScreen {...props} onAuthSuccess={handleAuthSuccess} />}
                        </Stack.Screen>
                        <Stack.Screen name="Register">
                            {(props) => <RegisterScreen {...props} onAuthSuccess={handleAuthSuccess} />}
                        </Stack.Screen>
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

const styles = StyleSheet.create({
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#121212'
    }
})

export default App; 