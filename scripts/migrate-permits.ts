/**
 * Migration Script: Convert legacy permit booleans to JobPermit records
 * 
 * This script migrates existing JobPlan records that use the old boolean permit fields
 * (rmpPermitApproved, sesdPermitApproved, makeReadyComplete, easementsClear) to the new
 * dynamic JobPermit system.
 * 
 * Run with: npx tsx scripts/migrate-permits.ts
 * 
 * Options:
 *   --dry-run    Show what would be migrated without making changes
 *   --verbose    Show detailed output for each job
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Map of old boolean fields to default permit type names
const LEGACY_PERMIT_MAP = {
  rmpPermitApproved: "RMP Permit",
  sesdPermitApproved: "SESD Permit",
  makeReadyComplete: "Make-Ready",
  easementsClear: "Easements",
} as const;

type LegacyPermitField = keyof typeof LEGACY_PERMIT_MAP;

interface MigrationStats {
  totalJobs: number;
  jobsWithExistingPermits: number;
  jobsMigrated: number;
  permitsCreated: number;
  errors: number;
}

async function migratePermits(dryRun: boolean = false, verbose: boolean = false) {
  const stats: MigrationStats = {
    totalJobs: 0,
    jobsWithExistingPermits: 0,
    jobsMigrated: 0,
    permitsCreated: 0,
    errors: 0,
  };

  console.log("\n🔄 Starting permit migration...\n");
  console.log(`Mode: ${dryRun ? "DRY RUN (no changes will be made)" : "LIVE"}\n`);

  try {
    // Step 1: Ensure default permit types exist
    console.log("📋 Verifying default permit types...");
    const permitTypes = await prisma.permitType.findMany({
      where: {
        name: { in: Object.values(LEGACY_PERMIT_MAP) },
      },
    });

    const permitTypeMap = new Map(permitTypes.map(pt => [pt.name, pt.id]));

    // Check if all required types exist
    const missingTypes = Object.values(LEGACY_PERMIT_MAP).filter(
      name => !permitTypeMap.has(name)
    );

    if (missingTypes.length > 0) {
      console.error(`\n❌ Missing permit types: ${missingTypes.join(", ")}`);
      console.error("Please run the seed script first: npx tsx prisma/seed.ts\n");
      return;
    }

    console.log(`✓ Found all ${Object.values(LEGACY_PERMIT_MAP).length} default permit types\n`);

    // Step 2: Get all jobs
    const jobs = await prisma.jobPlan.findMany({
      select: {
        id: true,
        jobName: true,
        rmpPermitApproved: true,
        sesdPermitApproved: true,
        makeReadyComplete: true,
        easementsClear: true,
        permits: {
          select: { id: true },
        },
      },
    });

    stats.totalJobs = jobs.length;
    console.log(`📊 Found ${jobs.length} total jobs\n`);

    // Step 3: Process each job
    for (const job of jobs) {
      // Skip jobs that already have permits
      if (job.permits.length > 0) {
        stats.jobsWithExistingPermits++;
        if (verbose) {
          console.log(`⏭️  Skipping "${job.jobName}" - already has ${job.permits.length} permits`);
        }
        continue;
      }

      if (verbose) {
        console.log(`\n📝 Processing "${job.jobName}" (${job.id})...`);
      }

      const permitsToCreate: { permitTypeId: string; isApproved: boolean }[] = [];

      // Check each legacy field
      for (const [field, permitTypeName] of Object.entries(LEGACY_PERMIT_MAP)) {
        const permitTypeId = permitTypeMap.get(permitTypeName);
        if (!permitTypeId) continue;

        const isApproved = job[field as LegacyPermitField];
        permitsToCreate.push({
          permitTypeId,
          isApproved,
        });

        if (verbose) {
          console.log(`   - ${permitTypeName}: ${isApproved ? "✓ Approved" : "○ Pending"}`);
        }
      }

      if (permitsToCreate.length > 0) {
        if (!dryRun) {
          try {
            await prisma.jobPermit.createMany({
              data: permitsToCreate.map(p => ({
                jobPlanId: job.id,
                permitTypeId: p.permitTypeId,
                isApproved: p.isApproved,
              })),
            });
            stats.permitsCreated += permitsToCreate.length;
            stats.jobsMigrated++;
          } catch (error) {
            console.error(`   ❌ Error creating permits for job "${job.jobName}":`, error);
            stats.errors++;
          }
        } else {
          stats.permitsCreated += permitsToCreate.length;
          stats.jobsMigrated++;
        }
      }
    }

    // Step 4: Print summary
    console.log("\n" + "=".repeat(50));
    console.log("📊 Migration Summary");
    console.log("=".repeat(50));
    console.log(`Total jobs found:              ${stats.totalJobs}`);
    console.log(`Jobs already with permits:     ${stats.jobsWithExistingPermits}`);
    console.log(`Jobs migrated:                 ${stats.jobsMigrated}`);
    console.log(`Total permits created:         ${stats.permitsCreated}`);
    if (stats.errors > 0) {
      console.log(`Errors:                        ${stats.errors}`);
    }
    console.log("=".repeat(50));

    if (dryRun) {
      console.log("\n⚠️  This was a dry run. No changes were made.");
      console.log("Run without --dry-run to apply changes.\n");
    } else {
      console.log("\n✅ Migration complete!\n");
    }

  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const verbose = args.includes("--verbose");

migratePermits(dryRun, verbose).catch(console.error);
