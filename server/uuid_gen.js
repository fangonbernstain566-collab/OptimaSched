import { prisma } from './src/config/prisma.js';

async function main() {
  const section = await prisma.section.create({
    data: {
      name: 'BSIT-B1'
    }
  });

  console.log(section);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });