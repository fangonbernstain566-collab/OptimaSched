import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Typography, Paper, Tab, Tabs, CircularProgress, Button, Modal, Stack,
  TextField, Select, MenuItem, Divider, Card, CardContent, Chip, Alert, IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = ['07:30', '09:00', '10:30', '12:00', '13:30', '15:00', '16:30'];

export default function InstructorSchedules() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();

  const [schedules, setSchedules] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [loading, setLoading] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [formData, setFormData] = useState({
    subjectName: '',
    room: '',
    studentCount: '',
    notes: '',
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('optimasched_token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const config = getAuthHeaders();
      const [resSched, resRooms] = await Promise.all([
        axios.get('/api/schedules', config),
        axios.get('/api/rooms', config),
      ]);

      setSchedules(resSched.data?.data ?? []);
      setRooms(resRooms.data?.data ?? []);
    } catch (err) {
      console.error('Failed to load data:', err);
      showToast('Failed to load schedule data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isSlotOccupied = (day, timeSlot) => {
    return schedules.some(
      (s) =>
        s.dayOfWeek === day &&
        s.startTime === timeSlot &&
        s.status !== 'PENDING'
    );
  };

  const handleSlotClick = (day, timeSlot) => {
    if (isSlotOccupied(day, timeSlot)) {
      showToast('This slot is already occupied.', 'error');
      return;
    }
    setSelectedSlot({ day, timeSlot });
    setRequestOpen(true);
  };

  const handleSubmitRequest = async () => {
    if (!formData.subjectName || !formData.studentCount) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    try {
      const endTime = addMinutes(selectedSlot.timeSlot, 90);
      const requests = JSON.parse(localStorage.getItem('schedule_requests') || '[]');
      const newRequest = {
        id: Date.now(),
        subject: formData.subjectName,
        dayOfWeek: selectedSlot.day,
        startTime: selectedSlot.timeSlot,
        endTime,
        room: formData.room,
        studentCount: parseInt(formData.studentCount),
        notes: formData.notes,
        status: 'PENDING',
        submittedAt: new Date().toISOString(),
      };
      requests.push(newRequest);
      localStorage.setItem('schedule_requests', JSON.stringify(requests));

      showToast('Schedule request submitted successfully!', 'success');
      setRequestOpen(false);
      setSelectedSlot(null);
      setFormData({ subjectName: '', room: '', studentCount: '', notes: '' });
    } catch (err) {
      showToast('Failed to submit request.', 'error');
    }
  };

  const addMinutes = (time, mins) => {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + mins;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  };

  const handleCancelRequest = (requestId) => {
    try {
      const requests = JSON.parse(localStorage.getItem('schedule_requests') || '[]');
      const filteredRequests = requests.filter((r) => r.id !== requestId);
      localStorage.setItem('schedule_requests', JSON.stringify(filteredRequests));
      showToast('Schedule request cancelled successfully.', 'success');
      fetchData();
    } catch (err) {
      showToast('Failed to cancel request.', 'error');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const savedRequests = JSON.parse(localStorage.getItem('schedule_requests') || '[]');

  return (
    <Box sx={{ p: 4, minHeight: '100vh', bgcolor: '#f8fafc', mt: -4, mx: -4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="700" sx={{ mb: 1, color: '#1B2B5E' }}>
          Check Schedules
        </Typography>
        <Typography variant="body2" color="textSecondary">
          View available schedules and request time slots for your classes
        </Typography>
      </Box>

      {/* Tabs for Days */}
      <Paper sx={{ mb: 4, borderRadius: 2 }}>
        <Tabs
          value={selectedDay}
          onChange={(e, val) => setSelectedDay(val)}
          variant="fullWidth"
        >
          {DAYS.map((day) => (
            <Tab key={day} label={day} value={day} />
          ))}
        </Tabs>
      </Paper>

      {/* Schedule Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 2, mb: 4 }}>
        {/* Time Labels */}
        <Box sx={{ display: 'flex', flexDirection: 'column', pt: 5 }}>
          {TIME_SLOTS.map((slot) => (
            <Box
              key={slot}
              sx={{
                height: 100,
                display: 'flex',
                alignItems: 'center',
                fontWeight: '600',
                fontSize: '0.875rem',
                color: '#64748b',
                px: 2,
              }}
            >
              {slot}
            </Box>
          ))}
        </Box>

        {/* Rooms Grid */}
        <Box>
          {rooms.length > 0 ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(200px, 1fr))`, gap: 2 }}>
              {rooms.map((room) => (
                <Box key={room.id}>
                  <Paper
                    sx={{
                      p: 2,
                      mb: 2,
                      backgroundColor: '#1B2B5E',
                      color: '#fff',
                      fontWeight: 'bold',
                      borderRadius: 1,
                      textAlign: 'center',
                    }}
                  >
                    {room.name} (Cap: {room.capacity})
                  </Paper>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {TIME_SLOTS.map((slot) => {
                      const occupied = isSlotOccupied(selectedDay, slot);
                      return (
                        <Box
                          key={slot}
                          onClick={() => !occupied && handleSlotClick(selectedDay, slot)}
                          sx={{
                            height: 100,
                            border: '2px solid #e2e8f0',
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: occupied ? 'not-allowed' : 'pointer',
                            backgroundColor: occupied ? '#fee2e2' : '#f8fafc',
                            borderColor: occupied ? '#fca5a5' : '#e2e8f0',
                            transition: 'all 0.2s ease',
                            '&:hover': !occupied && {
                              backgroundColor: '#e0e7ff',
                              borderColor: '#4f46e5',
                              boxShadow: 2,
                            },
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: '600',
                              color: occupied ? '#dc2626' : '#4f46e5',
                              textAlign: 'center',
                              px: 1,
                            }}
                          >
                            {occupied ? '❌ Occupied' : '✓ Available'}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              ))}
            </Box>
          ) : (
            <Alert severity="info">No rooms available.</Alert>
          )}
        </Box>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Your Requests Section */}
      <Typography variant="h6" fontWeight="700" sx={{ mb: 2, color: '#1B2B5E' }}>
        Your Schedule Requests
      </Typography>

      {savedRequests.length > 0 ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2, mb: 4 }}>
          {savedRequests.map((request) => (
            <Card key={request.id}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {request.subject}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {request.dayOfWeek} • {request.startTime} - {request.endTime}
                    </Typography>
                    {request.room && (
                      <Typography variant="body2" color="textSecondary">
                        Room: {request.room}
                      </Typography>
                    )}
                    <Typography variant="body2" color="textSecondary">
                      Students: {request.studentCount}
                    </Typography>
                    {request.notes && (
                      <Typography variant="caption" sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
                        {request.notes}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
                    <Chip
                      label={request.status}
                      size="small"
                      color={request.status === 'APPROVED' ? 'success' : 'warning'}
                      variant="outlined"
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleCancelRequest(request.id)}
                      sx={{
                        color: '#dc2626',
                        '&:hover': { backgroundColor: 'rgba(220, 38, 38, 0.1)' },
                      }}
                      title="Cancel request"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : (
        <Alert severity="info" sx={{ mb: 4 }}>
          No requests submitted yet. Click on an available slot to submit a request.
        </Alert>
      )}

      {/* Request Modal */}
      <Modal open={requestOpen} onClose={() => setRequestOpen(false)}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 450,
            backgroundColor: '#fff',
            p: 4,
            borderRadius: 2,
            boxShadow: 3,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" fontWeight="bold" sx={{ color: '#1B2B5E' }}>
              Request Schedule
            </Typography>
            <Button
              onClick={() => setRequestOpen(false)}
              sx={{ minWidth: 'auto', p: 0.5 }}
            >
              <CloseIcon />
            </Button>
          </Box>

          {selectedSlot && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {selectedSlot.day} • {selectedSlot.timeSlot} - {addMinutes(selectedSlot.timeSlot, 90)}
            </Alert>
          )}

          <Stack spacing={2}>
            <TextField
              label="Subject/Course Name"
              fullWidth
              value={formData.subjectName}
              onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
              required
            />

            <Select
              label="Preferred Room"
              value={formData.room}
              onChange={(e) => setFormData({ ...formData, room: e.target.value })}
              fullWidth
            >
              <MenuItem value="">No Preference</MenuItem>
              {rooms.map((room) => (
                <MenuItem key={room.id} value={room.name}>
                  {room.name} (Cap: {room.capacity})
                </MenuItem>
              ))}
            </Select>

            <TextField
              label="Expected Student Count"
              type="number"
              fullWidth
              value={formData.studentCount}
              onChange={(e) => setFormData({ ...formData, studentCount: e.target.value })}
              required
            />

            <TextField
              label="Additional Notes"
              fullWidth
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any special requirements..."
            />

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
              <Button
                variant="outlined"
                onClick={() => setRequestOpen(false)}
                sx={{ color: '#1B2B5E', borderColor: '#1B2B5E' }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmitRequest}
                startIcon={<AddIcon />}
                sx={{
                  backgroundColor: '#C49A3C',
                  color: '#fff',
                  fontWeight: 'bold',
                  '&:hover': { backgroundColor: '#B8892E' },
                }}
              >
                Request Schedule
              </Button>
            </Box>
          </Stack>
        </Box>
      </Modal>

      <Toast toast={toast} onClose={hideToast} />
    </Box>
  );
}
