import 'dotenv/config';
import { prisma } from '../src/config/prisma.js';
import bcrypt from 'bcrypt'; // Switch to 'bcryptjs' if your project uses it

async function main() {
  console.log('🌱 Starting database seeding...');
  const defaultPassword = "Password123!";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);
  
  // 1. Create Current School Year
  const schoolYear = await prisma.schoolYear.upsert({
    where: { name: '2026-2027' },
    update: {},
    create: {
      name: '2026-2027',
      isCurrent: true,
    },
  });
  console.log(`✅ School Year created: ${schoolYear.name}`);

  // 2. Create Current Semester
  // Using findFirst/create since name is not marked unique in your schema
  let semester = await prisma.semester.findFirst({
    where: { name: '1st Semester' }
  });
  if (!semester) {
    semester = await prisma.semester.create({
      data: {
        name: '1st Semester',
        isCurrent: true,
      },
    });
  }
  console.log(`✅ Semester created: ${semester.name}`);

  // 3. Create a Default Subject
  const subject = await prisma.subject.upsert({
    where: { code: 'CS101' },
    update: {},
    create: {
      code: 'CS101',
      name: 'Intro to Computing',
      units: 3,
      isLabRequired: false,
    },
  });
  console.log(`✅ Subject created: ${subject.code}`);

  // 4. Create a Subject Offering linked to that Subject
  const offering = await prisma.subjectOffering.create({
    data: {
      subjectId: subject.id,
    },
  });
  console.log(`✅ Subject Offering created with ID: ${offering.id}`);

  console.log('✨ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });