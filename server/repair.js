import { prisma } from './src/config/prisma.js';

async function main() {
  // Create Teacher
  const teacher = await prisma.teacher.create({
    data: {
      userId: '993e241e-295d-4407-bf3d-3c4ea4613f05',
      departmentId: '30491f14-a1a5-472f-9497-89bbe3b031a2',
      maxTeachingLoad: 23
    }
  });

  console.log("Teacher created:");
  console.log(teacher);

  // Create Section
  const section = await prisma.section.create({
    data: {
      name: 'BSCS-4A'
    }
  });

  console.log("Section created:");
  console.log(section);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });