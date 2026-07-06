import { Router } from 'express';
import { prisma } from '../config/prisma.js';

const router = Router();


// GET /api/dashboard/metrics
router.get('/metrics', async (req, res) => {
  try {
    const [teachers, rooms, sections, schedules] = await Promise.all([
      prisma.teacher.count(),
      prisma.room.count(),
      prisma.section.count(),
      prisma.schedule.count({ where: { isDeleted: false } }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        teachers,
        rooms,
        sections,
        schedules,
      },
    });
  } catch (error) {
  console.error('Dashboard Metrics Error:', error);

  return res.status(500).json({
    success: false,
    message: error.message,
    error,
  });
}
});

// GET /api/dashboard/timetable-progress
router.get('/timetable-progress', async (req, res) => {
  try {
    const [totalBlocks, activeSchoolYear, activeSemester] = await Promise.all([
      prisma.section.count(),
      prisma.schoolYear.findFirst({ where: { isCurrent: true } }),
      prisma.semester.findFirst({ where: { isCurrent: true } }),
    ]);

    // A section counts as "allocated" once it has at least one active
    // schedule entry in the current school year + semester.
    const scheduledSections = activeSchoolYear && activeSemester
      ? await prisma.schedule.findMany({
          where: {
            isDeleted: false,
            schoolYearId: activeSchoolYear.id,
            semesterId: activeSemester.id,
          },
          distinct: ['sectionId'],
          select: { sectionId: true },
        })
      : [];

    const completedBlocks = scheduledSections.length;
    const remainingClasses = Math.max(totalBlocks - completedBlocks, 0);
    const progress = totalBlocks > 0 ? Math.round((completedBlocks / totalBlocks) * 100) : 0;

    return res.status(200).json({
      success: true,
      data: {
        progress,
        allocatedClasses: completedBlocks,
        remainingClasses,
        completedBlocks,
        totalBlocks,
      },
    });
  } catch (error) {
    console.error('Dashboard Timetable Progress Error:', error);

    return res.status(500).json({
      success: false,
      message: error.message,
      error,
    });
  }
});

export default router;