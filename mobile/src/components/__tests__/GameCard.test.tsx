import React from 'react';
import { render } from '@testing-library/react-native';
import GameCard from '../GameCard';

describe('GameCard', () => {
    it('renders correctly with given data', () => {
        const { getByText } = render(
            <GameCard
                title="Test Game"
                value="100"
                subtitle="This is a test subtitle."
                icon="🔥"
                color="#FFD700"
                onPress={() => { }}
            />
        );

        expect(getByText('Test Game')).toBeTruthy();
        expect(getByText('100')).toBeTruthy();
        expect(getByText('This is a test subtitle.')).toBeTruthy();
        expect(getByText('🔥')).toBeTruthy();
    });
}); 