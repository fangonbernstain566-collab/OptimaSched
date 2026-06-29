import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell,
  TableHead, TableRow, Modal, TextField, MenuItem, Stack,
  CircularProgress, IconButton, Chip, Tooltip, Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';

const DAYS      = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = ['07:30', '09:00', '10:30', '12:00', '13:30', '15:00', '16:30'];

const STATUS_COLORS = {
  PENDING:   'warning',
  SCHEDULED: 'success',
  DRAFT:     'default',
  ACTIVE:    'primary',
  ARCHIVED:  'error',
};

const INITIAL_FORM = {
  teacherId: '', roomId: '', sectionId: '', subjectOfferingId: '',
  schoolYearId: '', semesterId: '', dayOfWeek: 'Monday',
  startTime: '', endTime: '',
  studentCount: '',   // ✅ NEW
};

const Schedules = () => {
  const [schedules, setSchedules]   = useState([]);
  const [options, setOptions]       = useState({
    teachers: [], rooms: [], sections: [],
    subjectOfferings: [], schoolYears: [], semesters: [],
  });
  const [open, setOpen]             = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [formData, setFormData]     = useState(INITIAL_FORM);
  const [loading, setLoading]       = useState(false);
  const [deleteId, setDeleteId]     = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { toast, showToast, hideToast } = useToast();

  // ─── Auth Helper ──────────────────────────────────────────────────────────
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };

  // ─── Fetch All Data ───────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      const config = getAuthHeaders();
      const [resSched, resOpt] = await Promise.all([
        axios.get('/api/schedules', config),
        axios.get('/api/schedules/options', config),
      ]);

      const rawOpt = resOpt.data?.data ?? resOpt.data ?? {};
      setSchedules(resSched.data?.data ?? []);
      setOptions({
        teachers:         Array.isArray(rawOpt.teachers)         ? rawOpt.teachers         : [],
        rooms:            Array.isArray(rawOpt.rooms)            ? rawOpt.rooms            : [],
        sections:         Array.isArray(rawOpt.sections)         ? rawOpt.sections         : [],
        subjectOfferings: Array.isArray(rawOpt.subjectOfferings) ? rawOpt.subjectOfferings : [],
        schoolYears:      Array.isArray(rawOpt.schoolYears)      ? rawOpt.schoolYears      : [],
        semesters:        Array.isArray(rawOpt.semesters)        ? rawOpt.semesters        : [],
      });
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Failed to load schedule data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ─── Form Helpers ─────────────────────────────────────────────────────────
  const handleChange = (field) => (e) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  const openCreate = () => {
    setEditTarget(null);
    setFormData(INITIAL_FORM);
    setOpen(true);
  };

  const openEdit = (schedule) => {
    setEditTarget(schedule);
    setFormData({
      teacherId:         schedule.teacherId,
      roomId:            schedule.roomId,
      sectionId:         schedule.sectionId,
      subjectOfferingId: schedule.subjectOfferingId,
      schoolYearId:      schedule.schoolYearId,
      semesterId:        schedule.semesterId,
      dayOfWeek:         schedule.dayOfWeek,
      startTime:         schedule.startTime,
      endTime:           schedule.endTime,
      studentCount:      schedule.studentCount ?? '',   // ✅ NEW
      status:            schedule.status,
    });
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setEditTarget(null);
    setFormData(INITIAL_FORM);
  };

  // ─── Validate Form ────────────────────────────────────────────────────────
  const validateForm = () => {
    const required = [
      'teacherId', 'roomId', 'sectionId', 'subjectOfferingId',
      'schoolYearId', 'semesterId', 'dayOfWeek', 'startTime', 'endTime',
    ];
    const missing = required.filter((f) => !formData[f]);
    if (missing.length > 0) {
      showToast(`Please fill in: ${missing.join(', ')}`, 'warning');
      return false;
    }
    if (!formData.studentCount || Number(formData.studentCount) < 1) {
      showToast('Student count must be at least 1.', 'warning');
      return false;
    }
    return true;
  };

  // ─── Create ───────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!validateForm()) return;
    try {
      const config = getAuthHeaders();
      const res = await axios.post('/api/schedules', formData, config);
      showToast(res.data.message ?? 'Schedule created!', 'success');
      closeModal();
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Failed to create schedule.', 'error');
    }
  };

  // ─── Update ───────────────────────────────────────────────────────────────
  const handleUpdate = async () => {
    if (!validateForm()) return;
    try {
      const config = getAuthHeaders();
      const res = await axios.put(`/api/schedules/${editTarget.id}`, formData, config);
      showToast(res.data.message ?? 'Schedule updated!', 'success');
      closeModal();
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Failed to update schedule.', 'error');
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    editTarget ? handleUpdate() : handleCreate();
  };

  // ─── Delete ───────────────────────────────────────────────────────────────
  const askDelete = (id) => { setDeleteId(id); setDeleteOpen(true); };

  const confirmDelete = async () => {
    try {
      const config = getAuthHeaders();
      await axios.delete(`/api/schedules/${deleteId}`, config);
      showToast('Schedule deleted successfully!', 'success');
      setDeleteOpen(false);
      setDeleteId(null);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Failed to delete schedule.', 'error');
    }
  };

  // ─── Matrix Lookup ────────────────────────────────────────────────────────
  const getScheduleForSlot = (day, time) =>
    schedules.find((s) => s.dayOfWeek === day && s.startTime?.startsWith(time));

  // ─── Shared Form ─────────────────────────────────────────────────────────
  const renderForm = () => (
    <form onSubmit={handleSave}>
      <Stack spacing={2.5}>

        {/* Teacher */}
        <TextField select fullWidth required label="Teacher"
          value={formData.teacherId} onChange={handleChange('teacherId')}>
          {options.teachers.length > 0
            ? options.teachers.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.user ? `${t.user.firstName} ${t.user.lastName}` : 'Unnamed Teacher'}
                </MenuItem>
              ))
            : <MenuItem disabled>No Teachers Available</MenuItem>}
        </TextField>

        {/* Room + Section */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField select fullWidth required label="Room"
            value={formData.roomId} onChange={handleChange('roomId')}>
            {options.rooms.length > 0
              ? options.rooms.map((r) => (
                  <MenuItem key={r.id} value={r.id}>
                    {r.name} {r.capacity ? `(Cap: ${r.capacity})` : ''}
                  </MenuItem>
                ))
              : <MenuItem disabled>No Rooms Available</MenuItem>}
          </TextField>

          <TextField select fullWidth required label="Section"
            value={formData.sectionId} onChange={handleChange('sectionId')}>
            {options.sections.length > 0
              ? options.sections.map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                ))
              : <MenuItem disabled>No Sections Available</MenuItem>}
          </TextField>
        </Box>

        {/* Subject Offering */}
        <TextField select fullWidth required label="Subject Offering"
          value={formData.subjectOfferingId} onChange={handleChange('subjectOfferingId')}>
          {options.subjectOfferings.length > 0
            ? options.subjectOfferings.map((so) => (
                <MenuItem key={so.id} value={so.id}>
                  {so.subject?.name ?? `Offering #${so.id}`}
                </MenuItem>
              ))
            : <MenuItem disabled>No Subject Offerings Available</MenuItem>}
        </TextField>

        {/* School Year + Semester */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField select fullWidth required label="School Year"
            value={formData.schoolYearId} onChange={handleChange('schoolYearId')}>
            {options.schoolYears.length > 0
              ? options.schoolYears.map((sy) => (
                  <MenuItem key={sy.id} value={sy.id}>
                    {sy.name}{sy.isCurrent ? ' (Current)' : ''}
                  </MenuItem>
                ))
              : <MenuItem disabled>No School Years Available</MenuItem>}
          </TextField>

          <TextField select fullWidth required label="Semester"
            value={formData.semesterId} onChange={handleChange('semesterId')}>
            {options.semesters.length > 0
              ? options.semesters.map((sem) => (
                  <MenuItem key={sem.id} value={sem.id}>
                    {sem.name}{sem.isCurrent ? ' (Current)' : ''}
                  </MenuItem>
                ))
              : <MenuItem disabled>No Semesters Available</MenuItem>}
          </TextField>
        </Box>

        {/* ✅ NEW: Student Count */}
        <TextField
          fullWidth required
          type="number"
          label="Number of Students"
          value={formData.studentCount}
          onChange={handleChange('studentCount')}
          inputProps={{ min: 1, max: 999 }}
          helperText="Used for room capacity check in the Schedule Plotter"
        />

        {/* Day of Week */}
        <TextField select fullWidth required label="Day of Week"
          value={formData.dayOfWeek} onChange={handleChange('dayOfWeek')}>
          {DAYS.map((day) => <MenuItem key={day} value={day}>{day}</MenuItem>)}
        </TextField>

        {/* Time Range */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField fullWidth required label="Start Time" type="time"
            InputLabelProps={{ shrink: true }}
            value={formData.startTime} onChange={handleChange('startTime')} />
          <TextField fullWidth required label="End Time" type="time"
            InputLabelProps={{ shrink: true }}
            value={formData.endTime} onChange={handleChange('endTime')} />
        </Box>

        {/* Status — Edit mode only */}
        {editTarget && (
          <TextField select fullWidth label="Status"
            value={formData.status} onChange={handleChange('status')}>
            {['PENDING', 'SCHEDULED', 'DRAFT', 'ACTIVE', 'ARCHIVED'].map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </TextField>
        )}

        <Button fullWidth variant="contained" type="submit"
          sx={{ py: 1.5, bgcolor: '#2563eb', borderRadius: '10px', textTransform: 'none' }}>
          {editTarget ? 'Update Schedule' : 'Save Schedule'}
        </Button>
      </Stack>
    </form>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: 4, minHeight: '100vh', bgcolor: '#f8fafc', mt: -4, mx: -4 }}>

      <Toast toast={toast} onClose={hideToast} />

      <Box sx={{ maxWidth: '1300px', mx: 'auto' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" fontWeight="800" sx={{ color: '#1e293b' }}>
            Manage Schedules
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
            sx={{ bgcolor: '#2563eb', borderRadius: '12px', textTransform: 'none' }}>
            Add New Schedule
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Weekly Matrix */}
            <Typography variant="h6" fontWeight="700" sx={{ mb: 1.5, color: '#334155' }}>
              Weekly Overview
            </Typography>
            <Paper sx={{ p: 3, borderRadius: '16px', mb: 4, overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>Time</TableCell>
                    {DAYS.map((day) => (
                      <TableCell key={day} align="center" sx={{ fontWeight: 'bold' }}>{day}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {TIME_SLOTS.map((time) => (
                    <TableRow key={time}>
                      <TableCell sx={{ fontWeight: '600', color: '#64748b' }}>{time}</TableCell>
                      {DAYS.map((day) => {
                        const match = getScheduleForSlot(day, time);
                        return (
                          <TableCell key={day} align="center"
                            sx={{ bgcolor: match ? '#eff6ff' : 'transparent' }}>
                            {match ? (
                              <Box>
                                <Typography variant="caption" fontWeight="700" display="block">
                                  {match.subjectOffering?.subject?.name ?? 'Class'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {match.room?.name}
                                </Typography>
                              </Box>
                            ) : '—'}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>

            {/* Records Table */}
            <Typography variant="h6" fontWeight="700" sx={{ mb: 1.5, color: '#334155' }}>
              Schedule Records ({schedules.length})
            </Typography>
            <Paper sx={{ borderRadius: '16px', overflowX: 'auto' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                    {['Subject', 'Teacher', 'Room', 'Section', 'Students', 'Day', 'Time', 'School Year', 'Semester', 'Status', 'Actions'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {schedules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} align="center" sx={{ py: 6, color: '#94a3b8' }}>
                        No schedules yet. Click "Add New Schedule" to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    schedules.map((s) => (
                      <TableRow key={s.id} hover>
                        <TableCell sx={{ fontWeight: '600' }}>
                          {s.subjectOffering?.subject?.name ?? '—'}
                        </TableCell>
                        <TableCell>
                          {s.teacher?.user
                            ? `${s.teacher.user.firstName} ${s.teacher.user.lastName}`
                            : '—'}
                        </TableCell>
                        <TableCell>{s.room?.name ?? '—'}</TableCell>
                        <TableCell>{s.section?.name ?? '—'}</TableCell>
                        {/* ✅ NEW column */}
                        <TableCell align="center">
                          <Chip
                            label={s.studentCount ?? 0}
                            size="small"
                            sx={{ bgcolor: '#eff6ff', color: '#2563eb', fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell>{s.dayOfWeek}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {s.startTime} – {s.endTime}
                        </TableCell>
                        <TableCell>{s.schoolYear?.name ?? '—'}</TableCell>
                        <TableCell>{s.semester?.name ?? '—'}</TableCell>
                        <TableCell>
                          <Chip
                            label={s.status}
                            color={STATUS_COLORS[s.status] ?? 'default'}
                            size="small"
                            sx={{ fontWeight: '700', fontSize: '0.7rem' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => openEdit(s)}
                                sx={{ color: '#2563eb' }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" onClick={() => askDelete(s.id)}
                                sx={{ color: '#ef4444' }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Paper>
          </>
        )}

        {/* Create / Edit Modal */}
        <Modal open={open} onClose={closeModal}
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{
            p: 4, bgcolor: 'background.paper', width: '100%',
            maxWidth: '500px', borderRadius: '20px',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            <Typography variant="h6" fontWeight="800" sx={{ mb: 3 }}>
              {editTarget ? 'Edit Schedule' : 'Create New Schedule'}
            </Typography>
            {renderForm()}
          </Box>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)}
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{
            p: 4, bgcolor: 'background.paper', width: '100%',
            maxWidth: '400px', borderRadius: '20px', textAlign: 'center',
          }}>
            <Typography variant="h6" fontWeight="800" sx={{ mb: 1 }}>
              Delete Schedule?
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              This action cannot be undone. The schedule will be permanently removed.
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button variant="outlined" onClick={() => setDeleteOpen(false)}
                sx={{ borderRadius: '10px', textTransform: 'none', px: 3 }}>
                Cancel
              </Button>
              <Button variant="contained" onClick={confirmDelete}
                sx={{ bgcolor: '#ef4444', borderRadius: '10px', textTransform: 'none', px: 3,
                  '&:hover': { bgcolor: '#dc2626' } }}>
                Yes, Delete
              </Button>
            </Box>
          </Box>
        </Modal>

      </Box>
    </Box>
  );
};

export default Schedules;