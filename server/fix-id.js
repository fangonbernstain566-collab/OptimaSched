import { prisma } from './src/config/prisma.js';
import { randomUUID } from 'crypto';

async function main() {
  const newId = randomUUID();

  const teacher = await prisma.teacher.update({
    where: {
      id: ''
    },
    data: {
      id: newId
    }
  });

  console.log(teacher);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });