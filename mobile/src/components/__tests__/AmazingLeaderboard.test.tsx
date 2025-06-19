import React from 'react';
import { render } from '@testing-library/react-native';
import AmazingLeaderboard, { LeaderboardEntry } from '../AmazingLeaderboard';

describe('AmazingLeaderboard', () => {
    it('renders correctly with given data', () => {
        const data: LeaderboardEntry[] = [
            { userId: '1', username: 'John Doe', level: 1, xp: 100, streak: 5, formScore: 95, rank: 1, change: 0, isCurrentUser: true },
            { userId: '2', username: 'Jane Doe', level: 1, xp: 90, streak: 3, formScore: 92, rank: 2, change: 1 },
            { userId: '3', username: 'Peter Jones', level: 1, xp: 80, streak: 1, formScore: 90, rank: 3, change: -1 },
            { userId: '4', username: 'Mary Smith', level: 1, xp: 70, streak: 0, formScore: 88, rank: 4, change: 0 },
        ];

        const { getByText } = render(<AmazingLeaderboard data={data} type="xp" onTypeChange={() => { }} />);

        // Check podium users
        expect(getByText('John Doe')).toBeTruthy();
        expect(getByText('Jane Doe')).toBeTruthy();
        expect(getByText('Peter Jones')).toBeTruthy();

        // Check list user
        expect(getByText('Mary Smith')).toBeTruthy();

        // Check values
        expect(getByText('100 XP')).toBeTruthy();
        expect(getByText('90 XP')).toBeTruthy();
        expect(getByText('80 XP')).toBeTruthy();
        expect(getByText('70 XP')).toBeTruthy();
    });
}); 