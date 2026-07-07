// src/routes/schedule.routes.js
import { Router } from 'express';
import prisma from '../config/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { logAudit } from '../utils/auditLog.js';
import { z } from 'zod';

const router = Router();
router.use(authenticate); // ✅ makes req.user available to every route below

const idParamSchema = z.object({
  id: z.string().uuid('Invalid schedule id format.'),
});

const parseScheduleId = (req, res) => {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message ?? 'Invalid request parameters.',
    });
    return null;
  }
  return parsed.data.id;
};

// ─── Helper: safely extract value from allSettled result ──────────────────────
const safeResult = (result) => {
  if (result.status === 'fulfilled') return result.value;
  console.error('[options] Query failed:', result.reason?.message);
  return [];
};

// ─── 1. GET /: All schedules for matrix + records table ──────────────────────
router.get('/', async (req, res) => {
  try {
    const schedules = await prisma.schedule.findMany({
      where: {
        isDeleted: false,
      },
      include: {
        teacher:         { include: { user: true } },
        room:            true,
        section:         true,
        subjectOffering: { include: { subject: true } },
        schoolYear:      true,
        semester:        true,
      }
    });
    return res.json({ success: true, data: schedules });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── 2. GET /options: All dropdown data ──────────────────────────────────────
router.get('/options', async (req, res) => {
  try {
    const results = await Promise.allSettled([
      prisma.teacher.findMany({ include: { user: true } }),
      prisma.room.findMany({
        where: {
          isDeleted: false,
          type: {
            in: ['LECTURE_ROOM', 'COMPUTER_LABORATORY', 'LABORATORY', 'AVR', 'SIMULATOR_ROOM'],
          },
        },
      }),
      prisma.section.findMany(),
      prisma.subjectOffering.findMany({ include: { subject: true } }),
      prisma.schoolYear.findMany(),
      prisma.semester.findMany(),
    ]);

    const [
      teachersResult, roomsResult, sectionsResult,
      subjectOfferingsResult, schoolYearsResult, semestersResult,
    ] = results;

    return res.json({
      success: true,
      data: {
        teachers:         safeResult(teachersResult),
        rooms:            safeResult(roomsResult),
        sections:         safeResult(sectionsResult),
        subjectOfferings: safeResult(subjectOfferingsResult),
        schoolYears:      safeResult(schoolYearsResult),
        semesters:        safeResult(semestersResult),
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── 3. GET /pending: Pending schedules ──────────────────────────────────────
router.get('/pending', async (req, res) => {
  try {
    const pendingSchedules = await prisma.schedule.findMany({
      where:   {
        status: 'PENDING',
        isDeleted: false,
      },
      include: {
        teacher:         { include: { user: true } },
        subjectOffering: { include: { subject: true } },
        section:         true,
      }
    });
    return res.json({ success: true, data: pendingSchedules });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── 4. POST /: Create a new schedule ────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const {
      teacherId, roomId, sectionId, subjectOfferingId,
      schoolYearId, semesterId, dayOfWeek, startTime, endTime,
      studentCount,
    } = req.body;

    const requiredFields = {
      teacherId, roomId, sectionId, subjectOfferingId,
      schoolYearId, semesterId, dayOfWeek, startTime, endTime,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([, val]) => !val || String(val).trim() === '')
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // ✅ FIX: create happens FIRST, only once, before anything references it
    const newSchedule = await prisma.schedule.create({
      data: {
        teacherId, roomId, sectionId, subjectOfferingId,
        schoolYearId, semesterId, dayOfWeek, startTime, endTime,
        studentCount: Number(studentCount) || 0,
        status: 'PENDING',
      },
      include: { subjectOffering: { include: { subject: true } } },
    });

    await logAudit(req, {
      action: 'SCHEDULE_CREATE',
      module: 'SCHEDULE_MANAGEMENT',
      description: `${req.user.firstName} created a new schedule (pending placement).`,
      targetRecordId: newSchedule.id,
      targetRecordName: newSchedule.subjectOffering?.subject?.name ?? 'Schedule',
      metadata: {
        teacherId,
        roomId,
        sectionId,
        dayOfWeek,
        startTime,
        endTime,
        status: 'PENDING',
      },
    });

    // ✅ Single return, at the end
    return res.json({ success: true, message: 'Schedule request created!', data: newSchedule });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── 5. POST /validate: Conflict check ───────────────────────────────────────
router.post('/validate', async (req, res) => {
  const { teacherId, roomId, sectionId, dayOfWeek, startTime, endTime } = req.body;

  try {
    const conflictQuery = (field, id) => ({
      where: {
        [field]: id,
        dayOfWeek,
        status: 'SCHEDULED',
        isDeleted: false,
        OR: [
          { startTime: { lte: startTime }, endTime: { gt: startTime } },
          { startTime: { lt: endTime },    endTime: { gte: endTime  } }
        ]
      }
    });

    if (roomId) {
      const roomConflict = await prisma.schedule.findFirst(conflictQuery('roomId', roomId));
      if (roomConflict) return res.status(400).json({ success: false, message: 'Room is occupied.' });
    }

    const teacherConflict = await prisma.schedule.findFirst(conflictQuery('teacherId', teacherId));
    if (teacherConflict) return res.status(400).json({ success: false, message: 'Teacher is busy.' });

    if (sectionId) {
      const sectionConflict = await prisma.schedule.findFirst(conflictQuery('sectionId', sectionId));
      if (sectionConflict) return res.status(400).json({ success: false, message: 'Section already has a class.' });
    }

    return res.json({ success: true, message: 'Time slot is valid.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── 6. POST /confirm: Finalize a schedule ───────────────────────────────────
router.post('/confirm', async (req, res) => {
  const { scheduleId, roomId, dayOfWeek, startTime, endTime } = req.body;
  try {
    const existing = await prisma.schedule.findUnique({
      where: { id: scheduleId },
      select: { id: true, isDeleted: true },
    });

    if (!existing || existing.isDeleted) {
      return res.status(404).json({ success: false, message: 'Schedule not found.' });
    }

    const updated = await prisma.schedule.update({
      where: { id: scheduleId },
      data:  { roomId, dayOfWeek, startTime, endTime, status: 'SCHEDULED' }
    });

    await logAudit(req, {
      action: 'SCHEDULE_CONFIRM',
      module: 'SCHEDULE_MANAGEMENT',
      description: `${req.user.firstName} finalized a schedule placement.`,
      targetRecordId: updated.id,
      targetRecordName: 'Schedule',
      metadata: { roomId, dayOfWeek, startTime, endTime },
    });

    return res.json({ success: true, message: 'Successfully scheduled.', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── 7. PUT /:id: Update a schedule ──────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const id = parseScheduleId(req, res);
    if (!id) return;
    const {
      teacherId, roomId, sectionId, subjectOfferingId,
      schoolYearId, semesterId, dayOfWeek, startTime, endTime,
      studentCount,
      status,
    } = req.body;

    const requiredFields = {
      teacherId, roomId, sectionId, subjectOfferingId,
      schoolYearId, semesterId, dayOfWeek, startTime, endTime,
    };
     
    const missingFields = Object.entries(requiredFields)
      .filter(([, val]) => !val || String(val).trim() === '')
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    const existing = await prisma.schedule.findUnique({
      where: { id },
      select: { id: true, isDeleted: true },
    });

    if (!existing || existing.isDeleted) {
      return res.status(404).json({ success: false, message: 'Schedule not found.' });
    }

    const updated = await prisma.schedule.update({
      where: { id },
      data: {
        teacherId, roomId, sectionId, subjectOfferingId,
        schoolYearId, semesterId, dayOfWeek, startTime, endTime,
        studentCount: Number(studentCount) || 0,
        ...(status && { status }),
      },
      include: {
        teacher:         { include: { user: true } },
        room:            true,
        section:         true,
        subjectOffering: { include: { subject: true } },
        schoolYear:      true,
        semester:        true,
      }
    });

    await logAudit(req, {
      action: 'SCHEDULE_UPDATE',
      module: 'SCHEDULE_MANAGEMENT',
      description: `${req.user.firstName} updated the ${updated.subjectOffering?.subject?.name ?? 'class'} schedule.`,
      targetRecordId: updated.id,
      targetRecordName: updated.subjectOffering?.subject?.name ?? 'Schedule',
      metadata: { status: updated.status, dayOfWeek, startTime, endTime },
    });

    return res.json({ success: true, message: 'Schedule updated successfully!', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── 8. GET /recently-deleted: List soft-deleted schedules ───────────────────
router.get('/recently-deleted', async (req, res) => {
  try {
    const deletedSchedules = await prisma.schedule.findMany({
      where: { isDeleted: true },
      include: {
        teacher:         { include: { user: true } },
        room:            true,
        section:         true,
        subjectOffering: { include: { subject: true } },
        schoolYear:      true,
        semester:        true,
      },
      orderBy: { deletedAt: 'desc' },
    });

    return res.json({ success: true, data: deletedSchedules });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── 9. PATCH /:id/restore: Restore a soft-deleted schedule ──────────────────
router.patch('/:id/restore', async (req, res) => {
  try {
    const id = parseScheduleId(req, res);
    if (!id) return;

    const existing = await prisma.schedule.findUnique({
      where: { id },
      include: { subjectOffering: { include: { subject: true } } },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Schedule not found.' });
    }
    if (!existing.isDeleted) {
      return res.status(400).json({ success: false, message: 'Schedule is already active.' });
    }

    const restored = await prisma.schedule.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
      },
    });

    await logAudit(req, {
      action: 'SCHEDULE_RESTORE',
      module: 'SCHEDULE_MANAGEMENT',
      description: `${req.user.firstName} restored the ${existing?.subjectOffering?.subject?.name ?? 'a'} schedule.`,
      targetRecordId: id,
      targetRecordName: existing?.subjectOffering?.subject?.name ?? 'Schedule',
    });

    return res.json({ success: true, message: 'Schedule restored successfully!', data: restored });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── 10. DELETE /:id/permanent: Hard-delete a soft-deleted schedule ─────────
router.delete('/:id/permanent', async (req, res) => {
  try {
    const id = parseScheduleId(req, res);
    if (!id) return;

    const target = await prisma.schedule.findUnique({
      where: { id },
      include: { subjectOffering: { include: { subject: true } } },
    });

    if (!target) {
      return res.status(404).json({ success: false, message: 'Schedule not found.' });
    }
    if (!target.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Schedule must be soft-deleted first before permanent deletion.',
      });
    }

    await prisma.schedule.delete({ where: { id } });

    await logAudit(req, {
      action: 'SCHEDULE_PERMANENT_DELETE',
      module: 'SCHEDULE_MANAGEMENT',
      description: `${req.user.firstName} permanently deleted the ${target?.subjectOffering?.subject?.name ?? 'a'} schedule.`,
      targetRecordId: id,
      targetRecordName: target?.subjectOffering?.subject?.name ?? 'Schedule',
    });

    return res.json({ success: true, message: 'Schedule permanently deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── 11. DELETE /:id: Soft-delete a schedule ─────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const id = parseScheduleId(req, res);
    if (!id) return;

    const target = await prisma.schedule.findUnique({
      where: { id },
      include: { subjectOffering: { include: { subject: true } } },
    });

    if (!target) {
      return res.status(404).json({ success: false, message: 'Schedule not found.' });
    }
    if (target.isDeleted) {
      return res.status(400).json({ success: false, message: 'Schedule is already deleted.' });
    }

    await prisma.schedule.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    await logAudit(req, {
      action: 'SCHEDULE_SOFT_DELETE',
      module: 'SCHEDULE_MANAGEMENT',
      description: `${req.user.firstName} moved the ${target?.subjectOffering?.subject?.name ?? 'a'} schedule to Recently Deleted.`,
      targetRecordId: id,
      targetRecordName: target?.subjectOffering?.subject?.name ?? 'Schedule',
    });

    return res.json({ success: true, message: 'Schedule moved to Recently Deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── 12. POST /check-room-conflict: Soft room-conflict check ─────────────────
router.post('/check-room-conflict', async (req, res) => {
  try {
    const { roomId, dayOfWeek, startTime, endTime, excludeId } = req.body;

    if (!roomId || !dayOfWeek || !startTime || !endTime) {
      return res.json({ success: true, hasConflict: false, conflict: null });
    }

    const conflict = await prisma.schedule.findFirst({
      where: {
        roomId,
        dayOfWeek,
        status: { not: 'ARCHIVED' },
        isDeleted: false,
        ...(excludeId && { id: { not: excludeId } }),
        startTime: { lt: endTime },
        endTime:   { gt: startTime },
      },
      include: {
        subjectOffering: { include: { subject: true } },
        teacher:          { include: { user: true } },
      },
    });

    return res.json({ success: true, hasConflict: !!conflict, conflict });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── 13. PUT /:id/students: Save the lightweight student roster ─────────────
router.put('/:id/students', async (req, res) => {
  try {
    const id = parseScheduleId(req, res);
    if (!id) return;
    const { names } = req.body;

    if (!Array.isArray(names)) {
      return res.status(400).json({ success: false, message: '"names" must be an array of strings.' });
    }

    const cleaned = names
      .map((n) => String(n).trim())
      .filter((n) => n.length > 0);

    const existing = await prisma.schedule.findUnique({
      where: { id },
      select: { id: true, isDeleted: true },
    });

    if (!existing || existing.isDeleted) {
      return res.status(404).json({ success: false, message: 'Schedule not found.' });
    }

    const updated = await prisma.schedule.update({
      where: { id },
      data: { enrolledStudents: cleaned },
    });

    await logAudit(req, {
      action: 'ATTENDANCE_UPDATE',
      module: 'SCHEDULE_MANAGEMENT',
      description: `${req.user.firstName} updated enrolled students list.`,
      targetRecordId: updated.id,
      targetRecordName: 'Schedule',
      metadata: { studentCount: cleaned.length },
    });

    return res.json({ success: true, data: updated.enrolledStudents });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;