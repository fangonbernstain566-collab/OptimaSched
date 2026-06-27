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
      prisma.schedule.count(),
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
export default router;