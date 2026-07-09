import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, CircularProgress,
} from '@mui/material';
import api from '../../services/api';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';

export default function CashierClasses() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    api.get('/schedules')
      .then((res) => setSchedules((res.data?.data ?? []).filter((s) => s.status !== 'PENDING')))
      .catch(() => showToast('Failed to load class list.', 'error'))
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
      <Typography variant="h4" fontWeight="800" sx={{ mb: 0.5, color: 'text.primary' }}>Manage Class List</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Read-only roster of currently placed classes.
      </Typography>

      <Paper sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {['Class Code', 'Subject', 'Instructor', 'Section', 'Enrolled', 'Schedule', 'Room'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: 'text.secondary' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {schedules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                    No classes placed yet.
                  </TableCell>
                </TableRow>
              ) : (
                schedules.map((s) => (
                  <TableRow key={s.id} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{s.subjectOffering?.classCode ?? '—'}</TableCell>
                    <TableCell>{s.subjectOffering?.subject?.name ?? '—'}</TableCell>
                    <TableCell>
                      {s.teacher?.user ? `${s.teacher.user.firstName} ${s.teacher.user.lastName}` : '—'}
                    </TableCell>
                    <TableCell>{s.section?.name ?? '—'}</TableCell>
                    <TableCell>
                      <Chip label={`${s.studentCount ?? 0}`} size="small" sx={{ bgcolor: 'action.hover' }} />
                    </TableCell>
                    <TableCell>{s.dayOfWeek} {s.startTime}–{s.endTime}</TableCell>
                    <TableCell>{s.room?.name ?? '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
