import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET /api/reports/monthly - Get comprehensive monthly report data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, teamId: true },
    });

    if (!user || user.role === "FIELD") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get("month"); // Format: "2026-02"

    // Parse month parameter
    let startDate: Date;
    let endDate: Date;

    if (monthParam) {
      const [year, month] = monthParam.split("-").map(Number);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59, 999); // Last day of month
    } else {
      // Default to previous month
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    }

    const monthStart = startDate.toISOString().split('T')[0];
    const monthEnd = endDate.toISOString().split('T')[0];
    const monthLabel = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // ============================================
    // 1. EQUIPMENT USAGE FOR THE MONTH
    // ============================================
    const equipmentUsage = await prisma.equipmentLog.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        type: { in: ["USED", "REMOVE"] }, // Only consumption, not additions
      },
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            sku: true,
            pricePerUnit: true,
            unitType: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    // Aggregate equipment usage by equipment
    const equipmentUsageMap = new Map<string, {
      equipment: typeof equipmentUsage[0]["equipment"];
      totalQuantity: number;
      totalCost: number;
      usageCount: number;
    }>();

    equipmentUsage.forEach((log) => {
      const existing = equipmentUsageMap.get(log.equipmentId);
      const quantity = Math.abs(log.quantity);
      const cost = quantity * (log.equipment.pricePerUnit || 0);

      if (existing) {
        existing.totalQuantity += quantity;
        existing.totalCost += cost;
        existing.usageCount += 1;
      } else {
        equipmentUsageMap.set(log.equipmentId, {
          equipment: log.equipment,
          totalQuantity: quantity,
          totalCost: cost,
          usageCount: 1,
        });
      }
    });

    const inventoryUsage = Array.from(equipmentUsageMap.values())
      .sort((a, b) => b.totalQuantity - a.totalQuantity);

    // ============================================
    // 2. CURRENT STOCK LEVELS & COMPARISON
    // ============================================
    const currentInventory = await prisma.inventory.findMany({
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            sku: true,
            pricePerUnit: true,
            unitType: true,
            isArchived: true,
          },
        },
      },
    });

    // Get equipment changes during the month for comparison
    const monthChanges = await prisma.equipmentLog.groupBy({
      by: ["equipmentId"],
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        quantity: true,
      },
    });

    const changesMap = new Map(
      monthChanges.map((c) => [c.equipmentId, c._sum.quantity || 0])
    );

    // Build stock comparison data
    const stockComparison = currentInventory
      .filter((inv) => !inv.equipment.isArchived)
      .map((inv) => {
        const monthChange = changesMap.get(inv.equipment.id) || 0;
        const startOfMonth = inv.quantity - monthChange;
        return {
          equipment: inv.equipment,
          currentQuantity: inv.quantity,
          startOfMonthQuantity: startOfMonth,
          change: monthChange,
          changePercent: startOfMonth > 0 
            ? ((monthChange / startOfMonth) * 100).toFixed(1)
            : monthChange !== 0 ? "N/A" : "0",
        };
      })
      .filter((item) => item.change !== 0) // Only show items with changes
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

    // ============================================
    // 3. FIELD WORK LOGS FOR THE MONTH
    // ============================================
    const fieldLogs = await prisma.fieldWorkLog.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        team: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        jobPlan: { select: { id: true, jobName: true, jobNumber: true } },
      },
      orderBy: { date: "desc" },
    });

    // Aggregate field work stats
    const fieldWorkSummary = {
      totalLogs: fieldLogs.length,
      totalHoursWorked: fieldLogs.reduce((sum, log) => sum + (log.hoursWorked || 0), 0),
      uniqueWorkers: new Set(fieldLogs.flatMap((log) => log.workersNames)).size,
      aerial: {
        strandHungFootage: fieldLogs.reduce((sum, log) => sum + (log.strandHungFootage || 0), 0),
        polesAttached: fieldLogs.reduce((sum, log) => sum + (log.polesAttached || 0), 0),
        fiberLashedFootage: fieldLogs.reduce((sum, log) => sum + (log.fiberLashedFootage || 0), 0),
        fiberPulledFootage: fieldLogs.reduce((sum, log) => sum + (log.fiberPulledFootage || 0), 0),
      },
      underground: {
        drilledFootage: fieldLogs.reduce((sum, log) => sum + (log.drilledFootage || 0), 0),
        plowedFootage: fieldLogs.reduce((sum, log) => sum + (log.plowedFootage || 0), 0),
        trenchedFootage: fieldLogs.reduce((sum, log) => sum + (log.trenchedFootage || 0), 0),
        conduitPlacedFootage: fieldLogs.reduce((sum, log) => sum + (log.conduitPlacedFootage || 0), 0),
      },
      infrastructure: {
        handholesPlaced: fieldLogs.reduce((sum, log) => sum + (log.handholesPlaced || 0), 0),
        vaultsPlaced: fieldLogs.reduce((sum, log) => sum + (log.vaultsPlaced || 0), 0),
        mstsInstalled: fieldLogs.reduce((sum, log) => sum + (log.mstsInstalled || 0), 0),
        guysPlaced: fieldLogs.reduce((sum, log) => sum + (log.guysPlaced || 0), 0),
        slackLoops: fieldLogs.reduce((sum, log) => sum + (log.slackLoops || 0), 0),
        risersInstalled: fieldLogs.reduce((sum, log) => sum + (log.risersInstalled || 0), 0),
        spliceCases: fieldLogs.reduce((sum, log) => sum + (log.spliceCases || 0), 0),
        anchorsPlaced: fieldLogs.reduce((sum, log) => sum + (log.anchorsPlaced || 0), 0),
        snowshoesPlaced: fieldLogs.reduce((sum, log) => sum + (log.snowshoesPlaced || 0), 0),
      },
    };

    // ============================================
    // 3b. DERIVED USAGE (from field work)
    // ============================================
    const strandHungFootage = fieldWorkSummary.aerial.strandHungFootage;
    const lashingWireRolls = strandHungFootage > 0 ? Math.ceil(strandHungFootage / 500) : 0;
    const derivedUsage = [
      {
        name: "Lashing wire (rolls)",
        quantity: lashingWireRolls,
        sourceFootage: strandHungFootage,
        formula: "500 ft strand hung per roll",
      },
    ];

    // ============================================
    // 4. ASSEMBLY USAGE FOR THE MONTH
    // ============================================
    const assemblyUsageLogs = await prisma.assemblyUsageLog.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        assembly: {
          select: {
            id: true,
            name: true,
            description: true,
            category: { select: { name: true } },
            type: { select: { name: true } },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    // Aggregate assembly usage by assembly
    const assemblyUsageMap = new Map<string, {
      assembly: typeof assemblyUsageLogs[0]["assembly"];
      totalQuantity: number;
      usageCount: number;
    }>();

    assemblyUsageLogs.forEach((log) => {
      const existing = assemblyUsageMap.get(log.assemblyId);
      if (existing) {
        existing.totalQuantity += log.quantity;
        existing.usageCount += 1;
      } else {
        assemblyUsageMap.set(log.assemblyId, {
          assembly: log.assembly,
          totalQuantity: log.quantity,
          usageCount: 1,
        });
      }
    });

    const assemblyUsage = Array.from(assemblyUsageMap.values())
      .sort((a, b) => b.totalQuantity - a.totalQuantity);

    // ============================================
    // 5. JOB PROGRESS FOR THE MONTH
    // ============================================
    const jobPlans = await prisma.jobPlan.findMany({
      where: {
        OR: [
          { status: { in: ["IN_PROGRESS", "COMPLETED"] } },
          { 
            updatedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        ],
      },
      select: {
        id: true,
        jobName: true,
        jobNumber: true,
        locationName: true,
        status: true,
        totalDistance: true,
        actualFootage: true,
        poleCount: true,
        actualPolesComplete: true,
        strandFootage: true,
        actualStrandUsed: true,
        fiberFootage: true,
        actualFiberUsed: true,
        totalCrewHours: true,
        foremanSignoff: true,
        completedAt: true,
        plannedStartDate: true,
        plannedEndDate: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    const jobProgress = jobPlans.map((job) => ({
      ...job,
      progressPercent: job.totalDistance > 0 
        ? Math.round((job.actualFootage / job.totalDistance) * 100) 
        : 0,
      poleProgress: job.poleCount > 0 
        ? Math.round((job.actualPolesComplete / job.poleCount) * 100) 
        : 0,
    }));

    // ============================================
    // 6. EXECUTIVE SUMMARY
    // ============================================
    const totalInventoryCost = inventoryUsage.reduce((sum, item) => sum + item.totalCost, 0);
    const totalFieldFootage = 
      fieldWorkSummary.aerial.strandHungFootage +
      fieldWorkSummary.aerial.fiberLashedFootage +
      fieldWorkSummary.underground.conduitPlacedFootage +
      fieldWorkSummary.underground.drilledFootage +
      fieldWorkSummary.underground.plowedFootage;

    const executiveSummary = {
      month: monthLabel,
      dateRange: { start: monthStart, end: monthEnd },
      inventory: {
        itemsUsed: inventoryUsage.length,
        totalCost: totalInventoryCost,
        topItems: inventoryUsage.slice(0, 5),
      },
      fieldWork: {
        totalLogs: fieldWorkSummary.totalLogs,
        totalHours: fieldWorkSummary.totalHoursWorked,
        totalFootage: totalFieldFootage,
        uniqueWorkers: fieldWorkSummary.uniqueWorkers,
      },
      assemblies: {
        totalUsed: assemblyUsage.reduce((sum, a) => sum + a.totalQuantity, 0),
        uniqueTypes: assemblyUsage.length,
      },
      jobs: {
        total: jobProgress.length,
        completed: jobProgress.filter((j) => j.status === "COMPLETED").length,
        inProgress: jobProgress.filter((j) => j.status === "IN_PROGRESS").length,
      },
    };

    return NextResponse.json({
      month: monthLabel,
      dateRange: { start: monthStart, end: monthEnd },
      executiveSummary,
      inventoryUsage,
      stockComparison,
      fieldWorkSummary,
      fieldLogs: fieldLogs.map((log) => ({
        id: log.id,
        date: log.date,
        location: log.location,
        workersNames: log.workersNames,
        workerCount: log.workerCount,
        hoursWorked: log.hoursWorked,
        submittedBy: log.submittedBy,
        team: log.team,
        jobPlan: log.jobPlan,
        aerial: {
          strandHungFootage: log.strandHungFootage,
          polesAttached: log.polesAttached,
          fiberLashedFootage: log.fiberLashedFootage,
          fiberPulledFootage: log.fiberPulledFootage,
        },
        underground: {
          drilledFootage: log.drilledFootage,
          plowedFootage: log.plowedFootage,
          trenchedFootage: log.trenchedFootage,
          conduitPlacedFootage: log.conduitPlacedFootage,
        },
        infrastructure: {
          handholesPlaced: log.handholesPlaced,
          vaultsPlaced: log.vaultsPlaced,
          mstsInstalled: log.mstsInstalled,
          guysPlaced: log.guysPlaced,
        },
        notes: log.notes,
        issues: log.issues,
      })),
      assemblyUsage,
      jobProgress,
      derivedUsage,
    });
  } catch (error) {
    console.error("Error fetching monthly report:", error);
    return NextResponse.json(
      { error: "Failed to fetch monthly report data" },
      { status: 500 }
    );
  }
}
