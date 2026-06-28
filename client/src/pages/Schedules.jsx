import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Modal, TextField, MenuItem, Stack
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = ['07:30', '09:00', '10:30', '12:00', '13:30', '15:00', '16:30'];

const Schedules = () => {
  const [schedules, setSchedules] = useState([]);
  const [options, setOptions] = useState({ teachers: [], rooms: [], sections: [] });
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    teacherId: '', 
    roomId: '', 
    sectionId: '', 
    subjectOfferingId: '', 
    dayOfWeek: 'Monday', 
    startTime: '', 
    endTime: '' 
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };

  const fetchData = async () => {
    try {
      const config = getAuthHeaders();
      const [resSched, resOpt] = await Promise.all([
        axios.get('/api/schedules', config),
        axios.get('/api/schedules/options', config)
      ]);
      
      setSchedules(resSched.data.data || []);
      
      // Correctly mapping the response structure from your API
      const optData = resOpt.data.data;
      setOptions({
        teachers: optData.teachers || [],
        rooms: optData.rooms || [],
        sections: optData.sections || []
      });
    } catch (err) { 
      console.error("Error fetching data:", err); 
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  const handleSave = async (e) => {
    e.preventDefault(); 
    try {
      const config = getAuthHeaders();
      const response = await axios.post('/api/schedules', formData, config);
      alert(response.data.message || "Schedule created successfully!");
      setOpen(false);
      setFormData({ 
        teacherId: '', roomId: '', sectionId: '', subjectOfferingId: '', 
        dayOfWeek: 'Monday', startTime: '', endTime: '' 
      });
      fetchData(); 
    } catch (err) {
      console.error("Scheduling error occurred:", err);
      const errorMessage = err.response?.data?.message || "Failed to save schedule.";
      alert(errorMessage);
    }
  };

  const getScheduleForSlot = (day, time) => {
    return schedules.find(s => s.dayOfWeek === day && s.startTime?.startsWith(time));
  };

  return (
    <Box sx={{ p: 4, minHeight: '100vh', bgcolor: '#f8fafc', mt: -4, mx: -4 }}>
      <Box sx={{ maxWidth: '1200px', mx: 'auto' }}>
        
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" fontWeight="800" sx={{ color: '#1e293b' }}>Manage Schedules</Typography>
          </Box>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={() => setOpen(true)} 
            sx={{ bgcolor: '#2563eb', borderRadius: '12px', textTransform: 'none' }}
          >
            Add New Schedule
          </Button>
        </Box>

        {/* Matrix View */}
        <Paper sx={{ p: 3, borderRadius: '16px', mb: 4, overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Time</TableCell>
                {DAYS.map(day => <TableCell key={day} align="center" sx={{ fontWeight: 'bold' }}>{day}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {TIME_SLOTS.map(time => (
                <TableRow key={time}>
                  <TableCell>{time}</TableCell>
                  {DAYS.map(day => {
                    const match = getScheduleForSlot(day, time);
                    return (
                      <TableCell key={day} align="center" sx={{ bgcolor: match ? '#eff6ff' : 'transparent' }}>
                        {match ? (
                          <Typography variant="caption" fontWeight="700">{match.subjectOffering?.subject?.name || "Class"}</Typography>
                        ) : "—"}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>

        {/* Entry Form Modal */}
        <Modal open={open} onClose={() => setOpen(false)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ p: 4, bgcolor: 'background.paper', width: '100%', maxWidth: '460px', borderRadius: '20px' }}>
            <Typography variant="h6" fontWeight="800" sx={{ mb: 3 }}>Create New Schedule</Typography>
            <form onSubmit={handleSave}>
              <Stack spacing={2.5}>
                
                {/* Teacher Selector */}
                <TextField select fullWidth label="Teacher" value={formData.teacherId} onChange={(e) => setFormData({...formData, teacherId: e.target.value})}>
                  {options.teachers.length > 0 ? options.teachers.map(t => (
                    <MenuItem key={t.id} value={t.id}>{t.user ? `${t.user.firstName} ${t.user.lastName}` : "Unnamed Teacher"}</MenuItem>
                  )) : <MenuItem disabled>No Teachers Loaded</MenuItem>}
                </TextField>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  {/* Room Selector */}
                  <TextField select fullWidth label="Room" value={formData.roomId} onChange={(e) => setFormData({...formData, roomId: e.target.value})}>
                    {options.rooms.length > 0 ? options.rooms.map(r => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>) : <MenuItem disabled>No Rooms Loaded</MenuItem>}
                  </TextField>

                  {/* Section Selector */}
                  <TextField select fullWidth label="Section" value={formData.sectionId} onChange={(e) => setFormData({...formData, sectionId: e.target.value})}>
                    {options.sections.length > 0 ? options.sections.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>) : <MenuItem disabled>No Sections Loaded</MenuItem>}
                  </TextField>
                </Box>

                <TextField select fullWidth label="Day of Week" value={formData.dayOfWeek} onChange={(e) => setFormData({...formData, dayOfWeek: e.target.value})}>
                  {DAYS.map(day => <MenuItem key={day} value={day}>{day}</MenuItem>)}
                </TextField>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField fullWidth label="Start Time" type="time" InputLabelProps={{ shrink: true }} value={formData.startTime} onChange={(e) => setFormData({...formData, startTime: e.target.value})} />
                  <TextField fullWidth label="End Time" type="time" InputLabelProps={{ shrink: true }} value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})} />
                </Box>

                <Button fullWidth variant="contained" type="submit" sx={{ py: 1.5, bgcolor: '#2563eb' }}>Save Schedule</Button>
              </Stack>
            </form>
          </Box>
        </Modal>

      </Box>
    </Box>
  );
};

export default Schedules;