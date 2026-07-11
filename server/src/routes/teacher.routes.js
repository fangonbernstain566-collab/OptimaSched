import { Router } from 'express';
import prisma from '../config/prisma.js';
import bcrypt from 'bcrypt';
import { authenticate } from '../middleware/auth.js';
import { logAudit } from '../utils/auditLog.js';

const router = Router();
router.use(authenticate); // ✅ makes req.user available below

// Accepts either an array of strings or a comma-separated string from the UI
// and normalizes it to a deduped, trimmed array of credential tags.
const normalizeCredentials = (value) => {
  if (value === undefined) return undefined;
  const list = Array.isArray(value) ? value : String(value).split(',');
  return [...new Set(list.map((c) => String(c).trim()).filter(Boolean))];
};

// Whitelist of columns the UI is allowed to sort by, mapped to the Prisma
// orderBy shape needed to reach them (some live on the related User/Department).
// Keeping this as an explicit map (rather than trusting req.query.sortBy
// directly) prevents arbitrary/unsupported field names from being handed to Prisma.
const TEACHER_SORT_MAP = {
  firstName:       (order) => ({ user: { firstName: order } }),
  lastName:        (order) => ({ user: { lastName: order } }),
  email:           (order) => ({ user: { email: order } }),
  department:      (order) => ({ department: { name: order } }),
  maxTeachingLoad: (order) => ({ maxTeachingLoad: order }),
  createdAt:       (order) => ({ user: { createdAt: order } }),
};

// ─── GET /: Fetch registered teachers ─────────────────────────────────────────
// Pagination is opt-in via ?page=. Omitting it preserves the old behavior
// (full array) for existing callers that don't expect a paginated shape.
router.get('/', async (req, res) => {
  try {
    const where = { isDeleted: false };
    const include = {
      user:       { select: { id: true, firstName: true, lastName: true, email: true, createdAt: true } },
      department: true,
    };
    const defaultOrderBy = { user: { lastName: 'asc' } };

    if (req.query.page === undefined) {
      const teachers = await prisma.teacher.findMany({ where, include, orderBy: defaultOrderBy });
      return res.json({ success: true, data: teachers });
    }

    const page     = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 10, 1), 100);
    const skip     = (page - 1) * pageSize;

    const order   = req.query.order === 'desc' ? 'desc' : 'asc';
    const sortMap = TEACHER_SORT_MAP[req.query.sortBy];
    const orderBy = sortMap ? sortMap(order) : defaultOrderBy;

    const [total, teachers] = await Promise.all([
      prisma.teacher.count({ where }),
      prisma.teacher.findMany({ where, include, orderBy, skip, take: pageSize }),
    ]);

    return res.json({
      success: true,
      data: teachers,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /all: Kept for backward compatibility ────────────────────────────────
router.get('/all', async (req, res) => {
  try {
    const teachers = await prisma.teacher.findMany({
      where: { isDeleted: false, user: { role: { name: 'INSTRUCTOR' } } },
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

// ─── GET /recently-deleted: List soft-deleted teachers ───────────────────────
router.get('/recently-deleted', async (req, res) => {
  try {
    const deletedTeachers = await prisma.teacher.findMany({
      where: { isDeleted: true },
      include: {
        user:       { select: { id: true, firstName: true, lastName: true, email: true } },
        department: true,
      },
      orderBy: { deletedAt: 'desc' },
    });

    return res.json({ success: true, data: deletedTeachers });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /: Register a new teacher ──────────────────────────────────────────
router.post('/', async (req, res) => {
  const { firstName, lastName, email, maxTeachingLoad, departmentName, credentials } = req.body;

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
        credentials:     normalizeCredentials(credentials) ?? [],
      },
      include: { user: true, department: true },
    });

    await logAudit(req, {
      action: 'TEACHER_CREATE',
      module: 'TEACHER_MANAGEMENT',
      description: `${req.user.firstName} registered teacher ${newTeacher.user.firstName} ${newTeacher.user.lastName}.`,
      targetRecordId: newTeacher.id,
      targetRecordName: `${newTeacher.user.firstName} ${newTeacher.user.lastName}`,
      metadata: { email: newTeacher.user.email, department: newTeacher.department.name },
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

// ─── PUT /:id: Update a teacher's profile ────────────────────────────────────
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, maxTeachingLoad, departmentName, credentials } = req.body;

  try {
    const existingTeacher = await prisma.teacher.findUnique({
      where: { id },
      include: { user: true, department: true },
    });

    if (!existingTeacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found.' });
    }

    let departmentId = existingTeacher.departmentId;
    if (departmentName && departmentName !== existingTeacher.department.name) {
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
      departmentId = targetDept.id;
    }

    await prisma.user.update({
      where: { id: existingTeacher.userId },
      data: {
        firstName: firstName?.trim() || existingTeacher.user.firstName,
        lastName:  lastName?.trim()  || existingTeacher.user.lastName,
      },
    });

    const normalizedCredentials = normalizeCredentials(credentials);

    const updatedTeacher = await prisma.teacher.update({
      where: { id },
      data: {
        departmentId,
        maxTeachingLoad: maxTeachingLoad !== undefined
          ? parseInt(maxTeachingLoad, 10) || existingTeacher.maxTeachingLoad
          : existingTeacher.maxTeachingLoad,
        ...(normalizedCredentials !== undefined && { credentials: normalizedCredentials }),
      },
      include: { user: true, department: true },
    });

    await logAudit(req, {
      action: 'TEACHER_UPDATE',
      module: 'TEACHER_MANAGEMENT',
      description: `${req.user.firstName} updated teacher ${updatedTeacher.user.firstName} ${updatedTeacher.user.lastName}.`,
      targetRecordId: updatedTeacher.id,
      targetRecordName: `${updatedTeacher.user.firstName} ${updatedTeacher.user.lastName}`,
      metadata: { department: updatedTeacher.department.name, maxTeachingLoad: updatedTeacher.maxTeachingLoad },
    });

    return res.status(200).json({
      success: true,
      message: 'Instructor profile updated successfully.',
      data: updatedTeacher,
    });
  } catch (error) {
    console.error('❌ Error updating teacher:', error);
    return res.status(500).json({ success: false, message: `Teacher update failed: ${error.message}` });
  }
});

// ─── PATCH /:id/restore: Restore a soft-deleted teacher ──────────────────────
router.patch('/:id/restore', async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await prisma.teacher.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Teacher not found.' });
    }
    if (!existing.isDeleted) {
      return res.status(400).json({ success: false, message: 'Teacher is already active.' });
    }

    const restored = await prisma.teacher.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null },
      include: { user: true, department: true },
    });

    await logAudit(req, {
      action: 'TEACHER_RESTORE',
      module: 'TEACHER_MANAGEMENT',
      description: `${req.user.firstName} restored teacher ${existing.user.firstName} ${existing.user.lastName}.`,
      targetRecordId: id,
      targetRecordName: `${existing.user.firstName} ${existing.user.lastName}`,
    });

    return res.json({ success: true, message: 'Teacher restored successfully!', data: restored });
  } catch (error) {
    console.error('❌ Error restoring teacher:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── DELETE /:id/permanent: Hard-delete a soft-deleted teacher ───────────────
router.delete('/:id/permanent', async (req, res) => {
  const { id } = req.params;

  try {
    const target = await prisma.teacher.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!target) {
      return res.status(404).json({ success: false, message: 'Teacher not found.' });
    }
    if (!target.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Teacher must be soft-deleted first before permanent deletion.',
      });
    }

    await prisma.teacher.delete({ where: { id } });

    await logAudit(req, {
      action: 'TEACHER_PERMANENT_DELETE',
      module: 'TEACHER_MANAGEMENT',
      description: `${req.user.firstName} permanently deleted teacher ${target.user.firstName} ${target.user.lastName}.`,
      targetRecordId: id,
      targetRecordName: `${target.user.firstName} ${target.user.lastName}`,
    });

    return res.json({ success: true, message: 'Teacher permanently deleted.' });
  } catch (error) {
    console.error('❌ Error permanently deleting teacher:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── DELETE /:id: Soft-delete a teacher only if not tied to any schedule ─────
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const scheduleCount = await prisma.schedule.count({ where: { teacherId: id } });
    if (scheduleCount > 0) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete this teacher because they are already assigned to schedules.',
      });
    }

    const teacherToDelete = await prisma.teacher.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!teacherToDelete) {
      return res.status(404).json({ success: false, message: 'Teacher not found.' });
    }
    if (teacherToDelete.isDeleted) {
      return res.status(400).json({ success: false, message: 'Teacher is already deleted.' });
    }

    await prisma.teacher.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    await logAudit(req, {
      action: 'TEACHER_SOFT_DELETE',
      module: 'TEACHER_MANAGEMENT',
      description: `${req.user.firstName} moved teacher ${teacherToDelete.user.firstName} ${teacherToDelete.user.lastName} to Recently Deleted.`,
      targetRecordId: teacherToDelete.id,
      targetRecordName: `${teacherToDelete.user.firstName} ${teacherToDelete.user.lastName}`,
    });

    return res.status(200).json({ success: true, message: 'Teacher moved to Recently Deleted.' });
  } catch (error) {
    console.error('❌ Error deleting teacher:', error);
    return res.status(500).json({ success: false, message: `Teacher deletion failed: ${error.message}` });
  }
});

export default router;