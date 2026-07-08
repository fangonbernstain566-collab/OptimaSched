import { Router } from 'express';
import prisma from '../config/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logAudit } from '../utils/auditLog.js';
import { ScheduleConflictService } from '../services/scheduleConflict.service.js';
import { NotificationService } from '../services/notification.service.js';

const router = Router();
router.use(authenticate);

const REQUEST_INCLUDE = {
  teacher: { include: { user: true } },
  subjectOffering: { include: { subject: true } },
  section: true,
  room: true,
  reviewedBy: { select: { firstName: true, lastName: true } },
};

const getOwnTeacher = async (userId) => prisma.teacher.findUnique({ where: { userId } });

// ─── GET /mine: Instructor's own requests ────────────────────────────────────
router.get('/mine', authorize('INSTRUCTOR'), async (req, res) => {
  try {
    const teacher = await getOwnTeacher(req.user.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'No teacher profile found for this account.' });
    }

    const requests = await prisma.scheduleRequest.findMany({
      where: { teacherId: teacher.id, isDeleted: false },
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: requests });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /mine/recently-deleted: Instructor's own cancelled requests ─────────
router.get('/mine/recently-deleted', authorize('INSTRUCTOR'), async (req, res) => {
  try {
    const teacher = await getOwnTeacher(req.user.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'No teacher profile found for this account.' });
    }

    const requests = await prisma.scheduleRequest.findMany({
      where: { teacherId: teacher.id, isDeleted: true },
      include: REQUEST_INCLUDE,
      orderBy: { deletedAt: 'desc' },
    });

    return res.json({ success: true, data: requests });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /: Submit a new schedule request ───────────────────────────────────
router.post('/', authorize('INSTRUCTOR'), async (req, res) => {
  try {
    const { subjectOfferingId, sectionId, roomId, dayOfWeek, startTime, endTime, studentCount, notes } = req.body;

    const missing = ['subjectOfferingId', 'sectionId', 'dayOfWeek', 'startTime', 'endTime']
      .filter((field) => !req.body[field]);
    if (missing.length > 0) {
      return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(', ')}` });
    }

    const teacher = await getOwnTeacher(req.user.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'No teacher profile found for this account.' });
    }

    const created = await prisma.scheduleRequest.create({
      data: {
        teacherId: teacher.id,
        subjectOfferingId,
        sectionId,
        roomId: roomId || null,
        dayOfWeek,
        startTime,
        endTime,
        studentCount: Number(studentCount) || 0,
        notes: notes || null,
      },
      include: REQUEST_INCLUDE,
    });

    await logAudit(req, {
      action: 'SCHEDULE_REQUEST_CREATE',
      module: 'SCHEDULE_REQUEST_MANAGEMENT',
      description: `${req.user.firstName} requested a class slot (${created.subjectOffering.subject.name}, ${dayOfWeek} ${startTime}-${endTime}).`,
      targetRecordId: created.id,
      targetRecordName: created.subjectOffering.subject.name,
      metadata: { dayOfWeek, startTime, endTime, sectionId, roomId },
    });

    await NotificationService.createForRoles(['ADMINISTRATOR', 'REGISTRAR_SCHEDULER'], {
      title: 'New schedule request',
      message: `${req.user.firstName} ${req.user.lastName} requested ${created.subjectOffering.subject.name} on ${dayOfWeek} ${startTime}-${endTime}.`,
      type: 'SCHEDULE_REQUEST_SUBMITTED',
      link: '/schedule-requests',
    });

    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── DELETE /:id: Cancel own PENDING request (soft delete) ───────────────────
router.delete('/:id', authorize('INSTRUCTOR'), async (req, res) => {
  try {
    const teacher = await getOwnTeacher(req.user.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'No teacher profile found for this account.' });
    }

    const existing = await prisma.scheduleRequest.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.teacherId !== teacher.id || existing.isDeleted) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }
    if (existing.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Only pending requests can be cancelled.' });
    }

    await prisma.scheduleRequest.update({
      where: { id: req.params.id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    await logAudit(req, {
      action: 'SCHEDULE_REQUEST_CANCEL',
      module: 'SCHEDULE_REQUEST_MANAGEMENT',
      description: `${req.user.firstName} cancelled their own schedule request.`,
      targetRecordId: req.params.id,
    });

    return res.json({ success: true, message: 'Request cancelled and moved to Recently Deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PATCH /:id/restore: Instructor restores their own cancelled request ─────
router.patch('/:id/restore', authorize('INSTRUCTOR'), async (req, res) => {
  try {
    const teacher = await getOwnTeacher(req.user.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'No teacher profile found for this account.' });
    }

    const existing = await prisma.scheduleRequest.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.teacherId !== teacher.id || !existing.isDeleted) {
      return res.status(404).json({ success: false, message: 'Request not found or not deleted.' });
    }

    const restored = await prisma.scheduleRequest.update({
      where: { id: req.params.id },
      data: { isDeleted: false, deletedAt: null },
      include: REQUEST_INCLUDE,
    });

    await logAudit(req, {
      action: 'SCHEDULE_REQUEST_RESTORE',
      module: 'SCHEDULE_REQUEST_MANAGEMENT',
      description: `${req.user.firstName} restored a cancelled schedule request.`,
      targetRecordId: req.params.id,
    });

    return res.json({ success: true, message: 'Request restored.', data: restored });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── DELETE /:id/permanent: Instructor permanently deletes their own cancelled request ─
router.delete('/:id/permanent', authorize('INSTRUCTOR'), async (req, res) => {
  try {
    const teacher = await getOwnTeacher(req.user.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'No teacher profile found for this account.' });
    }

    const existing = await prisma.scheduleRequest.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.teacherId !== teacher.id || !existing.isDeleted) {
      return res.status(404).json({ success: false, message: 'Request not found or must be cancelled first.' });
    }

    await prisma.scheduleRequest.delete({ where: { id: req.params.id } });

    await logAudit(req, {
      action: 'SCHEDULE_REQUEST_PERMANENT_DELETE',
      module: 'SCHEDULE_REQUEST_MANAGEMENT',
      description: `${req.user.firstName} permanently deleted a cancelled schedule request.`,
      targetRecordId: req.params.id,
    });

    return res.json({ success: true, message: 'Request permanently deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /: All requests (Admin/Registrar review queue) ──────────────────────
router.get('/', authorize('ADMINISTRATOR', 'REGISTRAR_SCHEDULER'), async (req, res) => {
  try {
    const where = { isDeleted: false, ...(req.query.status ? { status: req.query.status } : {}) };
    const requests = await prisma.scheduleRequest.findMany({
      where,
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: requests });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PATCH /:id/approve: Validate + create the real Schedule ─────────────────
router.patch('/:id/approve', authorize('ADMINISTRATOR', 'REGISTRAR_SCHEDULER'), async (req, res) => {
  try {
    const existing = await prisma.scheduleRequest.findUnique({
      where: { id: req.params.id },
      include: { teacher: { include: { user: true } }, subjectOffering: { include: { subject: true } } },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }
    if (existing.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Only pending requests can be approved.' });
    }

    const roomId = req.body.roomId || existing.roomId;
    if (!roomId) {
      return res.status(400).json({ success: false, message: 'A room must be assigned before approving this request.' });
    }

    const [activeYear, currentSemester] = await Promise.all([
      prisma.schoolYear.findFirst({ where: { isCurrent: true } }),
      prisma.semester.findFirst({ where: { isCurrent: true } }),
    ]);
    if (!activeYear || !currentSemester) {
      return res.status(400).json({
        success: false,
        message: 'Configuration error: ensure a School Year and Semester have isCurrent set to true.',
      });
    }

    const proposedData = {
      teacherId: existing.teacherId,
      roomId,
      sectionId: existing.sectionId,
      subjectOfferingId: existing.subjectOfferingId,
      schoolYearId: activeYear.id,
      semesterId: currentSemester.id,
      dayOfWeek: existing.dayOfWeek,
      startTime: existing.startTime,
      endTime: existing.endTime,
    };

    try {
      await ScheduleConflictService.validateSchedule(proposedData);
    } catch (conflictError) {
      return res.status(409).json({ success: false, message: conflictError.message });
    }

    const { newSchedule, updatedRequest } = await prisma.$transaction(async (tx) => {
      const schedule = await tx.schedule.create({
        data: {
          ...proposedData,
          studentCount: existing.studentCount,
          status: 'SCHEDULED',
        },
      });

      const request = await tx.scheduleRequest.update({
        where: { id: existing.id },
        data: { status: 'APPROVED', reviewedById: req.user.id, roomId, resultingScheduleId: schedule.id },
      });

      return { newSchedule: schedule, updatedRequest: request };
    });

    await logAudit(req, {
      action: 'SCHEDULE_REQUEST_APPROVE',
      module: 'SCHEDULE_REQUEST_MANAGEMENT',
      description: `${req.user.firstName} approved a schedule request and placed it as a real class.`,
      targetRecordId: existing.id,
      metadata: { resultingScheduleId: newSchedule.id },
    });

    await NotificationService.create(existing.teacher.userId, {
      title: 'Schedule request approved',
      message: `Your request for ${existing.subjectOffering.subject.name} on ${existing.dayOfWeek} ${existing.startTime}-${existing.endTime} was approved and scheduled.`,
      type: 'SCHEDULE_REQUEST_APPROVED',
      link: '/my-schedules',
    });

    return res.json({ success: true, message: 'Request approved and scheduled.', data: { request: updatedRequest, schedule: newSchedule } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PATCH /:id/reject ─────────────────────────────────────────────────────
router.patch('/:id/reject', authorize('ADMINISTRATOR', 'REGISTRAR_SCHEDULER'), async (req, res) => {
  try {
    const existing = await prisma.scheduleRequest.findUnique({
      where: { id: req.params.id },
      include: { teacher: { include: { user: true } }, subjectOffering: { include: { subject: true } } },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }
    if (existing.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Only pending requests can be rejected.' });
    }

    const updated = await prisma.scheduleRequest.update({
      where: { id: existing.id },
      data: { status: 'REJECTED', reviewedById: req.user.id, reviewNotes: req.body.reviewNotes || null },
    });

    await logAudit(req, {
      action: 'SCHEDULE_REQUEST_REJECT',
      module: 'SCHEDULE_REQUEST_MANAGEMENT',
      description: `${req.user.firstName} rejected a schedule request.`,
      targetRecordId: existing.id,
      metadata: { reviewNotes: req.body.reviewNotes || null },
    });

    await NotificationService.create(existing.teacher.userId, {
      title: 'Schedule request rejected',
      message: `Your request for ${existing.subjectOffering.subject.name} on ${existing.dayOfWeek} ${existing.startTime}-${existing.endTime} was rejected.${req.body.reviewNotes ? ` Reason: ${req.body.reviewNotes}` : ''}`,
      type: 'SCHEDULE_REQUEST_REJECTED',
      link: '/my-schedules',
    });

    return res.json({ success: true, message: 'Request rejected.', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
