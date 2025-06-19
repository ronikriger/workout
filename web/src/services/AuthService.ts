import axios from 'axios';

const API_URL = '/api/v1/auth'; // Using proxy to redirect to backend

interface AuthResponse {
    access_token: string;
    token_type: string;
}

class AuthService {
    /**
     * Logs in a user.
     * @param {string} email - The user's email.
     * @param {string} password - The user's password.
     * @returns {Promise<AuthResponse>} - The authentication response with token.
     */
    async login(email, password) {
        const params = new URLSearchParams();
        params.append('username', email);
        params.append('password', password);

        const response = await axios.post<AuthResponse>(`${API_URL}/login`, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        if (response.data.access_token) {
            localStorage.setItem('user', JSON.stringify(response.data));
        }
        return response.data;
    }

    /**
     * Logs out the current user by removing token from local storage.
     */
    logout() {
        localStorage.removeItem('user');
    }

    /**
     * Registers a new user.
     * @param {object} userData - The user's registration data.
     * @returns {Promise<any>} - The newly created user's data.
     */
    async register(userData) {
        const response = await axios.post(`${API_URL}/register`, userData);
        return response.data;
    }

    /**
     * Gets the current user's auth token from local storage.
     * @returns {AuthResponse | null} - The stored user auth object.
     */
    getCurrentUser() {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            return JSON.parse(userStr);
        }
        return null;
    }

    /**
     * Gets the auth header for API requests.
     * @returns {object | null} - The authorization header.
     */
    getAuthHeader() {
        const user = this.getCurrentUser();
        if (user && user.access_token) {
            return { Authorization: `Bearer ${user.access_token}` };
        } else {
            return null;
        }
    }
}

export default new AuthService(); 