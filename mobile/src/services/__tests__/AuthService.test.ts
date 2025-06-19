import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from '../AuthService';
import api from '../api'; // Import the original api

// Mock the entire api module
jest.mock('../api', () => ({
    post: jest.fn(),
}));

describe('AuthService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should login a user and store the token', async () => {
        const data = { access_token: 'test-token', token_type: 'bearer' };
        (api.post as jest.Mock).mockResolvedValue({ data });

        const params = new URLSearchParams();
        params.append('username', 'test@test.com');
        params.append('password', 'password');

        await AuthService.login('test@test.com', 'password');

        expect(api.post).toHaveBeenCalledWith(
            expect.stringContaining('/auth/login'),
            params,
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        expect(AsyncStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(data));
    });

    it('should register a user', async () => {
        const userData = { email: 'test@test.com', password: 'password', first_name: 'Test', last_name: 'User' };
        (api.post as jest.Mock).mockResolvedValue({ data: userData });

        await AuthService.register(userData);

        expect(api.post).toHaveBeenCalledWith(expect.stringContaining('/auth/register'), userData);
    });

    it('should store user data on successful login', async () => {
        const mockResponse = { data: { access_token: 'test_token' } };
        (api.post as jest.Mock).mockResolvedValue(mockResponse);

        const email = 'test@example.com';
        const password = 'password';
        const result = await AuthService.login(email, password);

        expect(api.post).toHaveBeenCalledWith('/auth/login', expect.any(URLSearchParams), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        expect(AsyncStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockResponse.data));
        expect(result).toEqual(mockResponse.data);
    });

    it('should throw an error on failed login', async () => {
        (api.post as jest.Mock).mockRejectedValue(new Error('Login failed'));
        await expect(AuthService.login('wrong@example.com', 'wrongpassword')).rejects.toThrow('Login failed');
    });

    it('should remove user data on logout', async () => {
        await AuthService.logout();
        expect(AsyncStorage.removeItem).toHaveBeenCalledWith('user');
    });
}); 