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
    teacherId: '', roomId: '', sectionId: '', subjectOfferingId: '', 
    dayOfWeek: 'Monday', startTime: '', endTime: '' 
  });

  // Helper function to extract token safely from localStorage
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token'); // Double check if your app saves it as 'token' or 'auth_token'
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
      setOptions(resOpt.data.data || { teachers: [], rooms: [], sections: [] });
    } catch (err) { 
      console.error("Error fetching data:", err); 
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (e) => {
    e.preventDefault(); 
    try {
      const config = getAuthHeaders();
      const response = await axios.post('/api/schedules', formData, config);
      alert(response.data.message || "Schedule created successfully!");
      setOpen(false);
      setFormData({ teacherId: '', roomId: '', sectionId: '', subjectOfferingId: '', dayOfWeek: 'Monday', startTime: '', endTime: '' });
      fetchData(); 
    } catch (err) {
      console.error("Scheduling error occurred:", err);
      const errorMessage = err.response?.data?.message || "Failed to save schedule due to a system error.";
      alert(errorMessage);
    }
  };

  const getScheduleForSlot = (day, time) => {
    return schedules.find(s => s.dayOfWeek === day && s.startTime?.startsWith(time));
  };

  return (
    <Box sx={{ p: 4, minHeight: '100vh', bgcolor: '#f8fafc', mt: -4, mx: -4 }}>
      <Box sx={{ maxWidth: '1200px', mx: 'auto' }}>
        
        {/* Header Section */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" fontWeight="800" sx={{ color: '#1e293b', letterSpacing: '-1px' }}>
              Manage Schedules
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
              Overview of your current academic blocks
            </Typography>
          </Box>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={() => setOpen(true)} 
            sx={{ 
              bgcolor: '#2563eb', px: 3, py: 1.2, borderRadius: '12px', fontWeight: '600', textTransform: 'none',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)', '&:hover': { bgcolor: '#1d4ed8' }
            }}
          >
            Add New Schedule
          </Button>
        </Box>

        {/* Weekly Timetable Matrix */}
        <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid #e2e8f0', mb: 4, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)', overflowX: 'auto' }}>
          <Typography variant="h6" fontWeight="700" sx={{ color: '#1e293b', mb: 2 }}>
            Weekly Timetable Matrix
          </Typography>
          <Table size="small" sx={{ minWidth: 800, border: '1px solid #e2e8f0' }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 'bold', width: '100px', borderRight: '1px solid #e2e8f0' }}>Time</TableCell>
                {DAYS.map(day => (
                  <TableCell key={day} align="center" sx={{ fontWeight: 'bold', borderRight: '1px solid #e2e8f0' }}>{day}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {TIME_SLOTS.map(time => (
                <TableRow key={time}>
                  <TableCell sx={{ fontWeight: '600', bgcolor: '#fdfdfd', borderRight: '1px solid #e2e8f0', py: 2 }}>{time}</TableCell>
                  {DAYS.map(day => {
                    const match = getScheduleForSlot(day, time);
                    return (
                      <TableCell key={day} align="center" sx={{ borderRight: '1px solid #e2e8f0', p: 0.5, bgcolor: match ? '#eff6ff' : 'transparent' }}>
                        {match ? (
                          <Box sx={{ p: 1, borderRadius: '6px', border: '1px solid #bfdbfe', color: '#1e40af' }}>
                            <Typography variant="caption" fontWeight="700" display="block">
                              {match.subjectOffering?.subject?.name || "Class Slot"}
                            </Typography>
                            <Typography variant="caption" color="textSecondary" sx={{ fontSize: '10px' }}>
                              Rm: {match.room?.name} | {match.teacher?.user?.lastName || 'Staff'}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="caption" sx={{ color: '#cbd5e1' }}>—</Typography>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>

        {/* Traditional Data Table View */}
        <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ bgcolor: '#fdfdfd' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: '700', color: '#64748b' }}>Teacher</TableCell>
                <TableCell sx={{ fontWeight: '700', color: '#64748b' }}>Room</TableCell>
                <TableCell sx={{ fontWeight: '700', color: '#64748b' }}>Day</TableCell>
                <TableCell sx={{ fontWeight: '700', color: '#64748b' }}>Time Slot</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {schedules.length === 0 ? (
                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: '#94a3b8' }}>No records saved.</TableCell></TableRow>
              ) : (
                schedules.map((s) => (
                  <TableRow key={s.id} hover>
                    <TableCell sx={{ fontWeight: '600' }}>
                      {s.teacher?.user ? `${s.teacher.user.firstName} ${s.teacher.user.lastName}` : 'Unassigned'}
                    </TableCell>
                    <TableCell>{s.room?.name || 'N/A'}</TableCell>
                    <TableCell>{s.dayOfWeek}</TableCell>
                    <TableCell sx={{ color: '#2563eb', fontWeight: '600' }}>{s.startTime} - {s.endTime}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Entry Form Modal */}
        <Modal open={open} onClose={() => setOpen(false)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ p: 4, bgcolor: 'background.paper', width: '100%', maxWidth: '460px', borderRadius: '20px', mx: 2, outline: 'none' }}>
            <Typography variant="h6" fontWeight="800" sx={{ mb: 3 }}>Create New Schedule</Typography>
            <form onSubmit={handleSave} style={{ width: '100%' }}>
              <Stack spacing={2.5}>
                
                {/* Teacher Selector with Null/Undefined Defenses */}
                <TextField select fullWidth label="Teacher" value={formData.teacherId} onChange={(e) => setFormData({...formData, teacherId: e.target.value})}>
                  {options.teachers?.length > 0 ? (
                    options.teachers.map(t => (
                      <MenuItem key={t.id} value={t.id}>
                        {t.user ? `${t.user.firstName} ${t.user.lastName}` : (t.name || `Teacher ID: ${t.id}`)}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>No Teachers Loaded</MenuItem>
                  )}
                </TextField>
                
                <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
                  {/* Fixed Room Selector */}
                  <TextField select fullWidth label="Room" value={formData.roomId} onChange={(e) => setFormData({...formData, roomId: e.target.value})}>
                    {options.rooms?.length > 0 ? (
                      options.rooms.map(r => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)
                    ) : (
                      <MenuItem disabled>No Rooms Loaded</MenuItem>
                    )}
                  </TextField>

                  {/* Fixed Section Selector */}
                  <TextField select fullWidth label="Section" value={formData.sectionId} onChange={(e) => setFormData({...formData, sectionId: e.target.value})}>
                    {options.sections?.length > 0 ? (
                      options.sections.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)
                    ) : (
                      <MenuItem disabled>No Sections Loaded</MenuItem>
                    )}
                  </TextField>
                </Box>

                <TextField select fullWidth label="Day of Week" value={formData.dayOfWeek} onChange={(e) => setFormData({...formData, dayOfWeek: e.target.value})}>
                  {DAYS.map(day => <MenuItem key={day} value={day}>{day}</MenuItem>)}
                </TextField>

                <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
                  <TextField fullWidth label="Start Time" type="time" slotProps={{ htmlInput: { step: 300 } }} InputLabelProps={{ shrink: true }} value={formData.startTime} onChange={(e) => setFormData({...formData, startTime: e.target.value})} />
                  <TextField fullWidth label="End Time" type="time" slotProps={{ htmlInput: { step: 300 } }} InputLabelProps={{ shrink: true }} value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})} />
                </Box>

                <Button fullWidth variant="contained" type="submit" sx={{ py: 1.5, bgcolor: '#2563eb', borderRadius: '12px', fontWeight: '700', textTransform: 'none' }}>
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