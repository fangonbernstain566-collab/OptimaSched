import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Modal, TextField, MenuItem,
  Stack, CircularProgress, Alert
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = ['07:30', '09:00', '10:30', '12:00', '13:30', '15:00', '16:30'];

const INITIAL_FORM = {
  teacherId: '',
  roomId: '',
  sectionId: '',
  subjectOfferingId: '',
  dayOfWeek: 'Monday',
  startTime: '',
  endTime: '',
};

const Schedules = () => {
  const [schedules, setSchedules] = useState([]);
  const [options, setOptions] = useState({
    teachers: [],
    rooms: [],
    sections: [],
    subjectOfferings: [],
  });
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ─── Auth Helper ──────────────────────────────────────────────
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };

  // ─── Fetch Schedules + Options ────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const config = getAuthHeaders();

      const [resSched, resOpt] = await Promise.all([
        axios.get('/api/schedules', config),
        axios.get('/api/schedules/options', config),
      ]);

      // ✅ FIX: Normalize response — handles both { data: {...} } and {...} shapes
      const rawOpt = resOpt.data?.data ?? resOpt.data ?? {};

      console.log('[Schedules] Raw options payload:', rawOpt); // Debug log

      setSchedules(resSched.data?.data ?? resSched.data ?? []);

      setOptions({
        teachers:         Array.isArray(rawOpt.teachers)         ? rawOpt.teachers         : [],
        rooms:            Array.isArray(rawOpt.rooms)            ? rawOpt.rooms            : [],
        sections:         Array.isArray(rawOpt.sections)         ? rawOpt.sections         : [],
        subjectOfferings: Array.isArray(rawOpt.subjectOfferings) ? rawOpt.subjectOfferings : [],
      });

    } catch (err) {
      console.error('[Schedules] Fetch error:', err);
      const msg = err.response?.data?.message ?? 'Failed to load schedule data.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ─── Form Field Change Handler ─────────────────────────────────
  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  // ─── Save Schedule ─────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const config = getAuthHeaders();
      const response = await axios.post('/api/schedules', formData, config);
      alert(response.data.message ?? 'Schedule created successfully!');
      setOpen(false);
      setFormData(INITIAL_FORM);
      fetchData();
    } catch (err) {
      console.error('[Schedules] Save error:', err);
      const errorMessage = err.response?.data?.message ?? 'Failed to save schedule.';
      alert(errorMessage);
    }
  };

  // ─── Matrix Lookup ─────────────────────────────────────────────
  const getScheduleForSlot = (day, time) =>
    schedules.find((s) => s.dayOfWeek === day && s.startTime?.startsWith(time));

  // ─── Render ────────────────────────────────────────────────────
  return (
    <Box sx={{ p: 4, minHeight: '100vh', bgcolor: '#f8fafc', mt: -4, mx: -4 }}>
      <Box sx={{ maxWidth: '1200px', mx: 'auto' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" fontWeight="800" sx={{ color: '#1e293b' }}>
            Manage Schedules
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpen(true)}
            sx={{ bgcolor: '#2563eb', borderRadius: '12px', textTransform: 'none' }}
          >
            Add New Schedule
          </Button>
        </Box>

        {/* Error Banner */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          /* Matrix View */
          <Paper sx={{ p: 3, borderRadius: '16px', mb: 4, overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>Time</TableCell>
                  {DAYS.map((day) => (
                    <TableCell key={day} align="center" sx={{ fontWeight: 'bold' }}>
                      {day}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {TIME_SLOTS.map((time) => (
                  <TableRow key={time}>
                    <TableCell>{time}</TableCell>
                    {DAYS.map((day) => {
                      const match = getScheduleForSlot(day, time);
                      return (
                        <TableCell
                          key={day}
                          align="center"
                          sx={{ bgcolor: match ? '#eff6ff' : 'transparent' }}
                        >
                          {match ? (
                            <Typography variant="caption" fontWeight="700">
                              {match.subjectOffering?.subject?.name ?? 'Class'}
                            </Typography>
                          ) : '—'}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}

        {/* Entry Form Modal */}
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Box
            sx={{
              p: 4,
              bgcolor: 'background.paper',
              width: '100%',
              maxWidth: '460px',
              borderRadius: '20px',
            }}
          >
            <Typography variant="h6" fontWeight="800" sx={{ mb: 3 }}>
              Create New Schedule
            </Typography>

            <form onSubmit={handleSave}>
              <Stack spacing={2.5}>

                {/* Teacher */}
                <TextField
                  select
                  fullWidth
                  required
                  label="Teacher"
                  value={formData.teacherId}
                  onChange={handleChange('teacherId')}
                >
                  {options.teachers.length > 0
                    ? options.teachers.map((t) => (
                        <MenuItem key={t.id} value={t.id}>
                          {t.user
                            ? `${t.user.firstName} ${t.user.lastName}`
                            : 'Unnamed Teacher'}
                        </MenuItem>
                      ))
                    : <MenuItem disabled>No Teachers Available</MenuItem>}
                </TextField>

                {/* Room + Section */}
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    select
                    fullWidth
                    required
                    label="Room"
                    value={formData.roomId}
                    onChange={handleChange('roomId')}
                  >
                    {options.rooms.length > 0
                      ? options.rooms.map((r) => (
                          <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                        ))
                      : <MenuItem disabled>No Rooms Available</MenuItem>}
                  </TextField>

                  <TextField
                    select
                    fullWidth
                    required
                    label="Section"
                    value={formData.sectionId}
                    onChange={handleChange('sectionId')}
                  >
                    {options.sections.length > 0
                      ? options.sections.map((s) => (
                          <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                        ))
                      : <MenuItem disabled>No Sections Available</MenuItem>}
                  </TextField>
                </Box>

                {/* ✅ FIX: Subject Offering — was in formData but had NO UI field */}
                <TextField
                  select
                  fullWidth
                  required
                  label="Subject Offering"
                  value={formData.subjectOfferingId}
                  onChange={handleChange('subjectOfferingId')}
                >
                  {options.subjectOfferings.length > 0
                    ? options.subjectOfferings.map((so) => (
                        <MenuItem key={so.id} value={so.id}>
                          {so.subject?.name ?? so.name ?? `Offering #${so.id}`}
                        </MenuItem>
                      ))
                    : <MenuItem disabled>No Subject Offerings Available</MenuItem>}
                </TextField>

                {/* Day of Week */}
                <TextField
                  select
                  fullWidth
                  required
                  label="Day of Week"
                  value={formData.dayOfWeek}
                  onChange={handleChange('dayOfWeek')}
                >
                  {DAYS.map((day) => (
                    <MenuItem key={day} value={day}>{day}</MenuItem>
                  ))}
                </TextField>

                {/* Time Range */}
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    fullWidth
                    required
                    label="Start Time"
                    type="time"
                    InputLabelProps={{ shrink: true }}
                    value={formData.startTime}
                    onChange={handleChange('startTime')}
                  />
                  <TextField
                    fullWidth
                    required
                    label="End Time"
                    type="time"
                    InputLabelProps={{ shrink: true }}
                    value={formData.endTime}
                    onChange={handleChange('endTime')}
                  />
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  type="submit"
                  sx={{ py: 1.5, bgcolor: '#2563eb' }}
                >
                  Save Schedule
                </Button>
              </Stack>
            </form>
          </Box>
        </Modal>

      </Box>
    </Box>
  );
};

export default Schedules;