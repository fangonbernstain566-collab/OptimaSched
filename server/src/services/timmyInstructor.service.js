// Timmy — Instructor variant: analyzes one instructor's own real schedule
// for load risk and tight room-to-room transitions. Read-only, no writes.
import prisma from '../config/prisma.js';

const MIN_TRANSITION_MINUTES = 15;

const toMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const NotFoundError = class extends Error {};

const getInstructorInsights = async (userId) => {
  const teacher = await prisma.teacher.findUnique({ where: { userId } });
  if (!teacher) throw new NotFoundError('No teacher profile found for this account.');

  const schedules = await prisma.schedule.findMany({
    where: { teacherId: teacher.id, status: 'SCHEDULED', isDeleted: false },
    include: {
      room: true,
      subjectOffering: { include: { subject: true } },
      section: true,
    },
  });

  const currentUnits = schedules.reduce((sum, s) => sum + s.subjectOffering.subject.units, 0);
  const loadPercentage = teacher.maxTeachingLoad > 0
    ? Math.round((currentUnits / teacher.maxTeachingLoad) * 100)
    : 0;

  const warnings = [];

  if (currentUnits >= teacher.maxTeachingLoad) {
    warnings.push({
      type: 'OVERLOAD',
      message: `Teaching load is at ${currentUnits}/${teacher.maxTeachingLoad} units — at or over the declared maximum.`,
    });
  } else if (loadPercentage >= 85) {
    warnings.push({
      type: 'NEAR_CAPACITY',
      message: `Teaching load is at ${currentUnits}/${teacher.maxTeachingLoad} units (${loadPercentage}%) — close to the declared maximum.`,
    });
  }

  // Group by day, sort by start time, flag back-to-back classes in
  // different rooms with less than MIN_TRANSITION_MINUTES between them.
  const byDay = new Map();
  for (const s of schedules) {
    if (!byDay.has(s.dayOfWeek)) byDay.set(s.dayOfWeek, []);
    byDay.get(s.dayOfWeek).push(s);
  }

  for (const [day, daySchedules] of byDay) {
    const sorted = [...daySchedules].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
    for (let i = 0; i < sorted.length - 1; i += 1) {
      const current = sorted[i];
      const next = sorted[i + 1];
      const gapMinutes = toMinutes(next.startTime) - toMinutes(current.endTime);

      if (gapMinutes < MIN_TRANSITION_MINUTES && current.roomId !== next.roomId) {
        warnings.push({
          type: 'TIGHT_TRANSITION',
          message: `${day}: only ${Math.max(gapMinutes, 0)} min between ${current.subjectOffering.subject.name} (${current.room.name}) ending ${current.endTime} and ${next.subjectOffering.subject.name} (${next.room.name}) starting ${next.startTime}.`,
        });
      }
    }
  }

  return {
    currentUnits,
    maxTeachingLoad: teacher.maxTeachingLoad,
    loadPercentage,
    totalClasses: schedules.length,
    warnings,
  };
};

export const TimmyInstructorService = { getInstructorInsights, NotFoundError };
