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
import { listDeletedPayments, restorePayment, permanentDeletePayment } from '../../services/paymentApi';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';

const fmt = (n) => `₱ ${Number(n ?? 0).toLocaleString('en-PH')}`;

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

export default function CashierRecentlyDeleted() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [deleted, setDeleted] = useState([]);
  const { toast, showToast, hideToast } = useToast();

  const fetchDeleted = async () => {
    setLoading(true);
    try {
      setDeleted(await listDeletedPayments());
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Failed to load recently deleted payments.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDeleted(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRestore = async (id) => {
    try {
      await restorePayment(id);
      showToast('Payment restored.', 'success');
      fetchDeleted();
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Failed to restore payment.', 'error');
    }
  };

  const handlePermanentDelete = async (id) => {
    if (!window.confirm('Permanently delete this payment? This action cannot be undone.')) return;
    try {
      await permanentDeletePayment(id);
      showToast('Payment permanently deleted.', 'success');
      fetchDeleted();
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Failed to permanently delete payment.', 'error');
    }
  };

  return (
    <Box sx={{ maxWidth: 1300, mx: 'auto' }}>
      <Toast toast={toast} onClose={hideToast} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" fontWeight="800" sx={{ color: '#1e293b' }}>
          Recently Deleted Payments
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/cashier/dashboard')}
          sx={{ borderRadius: '10px', textTransform: 'none' }}
        >
          Back to Payment Dashboard
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ borderRadius: '16px', overflowX: 'auto', border: '1px solid #e2e8f0' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                {['Student', 'Amount', 'Type', 'Method', 'Date Deleted', 'Actions'].map((header) => (
                  <TableCell key={header} sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>{header}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {deleted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: '#94a3b8' }}>
                    No recently deleted payments.
                  </TableCell>
                </TableRow>
              ) : (
                deleted.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{p.studentName} ({p.studentId})</TableCell>
                    <TableCell>{fmt(p.amount)}</TableCell>
                    <TableCell>{p.type.replace(/_/g, ' ')}</TableCell>
                    <TableCell>{p.method.replace(/_/g, ' ')}</TableCell>
                    <TableCell>{formatDateTime(p.deletedAt)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Restore">
                          <IconButton size="small" onClick={() => handleRestore(p.id)} sx={{ color: '#16a34a' }}>
                            <RestoreIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Permanently">
                          <IconButton size="small" onClick={() => handlePermanentDelete(p.id)} sx={{ color: '#ef4444' }}>
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
