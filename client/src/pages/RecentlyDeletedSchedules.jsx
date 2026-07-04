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

export default function RecentlyDeletedSchedules() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [deletedSchedules, setDeletedSchedules] = useState([]);
  const { toast, showToast, hideToast } = useToast();

  const getAuthHeaders = () => {
    const token = localStorage.getItem('optimasched_token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };

  const fetchDeletedSchedules = async () => {
    setLoading(true);
    try {
      const config = getAuthHeaders();
      const response = await axios.get('/api/schedules/recently-deleted', config);
      setDeletedSchedules(response.data?.data ?? []);
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Failed to load recently deleted schedules.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeletedSchedules();
  }, []);

  const handleRestore = async (id) => {
    try {
      const config = getAuthHeaders();
      await axios.patch(`/api/schedules/${id}/restore`, {}, config);
      showToast('Schedule restored successfully.', 'success');
      fetchDeletedSchedules();
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Failed to restore schedule.', 'error');
    }
  };

  const handlePermanentDelete = async (id) => {
    const confirmed = window.confirm('Permanently delete this schedule? This action cannot be undone.');
    if (!confirmed) return;

    try {
      const config = getAuthHeaders();
      await axios.delete(`/api/schedules/${id}/permanent`, config);
      showToast('Schedule permanently deleted.', 'success');
      fetchDeletedSchedules();
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Failed to permanently delete schedule.', 'error');
    }
  };

  return (
    <Box sx={{ p: 4, minHeight: '100vh', bgcolor: '#f8fafc', mt: -4 }}>
      <Toast toast={toast} onClose={hideToast} />

      <Box sx={{ maxWidth: '1300px', mx: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" fontWeight="800" sx={{ color: '#1e293b' }}>
            Recently Deleted Schedules
          </Typography>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/schedules')}
            sx={{ borderRadius: '10px', textTransform: 'none' }}
          >
            Back to Manage Schedules
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
                  {['Schedule Name', 'Room', 'Semester', 'School Year', 'Date Deleted', 'Actions'].map((header) => (
                    <TableCell key={header} sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                      {header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {deletedSchedules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6, color: '#94a3b8' }}>
                      No recently deleted schedules.
                    </TableCell>
                  </TableRow>
                ) : (
                  deletedSchedules.map((schedule) => (
                    <TableRow key={schedule.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {schedule.subjectOffering?.subject?.name ?? '—'}
                      </TableCell>
                      <TableCell>{schedule.room?.name ?? '—'}</TableCell>
                      <TableCell>{schedule.semester?.name ?? '—'}</TableCell>
                      <TableCell>{schedule.schoolYear?.name ?? '—'}</TableCell>
                      <TableCell>{formatDateTime(schedule.deletedAt)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="Restore">
                            <IconButton
                              size="small"
                              onClick={() => handleRestore(schedule.id)}
                              sx={{ color: '#16a34a' }}
                            >
                              <RestoreIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Permanently">
                            <IconButton
                              size="small"
                              onClick={() => handlePermanentDelete(schedule.id)}
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
