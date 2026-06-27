import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database demo seed...');

  // 1. Clean up existing demo data to prevent unique constraint errors
  // (Optional: Remove if you want to preserve existing records)
  await prisma.schedule.deleteMany({});
  await prisma.subjectOffering.deleteMany({});
  await prisma.subject.deleteMany({});
  await prisma.section.deleteMany({});
  await prisma.room.deleteMany({});
  await prisma.teacher.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.semester.deleteMany({});
  await prisma.schoolYear.deleteMany({});

  console.log('🧹 Cleared old demo records.');

  // 2. Insert Active School Year
  const schoolYear = await prisma.schoolYear.create({
    data: {
      name: '2026-2027',
      isCurrent: true,
    },
  });

  // 3. Insert Active Semester
  const semester = await prisma.semester.create({
    data: {
      name: '1st Semester',
      isCurrent: true,
    },
  });

  // 4. Insert Demo User and Link to Teacher Profile
  const demoUser = await prisma.user.create({
    data: {
      email: 'mendoza.alex@pclu.edu.ph',
      firstName: 'Alex',
      lastName: 'Mendoza',
      role: 'TEACHER', // Adjust based on your enum if applicable
    },
  });

  const teacher = await prisma.teacher.create({
    data: {
      userId: demoUser.id,
    },
  });

  // 5. Insert Demo Room
  const room = await prisma.room.create({
    data: {
      name: 'Room 302 (CL)',
      capacity: 45,
    },
  });

  // 6. Insert Demo Section
  const section = await prisma.section.create({
    data: {
      name: 'BSIT-3A',
    },
  });

  // 7. Insert Demo Subject & Subject Offering (For backend validation fallback)
  const subject = await prisma.subject.create({
    data: {
      code: 'IT311',
      title: 'Advanced Database Management Systems',
    },
  });

  await prisma.subjectOffering.create({
    data: {
      subjectId: subject.id,
      schoolYearId: schoolYear.id,
      semesterId: semester.id,
    },
  });

  console.log('✅ Demo workspace successfully populated!');
  console.log({
    SchoolYear: schoolYear.name,
    Semester: semester.name,
    Teacher: `${demoUser.firstName} ${demoUser.lastName}`,
    Room: room.name,
    Section: section.name,
    Subject: subject.title,
  });
}

main()
  .catch((e) => {
    console.error('❌ Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });