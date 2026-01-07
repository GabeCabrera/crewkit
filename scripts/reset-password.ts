import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const userName = 'Gabe Cabrera';
  const newPassword = 'gabe123'; // You can change this
  
  // Find the user
  const user = await prisma.user.findFirst({
    where: {
      name: {
        contains: userName,
        mode: 'insensitive'
      }
    }
  });
  
  if (!user) {
    console.log(`User "${userName}" not found`);
    return;
  }
  
  // Hash the new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  // Update the user
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword }
  });
  
  console.log(`Password reset for ${user.name} (${user.email})`);
  console.log(`New password: ${newPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

