import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Tab, Tabs, CircularProgress, Chip, Tooltip,
  Select, MenuItem, FormControl, InputLabel, Grid,
} from '@mui/material';
import {
  CalendarMonth as BlocksIcon,
  BookmarkBorder as SubjectsIcon,
  Group as FacultyIcon,
  AccessTime as SlotsIcon,
} from '@mui/icons-material';
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

const StatCard = ({ label, value, icon, iconBg }) => (
  <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', height: '100%' }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>{label}</Typography>
        <Typography variant="h4" fontWeight="800" sx={{ color: 'text.primary', mt: 0.5 }}>{value}</Typography>
      </Box>
      <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </Box>
    </Box>
  </Paper>
);

export default function RegistrarSchedule() {
  const [allSchedules, setAllSchedules] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [facultyFilter, setFacultyFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    Promise.all([api.get('/schedules'), api.get('/rooms?schedulable=true')])
      .then(([resSched, resRooms]) => {
        setAllSchedules((resSched.data?.data ?? []).filter((s) => s.status !== 'PENDING'));
        setRooms(resRooms.data?.data ?? []);
      })
      .catch(() => showToast('Failed to load schedule.', 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const facultyOptions = useMemo(() => {
    const names = new Set(
      allSchedules
        .filter((s) => s.teacher?.user)
        .map((s) => `${s.teacher.user.firstName} ${s.teacher.user.lastName}`)
    );
    return Array.from(names).sort();
  }, [allSchedules]);

  const schedules = useMemo(() => {
    if (facultyFilter === 'All') return allSchedules;
    return allSchedules.filter((s) => {
      const name = s.teacher?.user ? `${s.teacher.user.firstName} ${s.teacher.user.lastName}` : '';
      return name === facultyFilter;
    });
  }, [allSchedules, facultyFilter]);

  const stats = useMemo(() => {
    const uniqueSubjects = new Set(schedules.map((s) => s.subjectOffering?.subject?.name).filter(Boolean));
    const uniqueFaculty = new Set(schedules.map((s) => s.teacherId).filter(Boolean));
    return {
      totalBlocks: schedules.length,
      uniqueSubjects: uniqueSubjects.size,
      uniqueFaculty: uniqueFaculty.size,
    };
  }, [schedules]);

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
      <Typography variant="h4" fontWeight="800" sx={{ mb: 0.5, color: 'text.primary' }}>View Schedule</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Filterable read-only view of the current term's room schedule.
      </Typography>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <StatCard label="Scheduled Blocks" value={stats.totalBlocks} icon={<BlocksIcon sx={{ color: '#2563eb' }} />} iconBg="#dbeafe" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard label="Unique Subjects" value={stats.uniqueSubjects} icon={<SubjectsIcon sx={{ color: '#7c3aed' }} />} iconBg="#ede9fe" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard label="Faculty w/ Load" value={stats.uniqueFaculty} icon={<FacultyIcon sx={{ color: '#ea580c' }} />} iconBg="#ffedd5" />
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Faculty</InputLabel>
          <Select label="Faculty" value={facultyFilter} onChange={(e) => setFacultyFilter(e.target.value)}>
            <MenuItem value="All">All Faculty</MenuItem>
            {facultyOptions.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      <Paper sx={{ borderRadius: '12px', mb: 2 }}>
        <Tabs value={selectedDay} onChange={(_, v) => setSelectedDay(v)} variant="fullWidth" sx={{ '& .MuiTab-root': { fontWeight: 700, textTransform: 'none' } }}>
          {DAYS.map((d) => <Tab key={d} value={d} label={d} />)}
        </Tabs>
      </Paper>

      <Paper sx={{ p: 2, borderRadius: '16px', overflowX: 'auto', border: '1px solid', borderColor: 'divider' }}>
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
                <Typography variant="caption" fontWeight="700" color="text.secondary">{formatTime(t)}</Typography>
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
                  <Box sx={{ gridColumn: 1, gridRow, display: 'flex', flexDirection: 'column', justifyContent: 'center', pr: 1.5, borderRight: '2px solid', borderColor: 'divider' }}>
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
                          border: '2px dashed', borderColor: occupied ? '#93c5fd' : 'divider',
                          bgcolor: occupied ? '#dbeafe' : '#f8fafc',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', p: 0.75,
                        }}
                      >
                        {occupied ? (
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" fontWeight="700" color="#1e40af" display="block" noWrap>
                              {occupied.occupant.subjectOffering?.subject?.name ?? 'Occupied'}
                            </Typography>
                            <Typography variant="caption" color="#1e40af" display="block" sx={{ opacity: 0.75, fontSize: '0.65rem' }} noWrap>
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
