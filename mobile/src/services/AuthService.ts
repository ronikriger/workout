// Simplified AuthService - no more complex logic
export default class AuthService {
    static async register(userData: any) {
        console.log('Registering with simplified data:', userData);
        // For now, just return a mock successful response
        return {
            access_token: 'mock_token_' + Date.now(),
            token_type: 'bearer'
        };
    }

    static async login(email: string, password: string) {
        console.log('Logging in with simplified auth');
        // For now, just return a mock successful response
        return {
            access_token: 'mock_token_' + Date.now(),
            token_type: 'bearer'
        };
    }
} 