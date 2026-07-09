import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, CircularProgress, Chip, Stack,
  Modal, Divider, Grid,
} from '@mui/material';
import {
  AutoAwesome as TimmyIcon,
  MeetingRoom as RoomIcon,
  HourglassEmpty as PendingIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import { getTimmyRecommendations } from '../../services/timmyApi';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';

const RANK_STYLES = {
  1: { label: '#1 Best Match', solid: '#f59e0b', bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
  2: { label: '#2 Runner-up', solid: '#94a3b8', bg: '#f8fafc', border: '#94a3b8', text: '#334155' },
  3: { label: '#3 Alternative', solid: '#c2679f', bg: '#fdf2f8', border: '#db9dc7', text: '#831843' },
};

const formatTime = (time) => {
  if (!time) return time;
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

export default function RegistrarTimmy() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSchedule, setActiveSchedule] = useState(null);
  const [timmyLoadingId, setTimmyLoadingId] = useState(null);
  const [result, setResult] = useState(null); // { blocked, reason, recommendations }
  const [confirm, setConfirm] = useState(null);
  const { toast, showToast, hideToast } = useToast();

  const fetchPending = () => {
    setLoading(true);
    api.get('/schedules')
      .then((res) => setPending((res.data?.data ?? []).filter((s) => s.status === 'PENDING')))
      .catch(() => showToast('Failed to load pending schedules.', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPending(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAskTimmy = async (schedule) => {
    setTimmyLoadingId(schedule.id);
    setActiveSchedule(schedule);
    try {
      const res = await getTimmyRecommendations(schedule.id);
      setResult(res);
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Timmy could not generate recommendations.', 'error');
      setActiveSchedule(null);
    } finally {
      setTimmyLoadingId(null);
    }
  };

  const handleApply = (rec) => {
    setConfirm({
      schedule: activeSchedule,
      roomId: rec.roomId,
      roomName: rec.roomName,
      day: rec.day,
      startTime: rec.startTime,
      endTime: rec.endTime,
    });
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    try {
      await api.put(`/schedules/${confirm.schedule.id}`, {
        teacherId: confirm.schedule.teacherId,
        roomId: confirm.roomId,
        sectionId: confirm.schedule.sectionId,
        subjectOfferingId: confirm.schedule.subjectOfferingId,
        schoolYearId: confirm.schedule.schoolYearId,
        semesterId: confirm.schedule.semesterId,
        dayOfWeek: confirm.day,
        startTime: confirm.startTime,
        endTime: confirm.endTime,
        studentCount: confirm.schedule.studentCount ?? 0,
        status: 'SCHEDULED',
      });
      showToast('Schedule placed successfully!', 'success');
      setConfirm(null);
      setResult(null);
      setActiveSchedule(null);
      fetchPending();
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Failed to place schedule.', 'error');
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
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Toast toast={toast} onClose={hideToast} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <TimmyIcon sx={{ color: '#6d28d9' }} />
        <Typography variant="h4" fontWeight="800" sx={{ color: 'text.primary' }}>Ask Timmy</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Pick a pending class and Timmy will suggest the top 3 conflict-free room + time combinations.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <PendingIcon sx={{ color: '#7c3aed', fontSize: 20 }} />
              <Typography variant="subtitle1" fontWeight="700">Pending Queue</Typography>
              <Chip label={pending.length} size="small" sx={{ bgcolor: '#7c3aed', color: '#fff', fontWeight: 700 }} />
            </Box>

            {pending.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                No pending schedules right now.
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {pending.map((s) => (
                  <Paper
                    key={s.id}
                    variant="outlined"
                    sx={{
                      p: 1.75, borderRadius: '12px',
                      borderColor: activeSchedule?.id === s.id ? '#6d28d9' : 'divider',
                      borderWidth: activeSchedule?.id === s.id ? 2 : 1,
                    }}
                  >
                    <Typography variant="body2" fontWeight="700">{s.subjectOffering?.subject?.name ?? 'Unknown Subject'}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {s.teacher?.user ? `${s.teacher.user.firstName} ${s.teacher.user.lastName}` : '—'} · {s.section?.name ?? '—'} · {s.studentCount ?? 0} students
                    </Typography>
                    <Button
                      fullWidth size="small"
                      disabled={timmyLoadingId === s.id}
                      onClick={() => handleAskTimmy(s)}
                      startIcon={<TimmyIcon sx={{ fontSize: 15 }} />}
                      sx={{ mt: 1, bgcolor: '#f5f3ff', color: '#6d28d9', textTransform: 'none', fontWeight: 700, borderRadius: '8px', '&:hover': { bgcolor: '#ede9fe' } }}
                    >
                      {timmyLoadingId === s.id ? 'Asking Timmy…' : 'Ask Timmy'}
                    </Button>
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', minHeight: 200 }}>
            {!result ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Select a pending class and click "Ask Timmy" to see recommendations here.
                </Typography>
              </Box>
            ) : (
              <>
                <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 2 }}>
                  Recommendations for {activeSchedule?.subjectOffering?.subject?.name}
                </Typography>

                {result.blocked && (
                  <Typography variant="body2" sx={{ p: 1.5, bgcolor: '#fef2f2', color: '#b91c1c', borderRadius: '10px' }}>
                    {result.reason}
                  </Typography>
                )}

                {!result.blocked && result.recommendations.length === 0 && (
                  <Typography variant="body2" sx={{ p: 1.5, bgcolor: '#fffbeb', color: '#92400e', borderRadius: '10px' }}>
                    {result.reason ?? 'No conflict-free room/time combination was found.'}
                  </Typography>
                )}

                {!result.blocked && (
                  <Stack spacing={1.5}>
                    {result.recommendations.map((rec) => {
                      const style = RANK_STYLES[rec.rank];
                      return (
                        <Paper key={`${rec.roomId}-${rec.day}-${rec.startTime}`} variant="outlined" sx={{ p: 2, borderRadius: '12px', borderColor: style.border }}>
                          <Chip label={style.label} size="small" sx={{ bgcolor: style.solid, color: '#fff', fontWeight: 700, mb: 1 }} />
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                            <RoomIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <Typography variant="body2" fontWeight="700">{rec.roomName}</Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                            {rec.day} · {formatTime(rec.startTime)} – {formatTime(rec.endTime)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1, fontStyle: 'italic' }}>
                            {rec.reason}
                          </Typography>
                          <Button
                            fullWidth size="small" variant="contained"
                            onClick={() => handleApply(rec)}
                            sx={{ bgcolor: style.solid, borderRadius: '8px', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: style.solid, opacity: 0.85 } }}
                          >
                            Apply this slot
                          </Button>
                        </Paper>
                      );
                    })}
                  </Stack>
                )}
              </>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ p: 4, bgcolor: 'background.paper', width: '100%', maxWidth: 420, borderRadius: '20px' }}>
          <Typography variant="h6" fontWeight="800" sx={{ mb: 0.5 }}>Confirm Placement</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {confirm && (
              <>
                Placing <strong>{confirm.schedule.subjectOffering?.subject?.name}</strong> in <strong>{confirm.roomName}</strong> on{' '}
                <strong>{confirm.day}</strong> at <strong>{formatTime(confirm.startTime)}</strong>.
              </>
            )}
          </Typography>
          <Divider sx={{ mb: 3 }} />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button fullWidth variant="outlined" onClick={() => setConfirm(null)} sx={{ borderRadius: '10px', textTransform: 'none' }}>Cancel</Button>
            <Button fullWidth variant="contained" onClick={handleConfirm} sx={{ bgcolor: '#1B2B5E', borderRadius: '10px', textTransform: 'none' }}>Confirm Placement</Button>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
}
