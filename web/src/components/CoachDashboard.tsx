/**
 * Main Coach Dashboard - Professional trainer interface
 * Features: Client roster, real-time alerts, progress analytics, session reviews
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
    Alert,
    LinearProgress,
    IconButton,
    Badge,
    Tooltip,
    Divider,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    TextField,
    InputAdornment,
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    People as PeopleIcon,
    VideoLibrary as VideoIcon,
    Warning as WarningIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    Notifications as NotificationsIcon,
    Search as SearchIcon,
    FilterList as FilterIcon,
    VideoCall as VideoCallIcon,
    Assignment as AssignmentIcon,
    Stars as StarsIcon,
    Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { format, parseISO, isToday, isThisWeek } from 'date-fns';

import {
    CoachDashboard as CoachDashboardType,
    ClientProgress,
    FormAlert,
    WorkoutSession,
    CoachStatistics,
    Notification
} from '../types';
import { useCoachData } from '../hooks/useCoachData';
import { ClientProgressCard } from './ClientProgressCard';
import { SessionReviewModal } from './SessionReviewModal';
import { FormAlertDialog } from './FormAlertDialog';

interface CoachDashboardProps {
    trainerId: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const CoachDashboard: React.FC<CoachDashboardProps> = ({ trainerId }) => {
    const [selectedTimeRange, setSelectedTimeRange] = useState<'week' | 'month' | 'quarter'>('week');
    const [clientFilter, setClientFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);
    const [selectedAlert, setSelectedAlert] = useState<FormAlert | null>(null);
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [showAlertDialog, setShowAlertDialog] = useState(false);

    const {
        dashboard,
        isLoading,
        error,
        refetch,
        markNotificationAsRead,
        resolveAlert,
        addClientFeedback
    } = useCoachData(trainerId, selectedTimeRange);

    useEffect(() => {
        // Real-time updates via WebSocket would be implemented here
        const interval = setInterval(() => {
            refetch();
        }, 30000); // Refresh every 30 seconds

        return () => clearInterval(interval);
    }, [refetch]);

    const filteredClients = dashboard?.clients.filter(clientProgress => {
        const matchesSearch = clientProgress.client.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            clientProgress.client.lastName.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFilter = clientFilter === 'all' ||
            (clientFilter === 'active' && isThisWeek(parseISO(clientProgress.lastActivity))) ||
            (clientFilter === 'needs_attention' && clientProgress.alerts.length > 0) ||
            (clientFilter === 'improving' && clientProgress.improvementRate > 0);

        return matchesSearch && matchesFilter;
    }) || [];

    const handleSessionReview = (session: WorkoutSession) => {
        setSelectedSession(session);
        setShowSessionModal(true);
    };

    const handleAlertClick = (alert: FormAlert) => {
        setSelectedAlert(alert);
        setShowAlertDialog(true);
    };

    const handleResolveAlert = async (alertId: string, resolution: string) => {
        await resolveAlert(alertId, resolution);
        setShowAlertDialog(false);
        refetch();
    };

    const renderStatisticsCards = () => {
        if (!dashboard?.statistics) return null;

        const stats = dashboard.statistics;

        return (
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Box>
                                    <Typography color="textSecondary" gutterBottom variant="h6">
                                        Total Clients
                                    </Typography>
                                    <Typography variant="h4">
                                        {stats.totalClients}
                                    </Typography>
                                    <Typography variant="body2" color="success.main">
                                        +{stats.newClientsThisMonth} this month
                                    </Typography>
                                </Box>
                                <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                                    <PeopleIcon />
                                </Avatar>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Box>
                                    <Typography color="textSecondary" gutterBottom variant="h6">
                                        Active Clients
                                    </Typography>
                                    <Typography variant="h4">
                                        {stats.activeClients}
                                    </Typography>
                                    <Typography variant="body2">
                                        {Math.round((stats.activeClients / stats.totalClients) * 100)}% active
                                    </Typography>
                                </Box>
                                <Avatar sx={{ bgcolor: 'success.main', width: 56, height: 56 }}>
                                    <TrendingUpIcon />
                                </Avatar>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Box>
                                    <Typography color="textSecondary" gutterBottom variant="h6">
                                        Avg Progress
                                    </Typography>
                                    <Typography variant="h4">
                                        {stats.averageClientProgress.toFixed(1)}%
                                    </Typography>
                                    <Typography variant="body2" color="info.main">
                                        Client improvement
                                    </Typography>
                                </Box>
                                <Avatar sx={{ bgcolor: 'info.main', width: 56, height: 56 }}>
                                    <TrendingUpIcon />
                                </Avatar>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Box>
                                    <Typography color="textSecondary" gutterBottom variant="h6">
                                        Satisfaction
                                    </Typography>
                                    <Typography variant="h4">
                                        {stats.clientSatisfactionRating.toFixed(1)}
                                    </Typography>
                                    <Box display="flex" alignItems="center">
                                        <StarsIcon color="warning" fontSize="small" />
                                        <Typography variant="body2" sx={{ ml: 0.5 }}>
                                            /5.0 rating
                                        </Typography>
                                    </Box>
                                </Box>
                                <Avatar sx={{ bgcolor: 'warning.main', width: 56, height: 56 }}>
                                    <StarsIcon />
                                </Avatar>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        );
    };

    const renderActiveAlerts = () => {
        const activeAlerts = dashboard?.formAlerts.filter(alert => !alert.isResolved) || [];

        if (activeAlerts.length === 0) {
            return (
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            🎉 No Active Alerts
                        </Typography>
                        <Typography color="textSecondary">
                            All your clients are maintaining good form! Great coaching!
                        </Typography>
                    </CardContent>
                </Card>
            );
        }

        return (
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        ⚠️ Form Alerts ({activeAlerts.length})
                    </Typography>
                    {activeAlerts.slice(0, 5).map((alert) => (
                        <Alert
                            key={alert.id}
                            severity={alert.severity === 'high' ? 'error' : alert.severity === 'medium' ? 'warning' : 'info'}
                            action={
                                <Button
                                    color="inherit"
                                    size="small"
                                    onClick={() => handleAlertClick(alert)}
                                >
                                    REVIEW
                                </Button>
                            }
                            sx={{ mb: 1 }}
                        >
                            <strong>{alert.alertType.replace('_', ' ').toUpperCase()}</strong>: {alert.description}
                        </Alert>
                    ))}
                    {activeAlerts.length > 5 && (
                        <Button variant="text" size="small">
                            View {activeAlerts.length - 5} more alerts
                        </Button>
                    )}
                </CardContent>
            </Card>
        );
    };

    const renderRecentSessions = () => {
        const recentSessions = dashboard?.recentWorkouts.slice(0, 10) || [];

        return (
            <Card>
                <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">
                            Recent Sessions
                        </Typography>
                        <Button startIcon={<VideoIcon />} variant="outlined" size="small">
                            View All
                        </Button>
                    </Box>

                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Client</TableCell>
                                    <TableCell>Exercise</TableCell>
                                    <TableCell>Form Score</TableCell>
                                    <TableCell>Reps</TableCell>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {recentSessions.map((session) => {
                                    const client = dashboard?.clients.find(c => c.client.id === session.userId)?.client;

                                    return (
                                        <TableRow key={session.id} hover>
                                            <TableCell>
                                                <Box display="flex" alignItems="center">
                                                    <Avatar sx={{ width: 32, height: 32, mr: 1 }}>
                                                        {client?.firstName[0]}{client?.lastName[0]}
                                                    </Avatar>
                                                    <Typography variant="body2">
                                                        {client?.firstName} {client?.lastName}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={session.exerciseType}
                                                    size="small"
                                                    color={session.exerciseType === 'squat' ? 'primary' : 'secondary'}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Box display="flex" alignItems="center">
                                                    <Typography
                                                        variant="body2"
                                                        color={session.averageFormScore >= 80 ? 'success.main' :
                                                            session.averageFormScore >= 60 ? 'warning.main' : 'error.main'}
                                                        fontWeight="bold"
                                                    >
                                                        {session.averageFormScore}%
                                                    </Typography>
                                                    {session.averageFormScore >= 90 && <StarsIcon color="warning" fontSize="small" sx={{ ml: 0.5 }} />}
                                                </Box>
                                            </TableCell>
                                            <TableCell>{session.reps.length}</TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {format(parseISO(session.createdAt), 'MMM dd, HH:mm')}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={session.isReviewed ? 'Reviewed' : 'Pending'}
                                                    size="small"
                                                    color={session.isReviewed ? 'success' : 'warning'}
                                                    variant={session.isReviewed ? 'filled' : 'outlined'}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Tooltip title="Review Session">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleSessionReview(session)}
                                                        color={session.isReviewed ? 'default' : 'primary'}
                                                    >
                                                        <VideoCallIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>
        );
    };

    const renderClientProgressChart = () => {
        // Aggregate progress data for all clients
        const progressData = dashboard?.clients.reduce((acc, clientProgress) => {
            clientProgress.progressTrend.forEach(point => {
                const existingPoint = acc.find(p => p.date === point.date);
                if (existingPoint) {
                    existingPoint.avgFormScore = (existingPoint.avgFormScore + point.formScore) / 2;
                    existingPoint.totalReps += point.reps;
                } else {
                    acc.push({
                        date: point.date,
                        avgFormScore: point.formScore,
                        totalReps: point.reps,
                        clients: 1
                    });
                }
            });
            return acc;
        }, [] as any[]) || [];

        return (
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Overall Client Progress
                    </Typography>
                    <Box height={300}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={progressData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis yAxisId="score" orientation="left" domain={[0, 100]} />
                                <YAxis yAxisId="reps" orientation="right" />
                                <RechartsTooltip />
                                <Line
                                    yAxisId="score"
                                    type="monotone"
                                    dataKey="avgFormScore"
                                    stroke="#8884d8"
                                    strokeWidth={2}
                                    name="Avg Form Score"
                                />
                                <Line
                                    yAxisId="reps"
                                    type="monotone"
                                    dataKey="totalReps"
                                    stroke="#82ca9d"
                                    strokeWidth={2}
                                    name="Total Reps"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </Box>
                </CardContent>
            </Card>
        );
    };

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <Typography>Loading coach dashboard...</Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error">
                Failed to load dashboard data: {error.message}
            </Alert>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" fontWeight="bold">
                    Coach Dashboard
                </Typography>
                <Box display="flex" gap={2}>
                    <FormControl size="small">
                        <InputLabel>Time Range</InputLabel>
                        <Select
                            value={selectedTimeRange}
                            onChange={(e) => setSelectedTimeRange(e.target.value as any)}
                            label="Time Range"
                        >
                            <MenuItem value="week">This Week</MenuItem>
                            <MenuItem value="month">This Month</MenuItem>
                            <MenuItem value="quarter">This Quarter</MenuItem>
                        </Select>
                    </FormControl>
                    <Badge badgeContent={dashboard?.notifications.filter(n => !n.isRead).length} color="error">
                        <IconButton>
                            <NotificationsIcon />
                        </IconButton>
                    </Badge>
                </Box>
            </Box>

            {/* Statistics Cards */}
            {renderStatisticsCards()}

            {/* Progress Chart */}
            {renderClientProgressChart()}

            {/* Active Alerts */}
            {renderActiveAlerts()}

            <Grid container spacing={3}>
                {/* Client Roster */}
                <Grid item xs={12} lg={8}>
                    <Card>
                        <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="h6">
                                    Client Roster ({filteredClients.length})
                                </Typography>
                                <Box display="flex" gap={2}>
                                    <TextField
                                        size="small"
                                        placeholder="Search clients..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <SearchIcon />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                    <FormControl size="small" sx={{ minWidth: 120 }}>
                                        <Select
                                            value={clientFilter}
                                            onChange={(e) => setClientFilter(e.target.value)}
                                            displayEmpty
                                        >
                                            <MenuItem value="all">All Clients</MenuItem>
                                            <MenuItem value="active">Active</MenuItem>
                                            <MenuItem value="needs_attention">Needs Attention</MenuItem>
                                            <MenuItem value="improving">Improving</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Box>
                            </Box>

                            <Grid container spacing={2}>
                                {filteredClients.map((clientProgress) => (
                                    <Grid item xs={12} md={6} key={clientProgress.client.id}>
                                        <ClientProgressCard
                                            clientProgress={clientProgress}
                                            onSessionReview={handleSessionReview}
                                        />
                                    </Grid>
                                ))}
                            </Grid>

                            {filteredClients.length === 0 && (
                                <Box textAlign="center" py={4}>
                                    <Typography color="textSecondary">
                                        No clients found matching your criteria
                                    </Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Recent Sessions */}
                <Grid item xs={12} lg={4}>
                    {renderRecentSessions()}
                </Grid>
            </Grid>

            {/* Modals */}
            {selectedSession && (
                <SessionReviewModal
                    open={showSessionModal}
                    session={selectedSession}
                    onClose={() => setShowSessionModal(false)}
                    onAddFeedback={addClientFeedback}
                />
            )}

            {selectedAlert && (
                <FormAlertDialog
                    open={showAlertDialog}
                    alert={selectedAlert}
                    onClose={() => setShowAlertDialog(false)}
                    onResolve={handleResolveAlert}
                />
            )}
        </Box>
    );
}; 