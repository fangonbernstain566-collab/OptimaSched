import { PrismaClient } from '@prisma/client';
import { ScheduleConflictService } from './scheduleConflict.service.js';

const prisma = new PrismaClient();

export class ScheduleService {
  /**
   * Fetches all schedules with optional filters for teachers, rooms, or sections.
   */ 
  static async getAllSchedules(filters = {}) {
    return await prisma.schedule.findMany({
      where: {
        ...(filters.includeDeleted ? {} : { isDeleted: false }),
        ...(filters.status && { status: filters.status }),
        ...(filters.teacherId && { teacherId: filters.teacherId }),
        ...(filters.roomId && { roomId: filters.roomId }),
        ...(filters.sectionId && { sectionId: filters.sectionId }),
      },
      include: {
        subjectOffering: { include: { subject: true } },
        teacher: { include: { user: true } },
        room: { include: { building: true } },
        section: true,
        schoolYear: true,
        semester: true,
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Validates and creates a new schedule entry in the system.
   */
  static async createSchedule(data, userId) {
    // Run real-time conflict verification rules
    await ScheduleConflictService.validateSchedule(data);

    return await prisma.$transaction(async (tx) => {
      const schedule = await tx.schedule.create({
        data: {
          ...data,
          createdByUserId: userId,
          status: 'DRAFT'
        }
      });

      await tx.auditLog.create({
        data: {
          action: 'Schedule Created',
          userId,
          module: 'SCHEDULE_MANAGEMENT',
          description: 'Schedule created.',
          targetRecordId: schedule.id,
          metadata: { scheduleId: schedule.id, payload: data }
        }
      });

      return schedule;
    });
  }

  /**
   * Modifies an existing schedule block after validating against conflicts.
   */
  static async updateSchedule(id, data, userId) {
    const existing = await prisma.schedule.findUnique({ where: { id } });
    if (!existing) throw new Error("Target schedule resource not found.");
    if (existing.isDeleted) throw new Error("Cannot update a deleted schedule. Restore it first.");
    if (existing.status === 'PUBLISHED') throw new Error("Cannot modify an already published schedule.");

    // Validate modifications while ignoring this specific schedule record's current slot
    await ScheduleConflictService.validateSchedule(data, id);

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.schedule.update({
        where: { id },
        data: {
          ...data,
          updatedByUserId: userId
        }
      });

      await tx.auditLog.create({
        data: {
          action: 'Schedule Updated',
          userId,
          module: 'SCHEDULE_MANAGEMENT',
          description: 'Schedule updated.',
          targetRecordId: id,
          metadata: { scheduleId: id, old: existing, new: updated }
        }
      });

      return updated;
    });
  }

  /**
   * Manages status progression along the review workflow pipeline.
   */
  static async transitionStatus(id, targetStatus, userId) {
    const existing = await prisma.schedule.findUnique({ where: { id } });
    if (!existing) throw new Error("Target schedule resource not found.");
    if (existing.isDeleted) throw new Error("Cannot change status of a deleted schedule.");

    // Re-verify constraints if attempting to advance past draft status
    if (['FOR_REVIEW', 'APPROVED', 'PUBLISHED'].includes(targetStatus)) {
      await ScheduleConflictService.validateSchedule(existing, id);
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.schedule.update({
        where: { id },
        data: { status: targetStatus, updatedByUserId: userId }
      });

      await tx.auditLog.create({
        data: {
          action: `Workflow Transitioned to ${targetStatus}`,
          userId,
          module: 'SCHEDULE_MANAGEMENT',
          description: `Workflow transitioned to ${targetStatus}.`,
          targetRecordId: id,
          metadata: { scheduleId: id, previousStatus: existing.status }
        }
      });

      return updated;
    });
  }
}