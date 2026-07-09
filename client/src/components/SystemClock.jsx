// client/src/components/SystemClock.jsx
import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';

const formatDate = (date) =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const formatTime = (date) =>
  date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });

// Live system clock shown in the dashboard header, beside the notification bell.
// Purely a display of the user's local device time — never sent to or read from the server.
const SystemClock = ({ C }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Box
      sx={{
        display:      { xs: 'none', sm: 'flex' },
        flexDirection: 'column',
        alignItems:   'flex-end',
        lineHeight:   1.2,
      }}
    >
      <Typography sx={{ color: C.primary, fontSize: '0.78rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        {formatTime(now)}
      </Typography>
      <Typography sx={{ color: C.muted, fontSize: '0.65rem', fontWeight: 600 }}>
        {formatDate(now)}
      </Typography>
    </Box>
  );
};

export default SystemClock;
