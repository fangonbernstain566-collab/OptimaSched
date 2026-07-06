import { Router } from 'express';
import prisma from '../config/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// ─── GET /by-section/:sectionId: Subject offerings for a section's curriculum ─
router.get('/by-section/:sectionId', async (req, res) => {
  try {
    const { sectionId } = req.params;

    const section = await prisma.section.findUnique({ where: { id: sectionId } });
    if (!section) {
      return res.status(404).json({ success: false, message: 'Section not found.' });
    }

    const curriculumSubjects = await prisma.curriculumSubject.findMany({
      where: { program: section.program, yearLevel: section.yearLevel },
      select: { subjectId: true },
    });
    const subjectIds = curriculumSubjects.map((c) => c.subjectId);

    const offerings = subjectIds.length > 0
      ? await prisma.subjectOffering.findMany({
          where: { subjectId: { in: subjectIds } },
          include: { subject: true },
          orderBy: { classCode: 'asc' },
        })
      : [];

    // Group offerings by subject so each subject appears once with all of its
    // class codes nested underneath (a subject can have multiple offerings/sections).
    const bySubject = new Map();
    for (const offering of offerings) {
      const key = offering.subjectId;
      if (!bySubject.has(key)) {
        bySubject.set(key, {
          id: offering.subjectId,
          subjectCode: offering.subject.code,
          subjectName: offering.subject.name,
          classCodes: [],
        });
      }
      // { id, code } instead of a bare string — the frontend needs the actual
      // SubjectOffering id to submit a valid schedule, not just its display code.
      bySubject.get(key).classCodes.push({ id: offering.id, code: offering.classCode });
    }

    return res.json({
      success: true,
      data: {
        section: {
          id: section.id,
          name: section.name,
          program: section.program,
          yearLevel: section.yearLevel,
        },
        subjectOfferings: Array.from(bySubject.values()),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
