import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/api/dashboard/metrics', async (req, res) => {
  try {
    const [teachers, rooms, sections, schedules] = await Promise.all([
      prisma.teacher.count(),
      prisma.room.count(),
      prisma.section.count(),
      prisma.schedule.count()
    ]);

    return res.status(200).json({
      success: true,
      data: { teachers, rooms, sections, schedules }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to collect summary statistics." });
  }
});

export default router;