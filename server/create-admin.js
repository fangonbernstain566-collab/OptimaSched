import prisma from './src/config/prisma.js';
import bcrypt from 'bcrypt'; // Switch to 'bcryptjs' if your project uses it

async function seedAdmin() {
  const adminEmail = 'admin@pclu.edu.ph';
  const plainPassword = 'admin_password_123'; // Change this to your preferred password!
  const saltRounds = 10;

  try {
    console.log('⏳ Validating database Role matrix tier...');
    
    // Changed "ADMIN" to "ADMINISTRATOR" to match your schema's RoleName enum
    let adminRole = await prisma.role.findFirst({
      where: { name: 'ADMINISTRATOR' }
    });

    if (!adminRole) {
      adminRole = await prisma.role.create({
        data: { name: 'ADMINISTRATOR' }
      });
    }

    console.log('⏳ Generating secure cryptographic hash...');
    const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

    console.log(`⏳ Injecting admin profile for ${adminEmail}...`);
    
    const adminUser = await prisma.user.upsert({
      where: { email: adminEmail.toLowerCase().trim() },
      update: {
        passwordHash: hashedPassword,
        role: {
          connect: { id: adminRole.id }
        }
      },
      create: {
        email: adminEmail.toLowerCase().trim(),
        firstName: 'Aris',
        lastName: 'Registrar',
        passwordHash: hashedPassword,
        role: {
          connect: { id: adminRole.id }
        }, 
      },
    });

    console.log('\n==================================================');
    console.log('✅ ADMINISTRATOR PROFILE INSULATION COMPLETE!');
    console.log(`📧 Email: ${adminUser.email}`);
    console.log(`🔑 Password: ${plainPassword}`);
    console.log('==================================================\n');

  } catch (error) {
    console.error('❌ Failed to seed administrative user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin();