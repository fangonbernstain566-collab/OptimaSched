import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, CircularProgress, LinearProgress, Stack, Chip } from '@mui/material';
import { AutoAwesome as TimmyIcon, WarningAmber as WarnIcon, CheckCircle as OkIcon } from '@mui/icons-material';
import { getTimmyInstructorInsights } from '../../services/timmyApi';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';

const WARNING_STYLES = {
  OVERLOAD:         { color: '#dc2626', bg: '#fef2f2', label: 'Overload' },
  NEAR_CAPACITY:    { color: '#d97706', bg: '#fffbeb', label: 'Near Capacity' },
  TIGHT_TRANSITION: { color: '#7c3aed', bg: '#f5f3ff', label: 'Tight Transition' },
};

export default function InstructorTimmy() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    getTimmyInstructorInsights()
      .then(setInsights)
      .catch((err) => {
        setError(err.response?.data?.message ?? 'Timmy could not analyze your schedule.');
        showToast('Failed to load Timmy insights.', 'error');
      })
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

  if (error || !insights) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
        <Toast toast={toast} onClose={hideToast} />
        <Typography variant="body1" color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
          {error ?? 'No insights available.'}
        </Typography>
      </Box>
    );
  }

  const loadColor = insights.loadPercentage >= 100 ? '#dc2626' : insights.loadPercentage >= 85 ? '#d97706' : '#16a34a';

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Toast toast={toast} onClose={hideToast} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <TimmyIcon sx={{ color: '#6d28d9' }} />
        <Typography variant="h4" fontWeight="800" sx={{ color: 'text.primary' }}>Ask Timmy</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Load and transition analysis for your own placed schedule.
      </Typography>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>Teaching Load</Typography>
            <Typography variant="h4" fontWeight="800" sx={{ color: loadColor }}>
              {insights.currentUnits} / {insights.maxTeachingLoad} units
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.min(insights.loadPercentage, 100)}
              sx={{ mt: 1.5, height: 8, borderRadius: '20px', bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { bgcolor: loadColor, borderRadius: '20px' } }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {insights.loadPercentage}% of declared maximum
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>Placed Classes</Typography>
            <Typography variant="h4" fontWeight="800" sx={{ color: 'text.primary' }}>{insights.totalClasses}</Typography>
            <Typography variant="caption" color="text.secondary">Currently scheduled</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 2 }}>Warnings</Typography>
        {insights.warnings.length === 0 ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 3, justifyContent: 'center' }}>
            <OkIcon sx={{ color: '#16a34a' }} />
            <Typography variant="body2" color="text.secondary">No load or scheduling conflicts detected.</Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {insights.warnings.map((w, i) => {
              const style = WARNING_STYLES[w.type] ?? WARNING_STYLES.TIGHT_TRANSITION;
              return (
                <Paper key={i} variant="outlined" sx={{ p: 2, borderRadius: '12px', bgcolor: style.bg, borderColor: style.color }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                    <WarnIcon sx={{ color: style.color, fontSize: 20, mt: 0.25 }} />
                    <Box>
                      <Chip label={style.label} size="small" sx={{ bgcolor: style.color, color: '#fff', fontWeight: 700, mb: 0.75 }} />
                      <Typography variant="body2">{w.message}</Typography>
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
