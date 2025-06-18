/**
 * Team Management - Advanced team features for coaches
 * Features: Team creation, leaderboards, challenges, group analytics
 */

import React, { useState, useEffect } from 'react';
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Avatar,
    Button,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    IconButton,
    Tooltip,
    LinearProgress,
    Badge,
    AvatarGroup,
    Tabs,
    Tab,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    ListItemAvatar,
    Divider,
    Alert,
    Switch,
    FormControlLabel,
} from '@mui/material';
import {
    Group as TeamIcon,
    EmojiEvents as TrophyIcon,
    TrendingUp as TrendingUpIcon,
    Assignment as ChallengeIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Leaderboard as LeaderboardIcon,
    Timeline as TimelineIcon,
    Star as StarIcon,
    Flag as FlagIcon,
    CheckCircle as CheckIcon,
    Schedule as ScheduleIcon,
    Person as PersonIcon,
    Notifications as NotificationIcon,
} from '@mui/icons-material';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

import { Team, Leaderboard, Client, TeamStats, Challenge } from '../types';

interface TeamManagementProps {
    trainerId: string;
    teams: Team[];
    leaderboards: Leaderboard[];
    onCreateTeam: (team: Partial<Team>) => void;
    onUpdateTeam: (teamId: string, updates: Partial<Team>) => void;
    onDeleteTeam: (teamId: string) => void;
    onCreateChallenge: (challenge: Partial<Challenge>) => void;
    onInviteToTeam: (teamId: string, emails: string[]) => void;
}

interface Challenge {
    id: string;
    title: string;
    description: string;
    type: 'individual' | 'team';
    metric: 'form_score' | 'total_reps' | 'consistency' | 'improvement';
    target: number;
    duration: number; // days
    startDate: string;
    endDate: string;
    status: 'draft' | 'active' | 'completed';
    participants: string[];
    progress: ChallengeProgress[];
    rewards: string[];
    createdBy: string;
}

interface ChallengeProgress {
    userId: string;
    currentValue: number;
    targetValue: number;
    isCompleted: boolean;
    completedAt?: string;
    rank?: number;
}

export const TeamManagement: React.FC<TeamManagementProps> = ({
    trainerId,
    teams,
    leaderboards,
    onCreateTeam,
    onUpdateTeam,
    onDeleteTeam,
    onCreateChallenge,
    onInviteToTeam
}) => {
    const [selectedTab, setSelectedTab] = useState(0);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [showCreateTeamDialog, setShowCreateTeamDialog] = useState(false);
    const [showCreateChallengeDialog, setShowCreateChallengeDialog] = useState(false);
    const [showInviteDialog, setShowInviteDialog] = useState(false);
    const [teamForm, setTeamForm] = useState({ name: '', description: '' });
    const [challengeForm, setChallengeForm] = useState({
        title: '',
        description: '',
        type: 'team' as 'individual' | 'team',
        metric: 'form_score' as any,
        target: 100,
        duration: 7
    });
    const [inviteEmails, setInviteEmails] = useState<string[]>(['']);
    const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');

    // Mock data for challenges
    const [challenges] = useState<Challenge[]>([
        {
            id: '1',
            title: '90% Form Week',
            description: 'Maintain 90%+ form score for 7 days',
            type: 'individual',
            metric: 'form_score',
            target: 90,
            duration: 7,
            startDate: '2024-01-01',
            endDate: '2024-01-08',
            status: 'active',
            participants: ['1', '2', '3'],
            progress: [
                { userId: '1', currentValue: 92, targetValue: 90, isCompleted: true, rank: 1 },
                { userId: '2', currentValue: 88, targetValue: 90, isCompleted: false, rank: 2 },
                { userId: '3', currentValue: 85, targetValue: 90, isCompleted: false, rank: 3 }
            ],
            rewards: ['Gold Badge', '10% discount'],
            createdBy: trainerId
        },
        {
            id: '2',
            title: 'Team Squat Challenge',
            description: 'Complete 1000 squats as a team',
            type: 'team',
            metric: 'total_reps',
            target: 1000,
            duration: 14,
            startDate: '2024-01-01',
            endDate: '2024-01-15',
            status: 'active',
            participants: ['team1'],
            progress: [
                { userId: 'team1', currentValue: 750, targetValue: 1000, isCompleted: false, rank: 1 }
            ],
            rewards: ['Team Trophy', 'Group Training Session'],
            createdBy: trainerId
        }
    ]);

    const handleCreateTeam = () => {
        if (teamForm.name.trim()) {
            onCreateTeam({
                name: teamForm.name,
                description: teamForm.description,
                trainerId,
                members: [],
                totalMembers: 0,
                isActive: true,
                stats: {
                    totalWorkouts: 0,
                    averageFormScore: 0,
                    totalReps: 0,
                    activeMembers: 0,
                    topPerformer: '',
                    weeklyGoalCompletion: 0
                }
            });
            setTeamForm({ name: '', description: '' });
            setShowCreateTeamDialog(false);
        }
    };

    const handleCreateChallenge = () => {
        if (challengeForm.title.trim()) {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + challengeForm.duration);

            onCreateChallenge({
                title: challengeForm.title,
                description: challengeForm.description,
                type: challengeForm.type,
                metric: challengeForm.metric,
                target: challengeForm.target,
                duration: challengeForm.duration,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                status: 'draft',
                participants: [],
                progress: [],
                rewards: [],
                createdBy: trainerId
            });
            setChallengeForm({
                title: '',
                description: '',
                type: 'team',
                metric: 'form_score',
                target: 100,
                duration: 7
            });
            setShowCreateChallengeDialog(false);
        }
    };

    const handleInviteMembers = () => {
        if (selectedTeam && inviteEmails.some(email => email.trim())) {
            const validEmails = inviteEmails.filter(email => email.trim());
            onInviteToTeam(selectedTeam.id, validEmails);
            setInviteEmails(['']);
            setShowInviteDialog(false);
        }
    };

    const addEmailField = () => {
        setInviteEmails([...inviteEmails, '']);
    };

    const updateEmailField = (index: number, value: string) => {
        const newEmails = [...inviteEmails];
        newEmails[index] = value;
        setInviteEmails(newEmails);
    };

    const removeEmailField = (index: number) => {
        setInviteEmails(inviteEmails.filter((_, i) => i !== index));
    };

    const renderTeamsOverview = () => (
        <Grid container spacing={3}>
            {/* Team Statistics */}
            <Grid item xs={12} md={8}>
                <Card>
                    <CardContent>
                        <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
                            <Typography variant="h6">Teams Overview</Typography>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => setShowCreateTeamDialog(true)}
                            >
                                Create Team
                            </Button>
                        </Box>

                        <Grid container spacing={2}>
                            {teams.map((team) => (
                                <Grid item xs={12} sm={6} md={4} key={team.id}>
                                    <Card variant="outlined" sx={{ cursor: 'pointer' }} onClick={() => setSelectedTeam(team)}>
                                        <CardContent>
                                            <Box display="flex" alignItems="center" mb={2}>
                                                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                                                    <TeamIcon />
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="h6">{team.name}</Typography>
                                                    <Typography variant="body2" color="textSecondary">
                                                        {team.totalMembers} members
                                                    </Typography>
                                                </Box>
                                            </Box>

                                            <Box mb={2}>
                                                <Typography variant="body2" gutterBottom>
                                                    Progress: {team.stats.weeklyGoalCompletion}%
                                                </Typography>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={team.stats.weeklyGoalCompletion}
                                                    sx={{ height: 8, borderRadius: 4 }}
                                                />
                                            </Box>

                                            <Grid container spacing={1}>
                                                <Grid item xs={6}>
                                                    <Typography variant="caption" color="textSecondary">
                                                        Avg Form
                                                    </Typography>
                                                    <Typography variant="h6" color="primary">
                                                        {team.stats.averageFormScore}%
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Typography variant="caption" color="textSecondary">
                                                        Total Reps
                                                    </Typography>
                                                    <Typography variant="h6" color="secondary">
                                                        {team.stats.totalReps}
                                                    </Typography>
                                                </Grid>
                                            </Grid>

                                            <Box mt={2}>
                                                <AvatarGroup max={4}>
                                                    {team.members.slice(0, 4).map((member) => (
                                                        <Avatar key={member.id} sx={{ width: 24, height: 24 }}>
                                                            {member.firstName[0]}
                                                        </Avatar>
                                                    ))}
                                                </AvatarGroup>
                                            </Box>

                                            <Box display="flex" justifyContent="flex-end" mt={2}>
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedTeam(team);
                                                        setShowInviteDialog(true);
                                                    }}
                                                >
                                                    <AddIcon />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Edit team logic
                                                    }}
                                                >
                                                    <EditIcon />
                                                </IconButton>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    </CardContent>
                </Card>
            </Grid>

            {/* Quick Stats */}
            <Grid item xs={12} md={4}>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    🏆 Top Performing Team
                                </Typography>
                                {teams.length > 0 && (
                                    <Box>
                                        <Typography variant="h5" color="primary">
                                            {teams[0]?.name}
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary">
                                            {teams[0]?.stats.averageFormScore}% avg form score
                                        </Typography>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    📈 Total Teams
                                </Typography>
                                <Typography variant="h3" color="primary">
                                    {teams.length}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    {teams.reduce((acc, team) => acc + team.totalMembers, 0)} total members
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    🎯 Active Challenges
                                </Typography>
                                <Typography variant="h3" color="secondary">
                                    {challenges.filter(c => c.status === 'active').length}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    challenges in progress
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    );

    const renderLeaderboards = () => (
        <Grid container spacing={3}>
            {leaderboards.map((leaderboard) => (
                <Grid item xs={12} md={6} key={leaderboard.id}>
                    <Card>
                        <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="h6">
                                    {leaderboard.name}
                                </Typography>
                                <Chip
                                    label={leaderboard.period}
                                    size="small"
                                    color="primary"
                                />
                            </Box>

                            <List dense>
                                {leaderboard.entries.slice(0, 10).map((entry, index) => (
                                    <ListItem key={entry.userId}>
                                        <ListItemIcon>
                                            <Box display="flex" alignItems="center" minWidth={40}>
                                                {index < 3 ? (
                                                    <TrophyIcon
                                                        style={{
                                                            color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'
                                                        }}
                                                    />
                                                ) : (
                                                    <Typography variant="body2" color="textSecondary">
                                                        #{entry.rank}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </ListItemIcon>

                                        <ListItemAvatar>
                                            <Avatar sx={{ width: 32, height: 32 }}>
                                                {entry.username[0]}
                                            </Avatar>
                                        </ListItemAvatar>

                                        <ListItemText
                                            primary={entry.username}
                                            secondary={entry.teamName}
                                        />

                                        <Box textAlign="right">
                                            <Typography variant="body2" fontWeight="bold">
                                                {entry.score}
                                                {leaderboard.metric === 'form_score' && '%'}
                                            </Typography>
                                            {entry.change !== 0 && (
                                                <Typography
                                                    variant="caption"
                                                    color={entry.change > 0 ? 'success.main' : 'error.main'}
                                                >
                                                    {entry.change > 0 ? '+' : ''}{entry.change}
                                                </Typography>
                                            )}
                                        </Box>
                                    </ListItem>
                                ))}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>
            ))}
        </Grid>
    );

    const renderChallenges = () => (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">Team Challenges</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setShowCreateChallengeDialog(true)}
                >
                    Create Challenge
                </Button>
            </Box>

            <Grid container spacing={3}>
                {challenges.map((challenge) => (
                    <Grid item xs={12} md={6} key={challenge.id}>
                        <Card>
                            <CardContent>
                                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                                    <Box>
                                        <Typography variant="h6">{challenge.title}</Typography>
                                        <Typography variant="body2" color="textSecondary" gutterBottom>
                                            {challenge.description}
                                        </Typography>
                                    </Box>
                                    <Chip
                                        label={challenge.status}
                                        color={challenge.status === 'active' ? 'success' : 'default'}
                                        size="small"
                                    />
                                </Box>

                                <Box display="flex" gap={1} mb={2}>
                                    <Chip
                                        label={challenge.type}
                                        size="small"
                                        variant="outlined"
                                    />
                                    <Chip
                                        label={challenge.metric.replace('_', ' ')}
                                        size="small"
                                        variant="outlined"
                                    />
                                </Box>

                                <Box mb={2}>
                                    <Typography variant="body2" gutterBottom>
                                        Progress: {Math.round((challenge.progress[0]?.currentValue / challenge.target) * 100)}%
                                    </Typography>
                                    <LinearProgress
                                        variant="determinate"
                                        value={Math.min(100, (challenge.progress[0]?.currentValue / challenge.target) * 100)}
                                        sx={{ height: 8, borderRadius: 4 }}
                                    />
                                </Box>

                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="textSecondary">
                                            Target
                                        </Typography>
                                        <Typography variant="body1" fontWeight="bold">
                                            {challenge.target}
                                            {challenge.metric === 'form_score' && '%'}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="textSecondary">
                                            Duration
                                        </Typography>
                                        <Typography variant="body1" fontWeight="bold">
                                            {challenge.duration} days
                                        </Typography>
                                    </Grid>
                                </Grid>

                                <Box mt={2}>
                                    <Typography variant="caption" color="textSecondary">
                                        Participants: {challenge.participants.length}
                                    </Typography>
                                </Box>

                                {challenge.rewards.length > 0 && (
                                    <Box mt={2}>
                                        <Typography variant="caption" color="textSecondary" gutterBottom>
                                            Rewards:
                                        </Typography>
                                        <Box display="flex" gap={0.5} flexWrap="wrap">
                                            {challenge.rewards.map((reward, index) => (
                                                <Chip
                                                    key={index}
                                                    label={reward}
                                                    size="small"
                                                    color="warning"
                                                    variant="outlined"
                                                />
                                            ))}
                                        </Box>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );

    const renderTeamAnalytics = () => {
        if (!selectedTeam) {
            return (
                <Alert severity="info">
                    Select a team to view detailed analytics
                </Alert>
            );
        }

        // Mock analytics data
        const analyticsData = [
            { date: '2024-01-01', formScore: 85, reps: 120, activeMembers: 8 },
            { date: '2024-01-02', formScore: 87, reps: 140, activeMembers: 9 },
            { date: '2024-01-03', formScore: 89, reps: 135, activeMembers: 10 },
            { date: '2024-01-04', formScore: 92, reps: 160, activeMembers: 8 },
            { date: '2024-01-05', formScore: 88, reps: 145, activeMembers: 9 },
        ];

        return (
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                {selectedTeam.name} - Performance Analytics
                            </Typography>

                            <Box height={300}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={analyticsData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis yAxisId="score" orientation="left" domain={[0, 100]} />
                                        <YAxis yAxisId="reps" orientation="right" />
                                        <RechartsTooltip />
                                        <Line
                                            yAxisId="score"
                                            type="monotone"
                                            dataKey="formScore"
                                            stroke="#8884d8"
                                            strokeWidth={2}
                                            name="Form Score"
                                        />
                                        <Line
                                            yAxisId="reps"
                                            type="monotone"
                                            dataKey="reps"
                                            stroke="#82ca9d"
                                            strokeWidth={2}
                                            name="Total Reps"
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Member Performance
                            </Typography>
                            <List>
                                {selectedTeam.members.map((member) => (
                                    <ListItem key={member.id}>
                                        <ListItemAvatar>
                                            <Avatar>{member.firstName[0]}</Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={`${member.firstName} ${member.lastName}`}
                                            secondary={`${member.stats.averageFormScore}% avg form`}
                                        />
                                        <Typography variant="body2" color="primary">
                                            {member.stats.totalReps} reps
                                        </Typography>
                                    </ListItem>
                                ))}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Team Goals
                            </Typography>
                            <Box mb={2}>
                                <Typography variant="body2" gutterBottom>
                                    Weekly Form Score Target: 85%
                                </Typography>
                                <LinearProgress
                                    variant="determinate"
                                    value={Math.min(100, (selectedTeam.stats.averageFormScore / 85) * 100)}
                                    sx={{ height: 8, borderRadius: 4 }}
                                />
                            </Box>
                            <Box mb={2}>
                                <Typography variant="body2" gutterBottom>
                                    Weekly Rep Target: 500
                                </Typography>
                                <LinearProgress
                                    variant="determinate"
                                    value={Math.min(100, (selectedTeam.stats.totalReps / 500) * 100)}
                                    sx={{ height: 8, borderRadius: 4 }}
                                />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        );
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Typography variant="h4" fontWeight="bold" gutterBottom>
                Team Management
            </Typography>

            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)}>
                    <Tab label="Teams" icon={<TeamIcon />} />
                    <Tab label="Leaderboards" icon={<LeaderboardIcon />} />
                    <Tab label="Challenges" icon={<ChallengeIcon />} />
                    <Tab label="Analytics" icon={<TimelineIcon />} />
                </Tabs>
            </Box>

            {/* Tab Content */}
            {selectedTab === 0 && renderTeamsOverview()}
            {selectedTab === 1 && renderLeaderboards()}
            {selectedTab === 2 && renderChallenges()}
            {selectedTab === 3 && renderTeamAnalytics()}

            {/* Create Team Dialog */}
            <Dialog open={showCreateTeamDialog} onClose={() => setShowCreateTeamDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Create New Team</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="Team Name"
                        value={teamForm.name}
                        onChange={(e) => setTeamForm(prev => ({ ...prev, name: e.target.value }))}
                        margin="normal"
                    />
                    <TextField
                        fullWidth
                        label="Description"
                        value={teamForm.description}
                        onChange={(e) => setTeamForm(prev => ({ ...prev, description: e.target.value }))}
                        margin="normal"
                        multiline
                        rows={3}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowCreateTeamDialog(false)}>Cancel</Button>
                    <Button onClick={handleCreateTeam} variant="contained">Create</Button>
                </DialogActions>
            </Dialog>

            {/* Create Challenge Dialog */}
            <Dialog open={showCreateChallengeDialog} onClose={() => setShowCreateChallengeDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Create New Challenge</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="Challenge Title"
                        value={challengeForm.title}
                        onChange={(e) => setChallengeForm(prev => ({ ...prev, title: e.target.value }))}
                        margin="normal"
                    />
                    <TextField
                        fullWidth
                        label="Description"
                        value={challengeForm.description}
                        onChange={(e) => setChallengeForm(prev => ({ ...prev, description: e.target.value }))}
                        margin="normal"
                        multiline
                        rows={2}
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Type</InputLabel>
                        <Select
                            value={challengeForm.type}
                            onChange={(e) => setChallengeForm(prev => ({ ...prev, type: e.target.value as any }))}
                        >
                            <MenuItem value="individual">Individual</MenuItem>
                            <MenuItem value="team">Team</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Metric</InputLabel>
                        <Select
                            value={challengeForm.metric}
                            onChange={(e) => setChallengeForm(prev => ({ ...prev, metric: e.target.value as any }))}
                        >
                            <MenuItem value="form_score">Form Score</MenuItem>
                            <MenuItem value="total_reps">Total Reps</MenuItem>
                            <MenuItem value="consistency">Consistency</MenuItem>
                            <MenuItem value="improvement">Improvement</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        label="Target Value"
                        type="number"
                        value={challengeForm.target}
                        onChange={(e) => setChallengeForm(prev => ({ ...prev, target: Number(e.target.value) }))}
                        margin="normal"
                    />
                    <TextField
                        fullWidth
                        label="Duration (days)"
                        type="number"
                        value={challengeForm.duration}
                        onChange={(e) => setChallengeForm(prev => ({ ...prev, duration: Number(e.target.value) }))}
                        margin="normal"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowCreateChallengeDialog(false)}>Cancel</Button>
                    <Button onClick={handleCreateChallenge} variant="contained">Create</Button>
                </DialogActions>
            </Dialog>

            {/* Invite Members Dialog */}
            <Dialog open={showInviteDialog} onClose={() => setShowInviteDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Invite Members to {selectedTeam?.name}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                        Enter email addresses to invite new members to your team
                    </Typography>
                    {inviteEmails.map((email, index) => (
                        <Box key={index} display="flex" gap={1} mb={1}>
                            <TextField
                                fullWidth
                                label={`Email ${index + 1}`}
                                type="email"
                                value={email}
                                onChange={(e) => updateEmailField(index, e.target.value)}
                            />
                            {index > 0 && (
                                <IconButton onClick={() => removeEmailField(index)}>
                                    <DeleteIcon />
                                </IconButton>
                            )}
                        </Box>
                    ))}
                    <Button
                        startIcon={<AddIcon />}
                        onClick={addEmailField}
                        sx={{ mt: 1 }}
                    >
                        Add Another Email
                    </Button>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowInviteDialog(false)}>Cancel</Button>
                    <Button onClick={handleInviteMembers} variant="contained">Send Invites</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}; 