import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Button, Modal, Stack, TextField,
  Select, MenuItem, InputLabel, FormControl, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, CircularProgress, Divider, IconButton,
} from '@mui/material';
import {
  Payments as PaymentsIcon,
  Schedule as PendingIcon,
  CheckCircle as ConfirmedIcon,
  WarningAmber as OutstandingIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';
import { getPaymentStats, listPayments, createPayment, updatePaymentStatus, deletePayment } from '../../services/paymentApi';

const fmt = (n) => `₱ ${Number(n ?? 0).toLocaleString('en-PH')}`;

const TYPE_OPTIONS = [
  { value: 'TUITION_FEE',     label: 'Tuition Fee' },
  { value: 'MISCELLANEOUS',   label: 'Miscellaneous' },
  { value: 'LAB_FEE',         label: 'Lab Fee' },
  { value: 'ENROLLMENT_FEE',  label: 'Enrollment Fee' },
  { value: 'PARTIAL_PAYMENT', label: 'Partial Payment' },
  { value: 'ID_FEE',          label: 'ID Fee' },
  { value: 'OTHER',           label: 'Other' },
];

const METHOD_OPTIONS = [
  { value: 'CASH',          label: 'Cash' },
  { value: 'GCASH',         label: 'GCash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
];

const typeLabel = (v) => TYPE_OPTIONS.find((t) => t.value === v)?.label ?? v;
const methodLabel = (v) => METHOD_OPTIONS.find((m) => m.value === v)?.label ?? v;

const STATUS_COLORS = { PENDING: 'warning', CONFIRMED: 'success', CANCELLED: 'default' };

const PIE_COLORS = ['#1e2d6e', '#c9a227', '#6366f1', '#ec4899', '#10b981', '#f97316'];

const StatCard = ({ label, value, sub, icon, iconBg, iconColor }) => (
  <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', height: '100%' }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, maxWidth: '70%' }}>{label}</Typography>
      <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </Box>
    </Box>
    <Typography variant="h4" fontWeight="800" sx={{ color: 'text.primary' }}>{value}</Typography>
    {sub && (
      <Chip label={sub} size="small" sx={{ mt: 1, bgcolor: 'action.hover', color: 'text.secondary', fontWeight: 600, fontSize: '0.7rem' }} />
    )}
  </Paper>
);

function NewPaymentModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ studentName: '', studentId: '', type: 'TUITION_FEE', amount: '', method: 'CASH', status: 'CONFIRMED' });
  const [saving, setSaving] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.studentName || !form.studentId || !form.amount) {
      showToast('Please fill in student name, ID, and amount.', 'error');
      return;
    }
    setSaving(true);
    try {
      await createPayment({ ...form, amount: parseFloat(form.amount) });
      onSaved();
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Failed to record payment.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Box sx={{ width: '100%', maxWidth: 420, bgcolor: 'background.paper', borderRadius: '20px', p: 4 }}>
        <Toast toast={toast} onClose={hideToast} />
        <Typography variant="h6" fontWeight="800" sx={{ mb: 3 }}>New Payment Entry</Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2.5}>
            <TextField
              label="Student Name" fullWidth required
              value={form.studentName}
              onChange={(e) => setForm((f) => ({ ...f, studentName: e.target.value }))}
            />
            <TextField
              label="Student ID" fullWidth required placeholder="e.g. 2023-0001"
              value={form.studentId}
              onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
            />
            <FormControl fullWidth>
              <InputLabel>Payment Type</InputLabel>
              <Select label="Payment Type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                {TYPE_OPTIONS.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField
              label="Amount (₱)" type="number" fullWidth required
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
            <FormControl fullWidth>
              <InputLabel>Payment Method</InputLabel>
              <Select label="Payment Method" value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}>
                {METHOD_OPTIONS.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select label="Status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                <MenuItem value="CONFIRMED">Confirmed</MenuItem>
                <MenuItem value="PENDING">Pending</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
              <Button fullWidth variant="outlined" onClick={onClose} sx={{ borderRadius: '10px', textTransform: 'none' }}>Cancel</Button>
              <Button fullWidth type="submit" variant="contained" disabled={saving} sx={{ bgcolor: '#1e2d6e', borderRadius: '10px', textTransform: 'none', '&:hover': { bgcolor: '#162347' } }}>
                {saving ? 'Saving…' : 'Save Payment'}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Box>
    </Modal>
  );
}

export default function CashierDashboard() {
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsData, txData] = await Promise.all([
        getPaymentStats(),
        listPayments({ page: 1, pageSize: 8 }),
      ]);
      setStats(statsData);
      setTransactions(txData.payments ?? []);
    } catch {
      showToast('Failed to load payment dashboard.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleConfirm = async (id) => {
    try {
      await updatePaymentStatus(id, 'CONFIRMED');
      showToast('Payment confirmed.', 'success');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Failed to confirm payment.', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Move this payment to Recently Deleted?')) return;
    try {
      await deletePayment(id);
      showToast('Payment moved to Recently Deleted.', 'success');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Failed to delete payment.', 'error');
    }
  };

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
        <Typography variant="h4" fontWeight="800" sx={{ color: 'text.primary' }}>Payment Dashboard</Typography>
        <Button
          variant="contained" startIcon={<AddIcon />}
          onClick={() => setModalOpen(true)}
          sx={{ bgcolor: '#c9a227', borderRadius: '10px', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#b8892e' } }}
        >
          New Payment
        </Button>
      </Box>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Today's Collections" value={fmt(stats.todayCollected)} sub="Confirmed today" icon={<PaymentsIcon sx={{ color: '#2563eb' }} />} iconBg="#dbeafe" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Pending Transactions" value={stats.pendingCount} sub="Awaiting confirmation" icon={<PendingIcon sx={{ color: '#7c3aed' }} />} iconBg="#ede9fe" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Confirmed Payments" value={stats.confirmedTodayCount} sub="Verified today" icon={<ConfirmedIcon sx={{ color: '#db2777' }} />} iconBg="#fce7f3" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Outstanding Balances" value={stats.outstandingStudents} sub="Students w/ due" icon={<OutstandingIcon sx={{ color: '#ea580c' }} />} iconBg="#ffedd5" />
        </Grid>
      </Grid>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 2 }}>Weekly Collections</Typography>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.weekly} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                <ChartTooltip formatter={(v) => fmt(v)} />
                <Bar dataKey="amount" fill="#1e2d6e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 2 }}>Payment Type Breakdown</Typography>
            {stats.byType.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">No confirmed payments yet.</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={stats.byType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                    {stats.byType.map((entry, i) => <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 12 }}>{typeLabel(v)}</span>} />
                  <ChartTooltip formatter={(v) => `${v}%`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 2 }}>Recent Transactions</Typography>
        {transactions.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            No payments recorded yet.
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Student', 'Student ID', 'Amount', 'Type', 'Method', 'Status', 'Recorded', ''].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: 'text.secondary' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id} hover>
                    <TableCell>{tx.studentName}</TableCell>
                    <TableCell>{tx.studentId}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{fmt(tx.amount)}</TableCell>
                    <TableCell>{typeLabel(tx.type)}</TableCell>
                    <TableCell>{methodLabel(tx.method)}</TableCell>
                    <TableCell>
                      <Chip label={tx.status} size="small" color={STATUS_COLORS[tx.status]} variant="outlined" />
                    </TableCell>
                    <TableCell>{new Date(tx.createdAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {tx.status === 'PENDING' && (
                          <Button size="small" onClick={() => handleConfirm(tx.id)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                            Confirm
                          </Button>
                        )}
                        <IconButton size="small" onClick={() => handleDelete(tx.id)} title="Delete" sx={{ color: '#ef4444' }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {modalOpen && (
        <NewPaymentModal
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); showToast('Payment recorded!', 'success'); fetchData(); }}
        />
      )}
    </Box>
  );
}
