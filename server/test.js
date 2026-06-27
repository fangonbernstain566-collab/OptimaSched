import { prisma } from './src/config/prisma.js';

async function main() {
  const teacher = await prisma.teacher.findFirst();

  console.log(teacher);
}

main()
  .finally(async () => prisma.$disconnect());