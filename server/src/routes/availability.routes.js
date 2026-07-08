import { Router } from 'express';
import prisma from '../config/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logAudit } from '../utils/auditLog.js';

const router = Router();
router.use(authenticate, authorize('INSTRUCTOR'));

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const getOwnTeacher = async (userId) => prisma.teacher.findUnique({ where: { userId } });

// ─── GET /me: List the logged-in instructor's declared availability ─────────
router.get('/me', async (req, res) => {
  try {
    const teacher = await getOwnTeacher(req.user.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'No teacher profile found for this account.' });
    }

    const availabilities = await prisma.availability.findMany({
      where: { teacherId: teacher.id },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    return res.json({ success: true, data: availabilities });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /: Add a new availability window ───────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { dayOfWeek, startTime, endTime } = req.body;

    if (!dayOfWeek || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'dayOfWeek, startTime, and endTime are required.' });
    }
    if (!DAYS.includes(dayOfWeek)) {
      return res.status(400).json({ success: false, message: `dayOfWeek must be one of: ${DAYS.join(', ')}` });
    }
    if (startTime >= endTime) {
      return res.status(400).json({ success: false, message: 'startTime must be before endTime.' });
    }

    const teacher = await getOwnTeacher(req.user.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'No teacher profile found for this account.' });
    }

    const created = await prisma.availability.create({
      data: { teacherId: teacher.id, dayOfWeek, startTime, endTime },
    });

    await logAudit(req, {
      action: 'AVAILABILITY_CREATE',
      module: 'AVAILABILITY_MANAGEMENT',
      description: `${req.user.firstName} declared availability on ${dayOfWeek} ${startTime}-${endTime}.`,
      targetRecordId: created.id,
      metadata: { dayOfWeek, startTime, endTime },
    });

    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── DELETE /:id: Remove one of the instructor's own availability windows ────
router.delete('/:id', async (req, res) => {
  try {
    const teacher = await getOwnTeacher(req.user.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'No teacher profile found for this account.' });
    }

    const existing = await prisma.availability.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.teacherId !== teacher.id) {
      return res.status(404).json({ success: false, message: 'Availability window not found.' });
    }

    await prisma.availability.delete({ where: { id: req.params.id } });

    await logAudit(req, {
      action: 'AVAILABILITY_DELETE',
      module: 'AVAILABILITY_MANAGEMENT',
      description: `${req.user.firstName} removed a declared availability window.`,
      targetRecordId: req.params.id,
      metadata: { dayOfWeek: existing.dayOfWeek, startTime: existing.startTime, endTime: existing.endTime },
    });

    return res.json({ success: true, message: 'Availability window removed.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
