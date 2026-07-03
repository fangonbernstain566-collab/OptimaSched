import { Router } from 'express';
import prisma from '../config/prisma.js';
import bcrypt from 'bcrypt';
import { authenticate } from '../middleware/auth.js';
import { logAudit } from '../utils/auditLog.js';

const router = Router();
router.use(authenticate); // ✅ makes req.user available below

// ─── GET /: Fetch all registered teachers ────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const teachers = await prisma.teacher.findMany({
      include: {
        user:       { select: { id: true, firstName: true, lastName: true, email: true } },
        department: true,
      },
      orderBy: { user: { lastName: 'asc' } },
    });

    return res.json({ success: true, data: teachers });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /all: Kept for backward compatibility ────────────────────────────────
router.get('/all', async (req, res) => {
  try {
    const teachers = await prisma.teacher.findMany({
      where: { user: { role: { name: 'INSTRUCTOR' } } },
      include: {
        user:       { select: { id: true, firstName: true, lastName: true, email: true } },
        department: true,
      },
    });

    return res.json({ success: true, data: teachers });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /: Register a new teacher ──────────────────────────────────────────
router.post('/', async (req, res) => {
  const { firstName, lastName, email, maxTeachingLoad, departmentName } = req.body;

  try {
    if (!firstName || !lastName || !email || !departmentName) {
      return res.status(400).json({
        success: false,
        message: 'firstName, lastName, email, and departmentName are required.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    let teacherRole = await prisma.role.findFirst({ where: { name: 'INSTRUCTOR' } });
    if (!teacherRole) {
      teacherRole = await prisma.role.create({ data: { name: 'INSTRUCTOR' } });
    }

    const defaultPassword = 'Password123!';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const targetUser = await prisma.user.upsert({
      where:  { email: normalizedEmail },
      update: { firstName, lastName, role: { connect: { id: teacherRole.id } } },
      create: {
        email: normalizedEmail,
        firstName,
        lastName,
        passwordHash,
        role: { connect: { id: teacherRole.id } },
      },
    });

    let targetDept = await prisma.department.findFirst({ where: { name: departmentName } });

    if (!targetDept) {
      let primaryCollege = await prisma.college.findFirst();
      if (!primaryCollege) {
        primaryCollege = await prisma.college.create({
          data: { name: 'College of Information Technology', code: 'CIT' },
        });
      }

      targetDept = await prisma.department.create({
        data: {
          name: departmentName,
          code: departmentName.split(' ').map((w) => w[0]).join('').toUpperCase(),
          collegeId: primaryCollege.id,
        },
      });
    }

    const existingTeacher = await prisma.teacher.findFirst({ where: { userId: targetUser.id } });
    if (existingTeacher) {
      return res.status(409).json({
        success: false,
        message: 'This user is already registered as an instructor.',
      });
    }

    const newTeacher = await prisma.teacher.create({
      data: {
        userId:          targetUser.id,
        departmentId:    targetDept.id,
        maxTeachingLoad: parseInt(maxTeachingLoad, 10) || 15,
      },
      include: { user: true, department: true },
    });

    // ✅ NEW: audit log for teacher registration
    await logAudit(req, `${req.user.firstName} registered teacher ${newTeacher.user.firstName} ${newTeacher.user.lastName}`, {
      entityType: 'Teacher', entityId: newTeacher.id,
    });

    return res.status(201).json({
      success: true,
      message: 'Instructor profile registered successfully.',
      data: newTeacher,
      defaultPassword,
    });
  } catch (error) {
    console.error('❌ Prisma execution exception caught:', error);
    return res.status(500).json({
      success: false,
      message: `Database Insertion Failure: ${error.message}`,
    });
  }
});

export default router;