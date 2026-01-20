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

  // Create default permit types
  const defaultPermitTypes = [
    { name: "RMP Permit", description: "Right of Way Management Permit", isDefault: true },
    { name: "SESD Permit", description: "State Environmental Services Division Permit", isDefault: true },
    { name: "Make-Ready", description: "Make-Ready work completion verification", isDefault: true },
    { name: "Easements", description: "Easement clearance verification", isDefault: true },
    { name: "DOT Permit", description: "Department of Transportation Permit", isDefault: true },
    { name: "Railroad Crossing", description: "Railroad crossing permit", isDefault: true },
    { name: "County Permit", description: "County-level permit", isDefault: true },
    { name: "City Permit", description: "City-level permit", isDefault: true },
  ];

  const createdPermitTypes = [];
  for (const permitType of defaultPermitTypes) {
    const created = await prisma.permitType.upsert({
      where: { name: permitType.name },
      update: {},
      create: permitType,
    });
    createdPermitTypes.push(created.name);
  }

  // Create default node types for network design
  const defaultNodeTypes = [
    { name: "Pole", icon: "Waypoints", color: "#8B4513", order: 1 },
    { name: "Splice Enclosure", icon: "Cable", color: "#DC2626", order: 2 },
    { name: "Hand Hole", icon: "Square", color: "#059669", order: 3 },
    { name: "Pedestal", icon: "Cylinder", color: "#7C3AED", order: 4 },
    { name: "Terminal", icon: "Radio", color: "#2563EB", order: 5 },
    { name: "Anchor", icon: "Anchor", color: "#71717A", order: 6 },
    { name: "MST", icon: "GitBranch", color: "#F59E0B", order: 7 },
  ];

  const createdNodeTypes = [];
  for (const nodeType of defaultNodeTypes) {
    const created = await prisma.nodeType.upsert({
      where: { name: nodeType.name },
      update: { icon: nodeType.icon, color: nodeType.color, order: nodeType.order },
      create: nodeType,
    });
    createdNodeTypes.push(created.name);
  }

  console.log('Seed data created:');
  console.log('- Admin:', admin.email);
  console.log('- Manager:', manager.email);
  console.log('- Field:', field.email);
  console.log('- Equipment:', equipment1.name, equipment2.name);
  console.log('- Permit Types:', createdPermitTypes.join(', '));
  console.log('- Node Types:', createdNodeTypes.join(', '));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


