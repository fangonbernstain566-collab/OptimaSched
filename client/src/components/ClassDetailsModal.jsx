import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Modal, Box, Typography, TextField, Button, Stack, Chip,
  IconButton, Divider, MenuItem,
} from '@mui/material';
import { Close as CloseIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const ClassDetailsModal = ({ schedule, onClose, onSaved, getAuthHeaders, options }) => {
  const [names, setNames]     = useState(schedule?.enrolledStudents ?? []);
  const [newName, setNewName] = useState('');
  const [edit, setEdit] = useState({
    roomId: schedule?.roomId ?? '',
    dayOfWeek: schedule?.dayOfWeek ?? 'Monday',
    startTime: schedule?.startTime ?? '',
    endTime: schedule?.endTime ?? '',
  });

  if (!schedule) return null;

  const addName = () => {
    if (!newName.trim()) return;
    setNames((prev) => [...prev, newName.trim()]);
    setNewName('');
  };
  const removeName = (i) => setNames((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    const config = getAuthHeaders();
    // Save roster
    await axios.put(`/api/schedules/${schedule.id}/students`, { names }, config);
    // Save simplified edit fields — reuses existing full PUT, just changing a few fields
    await axios.put(`/api/schedules/${schedule.id}`, {
      ...schedule, ...edit,
    }, config);
    onSaved();
    onClose();
  };

  return (
    <Modal open onClose={onClose} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Box sx={{ p: 4, bgcolor: 'background.paper', width: '100%', maxWidth: 480, borderRadius: '20px', maxHeight: '90vh', overflowY: 'auto' }}>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Box>
            <Typography variant="h6" fontWeight="800">
              {schedule.subjectOffering?.subject?.name ?? 'Class'}
            </Typography>
            {schedule.subjectOffering?.subject?.code && (
              <Typography variant="body2" color="text.secondary">
                Class Code: {schedule.subjectOffering.subject.code}
              </Typography>
            )}
          </Box>
          <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
        </Box>

        {/* Read-only details */}
        <Stack spacing={0.5} sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            👤 {schedule.teacher?.user ? `${schedule.teacher.user.firstName} ${schedule.teacher.user.lastName}` : '—'}
          </Typography>
          <Typography variant="body2" color="text.secondary">🏷 Section: {schedule.section?.name ?? '—'}</Typography>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        {/* Simplified edit form */}
        <Typography variant="subtitle2" fontWeight="700" sx={{ mb: 1.5 }}>Edit Class</Typography>
        <Stack spacing={2} sx={{ mb: 3 }}>
          <TextField select fullWidth label="Room" value={edit.roomId}
            onChange={(e) => setEdit((p) => ({ ...p, roomId: e.target.value }))}>
            {options.rooms.map((r) => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
          </TextField>
          <TextField select fullWidth label="Day" value={edit.dayOfWeek}
            onChange={(e) => setEdit((p) => ({ ...p, dayOfWeek: e.target.value }))}>
            {DAYS.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
          </TextField>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField fullWidth type="time" label="Start" InputLabelProps={{ shrink: true }}
              value={edit.startTime} onChange={(e) => setEdit((p) => ({ ...p, startTime: e.target.value }))} />
            <TextField fullWidth type="time" label="End" InputLabelProps={{ shrink: true }}
              value={edit.endTime} onChange={(e) => setEdit((p) => ({ ...p, endTime: e.target.value }))} />
          </Box>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        {/* Roster */}
        <Typography variant="subtitle2" fontWeight="700" sx={{ mb: 1.5 }}>
          Enrolled Students ({names.length})
        </Typography>
        <Stack spacing={1} sx={{ mb: 2, maxHeight: 200, overflowY: 'auto' }}>
          {names.length === 0
            ? <Typography variant="body2" color="text.secondary">No students added yet.</Typography>
            : names.map((n, i) => (
                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Chip label={n} size="small" />
                  <IconButton size="small" onClick={() => removeName(i)}><DeleteIcon fontSize="small" /></IconButton>
                </Box>
              ))}
        </Stack>
        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
          <TextField fullWidth size="small" placeholder="Student name"
            value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addName()} />
          <Button variant="outlined" onClick={addName}><AddIcon /></Button>
        </Box>

        <Button fullWidth variant="contained" onClick={handleSave}
          sx={{ bgcolor: '#2563eb', borderRadius: '10px', textTransform: 'none', py: 1.2 }}>
          Save Changes
        </Button>
      </Box>
    </Modal>
  );
};

export default ClassDetailsModal;