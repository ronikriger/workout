import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { ThemeProvider, createTheme, styled } from '@mui/material/styles';
import {
    CssBaseline, Box, AppBar, Toolbar, Typography, Button, Container, Paper
} from '@mui/material';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import AuthService from './services/AuthService';

// Create theme
const theme = createTheme({
    palette: {
        primary: { main: '#1976d2' },
        secondary: { main: '#dc004e' },
        background: { default: '#f5f5f5' },
    },
});

// Create query client
const queryClient = new QueryClient();

// Auth hook
const useAuth = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const user = AuthService.getCurrentUser();
        setIsAuthenticated(!!(user && user.access_token));
        setLoading(false);
    }, []);

    const logout = () => {
        AuthService.logout();
        setIsAuthenticated(false);
        // Force redirect via window.location to ensure state is cleared
        window.location.href = '/login';
    };

    return { isAuthenticated, loading, logout };
};


const AuthenticatedApp = ({ logout }) => {
    return (
        <Box>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        RepRight
                    </Typography>
                    <Button color="inherit" onClick={logout}>Logout</Button>
                </Toolbar>
            </AppBar>
            <Container sx={{ mt: 4 }}>
                <Paper sx={{ p: 4 }}>
                    <Typography variant="h5" gutterBottom>Welcome!</Typography>
                    <Typography>
                        You are logged in. The user-facing web dashboard is coming soon. For now, please use the mobile application to track your workouts.
                    </Typography>
                </Paper>
            </Container>
        </Box>
    );
};

const UnauthenticatedApp = () => (
    <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
);


function App() {
    const { isAuthenticated, loading, logout } = useAuth();

    if (loading) {
        return <div>Loading...</div>; // Or a more sophisticated spinner
    }

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <Router>
                    {isAuthenticated ? <AuthenticatedApp logout={logout} /> : <UnauthenticatedApp />}
                </Router>
                <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} />
            </ThemeProvider>
        </QueryClientProvider>
    );
}

export default App; 