import { prisma } from './src/config/prisma.js';

async function main() {
  const sections = await prisma.section.findMany({
    orderBy: {
      name: 'asc'
    }
  });

  console.table(sections);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });