import { Router } from 'express';
import prisma from '../config/prisma.js'; 

const router = Router();

// POST: Onboard a New Faculty Teacher Profile
// Accessible via: POST http://localhost:5000/api/teachers
// POST: Onboard a New Faculty Teacher Profile
router.post('/', async (req, res) => {
  const { firstName, lastName, email, maxTeachingLoad, departmentName } = req.body;

  try {
    // 1. DYNAMIC ROLE RESOLUTION
    // Ensures the TEACHER structural role exists in your database
    let teacherRole = await prisma.role.findFirst({
      where: { name: 'TEACHER' }
    });

    if (!teacherRole) {
      teacherRole = await prisma.role.create({
        data: { name: 'TEACHER' }
      });
    }

    // 2. DYNAMIC USER CREATION OR RESOLUTION
    const targetUser = await prisma.user.upsert({
      where: { email: email.toLowerCase().trim() },
      update: {}, 
      create: {
        email: email.toLowerCase().trim(),
        firstName,
        lastName,
        role: {
          connect: { id: teacherRole.id } // Connects relation via unique ID link
        },
      },
    });

    // Fallback: If department doesn't exist yet, build its structural requirements safely
    if (!targetDept) {
      // Find any existing college context to prevent foreign key errors
      let primaryCollege = await prisma.college.findFirst();
      
      if (!primaryCollege) {
        // Creates a placeholder organization tier if the database is blank
        primaryCollege = await prisma.college.create({
          data: {
            name: 'College of Information Technology',
          }
        });
      }

      targetDept = await prisma.department.create({
        data: {
          name: departmentName,
          collegeId: primaryCollege.id,
        },
      });
    }

    // 3. ATOMIC TEACHER REGISTRATION
    // Links everything together inside the final table matrix
    const newTeacher = await prisma.teacher.create({
      data: {
        userId: targetUser.id,
        departmentId: targetDept.id,
        maxTeachingLoad: parseInt(maxTeachingLoad, 10) || 15,
      },
      include: {
        user: true,
        department: true
      }
    });

    return res.status(201).json({
      success: true,
      message: '🎉 Instructor profile registered successfully!',
      data: newTeacher
    });

  } catch (error) {
    console.error('❌ Prisma execution exception caught:', error);
    return res.status(500).json({
      success: false,
      message: `Database Insertion Failure: ${error.message}`
    });
  }
});

// GET: Fetch Active Faculty Roster
// Accessible via: GET http://localhost:5000/api/teachers
router.get('/', async (req, res) => {
  try {
    const teachers = await prisma.teacher.findMany({
      include: {
        user: true,
        department: true,
      },
    });
    return res.json({ success: true, data: teachers });
  } catch (error) {
    console.error('❌ Error fetching teacher roster:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;