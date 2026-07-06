// server/prisma/seed.js
import 'dotenv/config';
import { prisma } from '../src/config/prisma.js';
import bcrypt from 'bcrypt';

async function main() {
  console.log('🌱 Starting database seeding...');

  const defaultPassword  = 'Password123!';
  const passwordHash     = await bcrypt.hash(defaultPassword, 10);

  // ─── 1. Roles ──────────────────────────────────────────────────────────────
  console.log('Seeding roles...');
  const roleNames = ['ADMINISTRATOR', 'REGISTRAR_SCHEDULER', 'INSTRUCTOR', 'STUDENT'];
  for (const name of roleNames) {
    await prisma.role.upsert({
      where:  { name },
      update: {},
      create: { name },
    });
  }

  const adminRole      = await prisma.role.findUnique({ where: { name: 'ADMINISTRATOR' } });
  const instructorRole = await prisma.role.findUnique({ where: { name: 'INSTRUCTOR' } });

  if (!adminRole || !instructorRole) {
    throw new Error('Required roles were not created.');
  }
  console.log('✅ Roles created/updated');

  // ─── 2. Admin User ─────────────────────────────────────────────────────────
  // ✅ FIX: Admin user was completely missing — needed to log in after reset!
  console.log('Seeding admin user...');
  await prisma.user.upsert({
    where:  { email: 'admin@pclu.edu.ph' },
    update: {},
    create: {
      email:        'admin@pclu.edu.ph',
      firstName:    'Aris',
      lastName:     'Admin',
      passwordHash,
      role:         { connect: { id: adminRole.id } },
    },
  });
  console.log('✅ Admin user created: admin@pclu.edu.ph');

  // ─── 3. Instructor User ────────────────────────────────────────────────────
  console.log('Seeding instructor user...');
  const instructorUser = await prisma.user.upsert({
    where:  { email: 'hely.ten@pclu.edu.ph' },
    update: { firstName: 'berns', lastName: 'fangon', roleId: instructorRole.id },
    create: {
      email:        'hely.ten@pclu.edu.ph',
      firstName:    'berns',
      lastName:     'fangon',
      passwordHash,
      role:         { connect: { id: instructorRole.id } },
    },
  });
  console.log(`✅ Instructor created: ${instructorUser.email}`);

  // ─── 4. College + Department ───────────────────────────────────────────────
  // ✅ FIX: Missing — required for creating Teacher records
  console.log('Seeding college and departments...');
  const college = await prisma.college.upsert({
    where:  { code: 'CCS' },
    update: {},
    create: { name: 'College of Computer Studies', code: 'CCS' },
  });

  const departments = [
    { name: 'Computer Science',       code: 'CS'  },
    { name: 'Information Technology', code: 'IT'  },
  ];
  const [csDept] = await Promise.all(
    departments.map((d) =>
      prisma.department.upsert({
        where:  { code: d.code },
        update: {},
        create: { ...d, collegeId: college.id },
      })
    )
  );
  console.log('✅ College and departments created');

  // ─── 5. Teacher record for instructor ──────────────────────────────────────
  console.log('Seeding teacher record...');
  const existingTeacher = await prisma.teacher.findUnique({
    where: { userId: instructorUser.id },
  });
  if (!existingTeacher) {
    await prisma.teacher.create({
      data: {
        userId:       instructorUser.id,
        departmentId: csDept.id,
        maxTeachingLoad: 21,
      },
    });
  }
  console.log('✅ Teacher record created');

  // ─── 6. School Year ────────────────────────────────────────────────────────
  console.log('Seeding school year...');
  await prisma.schoolYear.updateMany({
    where: { isCurrent: true, name: { not: '2026-2027' } },
    data:  { isCurrent: false },
  });
  const schoolYear = await prisma.schoolYear.upsert({
    where:  { name: '2026-2027' },
    update: { isCurrent: true },
    create: { name: '2026-2027', isCurrent: true },
  });
  console.log(`✅ School Year: ${schoolYear.name}`);

  // ─── 7. Semesters ──────────────────────────────────────────────────────────
  console.log('Seeding semesters...');
  await prisma.semester.updateMany({
    where: { isCurrent: true, name: { not: '1st Semester' } },
    data:  { isCurrent: false },
  });
  for (const sem of [
    { name: '1st Semester', isCurrent: true  },
    { name: '2nd Semester', isCurrent: false },
    { name: 'Summer',       isCurrent: false },
  ]) {
    const existing = await prisma.semester.findFirst({ where: { name: sem.name } });
    if (!existing) {
      await prisma.semester.create({ data: sem });
    } else {
      await prisma.semester.update({ where: { id: existing.id }, data: sem });
    }
  }
  console.log('✅ Semesters created');

  // ─── 8. BSIT Curriculum: Subjects + Offerings + Year-Level Mapping ─────────
  console.log('Seeding BSIT curriculum (Year 1-4)...');
  const BSIT_CURRICULUM = {
    1: [ // First Year - BS in Information Technology
      { code: 'IT1',      name: 'Introduction to Computing',            units: 3, isLabRequired: true  },
      { code: 'IT2',      name: 'Computer Programming 1',                units: 3, isLabRequired: true  },
      { code: 'GE1',      name: 'Understanding the Self',                units: 3, isLabRequired: false },
      { code: 'GE2',      name: 'Readings in Philippine History',        units: 3, isLabRequired: false },
    { code: 'GE3',      name: 'The Contemporary World',                units: 3, isLabRequired: false },
    { code: 'GE4',      name: 'Mathematics in the Modern World',       units: 3, isLabRequired: false },
    { code: 'GEC1',     name: "People and the Earth's Ecosystems",     units: 3, isLabRequired: false },
    { code: 'PATHFit1', name: 'Movement Competency Program',           units: 2, isLabRequired: false },
    { code: 'NSTP1',    name: 'Civic Welfare Training Service 1',      units: 3, isLabRequired: false },
  ],
  2: [ // Second Year - BS in Information Technology
    { code: 'IT6',       name: 'Data Structures & Algorithm',          units: 3, isLabRequired: true  },
    { code: 'IT4',       name: 'Application Dev. & Emerging Tech.',    units: 3, isLabRequired: true  },
    { code: 'IT10',      name: 'Discrete Mathematics',                 units: 3, isLabRequired: false },
    { code: 'GE8',       name: 'IT Professional Ethics',                units: 3, isLabRequired: false },
    { code: 'GEC3',      name: 'World Literature',                     units: 3, isLabRequired: false },
    { code: 'PATHFit3',  name: 'Fundamentals of Games and Sports',     units: 2, isLabRequired: false },
    { code: 'TechWrit',  name: 'Technical Report Writing',             units: 3, isLabRequired: false },
  ],
  3: [ // Third Year - BS in Information Technology
    { code: 'IT Elec 1', name: 'Object Oriented Programming',          units: 3, isLabRequired: true  },
    { code: 'IT20',      name: 'Networking 2',                         units: 3, isLabRequired: true  },
    { code: 'IT11',      name: 'Integrative Programing & Tech. 1',     units: 3, isLabRequired: true  },
    { code: 'IT14',      name: 'Information Assurance & Security 1',   units: 3, isLabRequired: true  },
    { code: 'IT13',      name: 'Web Development',                      units: 3, isLabRequired: true  },
    { code: 'IT12',      name: 'Research Method',                      units: 3, isLabRequired: false },
    { code: 'IT15',      name: 'IT Trips and Seminar',                 units: 1, isLabRequired: false },
  ],
  4: [ // Fourth Year - BS in Information Technology
    { code: 'CAP2',      name: 'Capstone Project 2',                    units: 3, isLabRequired: false },
    { code: 'IT Elec 4', name: 'Integrative Programming Technology 2', units: 3, isLabRequired: false },
  ],
};

  for (const [yearLevel, subjects] of Object.entries(BSIT_CURRICULUM)) {
    for (const subjectData of subjects) {
      const subject = await prisma.subject.upsert({
        where:  { code: subjectData.code },
        update: { name: subjectData.name, units: subjectData.units, isLabRequired: subjectData.isLabRequired },
        create: subjectData,
      });

      const existingOffering = await prisma.subjectOffering.findFirst({
        where: { subjectId: subject.id },
      });
      if (!existingOffering) {
        await prisma.subjectOffering.create({
          data: { subjectId: subject.id, classCode: `${subject.code}-A` },
        });
      }

      await prisma.curriculumSubject.upsert({
        where: {
          program_yearLevel_subjectId: {
            program: 'BSIT',
            yearLevel: Number(yearLevel),
            subjectId: subject.id,
          },
        },
        update: {},
        create: { program: 'BSIT', yearLevel: Number(yearLevel), subjectId: subject.id },
      });
    }
  }

  // Retire the temporary dev bootstrap that mapped IT14 into every year level —
  // it now has its real Year 3 mapping from the loop above.
  const it14 = await prisma.subject.findUnique({ where: { code: 'IT14' } });
  if (it14) {
    await prisma.curriculumSubject.deleteMany({
      where: { subjectId: it14.id, program: 'BSIT', yearLevel: { not: 3 } },
    });
  }

  console.log('✅ BSIT curriculum (Year 1-4) seeded');

  // ─── 9. Building + Rooms ───────────────────────────────────────────────────
  console.log('Seeding building and rooms...');
  const building = await prisma.building.upsert({
    where:  { name: 'Main Building' },
    update: {},
    create: { name: 'Main Building' },
  });
  for (const room of [
    { name: 'Room 101',       capacity: 40, type: 'LECTURE_ROOM'        },
    { name: 'Computer Lab 1', capacity: 35, type: 'COMPUTER_LABORATORY' },
    { name: 'Science Lab 1',  capacity: 30, type: 'LABORATORY'          },
  ]) {
    const exists = await prisma.room.findFirst({
      where: { name: room.name, buildingId: building.id },
    });
    if (!exists) {
      await prisma.room.create({ data: { ...room, buildingId: building.id } });
    }
  }
  console.log('✅ Building and rooms created');

  // ─── 10. Sections ──────────────────────────────────────────────────────────
  // Naming convention: "<PROGRAM>-<YEAR_LETTER><BLOCK_NUMBER>", e.g. "BSIT-A1"
  // -> program BSIT, yearLevel 1 (A=1, B=2, C=3, D=4).
  console.log('Seeding sections...');
  for (const name of [
    'BSIT-A1', 'BSIT-A2', 'BSIT-A3', 'BSIT-A4',
    'BSIT-B1', 'BSIT-B2',
    'BSIT-C1', 'BSIT-C2',
    'BSIT-D1', 'BSIT-D2',
  ]) {
    const yearLetter = name.split('-')[1][0];
    const yearLevel = yearLetter.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
    await prisma.section.upsert({
      where:  { name },
      update: { program: 'BSIT', yearLevel },
      create: { name, program: 'BSIT', yearLevel },
    });
  }
  console.log('✅ Sections created');

  // ✅ FIX: These lines are now INSIDE main() where defaultPassword is in scope
  console.log('✨ Seeding completed successfully!');
  console.log(`🔑 Default password for all users: ${defaultPassword}`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });