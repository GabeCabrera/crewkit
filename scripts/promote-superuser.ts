import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userEmail = 'gcabrera@utahbroadband.com';
  
  // Find the user
  const user = await prisma.user.findUnique({
    where: { email: userEmail }
  });
  
  if (!user) {
    console.log(`User with email "${userEmail}" not found`);
    return;
  }
  
  // Update to SUPERUSER
  await prisma.user.update({
    where: { id: user.id },
    data: { role: 'SUPERUSER' }
  });
  
  console.log(`✅ Promoted ${user.name} (${user.email}) to SUPERUSER`);
  console.log(`Previous role: ${user.role}`);
  console.log(`New role: SUPERUSER`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

