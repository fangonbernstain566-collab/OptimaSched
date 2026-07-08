// Timmy — deterministic scheduling recommendation engine.
// Not a chatbot: given one PENDING schedule row, it enumerates every
// (room, day, start time) combination, discards anything that violates a
// hard constraint, scores what's left, and returns the top 3 — each with
// a plain-language reason. No ML, no external calls.
import prisma from '../config/prisma.js';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const SLOT_MINUTES = 30;
const GRID_START = '07:30';
const GRID_END = '18:00';

const SCHEDULABLE_TYPES = ['LECTURE_ROOM', 'COMPUTER_LABORATORY', 'LABORATORY', 'AVR', 'SIMULATOR_ROOM'];
const LAB_TYPES = ['COMPUTER_LABORATORY', 'LABORATORY'];

const toMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const toTimeStr = (mins) =>
  `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

const buildStartTimes = (durationMins) => {
  const starts = [];
  const gridEnd = toMinutes(GRID_END);
  for (let t = toMinutes(GRID_START); t + durationMins <= gridEnd; t += SLOT_MINUTES) {
    starts.push(toTimeStr(t));
  }
  return starts;
};

const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && aEnd > bStart;

const NotFoundError = class extends Error {};

const recommendSlots = async (scheduleId) => {
  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
    include: {
      teacher: true,
      section: true,
      subjectOffering: { include: { subject: true } },
    },
  });

  if (!schedule) throw new NotFoundError('Schedule not found.');

  const { teacherId, sectionId, subjectOffering, studentCount } = schedule;
  const subject = subjectOffering.subject;

  const rawDuration = toMinutes(schedule.endTime) - toMinutes(schedule.startTime);
  const durationMins = rawDuration > 0 ? rawDuration : 90;

  // ── Hard constraint: teaching load ceiling (independent of room/time) ──
  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  const otherSchedules = await prisma.schedule.findMany({
    where: { teacherId, isDeleted: false, id: { not: scheduleId } },
    include: { subjectOffering: { include: { subject: true } } },
  });
  const currentUnits = otherSchedules.reduce((sum, s) => sum + s.subjectOffering.subject.units, 0);

  if (currentUnits + subject.units > teacher.maxTeachingLoad) {
    return {
      blocked: true,
      reason: `Teacher's load (${currentUnits + subject.units} units) would exceed the maximum of ${teacher.maxTeachingLoad} units. No room/time combination can fix this — reduce load first.`,
      recommendations: [],
    };
  }

  // ── Candidate pool ──
  const candidateRooms = await prisma.room.findMany({
    where: {
      isDeleted: false,
      capacity: { gte: studentCount },
      type: { in: subject.isLabRequired ? LAB_TYPES : SCHEDULABLE_TYPES },
    },
  });

  const startTimes = buildStartTimes(durationMins);
  const availabilities = await prisma.availability.findMany({ where: { teacherId } });

  const existing = await prisma.schedule.findMany({
    where: {
      status: 'SCHEDULED',
      isDeleted: false,
      id: { not: scheduleId },
      OR: [{ teacherId }, { sectionId }, { roomId: { in: candidateRooms.map((r) => r.id) } }],
    },
  });

  const availabilityByDay = new Map();
  for (const a of availabilities) {
    if (!availabilityByDay.has(a.dayOfWeek)) availabilityByDay.set(a.dayOfWeek, []);
    availabilityByDay.get(a.dayOfWeek).push(a);
  }

  const existingByDay = new Map();
  for (const s of existing) {
    if (!existingByDay.has(s.dayOfWeek)) existingByDay.set(s.dayOfWeek, []);
    existingByDay.get(s.dayOfWeek).push(s);
  }

  const candidates = [];

  for (const day of DAYS) {
    const dayAvailability = availabilityByDay.get(day) ?? [];
    const dayExisting = existingByDay.get(day) ?? [];
    const teacherClassesThatDay = dayExisting.filter((s) => s.teacherId === teacherId).length;

    for (const startTime of startTimes) {
      const endTime = toTimeStr(toMinutes(startTime) + durationMins);
      const start = toMinutes(startTime);
      const end = toMinutes(endTime);

      // Hard: teacher declared availability (skip check if teacher declared none)
      if (dayAvailability.length > 0) {
        const fits = dayAvailability.some(
          (a) => start >= toMinutes(a.startTime) && end <= toMinutes(a.endTime)
        );
        if (!fits) continue;
      }

      // Hard: teacher / section overlap (room-independent)
      const teacherOrSectionConflict = dayExisting.some(
        (s) =>
          (s.teacherId === teacherId || s.sectionId === sectionId) &&
          overlaps(start, end, toMinutes(s.startTime), toMinutes(s.endTime))
      );
      if (teacherOrSectionConflict) continue;

      for (const room of candidateRooms) {
        // Hard: room overlap
        const roomConflict = dayExisting.some(
          (s) => s.roomId === room.id && overlaps(start, end, toMinutes(s.startTime), toMinutes(s.endTime))
        );
        if (roomConflict) continue;

        const capacityWaste = room.capacity - studentCount;
        const timePenalty = Math.abs(start - toMinutes('09:00'));
        // Heuristic: spread a teacher's classes across the week rather than
        // stacking them on one day — tune or replace this weighting freely.
        const score = -(1 * capacityWaste) - (0.02 * timePenalty) - (5 * teacherClassesThatDay);

        const fitLabel = capacityWaste === 0 ? 'exact fit' : capacityWaste <= 5 ? 'comfortable fit' : 'oversized';
        const capacityMatch = `${studentCount}/${room.capacity} seats (${fitLabel})`;
        const equipmentMatch = subject.isLabRequired
          ? `Lab required — ${room.type.replace(/_/g, ' ')} ✓`
          : `Lecture-only — ${room.type.replace(/_/g, ' ')} ✓`;
        const conflictStatus = 'No conflicts detected';
        const availability = dayAvailability.length > 0
          ? 'Within instructor’s declared availability'
          : 'No availability restrictions declared (open)';

        candidates.push({
          day,
          startTime,
          endTime,
          roomId: room.id,
          roomName: room.name,
          roomCapacity: room.capacity,
          score: Math.round(score * 100) / 100,
          capacityMatch,
          equipmentMatch,
          conflictStatus,
          availability,
          reason:
            `${room.name} (cap. ${room.capacity}, ${capacityWaste} seats to spare) is free ` +
            `${day} ${startTime}–${endTime}, and the instructor has ${teacherClassesThatDay} ` +
            `other class${teacherClassesThatDay === 1 ? '' : 'es'} that day.`,
        });
      }
    }
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.day !== b.day) return DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
    if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
    return a.roomName.localeCompare(b.roomName);
  });

  const top3 = candidates.slice(0, 3).map((c, i) => ({ ...c, rank: i + 1 }));

  return {
    blocked: false,
    reason: candidates.length === 0 ? 'No conflict-free room/time combination was found.' : null,
    recommendations: top3,
  };
};

export const TimmyService = { recommendSlots, NotFoundError };
