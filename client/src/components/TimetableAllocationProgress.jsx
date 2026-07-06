import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Box, Typography, Paper, Grid, LinearProgress, Alert, Button, Skeleton } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

const StatBlock = ({ label, value }) => (
  <Box>
    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: '600' }}>{label}</Typography>
    <Typography variant="h6" fontWeight="800" sx={{ color: '#1e293b' }}>{value}</Typography>
  </Box>
);

const TimetableAllocationProgress = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProgress = useCallback(() => {
    setLoading(true);
    setError(null);
    axios.get('/api/dashboard/timetable-progress')
      .then(res => setData(res.data.data))
      .catch(() => setError('Unable to load timetable allocation progress.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const cardSx = {
    mt: 4,
    p: 4,
    borderRadius: '20px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)',
    bgcolor: 'background.paper',
  };

  if (loading) {
    return (
      <Paper sx={cardSx}>
        <Skeleton variant="text" width={260} height={32} />
        <Skeleton variant="rounded" height={10} sx={{ mt: 3, borderRadius: '20px' }} />
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} sm={4} key={i}>
              <Skeleton variant="text" width={120} />
              <Skeleton variant="text" width={60} height={36} />
            </Grid>
          ))}
        </Grid>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={cardSx}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={fetchProgress} startIcon={<RefreshIcon />}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Paper>
    );
  }

  const { progress, allocatedClasses, remainingClasses, completedBlocks, totalBlocks } = data;

  return (
    <Paper sx={cardSx}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h6" fontWeight="700" sx={{ color: '#334155' }}>
          Timetable Allocation Progress
        </Typography>
        <Typography variant="h4" fontWeight="800" sx={{ color: '#1e293b', letterSpacing: '-1px' }}>
          {progress}%
        </Typography>
      </Box>

      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          mt: 2,
          height: 10,
          borderRadius: '20px',
          bgcolor: '#f1f5f9',
          '& .MuiLinearProgress-bar': { borderRadius: '20px', bgcolor: '#2563eb' },
        }}
      />

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} sm={4}><StatBlock label="Allocated Classes" value={allocatedClasses} /></Grid>
        <Grid item xs={12} sm={4}><StatBlock label="Remaining Classes" value={remainingClasses} /></Grid>
        <Grid item xs={12} sm={4}><StatBlock label="Completed Blocks" value={`${completedBlocks} / ${totalBlocks}`} /></Grid>
      </Grid>
    </Paper>
  );
};

export default TimetableAllocationProgress;
