import { prisma } from "@/lib/prisma";

/**
 * Field-Job Sync Service
 * 
 * Handles synchronization between FieldWorkLog entries and JobPlan logs.
 * When a field log is linked to a job, this service creates/updates
 * the corresponding DailyProgressLog, MaterialUsageLog, and CrewHoursLog entries.
 */

// Type for field log with minimal required fields
interface FieldLogData {
  id: string;
  jobPlanId: string | null;
  date: Date;
  hoursWorked: number;
  workerCount: number;
  workersNames: string[];
  strandHungFootage: number | null;
  fiberLashedFootage: number | null;
  fiberPulledFootage: number | null;
  polesAttached: number | null;
  anchorsPlaced: number | null;
  guysPlaced: number | null;
  notes: string | null;
  createdById: string | null;
}

/**
 * Sync a field log to its linked job plan
 * Creates/updates DailyProgressLog, MaterialUsageLog, and CrewHoursLog entries
 */
export async function syncFieldLogToJobPlan(
  fieldLogId: string,
  createdById: string
): Promise<void> {
  const fieldLog = await prisma.fieldWorkLog.findUnique({
    where: { id: fieldLogId },
  });

  if (!fieldLog || !fieldLog.jobPlanId) {
    console.log(`Field log ${fieldLogId} has no job plan linked, skipping sync`);
    return;
  }

  const jobPlanId = fieldLog.jobPlanId;

  // Start a transaction to ensure all logs are created atomically
  await prisma.$transaction(async (tx) => {
    // 1. Create/Update DailyProgressLog
    const footage = 
      (fieldLog.strandHungFootage || 0) + 
      (fieldLog.fiberLashedFootage || 0) + 
      (fieldLog.fiberPulledFootage || 0);
    const poles = fieldLog.polesAttached || 0;

    if (footage > 0 || poles > 0) {
      // Check if we already have a progress log for this field log's date
      const existingProgress = await tx.dailyProgressLog.findFirst({
        where: {
          jobPlanId,
          date: fieldLog.date,
          notes: { contains: `[FieldLog:${fieldLogId}]` },
        },
      });

      if (existingProgress) {
        await tx.dailyProgressLog.update({
          where: { id: existingProgress.id },
          data: {
            footage,
            poles,
            notes: `${fieldLog.notes || ''} [FieldLog:${fieldLogId}]`.trim(),
          },
        });
      } else {
        await tx.dailyProgressLog.create({
          data: {
            jobPlanId,
            date: fieldLog.date,
            footage,
            poles,
            notes: `${fieldLog.notes || ''} [FieldLog:${fieldLogId}]`.trim(),
            createdById,
          },
        });
      }
    }

    // 2. Create/Update MaterialUsageLog
    const strand = fieldLog.strandHungFootage || 0;
    const fiber = (fieldLog.fiberLashedFootage || 0) + (fieldLog.fiberPulledFootage || 0);
    const anchors = (fieldLog.anchorsPlaced || 0) + (fieldLog.guysPlaced || 0);

    if (strand > 0 || fiber > 0 || anchors > 0) {
      const existingMaterial = await tx.materialUsageLog.findFirst({
        where: {
          jobPlanId,
          date: fieldLog.date,
          notes: { contains: `[FieldLog:${fieldLogId}]` },
        },
      });

      if (existingMaterial) {
        await tx.materialUsageLog.update({
          where: { id: existingMaterial.id },
          data: {
            strand,
            fiber,
            anchors,
            notes: `${fieldLog.notes || ''} [FieldLog:${fieldLogId}]`.trim(),
          },
        });
      } else {
        await tx.materialUsageLog.create({
          data: {
            jobPlanId,
            date: fieldLog.date,
            strand,
            fiber,
            anchors,
            notes: `${fieldLog.notes || ''} [FieldLog:${fieldLogId}]`.trim(),
            createdById,
          },
        });
      }
    }

    // 3. Create/Update CrewHoursLog entries (one per worker)
    if (fieldLog.hoursWorked > 0 && fieldLog.workersNames.length > 0) {
      const hoursPerWorker = fieldLog.hoursWorked / Math.max(fieldLog.workerCount, fieldLog.workersNames.length, 1);

      // Delete existing hours logs for this field log
      await tx.crewHoursLog.deleteMany({
        where: {
          jobPlanId,
          date: fieldLog.date,
          notes: { contains: `[FieldLog:${fieldLogId}]` },
        },
      });

      // Create new hours logs for each worker
      for (const workerName of fieldLog.workersNames) {
        await tx.crewHoursLog.create({
          data: {
            jobPlanId,
            date: fieldLog.date,
            userId: createdById, // Use creator as fallback since workers are names not IDs
            userName: workerName,
            hours: hoursPerWorker,
            notes: `[FieldLog:${fieldLogId}]`,
            createdById,
          },
        });
      }
    }

    // 4. Update syncedAt timestamp on field log
    await tx.fieldWorkLog.update({
      where: { id: fieldLogId },
      data: { syncedAt: new Date() },
    });
  });

  // 5. Update job plan totals (outside transaction for simpler logic)
  await updateJobPlanTotals(jobPlanId);
}

/**
 * Remove synced job logs when a field log is unlinked from a job
 */
export async function removeSyncedJobLogs(
  fieldLogId: string,
  jobPlanId: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Delete progress logs from this field log
    await tx.dailyProgressLog.deleteMany({
      where: {
        jobPlanId,
        notes: { contains: `[FieldLog:${fieldLogId}]` },
      },
    });

    // Delete material logs from this field log
    await tx.materialUsageLog.deleteMany({
      where: {
        jobPlanId,
        notes: { contains: `[FieldLog:${fieldLogId}]` },
      },
    });

    // Delete hours logs from this field log
    await tx.crewHoursLog.deleteMany({
      where: {
        jobPlanId,
        notes: { contains: `[FieldLog:${fieldLogId}]` },
      },
    });
  });

  // Update job totals after removing logs
  await updateJobPlanTotals(jobPlanId);
}

/**
 * Handle job assignment change for a field log
 * Removes logs from old job and creates new ones for new job
 */
export async function resyncFieldLog(
  fieldLogId: string,
  oldJobPlanId: string | null,
  newJobPlanId: string | null,
  createdById: string
): Promise<void> {
  // Remove from old job if it had one
  if (oldJobPlanId) {
    await removeSyncedJobLogs(fieldLogId, oldJobPlanId);
  }

  // Sync to new job if assigned
  if (newJobPlanId) {
    // Update field log with new job
    await prisma.fieldWorkLog.update({
      where: { id: fieldLogId },
      data: { jobPlanId: newJobPlanId },
    });

    await syncFieldLogToJobPlan(fieldLogId, createdById);
  } else {
    // Just clear the job assignment
    await prisma.fieldWorkLog.update({
      where: { id: fieldLogId },
      data: { jobPlanId: null, syncedAt: null },
    });
  }
}

/**
 * Update all totals for a job plan based on its logs
 */
export async function updateJobPlanTotals(jobPlanId: string): Promise<void> {
  // Get all progress logs
  const progressLogs = await prisma.dailyProgressLog.findMany({
    where: { jobPlanId },
  });

  const totalFootage = progressLogs.reduce((sum, log) => sum + log.footage, 0);
  const totalPoles = progressLogs.reduce((sum, log) => sum + log.poles, 0);

  // Get all material logs
  const materialLogs = await prisma.materialUsageLog.findMany({
    where: { jobPlanId },
  });

  const materialTotals = materialLogs.reduce(
    (acc, log) => ({
      strand: acc.strand + (log.strand || 0),
      fiber: acc.fiber + (log.fiber || 0),
      deadEnds: acc.deadEnds + (log.deadEnds || 0),
      tangents: acc.tangents + (log.tangents || 0),
      anchors: acc.anchors + (log.anchors || 0),
    }),
    { strand: 0, fiber: 0, deadEnds: 0, tangents: 0, anchors: 0 }
  );

  // Get all hours logs
  const hoursLogs = await prisma.crewHoursLog.findMany({
    where: { jobPlanId },
  });

  const totalHours = hoursLogs.reduce((sum, log) => sum + log.hours, 0);

  // Get current job status
  const job = await prisma.jobPlan.findUnique({
    where: { id: jobPlanId },
  });

  // Auto-transition from READY to IN_PROGRESS if progress is logged
  let newStatus = job?.status;
  if (job?.status === "READY" && (totalFootage > 0 || totalPoles > 0)) {
    newStatus = "IN_PROGRESS";
  }

  // Update job plan with all totals
  await prisma.jobPlan.update({
    where: { id: jobPlanId },
    data: {
      actualFootage: totalFootage,
      actualPolesComplete: totalPoles,
      actualStrandUsed: materialTotals.strand,
      actualFiberUsed: materialTotals.fiber,
      actualDeadEnds: materialTotals.deadEnds,
      actualTangents: materialTotals.tangents,
      actualAnchors: materialTotals.anchors,
      totalCrewHours: totalHours,
      status: newStatus,
    },
  });
}

/**
 * Get linked job info for a field log
 */
export async function getFieldLogJobInfo(fieldLogId: string) {
  const fieldLog = await prisma.fieldWorkLog.findUnique({
    where: { id: fieldLogId },
    include: {
      jobPlan: {
        select: {
          id: true,
          jobName: true,
          jobNumber: true,
          locationName: true,
          status: true,
        },
      },
    },
  });

  return fieldLog?.jobPlan || null;
}

/**
 * Get field logs linked to a job plan
 */
export async function getJobFieldLogs(jobPlanId: string) {
  return prisma.fieldWorkLog.findMany({
    where: { jobPlanId },
    orderBy: { date: "desc" },
    select: {
      id: true,
      date: true,
      location: true,
      workersNames: true,
      workerCount: true,
      hoursWorked: true,
      strandHungFootage: true,
      fiberLashedFootage: true,
      fiberPulledFootage: true,
      polesAttached: true,
      notes: true,
      syncedAt: true,
      submittedBy: true,
    },
  });
}

/**
 * Get summary of field logs for a job
 */
export async function getJobFieldLogsSummary(jobPlanId: string) {
  const logs = await prisma.fieldWorkLog.findMany({
    where: { jobPlanId },
  });

  return {
    count: logs.length,
    totalHours: logs.reduce((sum, log) => sum + (log.hoursWorked || 0), 0),
    totalFootage: logs.reduce((sum, log) => 
      sum + 
      (log.strandHungFootage || 0) + 
      (log.fiberLashedFootage || 0) + 
      (log.fiberPulledFootage || 0), 
      0
    ),
    totalPoles: logs.reduce((sum, log) => sum + (log.polesAttached || 0), 0),
    dates: Array.from(new Set(logs.map(log => log.date.toISOString().split('T')[0]))),
  };
}

/**
 * Sync field log completions to job BOM infrastructure/fiber items
 * Marks specified items as completed when field log is submitted
 */
export async function syncFieldLogCompletions(
  fieldLogId: string,
  jobPlanId: string,
  completedInfraIds: string[],
  completedFiberIds: string[],
  userId: string
): Promise<{ 
  infraUpdated: number; 
  fiberUpdated: number; 
}> {
  // Get the BOM for this job
  const bom = await prisma.jobBOM.findUnique({
    where: { jobPlanId },
    select: { id: true },
  });

  if (!bom) {
    console.log(`No BOM found for job ${jobPlanId}, skipping completion sync`);
    return { infraUpdated: 0, fiberUpdated: 0 };
  }

  const now = new Date();
  let infraUpdated = 0;
  let fiberUpdated = 0;

  await prisma.$transaction(async (tx) => {
    // Update infrastructure items as completed
    if (completedInfraIds.length > 0) {
      const result = await tx.jobInfrastructure.updateMany({
        where: {
          id: { in: completedInfraIds },
          bomId: bom.id,
          isCompleted: false, // Only update items not already completed
        },
        data: {
          isCompleted: true,
          completedAt: now,
          completedById: userId,
        },
      });
      infraUpdated = result.count;
    }

    // Update fiber segments as completed
    if (completedFiberIds.length > 0) {
      const result = await tx.jobFiberSegment.updateMany({
        where: {
          id: { in: completedFiberIds },
          bomId: bom.id,
          isCompleted: false, // Only update segments not already completed
        },
        data: {
          isCompleted: true,
          completedAt: now,
          completedById: userId,
        },
      });
      fiberUpdated = result.count;
    }

    // Update the field log with the completion IDs for traceability
    await tx.fieldWorkLog.update({
      where: { id: fieldLogId },
      data: {
        completedInfraIds,
        completedFiberIds,
      },
    });
  });

  return { infraUpdated, fiberUpdated };
}

/**
 * Reverse completions from a field log (when log is deleted or edited)
 * Only reverses items that were specifically marked complete by this log
 */
export async function reverseFieldLogCompletions(
  fieldLogId: string,
  jobPlanId: string
): Promise<void> {
  // Get the field log to find which items it marked complete
  const fieldLog = await prisma.fieldWorkLog.findUnique({
    where: { id: fieldLogId },
    select: {
      completedInfraIds: true,
      completedFiberIds: true,
    },
  });

  if (!fieldLog) {
    return;
  }

  const bom = await prisma.jobBOM.findUnique({
    where: { jobPlanId },
    select: { id: true },
  });

  if (!bom) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    // Reverse infrastructure completions
    if (fieldLog.completedInfraIds.length > 0) {
      await tx.jobInfrastructure.updateMany({
        where: {
          id: { in: fieldLog.completedInfraIds },
          bomId: bom.id,
        },
        data: {
          isCompleted: false,
          completedAt: null,
          completedById: null,
        },
      });
    }

    // Reverse fiber segment completions
    if (fieldLog.completedFiberIds.length > 0) {
      await tx.jobFiberSegment.updateMany({
        where: {
          id: { in: fieldLog.completedFiberIds },
          bomId: bom.id,
        },
        data: {
          isCompleted: false,
          completedAt: null,
          completedById: null,
        },
      });
    }

    // Clear the completion IDs from the field log
    await tx.fieldWorkLog.update({
      where: { id: fieldLogId },
      data: {
        completedInfraIds: [],
        completedFiberIds: [],
      },
    });
  });
}

/**
 * Get visual progress statistics for a job
 */
export async function getJobProgressStats(jobPlanId: string) {
  const bom = await prisma.jobBOM.findUnique({
    where: { jobPlanId },
    include: {
      infrastructure: {
        where: { isSelected: true },
        select: {
          id: true,
          itemType: true,
          quantity: true,
          isCompleted: true,
          completedAt: true,
        },
      },
      fiberSegments: {
        where: { isSelected: true },
        select: {
          id: true,
          segmentType: true,
          footage: true,
          isCompleted: true,
          completedAt: true,
        },
      },
    },
  });

  if (!bom) {
    return null;
  }

  // Calculate infrastructure stats
  const infraStats: Record<string, { total: number; completed: number }> = {};
  let totalInfraItems = 0;
  let completedInfraItems = 0;

  bom.infrastructure.forEach((item) => {
    if (!infraStats[item.itemType]) {
      infraStats[item.itemType] = { total: 0, completed: 0 };
    }
    infraStats[item.itemType].total += item.quantity;
    totalInfraItems += item.quantity;

    if (item.isCompleted) {
      infraStats[item.itemType].completed += item.quantity;
      completedInfraItems += item.quantity;
    }
  });

  // Calculate fiber stats
  const fiberStats: Record<string, { totalFootage: number; completedFootage: number }> = {};
  let totalFiberFootage = 0;
  let completedFiberFootage = 0;

  bom.fiberSegments.forEach((seg) => {
    if (!fiberStats[seg.segmentType]) {
      fiberStats[seg.segmentType] = { totalFootage: 0, completedFootage: 0 };
    }
    fiberStats[seg.segmentType].totalFootage += seg.footage;
    totalFiberFootage += seg.footage;

    if (seg.isCompleted) {
      fiberStats[seg.segmentType].completedFootage += seg.footage;
      completedFiberFootage += seg.footage;
    }
  });

  return {
    infrastructure: {
      byType: infraStats,
      total: totalInfraItems,
      completed: completedInfraItems,
      percentComplete: totalInfraItems > 0 
        ? Math.round((completedInfraItems / totalInfraItems) * 100) 
        : 0,
    },
    fiber: {
      byType: fiberStats,
      totalFootage: totalFiberFootage,
      completedFootage: completedFiberFootage,
      percentComplete: totalFiberFootage > 0 
        ? Math.round((completedFiberFootage / totalFiberFootage) * 100) 
        : 0,
    },
    overallPercent: (totalInfraItems + totalFiberFootage) > 0
      ? Math.round(
          ((completedInfraItems + completedFiberFootage) / 
           (totalInfraItems + totalFiberFootage)) * 100
        )
      : 0,
  };
}
