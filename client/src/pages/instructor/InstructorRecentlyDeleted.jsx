import React, { useEffect, useState } from 'react';
import {
  Box, Button, CircularProgress, Paper, Table, TableBody, TableCell,
  TableHead, TableRow, Tooltip, Typography, IconButton,
} from '@mui/material';
import {
  RestoreFromTrash as RestoreIcon,
  DeleteForever as DeleteForeverIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getMyDeletedRequests, restoreRequest, permanentDeleteRequest } from '../../services/scheduleRequestApi';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

const formatTime = (time) => {
  if (!time) return time;
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

export default function InstructorRecentlyDeleted() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [deleted, setDeleted] = useState([]);
  const { toast, showToast, hideToast } = useToast();

  const fetchDeleted = async () => {
    setLoading(true);
    try {
      setDeleted(await getMyDeletedRequests());
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Failed to load recently deleted requests.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDeleted(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRestore = async (id) => {
    try {
      await restoreRequest(id);
      showToast('Request restored to Pending.', 'success');
      fetchDeleted();
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Failed to restore request.', 'error');
    }
  };

  const handlePermanentDelete = async (id) => {
    if (!window.confirm('Permanently delete this request? This action cannot be undone.')) return;
    try {
      await permanentDeleteRequest(id);
      showToast('Request permanently deleted.', 'success');
      fetchDeleted();
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Failed to permanently delete request.', 'error');
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Toast toast={toast} onClose={hideToast} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" fontWeight="800" sx={{ color: '#1B2B5E' }}>
          Recently Deleted Requests
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/my-schedules')}
          sx={{ borderRadius: '10px', textTransform: 'none' }}
        >
          Back to My Schedules
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ borderRadius: '16px', overflowX: 'auto', border: '1px solid', borderColor: 'divider' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                {['Subject', 'Section', 'Day / Time', 'Date Cancelled', 'Actions'].map((header) => (
                  <TableCell key={header} sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>{header}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {deleted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.disabled' }}>
                    No recently cancelled requests.
                  </TableCell>
                </TableRow>
              ) : (
                deleted.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{r.subjectOffering?.subject?.name ?? '—'}</TableCell>
                    <TableCell>{r.section?.name ?? '—'}</TableCell>
                    <TableCell>{r.dayOfWeek} {formatTime(r.startTime)}–{formatTime(r.endTime)}</TableCell>
                    <TableCell>{formatDateTime(r.deletedAt)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Restore to Pending">
                          <IconButton size="small" onClick={() => handleRestore(r.id)} sx={{ color: '#16a34a' }}>
                            <RestoreIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Permanently">
                          <IconButton size="small" onClick={() => handlePermanentDelete(r.id)} sx={{ color: '#ef4444' }}>
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
  );
}
