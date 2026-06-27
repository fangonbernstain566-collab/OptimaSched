import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Container, Box, Paper, Typography, TextField, Button, Alert, CircularProgress 
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const loginSchema = z.object({
  email: z.string().email({ message: "Please supply a valid university email account." }),
  password: z.string().min(6, { message: "Security strings must contain at least 6 characters." }),
});

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors }, setError } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const mutation = useMutation({
    mutationFn: async (credentials) => {
      const response = await api.post('/auth/login', credentials);
      return response.data;
    },
    onSuccess: (data) => {
      login(data.user, data.token);
      navigate('/dashboard'); // Route safely to main content shell
    },
    onError: (error) => {
      const serverMessage = error.response?.data?.error || "Network sync authentication failure.";
      setError('root.serverError', { type: 'manual', message: serverMessage });
    }
  });

  const onSubmit = (data) => mutation.mutate(data);

  return (
    <Container component="main" maxWidth="xs">
      <Box sx={{ mt: 12, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Paper elevation={4} sx={{ p: 4, borderRadius: 3, width: '100%', bgcolor: 'background.paper' }}>
          <Typography component="h1" variant="h5" fontWeight="700" textAlign="center" gutterBottom color="primary">
            PCLU: OptimaSched
          </Typography>
          <Typography variant="body2" color="textSecondary" textAlign="center" sx={{ mb: 3 }}>
            University Scheduling & Resource Infrastructure
          </Typography>

          {errors.root?.serverError && (
            <Alert severity="error" sx={{ mb: 2 }}>{errors.root.serverError.message}</Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              label="University Email"
              autoComplete="email"
              autoFocus
              {...register('email')}
              error={!!errors.email}
              helperText={errors.email?.message}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Password Security Key"
              type="password"
              autoComplete="current-password"
              {...register('password')}
              error={!!errors.password}
              helperText={errors.password?.message}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={mutation.isLoading}
              sx={{ mt: 3, mb: 2, py: 1.2, fontWeight: 'bold' }}
            >
              {mutation.isLoading ? <CircularProgress size={24} color="inherit" /> : 'Sign In Engine'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}