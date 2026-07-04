import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  IconButton,
} from '@mui/material';
import {
  RestoreFromTrash as RestoreIcon,
  DeleteForever as DeleteForeverIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

export default function RecentlyDeletedTeachers() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [deletedTeachers, setDeletedTeachers] = useState([]);
  const { toast, showToast, hideToast } = useToast();

  const getAuthHeaders = () => {
    const token = localStorage.getItem('optimasched_token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };

  const fetchDeletedTeachers = async () => {
    setLoading(true);
    try {
      const config = getAuthHeaders();
      const response = await axios.get('/api/teachers/recently-deleted', config);
      setDeletedTeachers(response.data?.data ?? []);
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Failed to load recently deleted teachers.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeletedTeachers();
  }, []);

  const handleRestore = async (id) => {
    try {
      const config = getAuthHeaders();
      await axios.patch(`/api/teachers/${id}/restore`, {}, config);
      showToast('Teacher restored successfully.', 'success');
      fetchDeletedTeachers();
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Failed to restore teacher.', 'error');
    }
  };

  const handlePermanentDelete = async (id) => {
    const confirmed = window.confirm('Permanently delete this teacher? This action cannot be undone.');
    if (!confirmed) return;

    try {
      const config = getAuthHeaders();
      await axios.delete(`/api/teachers/${id}/permanent`, config);
      showToast('Teacher permanently deleted.', 'success');
      fetchDeletedTeachers();
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Failed to permanently delete teacher.', 'error');
    }
  };

  return (
    <Box sx={{ p: 4, minHeight: '100vh', bgcolor: '#f8fafc', mt: -4 }}>
      <Toast toast={toast} onClose={hideToast} />

      <Box sx={{ maxWidth: '1300px', mx: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" fontWeight="800" sx={{ color: '#1e293b' }}>
            Recently Deleted Teachers
          </Typography>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/teachers')}
            sx={{ borderRadius: '10px', textTransform: 'none' }}
          >
            Back to Manage Teachers
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Paper sx={{ borderRadius: '16px', overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                  {['Name', 'Email', 'Department', 'Max Load', 'Date Deleted', 'Actions'].map((header) => (
                    <TableCell key={header} sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                      {header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {deletedTeachers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6, color: '#94a3b8' }}>
                      No recently deleted teachers.
                    </TableCell>
                  </TableRow>
                ) : (
                  deletedTeachers.map((teacher) => (
                    <TableRow key={teacher.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {teacher.user?.firstName} {teacher.user?.lastName}
                      </TableCell>
                      <TableCell>{teacher.user?.email ?? '—'}</TableCell>
                      <TableCell>{teacher.department?.name ?? '—'}</TableCell>
                      <TableCell>{teacher.maxTeachingLoad} Units</TableCell>
                      <TableCell>{formatDateTime(teacher.deletedAt)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="Restore">
                            <IconButton
                              size="small"
                              onClick={() => handleRestore(teacher.id)}
                              sx={{ color: '#16a34a' }}
                            >
                              <RestoreIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Permanently">
                            <IconButton
                              size="small"
                              onClick={() => handlePermanentDelete(teacher.id)}
                              sx={{ color: '#ef4444' }}
                            >
                              <DeleteForeverIcon fontSize="small" />
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
        )}
      </Box>
    </Box>
  );
}
