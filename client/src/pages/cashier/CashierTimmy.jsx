import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, CircularProgress, Chip, Stack, Button } from '@mui/material';
import { AutoAwesome as TimmyIcon, Payments as MoneyIcon } from '@mui/icons-material';
import { getTimmyPaymentInsights } from '../../services/timmyApi';
import { updatePaymentStatus } from '../../services/paymentApi';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';

const fmt = (n) => `₱ ${Number(n ?? 0).toLocaleString('en-PH')}`;

const RANK_STYLES = {
  1: { solid: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  2: { solid: '#ea580c', bg: '#fff7ed', border: '#fdba74' },
  3: { solid: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  4: { solid: '#65a30d', bg: '#f7fee7', border: '#bef264' },
  5: { solid: '#65a30d', bg: '#f7fee7', border: '#bef264' },
};

const StatCard = ({ label, value, sub }) => (
  <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0', height: '100%' }}>
    <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>{label}</Typography>
    <Typography variant="h4" fontWeight="800" sx={{ color: '#1e293b', mt: 0.5 }}>{value}</Typography>
    {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
  </Paper>
);

export default function CashierTimmy() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast, showToast, hideToast } = useToast();

  const fetchInsights = () => {
    setLoading(true);
    getTimmyPaymentInsights()
      .then(setInsights)
      .catch(() => showToast('Timmy could not analyze outstanding payments.', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchInsights(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfirm = async (id) => {
    try {
      await updatePaymentStatus(id, 'CONFIRMED');
      showToast('Payment confirmed.', 'success');
      fetchInsights();
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Failed to confirm payment.', 'error');
    }
  };

  if (loading || !insights) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      <Toast toast={toast} onClose={hideToast} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <TimmyIcon sx={{ color: '#6d28d9' }} />
        <Typography variant="h4" fontWeight="800" sx={{ color: '#1e293b' }}>Ask Timmy</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Ranked follow-up priority for outstanding (pending) payments.
      </Typography>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <StatCard label="Total Outstanding" value={fmt(insights.totalOutstanding)} sub={`${insights.pendingCount} pending payment${insights.pendingCount === 1 ? '' : 's'}`} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard label="Pending Count" value={insights.pendingCount} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard label="Oldest Pending" value={`${insights.oldestDaysPending}d`} sub="days waiting" />
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 2 }}>Top Follow-ups</Typography>
        {insights.topFollowUps.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            No pending payments — nothing to follow up on.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {insights.topFollowUps.map((p) => {
              const style = RANK_STYLES[p.rank] ?? RANK_STYLES[5];
              return (
                <Paper key={p.id} variant="outlined" sx={{ p: 2, borderRadius: '12px', borderColor: style.border, bgcolor: style.bg }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Chip label={`#${p.rank}`} size="small" sx={{ bgcolor: style.solid, color: '#fff', fontWeight: 700 }} />
                        <Typography variant="body2" fontWeight="700">{p.studentName}</Typography>
                        <Typography variant="caption" color="text.secondary">({p.studentId})</Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" display="block">{p.reason}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                      <Typography variant="body1" fontWeight="800">{fmt(p.amount)}</Typography>
                      <Button size="small" onClick={() => handleConfirm(p.id)} sx={{ textTransform: 'none', fontWeight: 700, mt: 0.5 }}>
                        <MoneyIcon sx={{ fontSize: 14, mr: 0.5 }} /> Confirm
                      </Button>
                    </Box>
                  </Box>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
