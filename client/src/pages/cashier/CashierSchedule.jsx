import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Tab, Tabs, CircularProgress, Chip, Tooltip,
} from '@mui/material';
import api from '../../services/api';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const SLOT_MINUTES = 30;
const GRID_START = '07:30';
const GRID_END = '18:00';

const toMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const formatTime = (time) => {
  if (!time) return time;
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

const buildTimeSlots = (start, end, step) => {
  const slots = [];
  for (let t = toMinutes(start); t < toMinutes(end); t += step) {
    slots.push(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`);
  }
  return slots;
};

const TIME_SLOTS = buildTimeSlots(GRID_START, GRID_END, SLOT_MINUTES);

const durationInSlots = (s) => Math.max(1, Math.round((toMinutes(s.endTime) - toMinutes(s.startTime)) / SLOT_MINUTES));

const getRoomOccupancy = (schedules, roomId, day) => {
  const bySlotIndex = new Map();
  schedules
    .filter((s) => s.roomId === roomId && s.dayOfWeek === day)
    .forEach((occupant) => {
      const startIdx = TIME_SLOTS.indexOf(occupant.startTime);
      if (startIdx === -1) return;
      const span = Math.min(durationInSlots(occupant), TIME_SLOTS.length - startIdx);
      bySlotIndex.set(startIdx, { occupant, span });
    });
  return bySlotIndex;
};

export default function CashierSchedule() {
  const [schedules, setSchedules] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [loading, setLoading] = useState(true);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    Promise.all([api.get('/schedules'), api.get('/rooms?schedulable=true')])
      .then(([resSched, resRooms]) => {
        setSchedules((resSched.data?.data ?? []).filter((s) => s.status !== 'PENDING'));
        setRooms(resRooms.data?.data ?? []);
      })
      .catch(() => showToast('Failed to load schedule.', 'error'))
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

  return (
    <Box sx={{ maxWidth: 1500, mx: 'auto' }}>
      <Toast toast={toast} onClose={hideToast} />
      <Typography variant="h4" fontWeight="800" sx={{ mb: 0.5, color: '#1e293b' }}>View Schedule</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Read-only view of the current term's room schedule.
      </Typography>

      <Paper sx={{ borderRadius: '12px', mb: 2 }}>
        <Tabs value={selectedDay} onChange={(_, v) => setSelectedDay(v)} variant="fullWidth" sx={{ '& .MuiTab-root': { fontWeight: 700, textTransform: 'none' } }}>
          {DAYS.map((d) => <Tab key={d} value={d} label={d} />)}
        </Tabs>
      </Paper>

      <Paper sx={{ p: 2, borderRadius: '16px', overflowX: 'auto', border: '1px solid #e2e8f0' }}>
        {rooms.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography color="text.secondary">No rooms found.</Typography>
          </Box>
        ) : (
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: `160px repeat(${TIME_SLOTS.length}, minmax(70px, 1fr))`,
            gap: 1,
            minWidth: 160 + TIME_SLOTS.length * 80,
          }}>
            <Box />
            {TIME_SLOTS.map((t) => (
              <Box key={t} sx={{ textAlign: 'center', pb: 0.5 }}>
                <Typography variant="caption" fontWeight="700" color="#475569">{formatTime(t)}</Typography>
              </Box>
            ))}

            {rooms.map((room, roomIndex) => {
              const occupancyByStart = getRoomOccupancy(schedules, room.id, selectedDay);
              const gridRow = roomIndex + 2;
              const coveredIndices = new Set();
              occupancyByStart.forEach(({ span }, startIdx) => {
                for (let i = 1; i < span; i += 1) coveredIndices.add(startIdx + i);
              });

              return (
                <React.Fragment key={room.id}>
                  <Box sx={{ gridColumn: 1, gridRow, display: 'flex', flexDirection: 'column', justifyContent: 'center', pr: 1.5, borderRight: '2px solid #e2e8f0' }}>
                    <Typography variant="body2" fontWeight="700" noWrap>{room.name}</Typography>
                    <Typography variant="caption" color="text.secondary">Cap: {room.capacity}</Typography>
                  </Box>

                  {TIME_SLOTS.map((timeSlot, slotIndex) => {
                    if (coveredIndices.has(slotIndex)) return null;
                    const occupied = occupancyByStart.get(slotIndex);
                    const colStart = slotIndex + 2;
                    const span = occupied?.span ?? 1;

                    const cell = (
                      <Box
                        key={`${room.id}||${timeSlot}`}
                        sx={{
                          gridColumn: `${colStart} / span ${span}`, gridRow,
                          minHeight: 56, borderRadius: '8px',
                          border: '2px dashed', borderColor: occupied ? '#fca5a5' : '#e2e8f0',
                          bgcolor: occupied ? '#fee2e2' : '#f8fafc',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', p: 0.75,
                        }}
                      >
                        {occupied ? (
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" fontWeight="700" color="error.main" display="block" noWrap>
                              {occupied.occupant.subjectOffering?.subject?.name ?? 'Occupied'}
                            </Typography>
                            <Typography variant="caption" color="error.main" display="block" sx={{ opacity: 0.75, fontSize: '0.65rem' }} noWrap>
                              {occupied.occupant.section?.name ?? ''}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="caption" color="#cbd5e1" fontSize="0.65rem">Available</Typography>
                        )}
                      </Box>
                    );

                    if (!occupied) return cell;

                    const o = occupied.occupant;
                    const teacherName = o.teacher?.user ? `${o.teacher.user.firstName} ${o.teacher.user.lastName}` : 'Unassigned';
                    return (
                      <Tooltip
                        key={`${room.id}||${timeSlot}`}
                        arrow placement="top"
                        title={
                          <Box sx={{ p: 0.5 }}>
                            <Typography variant="subtitle2" fontWeight="700">{o.subjectOffering?.subject?.name ?? '—'}</Typography>
                            <Typography variant="caption" display="block">👤 {teacherName}</Typography>
                            <Typography variant="caption" display="block">🏷 {o.section?.name ?? '—'}</Typography>
                            <Typography variant="caption" display="block">👥 {o.studentCount ?? 0} students</Typography>
                            <Typography variant="caption" display="block">⏰ {formatTime(o.startTime)} – {formatTime(o.endTime)}</Typography>
                          </Box>
                        }
                      >
                        {cell}
                      </Tooltip>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </Box>
        )}
      </Paper>
    </Box>
  );
}
