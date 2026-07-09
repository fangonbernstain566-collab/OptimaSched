import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, CircularProgress,
  TextField, Select, MenuItem, FormControl, InputLabel, Button,
  Modal, Stack, InputAdornment, Grid, Avatar,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Group as FacultyIcon,
  Business as DeptIcon,
  School as UnitsIcon,
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

const INITIAL_FORM = { firstName: '', lastName: '', email: '', maxTeachingLoad: 15, departmentName: '' };

function AddFacultyModal({ departments, onClose, onSaved }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email || !form.departmentName) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.post('/teachers', form);
      onSaved();
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Failed to add faculty.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Box sx={{ width: '100%', maxWidth: 420, bgcolor: 'background.paper', borderRadius: '20px', p: 4 }}>
        <Toast toast={toast} onClose={hideToast} />
        <Typography variant="h6" fontWeight="800" sx={{ mb: 3 }}>Add New Faculty</Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2.5}>
            <TextField label="First Name" fullWidth required value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
            <TextField label="Last Name" fullWidth required value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
            <TextField label="Email Address" type="email" fullWidth required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <FormControl fullWidth required>
              <InputLabel>Department</InputLabel>
              <Select label="Department" value={form.departmentName} onChange={(e) => setForm((f) => ({ ...f, departmentName: e.target.value }))}>
                {departments.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField
              label="Max Teaching Load (units)" type="number" fullWidth
              value={form.maxTeachingLoad}
              onChange={(e) => setForm((f) => ({ ...f, maxTeachingLoad: e.target.value }))}
            />
            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
              <Button fullWidth variant="outlined" onClick={onClose} sx={{ borderRadius: '10px', textTransform: 'none' }}>Cancel</Button>
              <Button fullWidth type="submit" variant="contained" disabled={saving} sx={{ bgcolor: '#1B2B5E', borderRadius: '10px', textTransform: 'none', '&:hover': { bgcolor: '#152150' } }}>
                {saving ? 'Adding…' : 'Add Faculty'}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Box>
    </Modal>
  );
}

export default function RegistrarFaculty() {
  const [teachers, setTeachers] = useState([]);
  const [subjectsByTeacher, setSubjectsByTeacher] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resTeachers, resSchedules] = await Promise.all([
        api.get('/teachers'),
        api.get('/schedules'),
      ]);
      setTeachers(resTeachers.data?.data ?? []);

      const bySubject = {};
      (resSchedules.data?.data ?? []).forEach((s) => {
        if (!s.teacherId || !s.subjectOffering?.subject?.name) return;
        if (!bySubject[s.teacherId]) bySubject[s.teacherId] = new Set();
        bySubject[s.teacherId].add(s.subjectOffering.subject.name);
      });
      const flattened = Object.fromEntries(
        Object.entries(bySubject).map(([id, set]) => [id, Array.from(set)])
      );
      setSubjectsByTeacher(flattened);
    } catch {
      showToast('Failed to load faculty.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const departments = useMemo(
    () => Array.from(new Set(teachers.map((t) => t.department?.name).filter(Boolean))).sort(),
    [teachers]
  );

  const totalUnits = useMemo(() => teachers.reduce((sum, t) => sum + (t.maxTeachingLoad ?? 0), 0), [teachers]);

  const filtered = useMemo(() => teachers.filter((t) => {
    const name = `${t.user?.firstName ?? ''} ${t.user?.lastName ?? ''}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || t.user?.email?.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === 'All' || t.department?.name === deptFilter;
    return matchSearch && matchDept;
  }), [teachers, search, deptFilter]);

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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="800" sx={{ color: 'text.primary' }}>Manage Faculty</Typography>
        <Button
          variant="contained" startIcon={<AddIcon />}
          onClick={() => setModalOpen(true)}
          sx={{ bgcolor: '#C49A3C', borderRadius: '10px', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#b8892e' } }}
        >
          Add Faculty
        </Button>
      </Box>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <StatCard label="Total Faculty" value={teachers.length} icon={<FacultyIcon sx={{ color: '#2563eb' }} />} iconBg="#dbeafe" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard label="Departments" value={departments.length} icon={<DeptIcon sx={{ color: '#db2777' }} />} iconBg="#fce7f3" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard label="Total Units Assigned" value={totalUnits} icon={<UnitsIcon sx={{ color: '#ea580c' }} />} iconBg="#ffedd5" />
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <TextField
            size="small" placeholder="Search faculty name or email…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1, minWidth: 220 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Department</InputLabel>
            <Select label="Department" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
              <MenuItem value="All">All Departments</MenuItem>
              {departments.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {['Name', 'Department', 'Email', 'Subjects', 'Max Load'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: 'text.secondary' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                    No faculty found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((t) => (
                  <TableRow key={t.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#1B2B5E', fontSize: '0.8rem' }}>
                          {t.user?.lastName?.[0]?.toUpperCase() ?? '?'}
                        </Avatar>
                        <Typography variant="body2" fontWeight={600}>{t.user?.firstName} {t.user?.lastName}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={t.department?.name ?? '—'} size="small" sx={{ bgcolor: 'action.hover' }} />
                    </TableCell>
                    <TableCell>{t.user?.email}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: 260 }}>
                        {(subjectsByTeacher[t.id] ?? []).length === 0 ? (
                          <Typography variant="caption" color="text.secondary">No current load</Typography>
                        ) : (
                          subjectsByTeacher[t.id].map((s) => (
                            <Chip key={s} label={s} size="small" sx={{ fontSize: '0.65rem', bgcolor: '#eff6ff', color: '#1d4ed8' }} />
                          ))
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{t.maxTeachingLoad} units</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          Showing {filtered.length} of {teachers.length} faculty members
        </Typography>
      </Paper>

      {modalOpen && (
        <AddFacultyModal
          departments={departments.length > 0 ? departments : ['Information Technology Dept']}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); showToast('Faculty added!', 'success'); fetchData(); }}
        />
      )}
    </Box>
  );
}
