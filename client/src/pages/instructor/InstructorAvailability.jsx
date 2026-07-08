import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Stack, Chip, CircularProgress,
  Select, MenuItem, TextField, FormControl, InputLabel, IconButton,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, EventAvailable as AvailIcon } from '@mui/icons-material';
import { getMyAvailability, addAvailability, deleteAvailability } from '../../services/availabilityApi';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const formatTime = (time) => {
  if (!time) return time;
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

export default function InstructorAvailability() {
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ dayOfWeek: 'Monday', startTime: '08:00', endTime: '17:00' });
  const { toast, showToast, hideToast } = useToast();

  const fetchData = () => {
    setLoading(true);
    getMyAvailability()
      .then(setAvailability)
      .catch(() => showToast('Failed to load availability.', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async () => {
    if (form.startTime >= form.endTime) {
      showToast('Start time must be before end time.', 'error');
      return;
    }
    setSaving(true);
    try {
      await addAvailability(form);
      showToast('Availability added.', 'success');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Failed to add availability.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAvailability(id);
      showToast('Availability removed.', 'success');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Failed to remove availability.', 'error');
    }
  };

  const byDay = DAYS.map((day) => ({
    day,
    windows: availability.filter((a) => a.dayOfWeek === day),
  }));

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Toast toast={toast} onClose={hideToast} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <AvailIcon sx={{ color: '#1B2B5E' }} />
        <Typography variant="h4" fontWeight="800" sx={{ color: '#1e293b' }}>My Availability</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Declare the days/times you're available to teach. Timmy uses this to avoid recommending
        slots outside your declared windows — leave a day empty and it's treated as fully open.
      </Typography>

      <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid #e2e8f0', mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 2 }}>Add a window</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Day</InputLabel>
            <Select label="Day" value={form.dayOfWeek} onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: e.target.value }))}>
              {DAYS.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField
            size="small" label="Start" type="time" value={form.startTime}
            onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            size="small" label="End" type="time" value={form.endTime}
            onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
          <Button
            variant="contained" startIcon={<AddIcon />} disabled={saving} onClick={handleAdd}
            sx={{ bgcolor: '#1B2B5E', borderRadius: '10px', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#152150' } }}
          >
            Add
          </Button>
        </Stack>
      </Paper>

      <Stack spacing={2}>
        {byDay.map(({ day, windows }) => (
          <Paper key={day} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <Typography variant="body2" fontWeight="700" sx={{ mb: windows.length ? 1.5 : 0 }}>{day}</Typography>
            {windows.length === 0 ? (
              <Typography variant="caption" color="text.secondary">No declared windows — treated as fully open.</Typography>
            ) : (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {windows.map((w) => (
                  <Chip
                    key={w.id}
                    label={`${formatTime(w.startTime)} – ${formatTime(w.endTime)}`}
                    onDelete={() => handleDelete(w.id)}
                    deleteIcon={<DeleteIcon fontSize="small" />}
                    sx={{ bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 600 }}
                  />
                ))}
              </Stack>
            )}
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}
