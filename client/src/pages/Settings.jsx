import React, { useState, useEffect } from 'react';
import {
  Box, Card, Typography, Divider, FormControl, InputLabel, Select, MenuItem,
  Switch, FormControlLabel, TextField, Button, Stack, Snackbar, Alert,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { updateProfile } from '../services/settingsApi';

const LANDING_PAGE_OPTIONS = [
  { value: '/dashboard', label: 'Dashboard View' },
  { value: '/schedules', label: 'Manage Schedules' },
  { value: '/schedules/plotter', label: 'Schedule Plotter' },
  { value: '/teachers', label: 'Manage Teachers' },
  { value: '/rooms', label: 'Manage Rooms' },
  { value: '/audit-logs', label: 'Audit Logs' },
  { value: '/my-schedules', label: 'My Schedules' },
];

function Section({ title, children }) {
  return (
    <Card sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>{title}</Typography>
      <Divider sx={{ mb: 2.5 }} />
      <Stack spacing={2.5}>{children}</Stack>
    </Card>
  );
}

export default function Settings() {
  const { user, updateUser } = useAuth();
  const { settings, updateSettings, loading } = useSettings();
  const [profile, setProfile] = useState({ firstName: '', lastName: '', email: '' });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (user) {
      setProfile({ firstName: user.firstName ?? '', lastName: user.lastName ?? '', email: user.email ?? '' });
    }
  }, [user]);

  const handleSettingChange = async (patch) => {
    try {
      await updateSettings(patch);
      setToast({ severity: 'success', message: 'Settings saved.' });
    } catch {
      setToast({ severity: 'error', message: 'Failed to save settings.' });
    }
  };

  const handleProfileSave = async () => {
    try {
      const updated = await updateProfile(profile);
      updateUser(updated);
      setToast({ severity: 'success', message: 'Profile updated.' });
    } catch (err) {
      setToast({ severity: 'error', message: err?.response?.data?.message || 'Failed to update profile.' });
    }
  };

  return (
    <Box sx={{ maxWidth: 720 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>Settings</Typography>

      <Section title="Accessibility">
        <FormControl fullWidth size="small">
          <InputLabel>Theme</InputLabel>
          <Select
            label="Theme"
            value={settings?.themeMode ?? 'LIGHT'}
            disabled={loading}
            onChange={(e) => handleSettingChange({ themeMode: e.target.value })}
          >
            <MenuItem value="LIGHT">Light</MenuItem>
            <MenuItem value="DARK">Dark</MenuItem>
            <MenuItem value="SYSTEM">Match system</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel>Font size</InputLabel>
          <Select
            label="Font size"
            value={settings?.fontSize ?? 'MEDIUM'}
            disabled={loading}
            onChange={(e) => handleSettingChange({ fontSize: e.target.value })}
          >
            <MenuItem value="SMALL">Small</MenuItem>
            <MenuItem value="MEDIUM">Medium</MenuItem>
            <MenuItem value="LARGE">Large</MenuItem>
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Switch
              checked={!!settings?.highContrast}
              disabled={loading}
              onChange={(e) => handleSettingChange({ highContrast: e.target.checked })}
            />
          }
          label="High contrast mode"
        />

        <FormControlLabel
          control={
            <Switch
              checked={!!settings?.reducedMotion}
              disabled={loading}
              onChange={(e) => handleSettingChange({ reducedMotion: e.target.checked })}
            />
          }
          label="Reduce motion"
        />
      </Section>

      <Section title="General">
        <FormControlLabel
          control={
            <Switch
              checked={!!settings?.emailNotifications}
              disabled={loading}
              onChange={(e) => handleSettingChange({ emailNotifications: e.target.checked })}
            />
          }
          label="Email notifications"
        />

        <FormControlLabel
          control={
            <Switch
              checked={!!settings?.inAppNotifications}
              disabled={loading}
              onChange={(e) => handleSettingChange({ inAppNotifications: e.target.checked })}
            />
          }
          label="In-app notifications"
        />

        <FormControl fullWidth size="small">
          <InputLabel>Default landing page</InputLabel>
          <Select
            label="Default landing page"
            value={settings?.defaultLandingPage ?? '/dashboard'}
            disabled={loading}
            onChange={(e) => handleSettingChange({ defaultLandingPage: e.target.value })}
          >
            {LANDING_PAGE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Section>

      <Section title="Profile">
        <TextField
          label="First name"
          size="small"
          value={profile.firstName}
          onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
        />
        <TextField
          label="Last name"
          size="small"
          value={profile.lastName}
          onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
        />
        <TextField
          label="Email"
          size="small"
          type="email"
          value={profile.email}
          onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
        />
        <Box>
          <Button variant="contained" onClick={handleProfileSave}>Save profile</Button>
        </Box>
      </Section>

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {toast && <Alert severity={toast.severity} onClose={() => setToast(null)}>{toast.message}</Alert>}
      </Snackbar>
    </Box>
  );
}
