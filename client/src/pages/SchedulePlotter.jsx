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
  Tooltip,
} from '@mui/material';
import {
  DragIndicator as DragIcon,
  Person as PersonIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';

const DAYS       = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const SLOT_MINUTES = 30;
const GRID_START = '07:30';
const GRID_END   = '18:00';

const toMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const addMinutes = (time, mins) => {
  const total = toMinutes(time) + mins;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

// Displays a "HH:mm" 24-hour string as standard 12-hour time, e.g. "13:30" -> "1:30 PM"
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

// Duration of a schedule in whole 30-minute slots (minimum 1).
const durationInSlots = (schedule) => {
  const mins = toMinutes(schedule.endTime) - toMinutes(schedule.startTime);
  return Math.max(1, Math.round(mins / SLOT_MINUTES));
};

// Builds, per room, the list of occupants that start within the visible grid,
// annotated with their starting slot index and how many slots they span —
// so a 90-minute class renders as one merged block instead of 3 separate cells.
const getRoomOccupancy = (slots, roomId, day) => {
  const bySlotIndex = new Map();
  slots
    .filter((s) => s.roomId === roomId && s.dayOfWeek === day)
    .forEach((occupant) => {
      const startIdx = TIME_SLOTS.indexOf(occupant.startTime);
      if (startIdx === -1) return;
      const span = Math.min(durationInSlots(occupant), TIME_SLOTS.length - startIdx);
      bySlotIndex.set(startIdx, { occupant, span });
    });
  return bySlotIndex;
};

const buildTooltip = (occupant) => {
  if (!occupant) return '';

  const teacherName = occupant.teacher?.user
    ? `${occupant.teacher.user.firstName} ${occupant.teacher.user.lastName}`
    : 'Unassigned';

  return (
    <Box sx={{ p: 0.5 }}>
      <Typography variant="subtitle2" fontWeight="700" sx={{ mb: 0.75 }}>
        {occupant.subjectOffering?.subject?.name ?? 'Unknown Subject'}
      </Typography>
      <Stack spacing={0.4}>
        <Typography variant="caption" display="block">🔖 Class Code: {occupant.subjectOffering?.classCode ?? '—'}</Typography>
        <Typography variant="caption" display="block">👤 {teacherName}</Typography>
        <Typography variant="caption" display="block">🏷 Section: {occupant.section?.name ?? '—'}</Typography>
        <Typography variant="caption" display="block">👥 Students: {occupant.studentCount ?? 0}</Typography>
        <Typography variant="caption" display="block">⏰ {formatTime(occupant.startTime)} – {formatTime(occupant.endTime)}</Typography>
        <Typography variant="caption" display="block">
          📅 {occupant.schoolYear?.name ?? '—'} · {occupant.semester?.name ?? '—'}
        </Typography>
        <Typography variant="caption" display="block">📌 Status: {occupant.status}</Typography>
      </Stack>
    </Box>
  );
};

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

const PlotterCell = ({ id, roomId, timeSlot, day, room, isOccupied, occupant, span = 1, gridColumn, gridRow, draggingCount }) => {
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

  const cellContent = (
    <Box
      ref={setNodeRef}
      sx={{
        gridColumn, gridRow,
        minHeight: 56, borderRadius: '8px',
        border: '2px dashed', borderColor,
        bgcolor: bg, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        transition: 'all .15s ease', p: 0.75,
        cursor: isOccupied ? 'pointer' : 'default',
      }}
    >
      {isOccupied ? (
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" fontWeight="700" color="error.main" display="block" noWrap>
            {occupant?.subjectOffering?.subject?.name ?? 'Occupied'}
          </Typography>
          {span > 1 && (
            <Typography variant="caption" color="error.main" display="block" sx={{ opacity: 0.75, fontSize: '0.65rem' }} noWrap>
              {formatTime(occupant?.startTime)} – {formatTime(occupant?.endTime)}
            </Typography>
          )}
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

  return isOccupied ? (
    <Tooltip
      title={buildTooltip(occupant)}
      arrow
      placement="top"
      componentsProps={{
        tooltip: {
          sx: {
            bgcolor: '#1e293b',
            maxWidth: 260,
            '& .MuiTooltip-arrow': { color: '#1e293b' },
          },
        },
      }}
    >
      {cellContent}
    </Tooltip>
  ) : cellContent;
};

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

  // ✅ FIX: was reading localStorage key 'token' — actual key is 'optimasched_token'
  const getAuthHeaders = () => {
    const token = localStorage.getItem('optimasched_token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const config = getAuthHeaders();
      const [resSched, resRooms] = await Promise.all([
        axios.get('/api/schedules', config),
        axios.get('/api/rooms?schedulable=true', config),
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

    const durationMins = toMinutes(schedule.endTime) - toMinutes(schedule.startTime);

    setConfirm({
      schedule,
      roomId,
      roomName: room.name,
      roomCapacity: room.capacity,
      timeSlot,
      endTime: addMinutes(timeSlot, durationMins > 0 ? durationMins : 90),
      day,
    });
  };

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

  return (
    <Box sx={{ p: 4, minHeight: '100vh', bgcolor: '#f8fafc', mt: -4 }}>
      <Toast toast={toast} onClose={hideToast} />

      <Box sx={{ maxWidth: '1500px', mx: 'auto' }}>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight="800" sx={{ color: '#1e293b' }}>
            Schedule Plotter
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Drag a pending schedule card onto an available room slot to assign it.
            🟢 = Valid drop &nbsp;|&nbsp; 🟡 = Over capacity &nbsp;|&nbsp; 🔴 = Occupied (hover for details)
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

                <Paper sx={{ p: 2, borderRadius: '16px', mt: 2 }}>
                  <Typography variant="caption" fontWeight="700" display="block" sx={{ mb: 1.5 }}>
                    Legend
                  </Typography>
                  {[
                    { bg: '#f8fafc',  border: '#e2e8f0', label: 'Available' },
                    { bg: '#fee2e2',  border: '#fca5a5', label: 'Occupied (hover for details)' },
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

              <Box sx={{ flex: 1, minWidth: 0 }}>

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

                <Paper sx={{ p: 2, borderRadius: '16px', overflowX: 'auto' }}>
                  {rooms.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <Typography color="text.secondary">No rooms found. Add rooms first.</Typography>
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
                          <Typography variant="caption" fontWeight="700" color="#475569">
                            {formatTime(t)}
                          </Typography>
                        </Box>
                      ))}

                      {rooms.map((room, roomIndex) => {
                        const occupancyByStart = getRoomOccupancy(scheduled, room.id, selectedDay);
                        const gridRow = roomIndex + 2; // row 1 is the time-slot header

                        // Slot indices already covered by an earlier, spanning block
                        // must be skipped entirely — not rendered empty — otherwise
                        // the grid's auto row-placement would shift later rooms.
                        const coveredIndices = new Set();
                        occupancyByStart.forEach(({ span }, startIdx) => {
                          for (let i = 1; i < span; i += 1) coveredIndices.add(startIdx + i);
                        });

                        return (
                          <React.Fragment key={room.id}>

                            <Box sx={{
                              gridColumn: 1, gridRow,
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
                              {activeSched && room.capacity < (activeSched.studentCount ?? 0) && (
                                <Typography variant="caption" color="warning.main" fontWeight="700" sx={{ mt: 0.25 }}>
                                  ⚠ Too small
                                </Typography>
                              )}
                            </Box>

                            {TIME_SLOTS.map((timeSlot, slotIndex) => {
                              if (coveredIndices.has(slotIndex)) return null;

                              const occupied = occupancyByStart.get(slotIndex);
                              const colStart = slotIndex + 2; // column 1 is the room label
                              const span = occupied?.span ?? 1;

                              return (
                                <PlotterCell
                                  key={`${room.id}||${timeSlot}`}
                                  id={`${room.id}||${timeSlot}||${selectedDay}`}
                                  roomId={room.id}
                                  timeSlot={timeSlot}
                                  day={selectedDay}
                                  room={room}
                                  isOccupied={!!occupied}
                                  occupant={occupied?.occupant}
                                  span={span}
                                  gridColumn={`${colStart} / span ${span}`}
                                  gridRow={gridRow}
                                  draggingCount={activeSched?.studentCount ?? null}
                                />
                              );
                            })}

                          </React.Fragment>
                        );
                      })}

                    </Box>
                  )}
                </Paper>

              </Box>
            </Box>

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
              {confirm && (
                <>
                  Placing <strong>{confirm.schedule.subjectOffering?.subject?.name ?? 'this class'}</strong>
                  {' '}({confirm.schedule.subjectOffering?.classCode ?? '—'}) in <strong>{confirm.roomName}</strong> on{' '}
                  <strong>{confirm.day}</strong> at <strong>{formatTime(confirm.timeSlot)}</strong>. It will be marked as SCHEDULED.
                </>
              )}
            </Typography>

            {confirm && (
              <Stack spacing={1.5} sx={{ mb: 3 }}>
                {[
                  ['📚 Subject',     confirm.schedule.subjectOffering?.subject?.name ?? '—'],
                  ['🔖 Class Code',  confirm.schedule.subjectOffering?.classCode ?? '—'],
                  ['👤 Teacher',     confirm.schedule.teacher?.user
                      ? `${confirm.schedule.teacher.user.firstName} ${confirm.schedule.teacher.user.lastName}`
                      : '—'],
                  ['🏫 Room',        `${confirm.roomName} (Cap: ${confirm.roomCapacity})`],
                  ['👥 Students',    confirm.schedule.studentCount ?? 0],
                  ['📅 Day',         confirm.day],
                  ['⏰ Time',        `${formatTime(confirm.timeSlot)} – ${formatTime(confirm.endTime)}`],
                  ['🏷 Section',     confirm.schedule.section?.name ?? '—'],
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