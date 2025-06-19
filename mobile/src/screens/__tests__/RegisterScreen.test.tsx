import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import RegisterScreen from '../RegisterScreen';
import AuthService from '../../services/AuthService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('../../services/AuthService');
jest.mock('@react-native-async-storage/async-storage');

const mockNavigate = jest.fn();
const mockNavigation = {
    navigate: mockNavigate,
    replace: mockNavigate, // Use the same mock for replace
};

describe('RegisterScreen', () => {
    const mockOnAuthSuccess = jest.fn();

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    it('renders correctly', () => {
        const { getByPlaceholderText, getByText } = render(
            <RegisterScreen navigation={mockNavigation} onAuthSuccess={mockOnAuthSuccess} />
        );

        expect(getByText('Create Account')).toBeTruthy();
        expect(getByText('Join RepRight to start your fitness journey')).toBeTruthy();
        expect(getByPlaceholderText('First Name')).toBeTruthy();
        expect(getByPlaceholderText('Last Name')).toBeTruthy();
        expect(getByPlaceholderText('Email Address')).toBeTruthy();
        expect(getByPlaceholderText('Password (min. 8 characters)')).toBeTruthy();
        expect(getByText('Sign Up')).toBeTruthy();
    });

    it('shows validation error for short password', () => {
        const { getByPlaceholderText, getByText } = render(
            <RegisterScreen navigation={mockNavigation} onAuthSuccess={mockOnAuthSuccess} />
        );

        fireEvent.changeText(getByPlaceholderText('First Name'), 'John');
        fireEvent.changeText(getByPlaceholderText('Last Name'), 'Doe');
        fireEvent.changeText(getByPlaceholderText('Email Address'), 'john@example.com');
        fireEvent.changeText(getByPlaceholderText('Password (min. 8 characters)'), '123');

        fireEvent.press(getByText('Sign Up'));
    });

    it('navigates to login when "Sign In" link is pressed', () => {
        const { getByText } = render(
            <RegisterScreen navigation={mockNavigation} onAuthSuccess={mockOnAuthSuccess} />
        );

        fireEvent.press(getByText('Sign In'));
        expect(mockNavigation.navigate).toHaveBeenCalledWith('Login');
    });

    it('should register a user successfully and call onAuthSuccess callback', async () => {
        // Arrange
        const mockToken = { access_token: 'fake-token', token_type: 'bearer' };
        (AuthService.register as jest.Mock).mockResolvedValue(mockToken);

        const { getByPlaceholderText, getByText } = render(
            <RegisterScreen navigation={mockNavigation} onAuthSuccess={mockOnAuthSuccess} />
        );

        // Act
        fireEvent.changeText(getByPlaceholderText('First Name'), 'John');
        fireEvent.changeText(getByPlaceholderText('Last Name'), 'Doe');
        fireEvent.changeText(getByPlaceholderText('Email Address'), 'john.doe@example.com');
        fireEvent.changeText(getByPlaceholderText('Password (min. 8 characters)'), 'password123');
        fireEvent.press(getByText('Sign Up'));

        // Assert
        await waitFor(() => {
            // Check if registration was called
            expect(AuthService.register).toHaveBeenCalledTimes(1);
        });

        // We need a separate waitFor for the auth callback as it happens after the register promise resolves
        await waitFor(() => {
            // Check if the token was saved to AsyncStorage
            expect(AsyncStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockToken));
            // Check if auth success callback was called
            expect(mockOnAuthSuccess).toHaveBeenCalledTimes(1);
        });
    });

    it('should show an error alert if registration fails', async () => {
        // Arrange
        const errorMessage = 'Email already registered';
        (AuthService.register as jest.Mock).mockRejectedValue({
            response: { data: { detail: errorMessage } },
        });
        const mockAlert = jest.spyOn(require('react-native').Alert, 'alert');

        const { getByPlaceholderText, getByText } = render(
            <RegisterScreen navigation={mockNavigation} onAuthSuccess={mockOnAuthSuccess} />
        );

        // Act
        fireEvent.changeText(getByPlaceholderText('Email Address'), 'fail@example.com');
        fireEvent.changeText(getByPlaceholderText('Password (min. 8 characters)'), 'password123');
        fireEvent.changeText(getByPlaceholderText('First Name'), 'John');
        fireEvent.changeText(getByPlaceholderText('Last Name'), 'Doe');
        fireEvent.press(getByText('Sign Up'));

        // Assert
        await waitFor(() => {
            expect(AuthService.register).toHaveBeenCalledTimes(1);
            expect(AsyncStorage.setItem).not.toHaveBeenCalled();
            expect(mockOnAuthSuccess).not.toHaveBeenCalled();
            expect(mockAlert).toHaveBeenCalledWith('Registration Failed', errorMessage);
        });
    });
});
