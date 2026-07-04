import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Typography, Paper, Grid, Stack } from '@mui/material';
import { 
  SupervisorAccount as TeacherIcon, 
  MeetingRoom as RoomIcon, 
  Class as SectionIcon, 
  CalendarMonth as SchedIcon 
} from '@mui/icons-material';

const StatCard = ({ title, value, icon, badgeText, badgeColor }) => (
  <Paper 
    sx={{ 
      p: 3, 
      borderRadius: '20px', 
      border: '1px solid #e2e8f0', 
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)',
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'space-between',
      height: '100%',
      minHeight: '160px',
      bgcolor: 'background.paper'
    }}
  >
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <Typography variant="body2" sx={{ color: '#64748b', fontWeight: '600' }}>{title}</Typography>
      <Box sx={{ p: 1, borderRadius: '12px', bgcolor: `${badgeColor}15`, color: badgeColor }}>
        {icon}
      </Box>
    </Box>
    <Box sx={{ mt: 2 }}>
      <Typography variant="h3" fontWeight="800" sx={{ color: '#1e293b', letterSpacing: '-1px' }}>{value}</Typography>
      {badgeText && (
        <Typography variant="caption" sx={{ display: 'inline-block', mt: 1, px: 1.5, py: 0.5, borderRadius: '20px', bgcolor: '#f1f5f9', color: '#475569', fontWeight: '700' }}>
          {badgeText}
        </Typography>
      )}
    </Box>
  </Paper>
);

const DashboardView = () => {
  const [metrics, setMetrics] = useState({ teachers: 0, rooms: 0, sections: 0, schedules: 0 });

  useEffect(() => {
    axios.get('/api/dashboard/metrics')
      .then(res => setMetrics(res.data.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <Box sx={{ p: 4, minHeight: '100vh', bgcolor: '#f8fafc', mt: -4 }}>
      <Box sx={{ maxWidth: '1200px', mx: 'auto' }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight="800" sx={{ color: '#1e293b', letterSpacing: '-1px' }}>Analytics Overview</Typography>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}><StatCard title="Total Instructors" value={metrics.teachers} icon={<TeacherIcon />} badgeText="Active Staff" badgeColor="#2563eb" /></Grid>
          <Grid item xs={12} sm={6} md={3}><StatCard title="Classroom Spaces" value={metrics.rooms} icon={<RoomIcon />} badgeText="Configured Rooms" badgeColor="#7c3aed" /></Grid>
          <Grid item xs={12} sm={6} md={3}><StatCard title="Student Sections" value={metrics.sections} icon={<SectionIcon />} badgeText="Academic Units" badgeColor="#db2777" /></Grid>
          <Grid item xs={12} sm={6} md={3}><StatCard title="Active Blocks" value={metrics.schedules} icon={<SchedIcon />} badgeText="Scheduled Slots" badgeColor="#ea580c" /></Grid>
        </Grid>

        <Paper sx={{ mt: 4, p: 4, borderRadius: '20px', border: '1px solid #e2e8f0', minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.paper' }}>
          <Stack alignItems="center" spacing={1}>
            <Typography variant="h6" fontWeight="700" sx={{ color: '#334155' }}>Timetable Allocation Status</Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8', textAlign: 'center' }}>Charts tracking metrics will systematically display right here.</Typography>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
};

export default DashboardView;