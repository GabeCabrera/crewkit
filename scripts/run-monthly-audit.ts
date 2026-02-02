/**
 * Run the monthly report data audit for a given month.
 * Usage: MONTH=2026-02 npx tsx scripts/run-monthly-audit.ts
 *        (omit MONTH to use previous calendar month)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function getMonthRange(monthStr: string) {
  const [year, month] = monthStr.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

async function main() {
  const monthParam = process.env.MONTH;
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthStr =
    monthParam ||
    `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
  const { start, end } = getMonthRange(monthStr);

  console.log("\n=== Monthly Report Data Audit ===\n");
  console.log(`Month: ${monthStr}`);
  console.log(`Range: ${start.toISOString().split("T")[0]} to ${end.toISOString().split("T")[0]}\n`);

  // --- 1. Field work logs ---
  const fieldLogs = await prisma.fieldWorkLog.findMany({
    where: { date: { gte: start, lte: end } },
    select: {
      id: true,
      date: true,
      location: true,
      submittedBy: true,
      hoursWorked: true,
      workerCount: true,
      workersNames: true,
      jobPlanId: true,
      strandHungFootage: true,
      polesAttached: true,
      fiberLashedFootage: true,
      fiberPulledFootage: true,
      drilledFootage: true,
      plowedFootage: true,
      trenchedFootage: true,
      conduitPlacedFootage: true,
      handholesPlaced: true,
      vaultsPlaced: true,
      mstsInstalled: true,
      guysPlaced: true,
      slackLoops: true,
      risersInstalled: true,
      spliceCases: true,
      anchorsPlaced: true,
      snowshoesPlaced: true,
    },
  });

  const noHours = fieldLogs.filter((l) => l.hoursWorked == null || l.hoursWorked === 0);
  const noWorkers = fieldLogs.filter(
    (l) => !l.workersNames?.length || l.workerCount === 0
  );
  const zeroConstruction = fieldLogs.filter((l) => {
    const a =
      (l.strandHungFootage ?? 0) === 0 &&
      (l.polesAttached ?? 0) === 0 &&
      (l.fiberLashedFootage ?? 0) === 0 &&
      (l.fiberPulledFootage ?? 0) === 0 &&
      (l.drilledFootage ?? 0) === 0 &&
      (l.plowedFootage ?? 0) === 0 &&
      (l.trenchedFootage ?? 0) === 0 &&
      (l.conduitPlacedFootage ?? 0) === 0 &&
      (l.handholesPlaced ?? 0) === 0 &&
      (l.vaultsPlaced ?? 0) === 0 &&
      (l.mstsInstalled ?? 0) === 0 &&
      (l.guysPlaced ?? 0) === 0 &&
      (l.slackLoops ?? 0) === 0 &&
      (l.risersInstalled ?? 0) === 0 &&
      (l.spliceCases ?? 0) === 0 &&
      (l.anchorsPlaced ?? 0) === 0 &&
      (l.snowshoesPlaced ?? 0) === 0;
    return a;
  });
  const noJobLink = fieldLogs.filter((l) => l.jobPlanId == null);

  console.log("--- 1. Field work logs ---");
  console.log(`  Total logs in month: ${fieldLogs.length}`);
  console.log(`  Logs with no hours: ${noHours.length}`);
  if (noHours.length > 0 && noHours.length <= 5) {
    noHours.forEach((l) => console.log(`    - ${l.date} ${l.location} (${l.submittedBy})`));
  } else if (noHours.length > 5) {
    noHours.slice(0, 3).forEach((l) => console.log(`    - ${l.date} ${l.location} (${l.submittedBy})`));
    console.log(`    ... and ${noHours.length - 3} more`);
  }
  console.log(`  Logs with no workers listed: ${noWorkers.length}`);
  console.log(`  Logs with zero construction data: ${zeroConstruction.length}`);
  console.log(`  Logs not linked to a job: ${noJobLink.length}`);
  console.log("");

  // --- 2. Equipment usage ---
  const equipmentLogs = await prisma.equipmentLog.findMany({
    where: {
      date: { gte: start, lte: end },
      type: { in: ["USED", "REMOVE"] },
    },
    include: { equipment: { select: { name: true, sku: true, pricePerUnit: true } } },
  });

  const usageByEquipment = new Map<
    string,
    { name: string; sku: string; qty: number; pricePerUnit: number | null }
  >();
  equipmentLogs.forEach((el) => {
    const key = el.equipmentId;
    const existing = usageByEquipment.get(key);
    const qty = Math.abs(el.quantity);
    if (existing) {
      existing.qty += qty;
    } else {
      usageByEquipment.set(key, {
        name: el.equipment.name,
        sku: el.equipment.sku,
        qty,
        pricePerUnit: el.equipment.pricePerUnit,
      });
    }
  });

  const noPrice = Array.from(usageByEquipment.values()).filter(
    (v) => v.pricePerUnit == null || v.pricePerUnit === 0
  );

  console.log("--- 2. Equipment usage (USED/REMOVE) ---");
  console.log(`  Total usage log entries: ${equipmentLogs.length}`);
  console.log(`  Unique equipment items used: ${usageByEquipment.size}`);
  console.log(`  Items with no price (cost = 0): ${noPrice.length}`);
  if (noPrice.length > 0 && noPrice.length <= 10) {
    noPrice.forEach((v) => console.log(`    - ${v.name} (${v.sku})`));
  } else if (noPrice.length > 10) {
    noPrice.slice(0, 5).forEach((v) => console.log(`    - ${v.name} (${v.sku})`));
    console.log(`    ... and ${noPrice.length - 5} more`);
  }
  console.log("");

  // --- 3. Assembly usage ---
  const assemblyLogs = await prisma.assemblyUsageLog.findMany({
    where: { date: { gte: start, lte: end } },
    include: {
      assembly: {
        select: {
          name: true,
          category: { select: { name: true } },
          type: { select: { name: true } },
        },
      },
    },
  });

  const assemblyTotalQty = assemblyLogs.reduce((s, l) => s + l.quantity, 0);

  console.log("--- 3. Assembly usage ---");
  console.log(`  Total assembly usage log entries: ${assemblyLogs.length}`);
  console.log(`  Total quantity used: ${assemblyTotalQty}`);
  console.log("");

  // --- 4. Job progress ---
  const jobPlans = await prisma.jobPlan.findMany({
    where: {
      OR: [
        { status: { in: ["IN_PROGRESS", "COMPLETED"] } },
        { updatedAt: { gte: start, lte: end } },
      ],
    },
    select: {
      id: true,
      jobName: true,
      jobNumber: true,
      status: true,
      totalDistance: true,
      actualFootage: true,
      poleCount: true,
      actualPolesComplete: true,
      totalCrewHours: true,
      foremanSignoff: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const completed = jobPlans.filter((j) => j.status === "COMPLETED");
  const inProgress = jobPlans.filter((j) => j.status === "IN_PROGRESS");

  console.log("--- 4. Job progress ---");
  console.log(`  Jobs in scope (active or updated in month): ${jobPlans.length}`);
  console.log(`  Completed: ${completed.length}`);
  console.log(`  In progress: ${inProgress.length}`);
  if (jobPlans.length > 0 && jobPlans.length <= 15) {
    jobPlans.forEach((j) =>
      console.log(
        `    - ${j.jobName} | ${j.status} | ${j.actualFootage}/${j.totalDistance} ft | hrs: ${j.totalCrewHours}`
      )
    );
  } else if (jobPlans.length > 15) {
    jobPlans.slice(0, 8).forEach((j) =>
      console.log(
        `    - ${j.jobName} | ${j.status} | ${j.actualFootage}/${j.totalDistance} ft`
      )
    );
    console.log(`    ... and ${jobPlans.length - 8} more`);
  }
  console.log("");

  // --- Summary ---
  console.log("=== Summary / Gaps ===\n");
  const gaps: string[] = [];
  if (fieldLogs.length === 0) gaps.push("No field logs for this month.");
  if (noHours.length > 0)
    gaps.push(`${noHours.length} field log(s) with no hours — backfill hoursWorked if needed.`);
  if (noWorkers.length > 0)
    gaps.push(`${noWorkers.length} field log(s) with no workers — backfill workersNames/workerCount if needed.`);
  if (zeroConstruction.length > 0)
    gaps.push(
      `${zeroConstruction.length} field log(s) with zero construction data — add aerial/underground/infra if real work.`
    );
  if (noJobLink.length > 0 && noJobLink.length === fieldLogs.length)
    gaps.push("All field logs unlinked from jobs — set jobPlanId where applicable.");
  else if (noJobLink.length > 0)
    gaps.push(`${noJobLink.length} field log(s) not linked to a job.`);
  if (equipmentLogs.length === 0)
    gaps.push("No equipment usage (USED/REMOVE) this month — inventory usage will be empty.");
  if (noPrice.length > 0)
    gaps.push(`${noPrice.length} equipment item(s) used with no price — cost will show as 0.`);
  if (assemblyLogs.length === 0)
    gaps.push("No assembly usage this month — assembly section will be empty.");
  if (jobPlans.length === 0)
    gaps.push("No jobs in scope — job progress section will be empty.");

  if (gaps.length === 0) {
    console.log("No major gaps identified. Data looks sufficient for the monthly report.\n");
  } else {
    gaps.forEach((g) => console.log(`  • ${g}`));
    console.log("");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
