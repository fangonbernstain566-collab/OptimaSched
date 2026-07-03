// client/src/pages/Login.jsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, Button,
  Alert, CircularProgress, InputAdornment, IconButton,
} from '@mui/material';
import {
  Visibility, VisibilityOff,
  CalendarMonth as CalendarIcon,
  ChevronRight,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// ─── Design tokens (from Figma theme.css) ────────────────────────────────────
const C = {
  primary:    '#1B2B5E',   // navy
  accent:     '#C49A3C',   // gold
  background: '#F2F0EB',   // warm beige
  card:       '#ffffff',
  secondary:  '#E8E4D9',
  muted:      '#6B6E7E',
  border:     'rgba(27, 43, 94, 0.12)',
};

// ─── Zod schema (unchanged from original Login.jsx) ───────────────────────────
const loginSchema = z.object({
  email:    z.string().email({ message: 'Please supply a valid university email account.' }),
  password: z.string().min(6,  { message: 'Security strings must contain at least 6 characters.' }),
});

// ─── Static data ──────────────────────────────────────────────────────────────
const FEATURES = [
  'Real-time room & faculty availability',
  'Conflict detection & resolution',
  'Exportable class schedule reports',
];

// Role toggle is cosmetic only — backend determines role from the DB
const ROLES = ['faculty', 'admin', 'registrar'];

// ─── Shared MUI TextField sx override ────────────────────────────────────────
const inputSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor:      C.card,
    borderRadius: '6px',
    fontSize:     '0.875rem',
    '& fieldset':             { borderColor: C.border },
    '&:hover fieldset':       { borderColor: C.accent },
    '&.Mui-focused fieldset': { borderColor: C.accent, borderWidth: '1.5px' },
    '& input::placeholder':   { color: C.muted, opacity: 1 },
  },
  '& .MuiFormHelperText-root': { fontSize: '0.75rem' },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function Login() {
  const { login }             = useAuth();
  const navigate              = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [role,    setRole]    = useState('admin');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm({ resolver: zodResolver(loginSchema) });

  // ─── Auth mutation (same api.js interceptor pattern as the rest of the app) ─
  const mutation = useMutation({
    mutationFn: async (credentials) => {
      const response = await api.post('/auth/login', credentials);
      return response.data;
    },
    onSuccess: (data) => {
      login(data.user, data.token);  // saves to localStorage under 'optimasched_token'
      navigate('/dashboard');
    },
    onError: (error) => {
      const msg = error.response?.data?.error ?? 'Network sync authentication failure.';
      setError('root.serverError', { type: 'manual', message: msg });
    },
  });

  const onSubmit = (data) => mutation.mutate(data);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Box
      sx={{
        minHeight:  '100vh',
        width:      '100%',
        display:    'flex',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        bgcolor:    C.background,
      }}
    >

      {/* ── Left Panel: Brand (desktop only) ──────────────────────────────── */}
      <Box
        sx={{
          display:       { xs: 'none', lg: 'flex' },
          flexDirection: 'column',
          position:      'relative',
          width:         '52%',
          bgcolor:       C.primary,
          overflow:      'hidden',
        }}
      >
        {/* Geometric grid */}
        <Box
          component="svg"
          xmlns="http://www.w3.org/2000/svg"
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06 }}
        >
          <defs>
            <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </Box>

        {/* Bottom-right accent arc */}
        <Box
          component="svg"
          sx={{ position: 'absolute', bottom: -96, right: -96, opacity: 0.1 }}
          width="480" height="480" viewBox="0 0 480 480"
        >
          <circle cx="240" cy="240" r="200" fill="none" stroke={C.accent} strokeWidth="60" />
        </Box>

        {/* Top-left accent arc */}
        <Box
          component="svg"
          sx={{ position: 'absolute', top: -80, left: -80, opacity: 0.1 }}
          width="320" height="320" viewBox="0 0 320 320"
        >
          <circle cx="160" cy="160" r="120" fill="none" stroke={C.accent} strokeWidth="40" />
        </Box>

        {/* Panel content */}
        <Box
          sx={{
            position:      'relative',
            zIndex:        10,
            display:       'flex',
            flexDirection: 'column',
            height:        '100%',
            px:            7,
            py:            6,
          }}
        >
          {/* Logo mark */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 'auto' }}>
            <Box
              sx={{
                width: 40, height: 40, borderRadius: '4px',
                bgcolor: C.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <image href="/logo.svg" width="20" height="20" />
            </Box>
            <Box>
              <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                PCLU
              </Typography>
              <Typography sx={{ color: '#fff', fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.2 }}>
                OptimaSched
              </Typography>
            </Box>
          </Box>

          {/* Headline */}
          <Box sx={{ mb: 'auto' }}>
            <Typography
              component="h1"
              sx={{
                color:         '#fff',
                mb:            3,
                fontFamily:    "'Fraunces', serif",
                fontSize:      'clamp(2.4rem, 4vw, 3.2rem)',
                fontWeight:    300,
                letterSpacing: '-0.01em',
                lineHeight:    1.1,
              }}
            >
              Scheduling,<br />
              <em style={{ fontStyle: 'italic', fontWeight: 300 }}>simplified.</em>
            </Typography>

            <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', lineHeight: 1.75, maxWidth: 300, fontWeight: 300 }}>
              The official scheduling system of Polytechnic College of La Union.
              Manage classes, rooms, and faculty assignments in one place.
            </Typography>

            {/* Feature pills */}
            <Box sx={{ mt: 5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {FEATURES.map((f) => (
                <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <ChevronRight sx={{ fontSize: 14, color: C.accent, flexShrink: 0 }} />
                  <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', letterSpacing: '0.02em' }}>
                    {f}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Academic year footer */}
          <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', pt: 3 }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.688rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Academic Year 2026-2027
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ── Right Panel: Login Form ────────────────────────────────────────── */}
      <Box
        sx={{
          flex:           1,
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          bgcolor:        C.background,
          px:             3,
          py:             6,
        }}
      >
        {/* Mobile-only logo */}
        <Box sx={{ display: { xs: 'flex', lg: 'none' }, alignItems: 'center', gap: 1, mb: 5 }}>
          <Box sx={{ width: 32, height: 32, borderRadius: '4px', bgcolor: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarIcon sx={{ color: '#fff', fontSize: 16 }} />
          </Box>
          <Box>
            <Typography sx={{ color: C.primary, fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase' }}>PCLU</Typography>
            <Typography sx={{ color: C.primary, fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.2 }}>OptimaSched</Typography>
          </Box>
        </Box>

        <Box sx={{ width: '100%', maxWidth: 400 }}>

          {/* Heading */}
          <Box sx={{ mb: 4.5 }}>
            <Typography
              component="h2"
              sx={{
                color:         C.primary,
                mb:            1,
                fontFamily:    "'Fraunces', serif",
                fontSize:      '1.85rem',
                fontWeight:    400,
                letterSpacing: '-0.02em',
                lineHeight:    1.2,
              }}
            >
              Sign in to your account
            </Typography>
            <Typography sx={{ color: C.muted, fontSize: '0.875rem' }}>
              Access your schedule, room, and assignment data.
            </Typography>
          </Box>

          {/* Role toggle — cosmetic UI, does not change auth behaviour */}
          <Box
            sx={{
              display:      'flex',
              mb:           3.5,
              border:       `1px solid ${C.border}`,
              borderRadius: '6px',
              overflow:     'hidden',
              bgcolor:      C.secondary,
            }}
          >
            {ROLES.map((r) => (
              <Box
                key={r}
                component="button"
                type="button"
                onClick={() => setRole(r)}
                sx={{
                  flex:          1,
                  py:            1,
                  border:        'none',
                  cursor:        'pointer',
                  fontSize:      '0.7rem',
                  fontWeight:    600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  transition:    'all 0.2s',
                  bgcolor:       role === r ? C.primary : 'transparent',
                  color:         role === r ? '#fff' : C.muted,
                  '&:hover':     { color: role === r ? '#fff' : C.primary },
                }}
              >
                {r}
              </Box>
            ))}
          </Box>

          {/* Server-side error */}
          {errors.root?.serverError && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: '6px', fontSize: '0.875rem' }}>
              {errors.root.serverError.message}
            </Alert>
          )}

          {/* Form */}
          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
          >
            {/* Email */}
            <Box>
              <Typography sx={{ color: C.primary, fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', mb: 0.75 }}>
                Institutional Email
              </Typography>
              <TextField
                fullWidth
                type="email"
                placeholder="admin@pclu.edu.ph"
                {...register('email')}
                error={!!errors.email}
                helperText={errors.email?.message}
                sx={inputSx}
              />
            </Box>

            {/* Password */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                <Typography sx={{ color: C.primary, fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  Password
                </Typography>
                <Typography
                  component="a"
                  href="#"
                  sx={{ fontSize: '0.75rem', color: C.accent, fontWeight: 500, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                >
                  Forgot password?
                </Typography>
              </Box>
              <TextField
                fullWidth
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('password')}
                error={!!errors.password}
                helperText={errors.password?.message}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        tabIndex={-1}
                        onClick={() => setShowPwd((p) => !p)}
                        edge="end"
                        size="small"
                        sx={{ color: C.muted, '&:hover': { color: C.primary } }}
                      >
                        {showPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={inputSx}
              />
            </Box>

            {/* Remember me */}
            <Box component="label" sx={{ display: 'flex', alignItems: 'center', gap: 1.25, cursor: 'pointer' }}>
              <Box component="input" type="checkbox" sx={{ width: 16, height: 16, accentColor: C.primary, cursor: 'pointer' }} />
              <Typography sx={{ color: C.muted, fontSize: '0.875rem', transition: 'color 0.2s', '&:hover': { color: C.primary } }}>
                Keep me signed in
              </Typography>
            </Box>

            {/* Submit */}
            <Button
              type="submit"
              fullWidth
              disabled={mutation.isPending}
              sx={{
                mt:           0.5,
                py:           1.5,
                bgcolor:      C.primary,
                color:        '#fff',
                fontSize:     '0.875rem',
                fontWeight:   600,
                letterSpacing:'0.04em',
                borderRadius: '6px',
                textTransform:'none',
                '&:hover':    { bgcolor: `${C.primary}cc` },
                '&:active':   { transform: 'scale(0.99)' },
                '&.Mui-disabled': { opacity: 0.7, color: '#fff !important', bgcolor: `${C.primary} !important` },
              }}
            >
              {mutation.isPending ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} sx={{ color: '#fff' }} />
                  Signing in…
                </Box>
              ) : 'Sign In'}
            </Button>
          </Box>

          {/* Support link */}
          <Typography sx={{ mt: 4, textAlign: 'center', fontSize: '0.688rem', color: C.muted }}>
            Having trouble signing in?{' '}
            <Box component="a" href="#" sx={{ color: C.accent, fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
              Contact IT Support
            </Box>
          </Typography>
        </Box>

        {/* Copyright */}
        <Box sx={{ mt: 6, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '0.688rem', color: C.muted, letterSpacing: '0.03em' }}>
            © 2026 Polytechnic College of La Union · All rights reserved
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}