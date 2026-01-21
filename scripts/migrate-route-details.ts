/**
 * Data migration script for Route Details redesign
 * 
 * Migrates existing jobs:
 * - totalDistance -> aerialFootage (assume aerial by default)
 * - trafficControl boolean -> trafficControlTier: true = "cones", false = "none"
 * - primaryMethod defaults to "aerial" if poleCount > 0
 * 
 * Run with: npx tsx scripts/migrate-route-details.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting Route Details data migration...\n");

  // Get all jobs that need migration
  const jobs = await prisma.jobPlan.findMany({
    select: {
      id: true,
      jobName: true,
      totalDistance: true,
      aerialFootage: true,
      undergroundFootage: true,
      trafficControl: true,
      trafficControlTier: true,
      poleCount: true,
      primaryMethod: true,
    },
  });

  console.log(`Found ${jobs.length} jobs to check\n`);

  let migratedCount = 0;

  for (const job of jobs) {
    const updates: Record<string, unknown> = {};

    // Migrate totalDistance to aerialFootage if aerialFootage is 0 and totalDistance > 0
    if (job.totalDistance > 0 && job.aerialFootage === 0 && job.undergroundFootage === 0) {
      updates.aerialFootage = job.totalDistance;
      console.log(`  [${job.jobName}] Migrating totalDistance ${job.totalDistance} -> aerialFootage`);
    }

    // Migrate trafficControl boolean to trafficControlTier
    if (job.trafficControlTier === null) {
      updates.trafficControlTier = job.trafficControl ? "cones" : "none";
      console.log(`  [${job.jobName}] Migrating trafficControl ${job.trafficControl} -> trafficControlTier "${updates.trafficControlTier}"`);
    }

    // Set primaryMethod based on existing data
    if (job.primaryMethod === null) {
      if (job.poleCount > 0 || job.totalDistance > 0) {
        updates.primaryMethod = "aerial";
        console.log(`  [${job.jobName}] Setting primaryMethod to "aerial" (has poles or footage)`);
      }
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      await prisma.jobPlan.update({
        where: { id: job.id },
        data: updates,
      });
      migratedCount++;
    }
  }

  console.log(`\nMigration complete. Updated ${migratedCount} jobs.`);
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
