import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell,
  TableHead, TableRow, Modal, TextField, Stack,
  CircularProgress, Chip, Alert, Card, CardContent, Select, MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = ['07:30', '09:00', '10:30', '12:00', '13:30', '15:00', '16:30'];

export default function InstructorSchedules() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();

  const [allSchedules, setAllSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    subjectName: '',
    dayOfWeek: 'Monday',
    startTime: '07:30',
    endTime: '09:00',
    room: '',
    studentCount: '',
    notes: '',
  });

  // Get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('optimasched_token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };

  // Fetch all schedules
  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const config = getAuthHeaders();
      const response = await axios.get('/api/schedules', config);
      setAllSchedules(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (err) {
      console.error('Failed to load schedules:', err);
      showToast('Failed to load schedules.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  // Handle form submission - save to notes or localStorage for now
  const handleSubmitRequest = async () => {
    if (!formData.subjectName || !formData.startTime || !formData.endTime) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    try {
      // For now, store in localStorage since backend endpoint doesn't exist yet
      const requests = JSON.parse(localStorage.getItem('schedule_requests') || '[]');
      const newRequest = {
        id: Date.now(),
        ...formData,
        submittedAt: new Date().toISOString(),
        status: 'PENDING',
      };
      requests.push(newRequest);
      localStorage.setItem('schedule_requests', JSON.stringify(requests));

      showToast('Schedule request submitted successfully!', 'success');
      setOpen(false);
      setFormData({
        subjectName: '',
        dayOfWeek: 'Monday',
        startTime: '07:30',
        endTime: '09:00',
        room: '',
        studentCount: '',
        notes: '',
      });
      fetchSchedules();
    } catch (err) {
      showToast('Failed to submit request.', 'error');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Get saved requests from localStorage
  const savedRequests = JSON.parse(localStorage.getItem('schedule_requests') || '[]');

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="700" sx={{ mb: 3, color: '#1B2B5E' }}>
        Check Schedules
      </Typography>

      {/* Action Button */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
          sx={{
            backgroundColor: '#C49A3C',
            color: '#fff',
            fontWeight: 'bold',
            '&:hover': { backgroundColor: '#B8892E' },
          }}
        >
          Request New Schedule
        </Button>
      </Box>

      {/* All Schedules Section */}
      <Typography variant="h6" fontWeight="700" sx={{ mt: 4, mb: 2, color: '#1B2B5E' }}>
        All Available Schedules
      </Typography>

      {allSchedules.length > 0 ? (
        <Paper sx={{ overflow: 'auto', mb: 4 }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#1B2B5E' }}>
              <TableRow>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Subject</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Day</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Time</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Room</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Teacher</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Section</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allSchedules.map((schedule) => (
                <TableRow key={schedule.id} hover>
                  <TableCell>{schedule.subject?.name || schedule.subjectName || 'N/A'}</TableCell>
                  <TableCell>{schedule.dayOfWeek}</TableCell>
                  <TableCell>{`${schedule.startTime} - ${schedule.endTime}`}</TableCell>
                  <TableCell>{schedule.room?.name || schedule.room || 'TBD'}</TableCell>
                  <TableCell>
                    {schedule.teacher?.user?.firstName || schedule.teacher?.lastName || 'TBD'}
                  </TableCell>
                  <TableCell>{schedule.section?.name || 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      ) : (
        <Alert severity="info" sx={{ mb: 4 }}>
          No schedules available yet.
        </Alert>
      )}

      {/* Pending Requests Section */}
      <Typography variant="h6" fontWeight="700" sx={{ mt: 4, mb: 2, color: '#1B2B5E' }}>
        Your Schedule Requests
      </Typography>

      {savedRequests.length > 0 ? (
        <Stack spacing={2} sx={{ mb: 4 }}>
          {savedRequests.map((request) => (
            <Card key={request.id}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {request.subjectName}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {request.dayOfWeek} • {request.startTime} - {request.endTime}
                    </Typography>
                    {request.room && (
                      <Typography variant="body2" color="textSecondary">
                        Room: {request.room}
                      </Typography>
                    )}
                    {request.notes && (
                      <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                        Notes: {request.notes}
                      </Typography>
                    )}
                  </Box>
                  <Chip
                    label={request.status || 'PENDING'}
                    color={request.status === 'APPROVED' ? 'success' : 'warning'}
                    variant="outlined"
                  />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <Alert severity="info" sx={{ mb: 4 }}>
          No requests submitted yet.
        </Alert>
      )}

      {/* Request Modal */}
      <Modal open={open} onClose={() => setOpen(false)}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 500,
            backgroundColor: '#fff',
            p: 4,
            borderRadius: 2,
            boxShadow: 3,
            maxHeight: '80vh',
            overflowY: 'auto',
          }}
        >
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 3, color: '#1B2B5E' }}>
            Request New Schedule
          </Typography>

          <Stack spacing={2}>
            <TextField
              label="Subject/Course Name"
              fullWidth
              value={formData.subjectName}
              onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
              required
            />

            <Select
              label="Day of Week"
              fullWidth
              value={formData.dayOfWeek}
              onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
            >
              {DAYS.map((day) => (
                <MenuItem key={day} value={day}>{day}</MenuItem>
              ))}
            </Select>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Select
                label="Start Time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              >
                {TIME_SLOTS.map((time) => (
                  <MenuItem key={time} value={time}>{time}</MenuItem>
                ))}
              </Select>
              <Select
                label="End Time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              >
                {TIME_SLOTS.map((time) => (
                  <MenuItem key={time} value={time}>{time}</MenuItem>
                ))}
              </Select>
            </Box>

            <TextField
              label="Preferred Room (Optional)"
              fullWidth
              value={formData.room}
              onChange={(e) => setFormData({ ...formData, room: e.target.value })}
              placeholder="e.g., Room 101"
            />

            <TextField
              label="Expected Student Count"
              type="number"
              fullWidth
              value={formData.studentCount}
              onChange={(e) => setFormData({ ...formData, studentCount: e.target.value })}
            />

            <TextField
              label="Additional Notes"
              fullWidth
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any special requirements or notes..."
            />

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
              <Button
                variant="outlined"
                onClick={() => setOpen(false)}
                sx={{ color: '#1B2B5E', borderColor: '#1B2B5E' }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmitRequest}
                sx={{
                  backgroundColor: '#C49A3C',
                  color: '#fff',
                  fontWeight: 'bold',
                  '&:hover': { backgroundColor: '#B8892E' },
                }}
              >
                Submit Request
              </Button>
            </Box>
          </Stack>
        </Box>
      </Modal>

      <Toast toast={toast} onClose={hideToast} />
    </Box>
  );
}
