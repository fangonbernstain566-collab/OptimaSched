import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, CircularProgress } from '@mui/material';
import {
  AssignmentInd as EnrolledIcon,
  Schedule as PendingIcon,
  Class as SectionsIcon,
  Group as FacultyIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import TimetableAllocationProgress from '../../components/TimetableAllocationProgress';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';

const StatCard = ({ label, value, sub, icon, iconBg }) => (
  <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', height: '100%' }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, maxWidth: '70%' }}>{label}</Typography>
      <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </Box>
    </Box>
    <Typography variant="h4" fontWeight="800" sx={{ color: 'text.primary' }}>{value}</Typography>
    {sub && (
      <Typography variant="caption" sx={{ display: 'inline-block', mt: 1, px: 1.5, py: 0.5, borderRadius: '20px', bgcolor: 'action.hover', color: 'text.secondary', fontWeight: 700 }}>
        {sub}
      </Typography>
    )}
  </Paper>
);

export default function RegistrarDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    Promise.all([api.get('/schedules'), api.get('/schedules/options'), api.get('/teachers')])
      .then(([resSched, resOptions, resTeachers]) => {
        const schedules = resSched.data?.data ?? [];
        const sections = resOptions.data?.data?.sections ?? [];
        const teachers = resTeachers.data?.data ?? [];

        const totalEnrolled = schedules
          .filter((s) => s.status === 'SCHEDULED')
          .reduce((sum, s) => sum + (s.studentCount ?? 0), 0);
        const pendingCount = schedules.filter((s) => s.status === 'PENDING').length;

        setStats({
          totalEnrolled,
          pendingCount,
          totalSections: sections.length,
          totalFaculty: teachers.length,
        });
      })
      .catch(() => showToast('Failed to load dashboard.', 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      <Toast toast={toast} onClose={hideToast} />
      <Typography variant="h4" fontWeight="800" sx={{ mb: 3, color: 'text.primary' }}>Analytics Overview</Typography>

      <Grid container spacing={2.5} sx={{ mb: 1 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Enrolled Students" value={stats.totalEnrolled} sub="Across scheduled classes" icon={<EnrolledIcon sx={{ color: '#2563eb' }} />} iconBg="#dbeafe" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Pending Schedules" value={stats.pendingCount} sub="Awaiting placement" icon={<PendingIcon sx={{ color: '#7c3aed' }} />} iconBg="#ede9fe" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Total Sections" value={stats.totalSections} sub="Across all programs" icon={<SectionsIcon sx={{ color: '#db2777' }} />} iconBg="#fce7f3" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Active Faculty" value={stats.totalFaculty} sub="Registered instructors" icon={<FacultyIcon sx={{ color: '#ea580c' }} />} iconBg="#ffedd5" />
        </Grid>
      </Grid>

      <TimetableAllocationProgress />
    </Box>
  );
}
