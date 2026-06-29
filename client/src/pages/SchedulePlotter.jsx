import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  Box, Typography, Paper, Chip, Tab, Tabs,
  CircularProgress, Button, Modal, Stack, Divider,
} from '@mui/material';
import {
  DragIndicator as DragIcon,
  Person as PersonIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS       = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = ['07:30', '09:00', '10:30', '12:00', '13:30', '15:00', '16:30'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const addMinutes = (time, mins) => {
  const [h, m] = time.split(':').map(Number);
  const total  = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const getOccupant = (slots, roomId, day, timeSlot) =>
  slots.find((s) => s.roomId === roomId && s.dayOfWeek === day && s.startTime === timeSlot);

// ─── Draggable Card ───────────────────────────────────────────────────────────
const PendingCard = ({ schedule }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: schedule.id,
    data: schedule,
  });

  return (
    <Paper
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      elevation={isDragging ? 0 : 2}
      sx={{
        p: 2, mb: 1.5, borderRadius: '12px',
        border: '2px solid',
        borderColor: isDragging ? '#2563eb' : '#e2e8f0',
        opacity: isDragging ? 0.35 : 1,
        cursor: 'grab', userSelect: 'none',
        transform: CSS.Translate.toString(transform),
        transition: 'border-color .2s, box-shadow .2s',
        '&:hover': { borderColor: '#2563eb', boxShadow: 3 },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
        <DragIcon sx={{ color: '#94a3b8', fontSize: 18, flexShrink: 0 }} />
        <Typography variant="body2" fontWeight="700" noWrap>
          {schedule.subjectOffering?.subject?.name ?? 'Unknown Subject'}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.4 }}>
        <PersonIcon sx={{ fontSize: 13, color: '#64748b' }} />
        <Typography variant="caption" color="text.secondary" noWrap>
          {schedule.teacher?.user
            ? `${schedule.teacher.user.firstName} ${schedule.teacher.user.lastName}`
            : '—'}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <GroupIcon sx={{ fontSize: 13, color: '#64748b' }} />
        <Typography variant="caption" color="text.secondary">
          {schedule.studentCount ?? 0} students · {schedule.section?.name ?? '—'}
        </Typography>
      </Box>
    </Paper>
  );
};

// ─── Droppable Cell ───────────────────────────────────────────────────────────
const PlotterCell = ({ id, roomId, timeSlot, day, room, isOccupied, occupant, draggingCount }) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { roomId, timeSlot, day, room },
    disabled: isOccupied,
  });

  const capacityOk = draggingCount !== null ? room.capacity >= draggingCount : true;

  const bg = isOccupied
    ? '#fee2e2'
    : isOver && capacityOk
    ? '#dcfce7'
    : isOver && !capacityOk
    ? '#fef3c7'
    : '#f8fafc';

  const borderColor = isOccupied
    ? '#fca5a5'
    : isOver && capacityOk
    ? '#86efac'
    : isOver && !capacityOk
    ? '#fcd34d'
    : '#e2e8f0';

  return (
    <Box
      ref={setNodeRef}
      sx={{
        minHeight: 72, borderRadius: '8px',
        border: '2px dashed', borderColor,
        bgcolor: bg, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        transition: 'all .15s ease', p: 0.75,
        cursor: isOccupied ? 'not-allowed' : 'default',
      }}
    >
      {isOccupied ? (
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" fontWeight="700" color="error.main" display="block" noWrap>
            {occupant?.subjectOffering?.subject?.name ?? 'Occupied'}
          </Typography>
          <Typography variant="caption" color="error.light" noWrap>
            {occupant?.teacher?.user?.firstName ?? ''}
          </Typography>
        </Box>
      ) : isOver ? (
        <Typography variant="caption" fontWeight="700"
          color={capacityOk ? 'success.main' : 'warning.main'}>
          {capacityOk ? '✓ Drop here' : '⚠ Over capacity'}
        </Typography>
      ) : (
        <Typography variant="caption" color="#cbd5e1" fontSize="0.65rem">
          Available
        </Typography>
      )}
    </Box>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const SchedulePlotter = () => {
  const [pending, setPending]         = useState([]);
  const [scheduled, setScheduled]     = useState([]);
  const [rooms, setRooms]             = useState([]);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [activeSched, setActiveSched] = useState(null);
  const [loading, setLoading]         = useState(false);
  const [confirm, setConfirm]         = useState(null);

  const { toast, showToast, hideToast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };

  // ─── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      const config = getAuthHeaders();
      const [resSched, resRooms] = await Promise.all([
        axios.get('/api/schedules', config),
        axios.get('/api/rooms', config),
      ]);

      const all = resSched.data?.data ?? [];
      setPending(all.filter((s) => s.status === 'PENDING'));
      setScheduled(all.filter((s) => s.status !== 'PENDING'));
      setRooms(resRooms.data?.data ?? []);
    } catch {
      showToast('Failed to load plotter data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ─── DnD Handlers ───────────────────────────────────────────────────────────
  const handleDragStart = ({ active }) => {
    setActiveSched(pending.find((s) => s.id === active.id) ?? null);
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveSched(null);
    if (!over) return;

    const { roomId, timeSlot, day, room } = over.data.current;
    const schedule = pending.find((s) => s.id === active.id);
    if (!schedule) return;

    const count = schedule.studentCount ?? 0;
    if (room.capacity < count) {
      showToast(
        `Room capacity (${room.capacity}) is less than student count (${count}). Pick a bigger room!`,
        'warning'
      );
      return;
    }

    setConfirm({
      schedule,
      roomId,
      roomName: room.name,
      roomCapacity: room.capacity,
      timeSlot,
      endTime: addMinutes(timeSlot, 90),
      day,
    });
  };

  // ─── Confirm Placement ───────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!confirm) return;
    try {
      const config = getAuthHeaders();
      await axios.put(
        `/api/schedules/${confirm.schedule.id}`,
        {
          teacherId:         confirm.schedule.teacherId,
          roomId:            confirm.roomId,
          sectionId:         confirm.schedule.sectionId,
          subjectOfferingId: confirm.schedule.subjectOfferingId,
          schoolYearId:      confirm.schedule.schoolYearId,
          semesterId:        confirm.schedule.semesterId,
          dayOfWeek:         confirm.day,
          startTime:         confirm.timeSlot,
          endTime:           confirm.endTime,
          studentCount:      confirm.schedule.studentCount ?? 0,
          status:            'SCHEDULED',
        },
        config
      );
      showToast('Schedule placed successfully! 🎉', 'success');
      setConfirm(null);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Failed to place schedule.', 'error');
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: 4, minHeight: '100vh', bgcolor: '#f8fafc', mt: -4, mx: -4 }}>
      <Toast toast={toast} onClose={hideToast} />

      <Box sx={{ maxWidth: '1500px', mx: 'auto' }}>

        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight="800" sx={{ color: '#1e293b' }}>
            Schedule Plotter
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Drag a pending schedule card onto an available room slot to assign it.
            🟢 = Valid drop &nbsp;|&nbsp; 🟡 = Over capacity &nbsp;|&nbsp; 🔴 = Occupied
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress />
          </Box>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>

              {/* ── Pending Queue ─────────────────────────────────────────── */}
              <Box sx={{ width: 250, flexShrink: 0 }}>
                <Paper sx={{ p: 2, borderRadius: '16px', position: 'sticky', top: 24, maxHeight: '80vh', overflowY: 'auto' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="700">
                      Pending Queue
                    </Typography>
                    <Chip
                      label={pending.length}
                      size="small"
                      sx={{ bgcolor: '#2563eb', color: '#fff', fontWeight: 700 }}
                    />
                  </Box>

                  {pending.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        No pending schedules.
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Go to Manage Schedules to create one.
                      </Typography>
                    </Box>
                  ) : (
                    pending.map((s) => <PendingCard key={s.id} schedule={s} />)
                  )}
                </Paper>

                {/* Legend */}
                <Paper sx={{ p: 2, borderRadius: '16px', mt: 2 }}>
                  <Typography variant="caption" fontWeight="700" display="block" sx={{ mb: 1.5 }}>
                    Legend
                  </Typography>
                  {[
                    { bg: '#f8fafc',  border: '#e2e8f0', label: 'Available' },
                    { bg: '#fee2e2',  border: '#fca5a5', label: 'Occupied' },
                    { bg: '#dcfce7',  border: '#86efac', label: 'Valid drop target' },
                    { bg: '#fef3c7',  border: '#fcd34d', label: 'Over capacity' },
                  ].map(({ bg, border, label }) => (
                    <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                      <Box sx={{ width: 18, height: 18, borderRadius: '4px', flexShrink: 0, bgcolor: bg, border: `2px solid ${border}` }} />
                      <Typography variant="caption">{label}</Typography>
                    </Box>
                  ))}
                </Paper>
              </Box>

              {/* ── Plotter Grid ──────────────────────────────────────────── */}
              <Box sx={{ flex: 1, minWidth: 0 }}>

                {/* Day Tabs */}
                <Paper sx={{ borderRadius: '12px', mb: 2 }}>
                  <Tabs
                    value={selectedDay}
                    onChange={(_, v) => setSelectedDay(v)}
                    variant="fullWidth"
                    sx={{ '& .MuiTab-root': { fontWeight: 700, textTransform: 'none' } }}
                  >
                    {DAYS.map((d) => {
                      const count = scheduled.filter((s) => s.dayOfWeek === d).length;
                      return (
                        <Tab
                          key={d} value={d}
                          label={
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="body2" fontWeight="700">{d}</Typography>
                              {count > 0 && (
                                <Typography variant="caption" color="text.secondary">
                                  {count} scheduled
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      );
                    })}
                  </Tabs>
                </Paper>

                {/* Grid */}
                <Paper sx={{ p: 2, borderRadius: '16px', overflowX: 'auto' }}>
                  {rooms.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <Typography color="text.secondary">No rooms found. Add rooms first.</Typography>
                    </Box>
                  ) : (
                    <Box sx={{
                      display: 'grid',
                      gridTemplateColumns: `160px repeat(${TIME_SLOTS.length}, 1fr)`,
                      gap: 1,
                      minWidth: 900,
                    }}>

                      {/* Column headers */}
                      <Box />
                      {TIME_SLOTS.map((t) => (
                        <Box key={t} sx={{ textAlign: 'center', pb: 0.5 }}>
                          <Typography variant="caption" fontWeight="700" color="#475569">
                            {t}
                          </Typography>
                        </Box>
                      ))}

                      {/* Room rows */}
                      {rooms.map((room) => (
                        <React.Fragment key={room.id}>

                          {/* Room info label */}
                          <Box sx={{
                            display: 'flex', flexDirection: 'column',
                            justifyContent: 'center', pr: 1.5,
                            borderRight: '2px solid #e2e8f0',
                          }}>
                            <Typography variant="body2" fontWeight="700" noWrap>
                              {room.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Cap: {room.capacity}
                            </Typography>
                            <Chip
                              label={room.type?.replace(/_/g, ' ') ?? 'Room'}
                              size="small"
                              sx={{ fontSize: '0.6rem', height: 16, mt: 0.5, maxWidth: 140 }}
                            />
                            {/* Capacity warning */}
                            {activeSched && room.capacity < (activeSched.studentCount ?? 0) && (
                              <Typography variant="caption" color="warning.main" fontWeight="700" sx={{ mt: 0.25 }}>
                                ⚠ Too small
                              </Typography>
                            )}
                          </Box>

                          {/* Time slot cells */}
                          {TIME_SLOTS.map((timeSlot) => {
                            const occupant = getOccupant(scheduled, room.id, selectedDay, timeSlot);
                            return (
                              <PlotterCell
                                key={`${room.id}||${timeSlot}`}
                                id={`${room.id}||${timeSlot}||${selectedDay}`}
                                roomId={room.id}
                                timeSlot={timeSlot}
                                day={selectedDay}
                                room={room}
                                isOccupied={!!occupant}
                                occupant={occupant}
                                draggingCount={activeSched?.studentCount ?? null}
                              />
                            );
                          })}

                        </React.Fragment>
                      ))}

                    </Box>
                  )}
                </Paper>

              </Box>
            </Box>

            {/* Drag Overlay — follows cursor */}
            <DragOverlay dropAnimation={null}>
              {activeSched ? (
                <Paper elevation={10} sx={{
                  p: 2, borderRadius: '12px', width: 220,
                  bgcolor: '#2563eb', color: '#fff', cursor: 'grabbing',
                }}>
                  <Typography variant="body2" fontWeight="700" noWrap>
                    {activeSched.subjectOffering?.subject?.name ?? 'Schedule'}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.85 }}>
                    {activeSched.studentCount ?? 0} students
                  </Typography>
                </Paper>
              ) : null}
            </DragOverlay>

          </DndContext>
        )}

        {/* ── Confirm Placement Modal ──────────────────────────────────────── */}
        <Modal
          open={!!confirm}
          onClose={() => setConfirm(null)}
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Box sx={{
            p: 4, bgcolor: 'background.paper',
            width: '100%', maxWidth: '420px', borderRadius: '20px',
          }}>
            <Typography variant="h6" fontWeight="800" sx={{ mb: 0.5 }}>
              Confirm Placement
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              The schedule will be marked as SCHEDULED.
            </Typography>

            {confirm && (
              <Stack spacing={1.5} sx={{ mb: 3 }}>
                {[
                  ['📚 Subject',  confirm.schedule.subjectOffering?.subject?.name ?? '—'],
                  ['👤 Teacher',  confirm.schedule.teacher?.user
                      ? `${confirm.schedule.teacher.user.firstName} ${confirm.schedule.teacher.user.lastName}`
                      : '—'],
                  ['🏫 Room',     `${confirm.roomName} (Cap: ${confirm.roomCapacity})`],
                  ['👥 Students', confirm.schedule.studentCount ?? 0],
                  ['📅 Day',      confirm.day],
                  ['⏰ Time',     `${confirm.timeSlot} – ${confirm.endTime}`],
                  ['🏷 Section',  confirm.schedule.section?.name ?? '—'],
                ].map(([label, value]) => (
                  <Box key={label} sx={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', py: 0.5,
                    borderBottom: '1px solid #f1f5f9',
                  }}>
                    <Typography variant="body2" color="text.secondary">{label}</Typography>
                    <Typography variant="body2" fontWeight="700">{value}</Typography>
                  </Box>
                ))}
              </Stack>
            )}

            <Divider sx={{ mb: 3 }} />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button fullWidth variant="outlined" onClick={() => setConfirm(null)}
                sx={{ borderRadius: '10px', textTransform: 'none' }}>
                Cancel
              </Button>
              <Button fullWidth variant="contained" onClick={handleConfirm}
                sx={{ bgcolor: '#2563eb', borderRadius: '10px', textTransform: 'none' }}>
                Confirm Placement
              </Button>
            </Box>
          </Box>
        </Modal>

      </Box>
    </Box>
  );
};

export default SchedulePlotter;