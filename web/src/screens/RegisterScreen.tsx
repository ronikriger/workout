import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
    Container,
    Box,
    TextField,
    Button,
    Typography,
    Paper,
    Alert,
    CircularProgress,
    Grid,
    CssBaseline
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import Avatar from '@mui/material/Avatar';

import AuthService from '../services/AuthService';
import { UserCreate } from '../types'; // Assuming types are updated

const theme = createTheme();

const RegisterScreen: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState<Omit<UserCreate, 'goals' | 'fitness_level'>>({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        if (formData.password.length < 8) {
            setError("Password must be at least 8 characters long.");
            setLoading(false);
            return;
        }

        try {
            await AuthService.register({
                ...formData,
                // Add default empty values for optional fields if needed by backend
                fitness_level: 'intermediate',
                goals: ['general_fitness']
            });
            setSuccess('Registration successful! Redirecting to login...');
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err: any) {
            const errorMsg = err.response?.data?.detail || 'Registration failed. Please try again.';
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ThemeProvider theme={theme}>
            <Container component="main" maxWidth="xs">
                <CssBaseline />
                <Paper
                    elevation={6}
                    sx={{
                        marginTop: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: 4,
                        borderRadius: 2
                    }}
                >
                    <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
                        <PersonAddAlt1Icon />
                    </Avatar>
                    <Typography component="h1" variant="h5">
                        Create Trainer Account
                    </Typography>
                    <Box component="form" onSubmit={handleRegister} noValidate sx={{ mt: 3 }}>
                        {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
                        {success && <Alert severity="success" sx={{ width: '100%', mb: 2 }}>{success}</Alert>}

                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    autoComplete="given-name"
                                    name="first_name"
                                    required
                                    fullWidth
                                    id="first_name"
                                    label="First Name"
                                    autoFocus
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    disabled={loading}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    required
                                    fullWidth
                                    id="last_name"
                                    label="Last Name"
                                    name="last_name"
                                    autoComplete="family-name"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    disabled={loading}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    required
                                    fullWidth
                                    id="email"
                                    label="Email Address"
                                    name="email"
                                    autoComplete="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    disabled={loading}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    required
                                    fullWidth
                                    name="password"
                                    label="Password"
                                    type="password"
                                    id="password"
                                    autoComplete="new-password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    disabled={loading}
                                    helperText="Password must be at least 8 characters long."
                                />
                            </Grid>
                        </Grid>
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}
                            disabled={loading || !!success}
                        >
                            {loading ? <CircularProgress size={24} /> : 'Sign Up'}
                        </Button>
                        <Box textAlign="center">
                            <RouterLink to="/login">
                                {"Already have an account? Sign In"}
                            </RouterLink>
                        </Box>
                    </Box>
                </Paper>
            </Container>
        </ThemeProvider>
    );
};

export default RegisterScreen; 