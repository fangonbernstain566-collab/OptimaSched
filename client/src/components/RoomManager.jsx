// client/src/components/RoomManager.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Box, Button, MenuItem, Modal, Paper, Stack,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';

const ROOM_TYPES = [
  { value: 'LECTURE_ROOM',        label: 'Lecture Room'        },
  { value: 'COMPUTER_LABORATORY', label: 'Computer Laboratory' },
  { value: 'LABORATORY',          label: 'Laboratory'          },
];

export default function RoomManager() {
  const [rooms, setRooms] = useState([]);
  const [open, setOpen]   = useState(false);
  const [formData, setFormData] = useState({
    name:         '',
    capacity:     40,
    type:         'LECTURE_ROOM',
    buildingName: 'Main Building',
  });

  const { toast, showToast, hideToast } = useToast();

  const getAuthHeaders = () => {
    const token = localStorage.getItem('optimasched_token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };

  const fetchRooms = async () => {
    try {
      const response = await axios.get('/api/rooms', getAuthHeaders());
      if (response.data.success) setRooms(response.data.data || []);
    } catch (error) {
      showToast(error.response?.data?.message ?? 'Failed to fetch rooms.', 'error');
    }
  };

  useEffect(() => { fetchRooms(); }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await axios.post('/api/rooms', formData, getAuthHeaders());
      if (response.data.success) {
        showToast(response.data.message ?? 'Room created successfully.', 'success');
        setOpen(false);
        setFormData({ name: '', capacity: 40, type: 'LECTURE_ROOM', buildingName: 'Main Building' });
        fetchRooms();
      }
    } catch (error) {
      showToast(error.response?.data?.message ?? 'Failed to create room.', 'error');
    }
  };

  const handleDelete = async (roomId) => {
    const confirmDelete = window.confirm(
      'Delete this room? This will only work if the room is not used in any schedule.'
    );
    if (!confirmDelete) return;
    try {
      const response = await axios.delete(`/api/rooms/${roomId}`, getAuthHeaders());
      if (response.data.success) {
        showToast(response.data.message ?? 'Room deleted successfully.', 'success');
        fetchRooms();
      }
    } catch (error) {
      showToast(error.response?.data?.message ?? 'Failed to delete room.', 'error');
    }
  };

  return (
    <Box>
      <Toast toast={toast} onClose={hideToast} />

      {/* ── Header — matches Manage Schedules pattern exactly ─────────────── */}
      <Box
        sx={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          mb:             4,
          width:          '100%',
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ color: '#1e293b' }}>
            Manage Rooms
          </Typography>
          <Typography color="text.secondary">
            Create classrooms and laboratories for schedule assignment.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
          sx={{ bgcolor: '#2563eb', borderRadius: '12px', textTransform: 'none' }}
        >
          Add Room
        </Button>
      </Box>

      {/* ── Rooms Table ────────────────────────────────────────────────────── */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Room Name</TableCell>
              <TableCell>Building</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Capacity</TableCell>
              <TableCell>Schedules Using Room</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rooms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No rooms created yet.
                </TableCell>
              </TableRow>
            ) : (
              rooms.map((room) => (
                <TableRow key={room.id}>
                  <TableCell>{room.name}</TableCell>
                  <TableCell>{room.building?.name || 'N/A'}</TableCell>
                  <TableCell>{room.type}</TableCell>
                  <TableCell>{room.capacity}</TableCell>
                  <TableCell>{room._count?.schedules || 0}</TableCell>
                  <TableCell align="right">
                    <Button color="error" size="small" onClick={() => handleDelete(room.id)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Add Room Modal ─────────────────────────────────────────────────── */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Paper sx={{ p: 4, width: 420 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            Create New Room
          </Typography>

          <Stack component="form" spacing={2} onSubmit={handleSubmit}>
            <TextField label="Room Name"     name="name"         value={formData.name}         onChange={handleChange} required fullWidth />
            <TextField label="Building Name" name="buildingName" value={formData.buildingName} onChange={handleChange} required fullWidth />
            <TextField label="Capacity"      name="capacity"     type="number"                 value={formData.capacity} onChange={handleChange} required fullWidth />
            <TextField
              select label="Room Type" name="type"
              value={formData.type} onChange={handleChange}
              required fullWidth
            >
              {ROOM_TYPES.map((rt) => (
                <MenuItem key={rt.value} value={rt.value}>{rt.label}</MenuItem>
              ))}
            </TextField>

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" variant="contained">Save Room</Button>
            </Stack>
          </Stack>
        </Paper>
      </Modal>
    </Box>
  );
}