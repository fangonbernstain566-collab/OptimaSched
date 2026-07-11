import prisma from '../config/prisma.js';

// Confirms the teacher holds every credential the subject requires (e.g. a
// "Masters in IT" tag on Subject.requiredCredentials must also appear in
// Teacher.credentials) before they can be assigned to teach it. Throws with a
// user-facing message on mismatch; callers should surface it as a 400.
export async function assertTeacherMeetsSubjectCredentials(teacherId, subjectOfferingId) {
  const [teacher, offering] = await Promise.all([
    prisma.teacher.findUnique({ where: { id: teacherId }, select: { credentials: true } }),
    prisma.subjectOffering.findUnique({
      where: { id: subjectOfferingId },
      select: { subject: { select: { name: true, requiredCredentials: true } } },
    }),
  ]);

  if (!teacher || !offering) {
    throw new Error('Invalid teacher or subject offering reference.');
  }

  const required = offering.subject.requiredCredentials;
  if (!required || required.length === 0) return;

  const held = new Set(teacher.credentials ?? []);
  const missing = required.filter((c) => !held.has(c));

  if (missing.length > 0) {
    throw new Error(
      `Instructor lacks the required credential(s) to teach ${offering.subject.name}: ${missing.join(', ')}.`
    );
  }
}
