import { prisma } from './src/config/prisma.js';
import { randomUUID } from 'crypto';

async function main() {
  const section = await prisma.section.findFirst();

  if (!section) {
    console.log('No section found.');
    return;
  }

  console.log('Current section:', section);

  const newId = randomUUID();

  const result = await prisma.section.update({
    where: {
      name: section.name, // use the unique name
    },
    data: {
      id: newId,
    },
  });

  console.log('Updated section:');
  console.log(result);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });