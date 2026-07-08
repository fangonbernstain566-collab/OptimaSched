import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, CircularProgress,
} from '@mui/material';
import api from '../../services/api';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';

export default function CashierFaculty() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    api.get('/teachers')
      .then((res) => setTeachers(res.data?.data ?? []))
      .catch(() => showToast('Failed to load faculty list.', 'error'))
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
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Toast toast={toast} onClose={hideToast} />
      <Typography variant="h4" fontWeight="800" sx={{ mb: 0.5, color: '#1e293b' }}>Manage Faculty</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Read-only directory of registered instructors.
      </Typography>

      <Paper sx={{ borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {['Name', 'Email', 'Department', 'Max Load', 'Registered'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748b' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {teachers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                    No faculty registered yet.
                  </TableCell>
                </TableRow>
              ) : (
                teachers.map((t) => (
                  <TableRow key={t.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{t.user?.firstName} {t.user?.lastName}</TableCell>
                    <TableCell>{t.user?.email}</TableCell>
                    <TableCell>
                      <Chip label={t.department?.name ?? '—'} size="small" sx={{ bgcolor: '#f1f5f9' }} />
                    </TableCell>
                    <TableCell>{t.maxTeachingLoad} units</TableCell>
                    <TableCell>{t.user?.createdAt ? new Date(t.user.createdAt).toLocaleDateString() : '—'}</TableCell>
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
