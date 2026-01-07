import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  // Create manager user
  const managerPassword = await bcrypt.hash('manager123', 10);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@example.com' },
    update: {},
    create: {
      email: 'manager@example.com',
      name: 'Manager User',
      password: managerPassword,
      role: 'MANAGER',
    },
  });

  // Create field user
  const fieldPassword = await bcrypt.hash('field123', 10);
  const field = await prisma.user.upsert({
    where: { email: 'field@example.com' },
    update: {},
    create: {
      email: 'field@example.com',
      name: 'Field User',
      password: fieldPassword,
      role: 'FIELD',
    },
  });

  // Create sample equipment
  const equipment1 = await prisma.equipment.upsert({
    where: { sku: 'BOLT-14-MACHINE' },
    update: {},
    create: {
      name: '14" Machine Bolt',
      sku: 'BOLT-14-MACHINE',
      description: '14 inch machine bolt',
      pricePerUnit: 2.50,
      unitType: 'UNIT',
      inventory: {
        create: {
          quantity: 100,
        },
      },
    },
  });

  const equipment2 = await prisma.equipment.upsert({
    where: { sku: 'CABLE-STRAND-500' },
    update: {},
    create: {
      name: '500ft Strand Cable',
      sku: 'CABLE-STRAND-500',
      description: '500 foot strand cable',
      pricePerUnit: 150.00,
      unitType: 'FOOT',
      inventory: {
        create: {
          quantity: 5000,
        },
      },
    },
  });

  console.log('Seed data created:');
  console.log('- Admin:', admin.email);
  console.log('- Manager:', manager.email);
  console.log('- Field:', field.email);
  console.log('- Equipment:', equipment1.name, equipment2.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


