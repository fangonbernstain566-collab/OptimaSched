import 'dotenv/config';
import { prisma } from '../src/config/prisma.js';
import bcrypt from 'bcrypt';

async function main() {
  console.log('🌱 Starting database seeding...');

  const defaultPassword = 'Password123!';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // 1. Seed roles
  const roles = [
    'ADMINISTRATOR',
    'REGISTRAR_SCHEDULER',
    'INSTRUCTOR',
    'STUDENT',
  ];

  for (const roleName of roles) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
  }

  const instructorRole = await prisma.role.findUnique({
    where: { name: 'INSTRUCTOR' },
  });

  if (!instructorRole) {
    throw new Error('INSTRUCTOR role was not created.');
  }

  console.log('✅ Roles created/updated');

  // 2. Seed instructor user
  const instructorUser = await prisma.user.upsert({
    where: {
      email: 'hely.ten@pclu.edu.ph',
    },
    update: {
      firstName: 'berns',
      lastName: 'fangon',
      roleId: instructorRole.id,
    },
    create: {
      email: 'hely.ten@pclu.edu.ph',
      firstName: 'berns',
      lastName: 'fangon',
      passwordHash,
      role: {
        connect: {
          id: instructorRole.id,
        },
      },
    },
  });

  console.log(`✅ Instructor user created/updated: ${instructorUser.email}`);

  // 3. Make sure only this school year is current
  await prisma.schoolYear.updateMany({
    where: {
      isCurrent: true,
      name: { not: '2026-2027' },
    },
    data: {
      isCurrent: false,
    },
  });

  const schoolYear = await prisma.schoolYear.upsert({
    where: { name: '2026-2027' },
    update: {
      isCurrent: true,
    },
    create: {
      name: '2026-2027',
      isCurrent: true,
    },
  });

  console.log(`✅ School Year created/updated: ${schoolYear.name}`);

  // 4. Make sure only this semester is current
  await prisma.semester.updateMany({
    where: {
      isCurrent: true,
      name: { not: '1st Semester' },
    },
    data: {
      isCurrent: false,
    },
  });

  let semester = await prisma.semester.findFirst({
    where: { name: '1st Semester' },
  });

  if (!semester) {
    semester = await prisma.semester.create({
      data: {
        name: '1st Semester',
        isCurrent: true,
      },
    });
  } else {
    semester = await prisma.semester.update({
      where: { id: semester.id },
      data: { isCurrent: true },
    });
  }

  console.log(`✅ Semester created/updated: ${semester.name}`);

  // 5. Create or update subject
  const subject = await prisma.subject.upsert({
    where: { code: 'CS101' },
    update: {
      name: 'Intro to Computing',
      units: 3,
      isLabRequired: false,
    },
    create: {
      code: 'CS101',
      name: 'Intro to Computing',
      units: 3,
      isLabRequired: false,
    },
  });

  console.log(`✅ Subject created/updated: ${subject.code}`);

  // 6. Create offering only if it does not exist
  let offering = await prisma.subjectOffering.findFirst({
    where: {
      subjectId: subject.id,
    },
  });

  if (!offering) {
    offering = await prisma.subjectOffering.create({
      data: {
        subjectId: subject.id,
      },
    });
  }

  console.log(`✅ Subject Offering ready with ID: ${offering.id}`);

  const mainBuilding = await prisma.building.upsert({
  where: {
    name: 'Main Building',
  },
  update: {},
  create: {
    name: 'Main Building',
  },
});

const sampleRooms = [
  {
    name: 'Room 101',
    capacity: 40,
    type: 'LECTURE_ROOM',
  },
  {
    name: 'Computer Lab 1',
    capacity: 35,
    type: 'COMPUTER_LABORATORY',
  },
  {
    name: 'Science Lab 1',
    capacity: 30,
    type: 'LABORATORY',
  },
];

for (const roomData of sampleRooms) {
  const existingRoom = await prisma.room.findFirst({
    where: {
      name: roomData.name,
      buildingId: mainBuilding.id,
    },
  });

  if (!existingRoom) {
    await prisma.room.create({
      data: {
        ...roomData,
        buildingId: mainBuilding.id,
      },
    });
  }
}

console.log('✅ Sample rooms created/verified');

  console.log('✨ Seeding completed successfully!');
  console.log(`🔑 Default instructor password: ${defaultPassword}`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });