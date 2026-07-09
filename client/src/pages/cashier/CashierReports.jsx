import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, CircularProgress } from '@mui/material';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { getPaymentStats } from '../../services/paymentApi';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';

const fmt = (n) => `₱ ${Number(n ?? 0).toLocaleString('en-PH')}`;

const METHOD_LABELS = { CASH: 'Cash', GCASH: 'GCash', BANK_TRANSFER: 'Bank Transfer' };
const PIE_COLORS = ['#1e2d6e', '#c9a227', '#6366f1', '#ec4899', '#10b981', '#f97316'];

const SummaryTile = ({ label, value }) => (
  <Box>
    <Typography variant="caption" fontWeight="700" color="text.secondary" textTransform="uppercase" letterSpacing="0.05em">
      {label}
    </Typography>
    <Typography variant="h6" fontWeight="800">{value}</Typography>
  </Box>
);

export default function CashierReports() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    getPaymentStats()
      .then(setStats)
      .catch(() => showToast('Failed to load reports.', 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !stats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  const yearTotal = stats.monthly.reduce((sum, m) => sum + m.amount, 0);

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      <Toast toast={toast} onClose={hideToast} />
      <Typography variant="h4" fontWeight="800" sx={{ mb: 0.5, color: 'text.primary' }}>Reports</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Year-to-date collections summary.
      </Typography>

      <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid', borderColor: 'divider', mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={6} sm={3}><SummaryTile label="Year-to-date" value={fmt(yearTotal)} /></Grid>
          <Grid item xs={6} sm={3}><SummaryTile label="Today" value={fmt(stats.todayCollected)} /></Grid>
          <Grid item xs={6} sm={3}><SummaryTile label="Pending" value={stats.pendingCount} /></Grid>
          <Grid item xs={6} sm={3}><SummaryTile label="Outstanding students" value={stats.outstandingStudents} /></Grid>
        </Grid>
      </Paper>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 2 }}>Monthly Collections ({new Date().getFullYear()})</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.monthly} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                <ChartTooltip formatter={(v) => fmt(v)} />
                <Bar dataKey="amount" fill="#1e2d6e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 2 }}>Payment Method Breakdown</Typography>
            {stats.byMethod.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">No confirmed payments yet.</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={stats.byMethod} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45}>
                    {stats.byMethod.map((entry, i) => <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 12 }}>{METHOD_LABELS[v] ?? v}</span>} />
                  <ChartTooltip formatter={(v) => `${v}%`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
