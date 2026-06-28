import { Router } from 'express';
import prisma from '../config/prisma.js';
import bcrypt from 'bcrypt';

const router = Router();

router.get('/all', async (req, res) => {
  try {
    const teachers = await prisma.user.findMany({
      where: { role: { name: 'FACULTY' } }, // Match your enum name!
      select: { id: true, firstName: true, lastName: true }
    });
    res.json({ success: true, data: teachers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    maxTeachingLoad,
    departmentName,
  } = req.body;

  try {
    if (!firstName || !lastName || !email || !departmentName) {
      return res.status(400).json({
        success: false,
        message: 'firstName, lastName, email, and departmentName are required.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    let teacherRole = await prisma.role.findFirst({
      where: {
        name: 'INSTRUCTOR',
      },
    });

    if (!teacherRole) {
      teacherRole = await prisma.role.create({
        data: {
          name: 'INSTRUCTOR',
        },
      });
    }

    const defaultPassword = 'Password123!';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const targetUser = await prisma.user.upsert({
      where: {
        email: normalizedEmail,
      },
      update: {
        firstName,
        lastName,
        role: {
          connect: {
            id: teacherRole.id,
          },
        },
      },
      create: {
        email: normalizedEmail,
        firstName,
        lastName,
        passwordHash,
        role: {
          connect: {
            id: teacherRole.id,
          },
        },
      },
    });

    let targetDept = await prisma.department.findFirst({
      where: {
        name: departmentName,
      },
    });

    if (!targetDept) {
      let primaryCollege = await prisma.college.findFirst();

      if (!primaryCollege) {
        primaryCollege = await prisma.college.create({
          data: {
            name: 'College of Information Technology',
            code: 'CIT',
          },
        });
      }

      targetDept = await prisma.department.create({
        data: {
          name: departmentName,
          code: departmentName
            .split(' ')
            .map((word) => word[0])
            .join('')
            .toUpperCase(),
          collegeId: primaryCollege.id,
        },
      });
    }

    const existingTeacher = await prisma.teacher.findFirst({
      where: {
        userId: targetUser.id,
      },
    });

    if (existingTeacher) {
      return res.status(409).json({
        success: false,
        message: 'This user is already registered as an instructor.',
      });
    }

    const newTeacher = await prisma.teacher.create({
      data: {
        userId: targetUser.id,
        departmentId: targetDept.id,
        maxTeachingLoad: parseInt(maxTeachingLoad, 10) || 15,
      },
      include: {
        user: true,
        department: true,
      },
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