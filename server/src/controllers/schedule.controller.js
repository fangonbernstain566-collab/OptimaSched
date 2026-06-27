import { prisma } from '../config/prisma.js';

// 1. GET ALL SCHEDULES
export const getSchedules = async (req, res) => {
  try {
    const schedules = await prisma.schedule.findMany({
      include: {
        teacher: {
          include: { user: true }
        },
        room: true,
        section: true,
        subjectOffering: {
          include: { subject: true }
        }
      }
    });

    return res.status(200).json({
      success: true,
      data: schedules
    });
  } catch (error) {
    console.error("Error retrieving schedules:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to fetch schedules from database." 
    });
  }
};

// 2. GET DROPDOWN OPTIONS
export const getScheduleOptions = async (req, res) => {
  try {
    const [teachers, rooms, sections] = await Promise.all([
      prisma.teacher.findMany({
        include: { user: true }
      }),
      prisma.room.findMany(),
      prisma.section.findMany()
    ]);

    return res.status(200).json({
      success: true,
      data: { teachers, rooms, sections }
    });
  } catch (error) {
    console.error("Error retrieving schedule options:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to fetch setup options." 
    });
  }
};

// 3. CREATE SCHEDULE (With Automatic Defaults and Overlap Validation)
export const createSchedule = async (req, res) => {
  try {
    const { 
      teacherId, 
      roomId, 
      sectionId, 
      subjectOfferingId, 
      dayOfWeek, 
      startTime, 
      endTime 
    } = req.body;

    // Basic validation check
    if (!teacherId || !roomId || !sectionId || !startTime || !endTime) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields." 
      });
    }

    // ─── DYNAMIC RELATION HOOKS ──────────────────────────────────────────
    // Fetch active school year and current semester automatically from your tables
    const [activeYear, currentSemester] = await Promise.all([
      prisma.schoolYear.findFirst({ where: { isCurrent: true } }),
      prisma.semester.findFirst({ where: { isCurrent: true } })
    ]);

    if (!activeYear || !currentSemester) {
      return res.status(400).json({
        success: false,
        message: "Configuration error: Ensure a School Year and Semester have 'isCurrent' checked true in your database."
      });
    }

    // Fallback logic for subjectOfferingId if your form hasn't built selection inputs yet
    let targetSubjectOfferingId = subjectOfferingId;
    if (!targetSubjectOfferingId) {
      const fallbackOffering = await prisma.subjectOffering.findFirst();
      if (!fallbackOffering) {
        return res.status(400).json({
          success: false,
          message: "Please add at least one row to your Subject and SubjectOffering tables via Prisma Studio before saving schedules."
        });
      }
      targetSubjectOfferingId = fallbackOffering.id;
    }
    // ─────────────────────────────────────────────────────────────────────

    // Look for existing overlaps across Teacher, Room, or Section
    const conflictingSchedule = await prisma.schedule.findFirst({
      where: {
        dayOfWeek,
        schoolYearId: activeYear.id,
        semesterId: currentSemester.id,
        OR: [
          { teacherId },
          { roomId },
          { sectionId }
        ],
        AND: [
          {
            startTime: { lt: endTime } // Starts before the new one ends
          },
          {
            endTime: { gt: startTime } // Ends after the new one starts
          }
        ]
      },
      include: {
        teacher: { include: { user: true } },
        room: true,
        section: true
      }
    });

    // If a conflict is discovered, stop execution and inform the client
    if (conflictingSchedule) {
      let resource = "resource";
      if (conflictingSchedule.teacherId === teacherId) {
        resource = `Teacher (${conflictingSchedule.teacher.user.firstName} ${conflictingSchedule.teacher.user.lastName})`;
      } else if (conflictingSchedule.roomId === roomId) {
        resource = `Room (${conflictingSchedule.room.name})`;
      } else if (conflictingSchedule.sectionId === sectionId) {
        resource = `Section (${conflictingSchedule.section.name})`;
      }

      return res.status(409).json({
        success: false,
        message: `Scheduling conflict! This ${resource} is already booked from ${conflictingSchedule.startTime} to ${conflictingSchedule.endTime}.`
      });
    }

    // No conflicts found -> Proceed safely to create the database entry
    const newSchedule = await prisma.schedule.create({
      data: {
        teacherId,
        roomId,
        sectionId,
        subjectOfferingId: targetSubjectOfferingId,
        schoolYearId: activeYear.id,
        semesterId: currentSemester.id,
        dayOfWeek,
        startTime,
        endTime
      }
    });

    return res.status(201).json({
      success: true,
      data: newSchedule,
      message: "Schedule created successfully!"
    });

  } catch (error) {
    console.error("Conflict checking error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error during schedule building." 
    });
  }
};

// 4. UPDATE SCHEDULE PLACEHOLDER
export const updateSchedule = async (req, res) => {
  try {
    return res.status(200).json({ success: true, message: "Update functional endpoint stub active." });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};