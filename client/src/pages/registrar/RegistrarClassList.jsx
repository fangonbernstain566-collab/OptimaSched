import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, CircularProgress,
  TextField, Select, MenuItem, FormControl, InputLabel, InputAdornment, Grid, Avatar,
} from '@mui/material';
import {
  Search as SearchIcon,
  Groups as StudentsIcon,
  Class as SectionsIcon,
  BookmarkBorder as SubjectsIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';

const StatCard = ({ label, value, icon, iconBg }) => (
  <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', height: '100%' }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>{label}</Typography>
        <Typography variant="h4" fontWeight="800" sx={{ color: 'text.primary', mt: 0.5 }}>{value}</Typography>
      </Box>
      <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </Box>
    </Box>
  </Paper>
);

export default function RegistrarClassList() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [sectionFilter, setSectionFilter] = useState('All');
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    api.get('/schedules')
      .then((res) => setSchedules((res.data?.data ?? []).filter((s) => s.status !== 'PENDING')))
      .catch(() => showToast('Failed to load class list.', 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Flatten each schedule's enrolled students into one row per student.
  const rows = useMemo(() => {
    const out = [];
    for (const s of schedules) {
      const subjectName = s.subjectOffering?.subject?.name ?? '—';
      const classCode = s.subjectOffering?.classCode ?? '—';
      const sectionName = s.section?.name ?? '—';
      const course = s.section?.program ?? '—';
      const yearLevel = s.section?.yearLevel ?? null;
      const teacherName = s.teacher?.user ? `${s.teacher.user.firstName} ${s.teacher.user.lastName}` : '—';

      (s.enrolledStudents ?? []).forEach((studentName, i) => {
        out.push({
          key: `${s.id}-${i}`,
          studentName,
          course,
          yearLevel,
          section: sectionName,
          subject: subjectName,
          classCode,
          teacher: teacherName,
        });
      });
    }
    return out;
  }, [schedules]);

  const subjects = useMemo(() => Array.from(new Set(rows.map((r) => r.subject))).sort(), [rows]);
  const sections = useMemo(() => Array.from(new Set(rows.map((r) => r.section))).sort(), [rows]);

  const filtered = useMemo(() => rows.filter((r) => {
    const matchSearch = !search || r.studentName.toLowerCase().includes(search.toLowerCase());
    const matchSubject = subjectFilter === 'All' || r.subject === subjectFilter;
    const matchSection = sectionFilter === 'All' || r.section === sectionFilter;
    return matchSearch && matchSubject && matchSection;
  }), [rows, search, subjectFilter, sectionFilter]);

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
      <Typography variant="h4" fontWeight="800" sx={{ mb: 0.5, color: 'text.primary' }}>Manage Class List</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Real enrolled-student rosters from placed classes.
      </Typography>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <StatCard label="Total Enrollments" value={rows.length} icon={<StudentsIcon sx={{ color: '#2563eb' }} />} iconBg="#dbeafe" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard label="Sections" value={sections.length} icon={<SectionsIcon sx={{ color: '#7c3aed' }} />} iconBg="#ede9fe" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard label="Subjects" value={subjects.length} icon={<SubjectsIcon sx={{ color: '#ea580c' }} />} iconBg="#ffedd5" />
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <TextField
            size="small" placeholder="Search student name…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1, minWidth: 220 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Subject</InputLabel>
            <Select label="Subject" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
              <MenuItem value="All">All Subjects</MenuItem>
              {subjects.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Section</InputLabel>
            <Select label="Section" value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)}>
              <MenuItem value="All">All Sections</MenuItem>
              {sections.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {['Student', 'Course', 'Year Level', 'Section', 'Subject', 'Instructor'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: 'text.secondary' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                    No students found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.key} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 28, height: 28, bgcolor: '#1B2B5E', fontSize: '0.7rem' }}>
                          {r.studentName?.[0]?.toUpperCase() ?? '?'}
                        </Avatar>
                        <Typography variant="body2" fontWeight={600}>{r.studentName}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{r.course}</TableCell>
                    <TableCell>{r.yearLevel ? `${r.yearLevel}${['th', 'st', 'nd', 'rd'][r.yearLevel % 10 > 3 ? 0 : r.yearLevel % 10] ?? 'th'} Year` : '—'}</TableCell>
                    <TableCell>
                      <Chip label={r.section} size="small" sx={{ bgcolor: 'action.hover' }} />
                    </TableCell>
                    <TableCell>
                      <Chip label={`${r.classCode} · ${r.subject}`} size="small" sx={{ bgcolor: '#eff6ff', color: '#1d4ed8', fontSize: '0.7rem' }} />
                    </TableCell>
                    <TableCell>{r.teacher}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          Showing {filtered.length} of {rows.length} enrollments
        </Typography>
      </Paper>
    </Box>
  );
}
