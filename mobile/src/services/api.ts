import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_BASE_URL = Constants.expoConfig?.extra?.ngrokUrl || (Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000');

const api = axios.create({
    baseURL: API_BASE_URL,
});

api.interceptors.request.use(
    async (config) => {
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            if (user?.access_token) {
                config.headers.Authorization = `Bearer ${user.access_token}`;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api; 