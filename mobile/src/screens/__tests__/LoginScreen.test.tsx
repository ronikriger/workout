import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import LoginScreen from '../LoginScreen';

// Mock the AuthService
jest.mock('../../services/AuthService', () => ({
    login: jest.fn(),
}));

describe('LoginScreen', () => {
    const mockNavigation = {
        replace: jest.fn(),
        navigate: jest.fn(),
    };
    const mockOnAuthSuccess = jest.fn();

    it('renders correctly', () => {
        const { getByPlaceholderText, getByText } = render(
            <LoginScreen navigation={mockNavigation} onAuthSuccess={mockOnAuthSuccess} />
        );

        expect(getByPlaceholderText('Email Address')).toBeTruthy();
        expect(getByPlaceholderText('Password')).toBeTruthy();
        expect(getByText('Sign In')).toBeTruthy();
    });

    it('calls the login function when the login button is pressed', () => {
        const { getByText } = render(<LoginScreen navigation={mockNavigation} onAuthSuccess={mockOnAuthSuccess} />);

        fireEvent.press(getByText('Sign In'));
    });

    it('displays the correct title and subtitle', () => {
        const { getByText } = render(<LoginScreen navigation={mockNavigation} onAuthSuccess={mockOnAuthSuccess} />);

        expect(getByText('Welcome to RepRight')).toBeTruthy();
        expect(getByText('Sign in to continue')).toBeTruthy();
    });
});
