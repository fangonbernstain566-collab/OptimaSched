import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Typography, Paper, Grid } from '@mui/material';
import {
  SupervisorAccount as TeacherIcon,
  MeetingRoom as RoomIcon,
  Class as SectionIcon,
  CalendarMonth as SchedIcon
} from '@mui/icons-material';
import TimetableAllocationProgress from '../../components/TimetableAllocationProgress';

const StatCard = ({ title, value, icon, badgeText, badgeColor }) => (
  <Paper
    sx={{
      p: 3,
      borderRadius: '20px',
      border: '1px solid',
      borderColor: 'divider',
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
      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: '600' }}>{title}</Typography>
      <Box sx={{ p: 1, borderRadius: '12px', bgcolor: `${badgeColor}15`, color: badgeColor }}>
        {icon}
      </Box>
    </Box>
    <Box sx={{ mt: 2 }}>
      <Typography variant="h3" fontWeight="800" sx={{ color: 'text.primary', letterSpacing: '-1px' }}>{value}</Typography>
      {badgeText && (
        <Typography variant="caption" sx={{ display: 'inline-block', mt: 1, px: 1.5, py: 0.5, borderRadius: '20px', bgcolor: 'action.hover', color: 'text.secondary', fontWeight: '700' }}>
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
    <Box sx={{ p: 4, minHeight: '100vh', bgcolor: 'background.default', mt: -4 }}>
      <Box sx={{ maxWidth: '1200px', mx: 'auto' }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight="800" sx={{ color: 'text.primary', letterSpacing: '-1px' }}>Analytics Overview</Typography>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}><StatCard title="Total Instructors" value={metrics.teachers} icon={<TeacherIcon />} badgeText="Active Staff" badgeColor="#2563eb" /></Grid>
          <Grid item xs={12} sm={6} md={3}><StatCard title="Classroom Spaces" value={metrics.rooms} icon={<RoomIcon />} badgeText="Configured Rooms" badgeColor="#7c3aed" /></Grid>
          <Grid item xs={12} sm={6} md={3}><StatCard title="Student Sections" value={metrics.sections} icon={<SectionIcon />} badgeText="Academic Units" badgeColor="#db2777" /></Grid>
          <Grid item xs={12} sm={6} md={3}><StatCard title="Active Blocks" value={metrics.schedules} icon={<SchedIcon />} badgeText="Scheduled Slots" badgeColor="#ea580c" /></Grid>
        </Grid>

        <TimetableAllocationProgress />
      </Box>
    </Box>
  );
};

export default DashboardView;