// server/add-sections.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const sections = [
  'BSCS-1A', 'BSCS-1B', 'BSCS-1C',
  'BSCS-2A', 'BSCS-2B', 'BSCS-2C',
  'BSCS-3A', 'BSCS-3B', 'BSCS-3C',
  'BSCS-4A', 'BSCS-4B', 'BSCS-4C',
  'BSIT-1A', 'BSIT-1B',
  'BSIT-2A', 'BSIT-2B',
  'BSIT-3A', 'BSIT-3B',
  'BSIT-4A', 'BSIT-4B',
];

async function main() {
  console.log('Adding sections...');

  for (const name of sections) {
    await prisma.section.upsert({
      where:  { name },
      update: {},
      create: { name },
    });
    console.log(`  ✅ ${name}`);
  }

  console.log('Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());