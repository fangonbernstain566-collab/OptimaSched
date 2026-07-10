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
  const roleNames = ['ADMINISTRATOR', 'REGISTRAR_SCHEDULER', 'CASHIER', 'INSTRUCTOR', 'STUDENT'];
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

  // --- 2b. Registrar User ---
  console.log('Seeding registrar user...');
  const registrarRole = await prisma.role.findUnique({ where: { name: 'REGISTRAR_SCHEDULER' } });
  await prisma.user.upsert({
    where:  { email: 'registrar@pclu.edu.ph' },
    update: {},
    create: {
      email:        'registrar@pclu.edu.ph',
      firstName:    'Regina',
      lastName:     'Registrar',
      passwordHash,
      role:         { connect: { id: registrarRole.id } },
    },
  });
  console.log('✅ Registrar user created: registrar@pclu.edu.ph');

  // --- 2c. Cashier User ---
  console.log('Seeding cashier user...');
  const cashierRole = await prisma.role.findUnique({ where: { name: 'CASHIER' } });
  await prisma.user.upsert({
    where:  { email: 'cashier@pclu.edu.ph' },
    update: {},
    create: {
      email:        'cashier@pclu.edu.ph',
      firstName:    'Carlo',
      lastName:     'Cashier',
      passwordHash,
      role:         { connect: { id: cashierRole.id } },
    },
  });
  console.log('✅ Cashier user created: cashier@pclu.edu.ph');

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

  // 🌟 NEW: Seed short-login uncertified instructor user for constraint testing
  console.log('Seeding uncertified instructor user for validation tests...');
  const uncertifiedUser = await prisma.user.upsert({
    where:  { email: 'test@pclu.edu.ph' },
    update: { firstName: 'Uncertified', lastName: 'Professor', roleId: instructorRole.id },
    create: {
      email:        'test@pclu.edu.ph',
      firstName:    'Uncertified',
      lastName:     'Professor',
      passwordHash,
      role:         { connect: { id: instructorRole.id } },
    },
  });
  console.log(`✅ Uncertified Instructor created: ${uncertifiedUser.email}`);

  // ─── 4. College + Department ───────────────────────────────────────────────
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

  // ─── 5. Teacher records for instructors ────────────────────────────────────
  console.log('Seeding teacher records...');
  let teacherRecord = await prisma.teacher.findUnique({
    where: { userId: instructorUser.id },
  });
  if (!teacherRecord) {
    teacherRecord = await prisma.teacher.create({
      data: {
        userId:       instructorUser.id,
        departmentId: csDept.id,
        maxTeachingLoad: 21,
      },
    });
  }

  // 🌟 NEW: Link a teacher configuration record to your short-login test account
  let uncertifiedTeacherRecord = await prisma.teacher.findUnique({
    where: { userId: uncertifiedUser.id },
  });
  if (!uncertifiedTeacherRecord) {
    uncertifiedTeacherRecord = await prisma.teacher.create({
      data: {
        userId:       uncertifiedUser.id,
        departmentId: csDept.id,
        maxTeachingLoad: 21,
      },
    });
  }
  console.log('✅ Teacher records synchronized');

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
    1: [
      { code: 'IT1',      name: 'Introduction to Computing',      units: 3, isLabRequired: true  },
      { code: 'IT2',      name: 'Computer Programming 1',         units: 3, isLabRequired: true  },
      { code: 'GE1',      name: 'Understanding the Self',         units: 3, isLabRequired: false },
      { code: 'GE2',      name: 'Readings in Philippine History',        units: 3, isLabRequired: false },
      { code: 'GE3',      name: 'The Contemporary World',        units: 3, isLabRequired: false },
      { code: 'GE4',      name: 'Mathematics in the Modern World',       units: 3, isLabRequired: false },
      { code: 'GEC1',     name: "People and the Earth's Ecosystems",     units: 3, isLabRequired: false },
      { code: 'PATHFit1', name: 'Movement Competency Program',           units: 2, isLabRequired: false },
      { code: 'NSTP1',    name: 'Civic Welfare Training Service 1',      units: 3, isLabRequired: false },
    ],
    2: [
      { code: 'IT6',       name: 'Data Structures & Algorithm',          units: 3, isLabRequired: true  },
      { code: 'IT4',       name: 'Application Dev. & Emerging Tech.',    units: 3, isLabRequired: true  },
      { code: 'IT10',      name: 'Discrete Mathematics',                 units: 3, isLabRequired: false },
      { code: 'GE8',       name: 'IT Professional Ethics',                units: 3, isLabRequired: false },
      { code: 'GEC3',      name: 'World Literature',                     units: 3, isLabRequired: false },
      { code: 'PATHFit3',  name: 'Fundamentals of Games and Sports',     units: 2, isLabRequired: false },
      { code: 'TechWrit',  name: 'Technical Report Writing',             units: 3, isLabRequired: false },
    ],
    3: [
      { code: 'IT Elec 1', name: 'Object Oriented Programming',          units: 3, isLabRequired: true  },
      { code: 'IT20',      name: 'Networking 2',                         units: 3, isLabRequired: true  },
      { code: 'IT11',      name: 'Integrative Programing & Tech. 1',     units: 3, isLabRequired: true  },
      { code: 'IT14',      name: 'Information Assurance & Security 1',   units: 3, isLabRequired: true  },
      { code: 'IT13',      name: 'Web Development',                      units: 3, isLabRequired: true  },
      { code: 'IT12',      name: 'Research Method',                      units: 3, isLabRequired: false },
      { code: 'IT15',      name: 'IT Trips and Seminar',                 units: 1, isLabRequired: false },
    ],
    4: [
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
  console.log('✅ BSIT curriculum (Year 1-4) seeded');

  // ─── 8b. Remove old/retired subjects no longer in the curriculum ─────────
  console.log('Cleaning up retired subjects...');
  const validCodes = Object.values(BSIT_CURRICULUM).flat().map((s) => s.code);

  const staleSubjects = await prisma.subject.findMany({
    where: { code: { notIn: validCodes } },
  });

  for (const stale of staleSubjects) {
    await prisma.curriculumSubject.deleteMany({ where: { subjectId: stale.id } });

    const staleOfferings = await prisma.subjectOffering.findMany({
      where: { subjectId: stale.id },
      select: { id: true },
    });
    const staleOfferingIds = staleOfferings.map((o) => o.id);

    if (staleOfferingIds.length > 0) {
      await prisma.schedule.deleteMany({
        where: { subjectOfferingId: { in: staleOfferingIds } },
      });
    }

    await prisma.subjectOffering.deleteMany({ where: { subjectId: stale.id } });
    await prisma.subject.delete({ where: { id: stale.id } });
  }
  console.log(`✅ Removed ${staleSubjects.length} retired subject(s)`);

  // ─── 9. Buildings + Rooms ──────────────────────────────────────────────────
  console.log('Seeding buildings and rooms...');

  const mainBuilding = await prisma.building.upsert({
    where:  { name: 'College Main Building' },
    update: {},
    create: { name: 'College Main Building' },
  });

  const newBuilding = await prisma.building.upsert({
    where:  { name: 'New Building' },
    update: {},
    create: { name: 'New Building' },
  });

  const allRooms = [
    { name: 'Clinic',                               capacity: 10, type: 'CLINIC',              buildingId: mainBuilding.id },
    { name: 'Computer Lab 1',                       capacity: 35, type: 'COMPUTER_LABORATORY', buildingId: mainBuilding.id },
    { name: 'Computer Lab 2',                       capacity: 35, type: 'COMPUTER_LABORATORY', buildingId: mainBuilding.id },
    { name: 'Computer Lab 3',                       capacity: 35, type: 'COMPUTER_LABORATORY', buildingId: mainBuilding.id },
    { name: 'IT Faculty Room / Office of the Dean',capacity: 20, type: 'OFFICE',              buildingId: mainBuilding.id },
    { name: 'Graduate School Room',                capacity: 30, type: 'LECTURE_ROOM',        buildingId: mainBuilding.id },
    { name: "Registrar's Office",                  capacity: 10, type: 'OFFICE',              buildingId: mainBuilding.id },
    { name: 'Office of the VP of Human Resources', capacity: 10, type: 'OFFICE',              buildingId: mainBuilding.id },
    { name: 'Office of the VP of Academic Affairs',capacity: 10, type: 'OFFICE',              buildingId: mainBuilding.id },
    { name: 'Accreditation / Defense Room',        capacity: 20, type: 'LECTURE_ROOM',        buildingId: mainBuilding.id },
    { name: 'QA Manager Office',                   capacity: 10, type: 'OFFICE',              buildingId: mainBuilding.id },
    { name: 'College Library',                      capacity: 50, type: 'LIBRARY',             buildingId: mainBuilding.id },
    { name: 'Graduate School Library / Research Center', capacity: 30, type: 'LIBRARY',       buildingId: mainBuilding.id },
    { name: 'Room 201',                             capacity: 40, type: 'LECTURE_ROOM',        buildingId: mainBuilding.id },
    { name: 'Room 202',                             capacity: 40, type: 'LECTURE_ROOM',        buildingId: mainBuilding.id },
    { name: 'Room 203',                             capacity: 40, type: 'LECTURE_ROOM',        buildingId: mainBuilding.id },
    { name: 'Room 204',                             capacity: 40, type: 'LECTURE_ROOM',        buildingId: mainBuilding.id },
    { name: 'Room 301',                             capacity: 40, type: 'LECTURE_ROOM',        buildingId: mainBuilding.id },
    { name: 'Room 302',                             capacity: 40, type: 'LECTURE_ROOM',        buildingId: mainBuilding.id },
    { name: 'Room 303',                             capacity: 40, type: 'LECTURE_ROOM',        buildingId: mainBuilding.id },
    { name: 'Room 304',                             capacity: 40, type: 'LECTURE_ROOM',        buildingId: mainBuilding.id },
    { name: 'Crime Laboratory Room',                capacity: 30, type: 'LABORATORY',          buildingId: mainBuilding.id },
    { name: 'Investigation Room',                    capacity: 20, type: 'LECTURE_ROOM',        buildingId: mainBuilding.id },
    { name: 'Faculty Office',                       capacity: 20, type: 'OFFICE',              buildingId: mainBuilding.id },
    { name: 'Criminology Office',                   capacity: 10, type: 'OFFICE',              buildingId: mainBuilding.id },
    { name: 'Room 305',                             capacity: 40, type: 'LECTURE_ROOM',        buildingId: mainBuilding.id },
    { name: 'Room 306',                             capacity: 40, type: 'LECTURE_ROOM',        buildingId: mainBuilding.id },
    { name: 'Room 307',                             capacity: 40, type: 'LECTURE_ROOM',        buildingId: mainBuilding.id },
    { name: 'Room 308',                             capacity: 40, type: 'LECTURE_ROOM',        buildingId: mainBuilding.id },
    { name: 'Ship Bridge Simulator Room',          capacity: 20, type: 'SIMULATOR_ROOM',      buildingId: mainBuilding.id },
    { name: 'STO Office',                           capacity: 10, type: 'OFFICE',              buildingId: mainBuilding.id },
    { name: 'Room 401',                             capacity: 40, type: 'LECTURE_ROOM',        buildingId: mainBuilding.id },
    { name: 'GMDSS and Radar Room',                capacity: 20, type: 'SIMULATOR_ROOM',      buildingId: mainBuilding.id },
    { name: 'ECDIS & Cargo Handling Room',          capacity: 20, type: 'SIMULATOR_ROOM',      buildingId: mainBuilding.id },
    { name: 'Chart Room',                           capacity: 20, type: 'LECTURE_ROOM',        buildingId: mainBuilding.id },
    { name: 'BSMT Room (Room 402)',                capacity: 40, type: 'LECTURE_ROOM',        buildingId: mainBuilding.id },
    { name: 'Room A-101',                           capacity: 40, type: 'LECTURE_ROOM',        buildingId: newBuilding.id },
    { name: 'Room A-102',                           capacity: 40, type: 'LECTURE_ROOM',        buildingId: newBuilding.id },
    { name: 'SHS Faculty Room (Room 103)',          capacity: 20, type: 'FACULTY_ROOM',        buildingId: newBuilding.id },
    { name: 'Room A-204',                           capacity: 40, type: 'LECTURE_ROOM',        buildingId: newBuilding.id },
    { name: 'Room A-205',                           capacity: 40, type: 'LECTURE_ROOM',        buildingId: newBuilding.id },
    { name: 'Room A-206',                           capacity: 40, type: 'LECTURE_ROOM',        buildingId: newBuilding.id },
    { name: 'Room A-207',                           capacity: 40, type: 'LECTURE_ROOM',        buildingId: newBuilding.id },
    { name: 'Room A-208',                           capacity: 40, type: 'LECTURE_ROOM',        buildingId: newBuilding.id },
    { name: 'Room A-209',                           capacity: 40, type: 'LECTURE_ROOM',        buildingId: newBuilding.id },
    { name: 'Room A201',                             capacity: 40, type: 'LECTURE_ROOM',        buildingId: newBuilding.id },
    { name: 'Room A202',                             capacity: 40, type: 'LECTURE_ROOM',        buildingId: newBuilding.id },
    { name: 'Guidance / OSA (Room A203)',          capacity: 15, type: 'OFFICE',              buildingId: newBuilding.id },
    { name: 'Room A204',                             capacity: 40, type: 'LECTURE_ROOM',        buildingId: newBuilding.id },
    { name: 'Room A205',                             capacity: 40, type: 'LECTURE_ROOM',        buildingId: newBuilding.id },
    { name: 'Room A206',                             capacity: 40, type: 'LECTURE_ROOM',        buildingId: newBuilding.id },
    { name: 'Room A207',                             capacity: 40, type: 'LECTURE_ROOM',        buildingId: newBuilding.id },
    { name: 'Room A208',                             capacity: 40, type: 'LECTURE_ROOM',        buildingId: newBuilding.id },
    { name: 'Room A209',                             capacity: 40, type: 'LECTURE_ROOM',        buildingId: newBuilding.id },
    { name: 'Room A210',                             capacity: 40, type: 'LECTURE_ROOM',        buildingId: newBuilding.id },
    { name: 'Room A301',                             capacity: 40, type: 'LECTURE_ROOM',        buildingId: newBuilding.id },
    { name: 'Room A302 - AVR / Multimedia Room',    capacity: 60, type: 'AVR',                 buildingId: newBuilding.id },
    { name: 'Room A303',                             capacity: 40, type: 'LECTURE_ROOM',        buildingId: newBuilding.id },
    { name: 'Room A304',                             capacity: 40, type: 'LECTURE_ROOM',        buildingId: newBuilding.id },
    { name: 'Room A305',                             capacity: 40, type: 'LECTURE_ROOM',        buildingId: newBuilding.id },
    { name: 'Room A306',                             capacity: 40, type: 'LECTURE_ROOM',        buildingId: newBuilding.id },
    { name: 'Room A307',                             capacity: 40, type: 'LECTURE_ROOM',        buildingId: newBuilding.id },
    { name: 'Room A308',                             capacity: 40, type: 'LECTURE_ROOM',        buildingId: newBuilding.id },
    { name: 'Room A309',                             capacity: 40, type: 'LECTURE_ROOM',        buildingId: newBuilding.id },
  ];

  for (const room of allRooms) {
    const exists = await prisma.room.findFirst({
      where: { name: room.name, buildingId: room.buildingId },
    });
    if (!exists) {
      await prisma.room.create({ data: room });
    }
  }
  console.log('✅ Buildings and rooms seeded');

  // ─── 10. Sections ──────────────────────────────────────────────────────────
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

  // ─── 11. Scheduling Constraint Rules ──────────────────────────────────
  console.log('Seeding matrix evaluation rules and constraints...');

  const databaseSubjects = await prisma.subject.findMany({});

  for (const currentSubject of databaseSubjects) {
    if (currentSubject.isLabRequired) {
      await prisma.subjectRoomConstraint.upsert({
        where: {
          subjectId_roomType: {
            subjectId: currentSubject.id,
            roomType: 'COMPUTER_LABORATORY',
          },
        },
        update: {},
        create: {
          subjectId: currentSubject.id,
          roomType: 'COMPUTER_LABORATORY',
        },
      });
    }

    // 🌟 Notice: Capabilities are mapped ONLY to teacherRecord (Hely).
    // The uncertified record remains untouched, triggering Constraint 2.
    if (teacherRecord) {
      await prisma.teacherSubjectCapability.upsert({
        where: {
          teacherId_subjectId: {
            teacherId: teacherRecord.id,
            subjectId: currentSubject.id,
          },
        },
        update: {},
        create: {
          teacherId: teacherRecord.id,
          subjectId: currentSubject.id,
        },
      });
    }
  }
  console.log('✅ Subject and Instructor configuration constraints mapped');

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