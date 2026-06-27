import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ScheduleConflictService {
  /**
   * Evaluates proposed schedule details against systemic rules and database states.
   * Throws explicit validation errors if hard constraints are violated.
   */
  static async validateSchedule(proposedData, ignoreScheduleId = null) {
    const {
      teacherId, roomId, sectionId, subjectOfferingId,
      schoolYearId, semesterId, dayOfWeek, startTime, endTime
    } = proposedData;

    // 1. Fetch cross-entity prerequisites for validations
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    const offering = await prisma.subjectOffering.findUnique({
      where: { id: subjectOfferingId },
      include: { subject: true }
    });
    const section = await prisma.section.findUnique({ where: { id: sectionId } });

    if (!room || !offering || !section) {
      throw new Error("Invalid entity reference parameters provided.");
    }

    // 2. Room Type Validation
    if (offering.subject.isLabRequired && room.type === 'LECTURE_ROOM') {
      throw new Error(`Subject requires laboratory environment. Room '${room.name}' is designated for Lectures.`);
    }

    // 3. Teacher Availability Check
    const convertedProposedStart = this.timeToMinutes(startTime);
    const convertedProposedEnd = this.timeToMinutes(endTime);

    const availabilities = await prisma.availability.findMany({
      where: { teacherId, dayOfWeek }
    });

    if (availabilities.length > 0) {
      const isAvailable = availabilities.some(avail => {
        const availStart = this.timeToMinutes(avail.startTime);
        const availEnd = this.timeToMinutes(avail.endTime);
        return convertedProposedStart >= availStart && convertedProposedEnd <= availEnd;
      });

      if (!isAvailable) {
        throw new Error("Requested time slot outside instructor's declared operating availability.");
      }
    }

    // 4. Overlap Check Queries (Teacher, Room, Section)
    const baseConflictFilter = {
      schoolYearId,
      semesterId,
      dayOfWeek,
      id: ignoreScheduleId ? { not: ignoreScheduleId } : undefined,
      status: { notIn: ['ARCHIVED'] } // Only compare with active/draft paths
    };

    const concurrentSchedules = await prisma.schedule.findMany({
      where: {
        ...baseConflictFilter,
        OR: [
          { teacherId },
          { roomId },
          { sectionId }
        ]
      },
      include: {
        teacher: { include: { user: true } },
        room: true,
        section: true
      }
    });

    for (const activeSched of concurrentSchedules) {
      const activeStart = this.timeToMinutes(activeSched.startTime);
      const activeEnd = this.timeToMinutes(activeSched.endTime);

      // Overlap formula: StartA < EndB AND EndA > StartB
      if (convertedProposedStart < activeEnd && convertedProposedEnd > activeStart) {
        if (activeSched.teacherId === teacherId) {
          throw new Error(`Instructor conflict: ${activeSched.teacher.user.lastName} is assigned to Section ${activeSched.section.name} during this slot.`);
        }
        if (activeSched.roomId === roomId) {
          throw new Error(`Spatial bottleneck: Room ${activeSched.room.name} is currently booked.`);
        }
        if (activeSched.sectionId === sectionId) {
          throw new Error(`Section constraint error: Section ${activeSched.section.name} has a concurrent class.`);
        }
      }
    }

    // 5. Teaching Load Validation
    const ongoingSchedules = await prisma.schedule.findMany({
      where: {
        teacherId,
        schoolYearId,
        semesterId,
        id: ignoreScheduleId ? { not: ignoreScheduleId } : undefined
      },
      include: { subjectOffering: { include: { subject: true } } }
    });

    const currentTotalUnits = ongoingSchedules.reduce((acc, current) => {
      return acc + current.subjectOffering.subject.units;
    }, 0);

    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
    if (currentTotalUnits + offering.subject.units > teacher.maxTeachingLoad) {
      throw new Error(`Load limit breached: Max authorized capacity is ${teacher.maxTeachingLoad} units.`);
    }

    return { isValid: true };
  }

  /**
   * Maps 24h string expression to explicit integer scalar representing total minutes from midnight
   * @param {string} timeStr - "HH:MM" format
   * @returns {number}
   */
  static timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }
}