import { Router } from 'express';
import prisma from '../config/prisma.js';

const router = Router();

// 1. GET: Fetch options for dropdowns (Teachers, Rooms, Sections)
router.get('/options', async (req, res) => {
  try {
    // NOTE: Ensure these model names (teacher, room, section) match your schema.prisma exactly!
    const [teachers, rooms, sections] = await Promise.all([
      prisma.teacher.findMany({ include: { user: true } }), 
      prisma.room.findMany(),
      prisma.section.findMany()
    ]);

    res.json({
      success: true,
      data: { teachers, rooms, sections }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. GET: Fetch all pending scheduling requests
router.get('/pending', async (req, res) => {
  try {
    const pendingSchedules = await prisma.schedule.findMany({
      where: { status: 'PENDING' },
      include: { teacher: { include: { user: true } }, subject: true }
    });
    return res.json({ success: true, data: pendingSchedules });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 3. POST: Create a new Pending Schedule (The form submission)
router.post('/', async (req, res) => {
  try {
    const { teacherId, roomId, sectionId, subjectOfferingId, dayOfWeek, startTime, endTime } = req.body;
    
    const newSchedule = await prisma.schedule.create({
      data: {
        teacherId, roomId, sectionId, subjectOfferingId, dayOfWeek, startTime, endTime,
        status: 'PENDING' // Starts in the drag-and-drop queue
      }
    });
    res.json({ success: true, message: 'Schedule request created!', data: newSchedule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. POST: Conflict Validation
router.post('/validate', async (req, res) => {
  const { teacherId, roomId, sectionId, dayOfWeek, startTime, endTime } = req.body;

  try {
    const conflictQuery = (field, id) => ({
      where: {
        [field]: id,
        dayOfWeek,
        status: 'SCHEDULED',
        OR: [
          { startTime: { lte: startTime }, endTime: { gt: startTime } },
          { startTime: { lt: endTime }, endTime: { gte: endTime } }
        ]
      }
    });

    // Check Room
    if (roomId) {
      const roomConflict = await prisma.schedule.findFirst(conflictQuery('roomId', roomId));
      if (roomConflict) return res.status(400).json({ success: false, message: 'Room is occupied.' });
    }

    // Check Teacher
    const teacherConflict = await prisma.schedule.findFirst(conflictQuery('teacherId', teacherId));
    if (teacherConflict) return res.status(400).json({ success: false, message: 'Teacher is busy.' });

    // Check Section
    if (sectionId) {
      const sectionConflict = await prisma.schedule.findFirst(conflictQuery('sectionId', sectionId));
      if (sectionConflict) return res.status(400).json({ success: false, message: 'Section already has a class.' });
    }

    return res.json({ success: true, message: 'Time slot is valid.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 5. POST: Confirm and Save
router.post('/confirm', async (req, res) => {
  const { scheduleId, roomId, dayOfWeek, startTime, endTime } = req.body;
  try {
    const updated = await prisma.schedule.update({
      where: { id: scheduleId },
      data: { roomId, dayOfWeek, startTime, endTime, status: 'SCHEDULED' }
    });
    return res.json({ success: true, message: 'Successfully scheduled.', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;