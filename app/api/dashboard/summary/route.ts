import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/dashboard/summary - Get comprehensive dashboard data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const monthParam = searchParams.get("month"); // Format: "2025-01" or "current"
    
    // Calculate date ranges
    const now = new Date();
    let currentMonthStart: Date;
    let currentMonthEnd: Date;
    let previousMonthStart: Date;
    let previousMonthEnd: Date;

    if (monthParam && monthParam !== "current") {
      const [year, month] = monthParam.split("-").map(Number);
      currentMonthStart = new Date(year, month - 1, 1);
      currentMonthEnd = new Date(year, month, 0, 23, 59, 59, 999);
      previousMonthStart = new Date(year, month - 2, 1);
      previousMonthEnd = new Date(year, month - 1, 0, 23, 59, 59, 999);
    } else {
      currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    }

    // Fetch current month field work data
    const currentMonthLogs = await prisma.fieldWorkLog.findMany({
      where: {
        date: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
      },
    });

    // Fetch previous month field work data for comparison
    const previousMonthLogs = await prisma.fieldWorkLog.findMany({
      where: {
        date: {
          gte: previousMonthStart,
          lte: previousMonthEnd,
        },
      },
    });

    // Aggregate current month metrics
    const currentMetrics = aggregateFieldLogs(currentMonthLogs);
    const previousMetrics = aggregateFieldLogs(previousMonthLogs);

    // Calculate deltas
    const deltas = calculateDeltas(currentMetrics, previousMetrics);

    // Get unique workers this month
    const uniqueWorkers = new Set<string>();
    currentMonthLogs.forEach(log => {
      log.workersNames.forEach(name => uniqueWorkers.add(name));
    });

    // Top contributors (by logs submitted)
    const contributorMap = new Map<string, { logs: number; hours: number }>();
    currentMonthLogs.forEach(log => {
      const existing = contributorMap.get(log.submittedBy) || { logs: 0, hours: 0 };
      contributorMap.set(log.submittedBy, {
        logs: existing.logs + 1,
        hours: existing.hours + (log.hoursWorked || 0),
      });
    });
    const topContributors = Array.from(contributorMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.logs - a.logs)
      .slice(0, 5);

    // Work by location
    const locationMap = new Map<string, { logs: number; hours: number }>();
    currentMonthLogs.forEach(log => {
      const existing = locationMap.get(log.location) || { logs: 0, hours: 0 };
      locationMap.set(log.location, {
        logs: existing.logs + 1,
        hours: existing.hours + (log.hoursWorked || 0),
      });
    });
    const topLocations = Array.from(locationMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.logs - a.logs)
      .slice(0, 5);

    // Get recent logs (last 10)
    const recentLogs = await prisma.fieldWorkLog.findMany({
      orderBy: { date: "desc" },
      take: 10,
      select: {
        id: true,
        date: true,
        location: true,
        workerCount: true,
        hoursWorked: true,
        strandHungFootage: true,
        fiberLashedFootage: true,
        fiberPulledFootage: true,
        submittedBy: true,
        notes: true,
      },
    });

    // Get today's assembly usage
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const todayUsage = await prisma.assemblyUsageLog.findMany({
      where: {
        date: {
          gte: today,
          lte: todayEnd,
        },
      },
      include: {
        assembly: {
          select: {
            name: true,
            items: {
              include: {
                equipment: {
                  select: { pricePerUnit: true },
                },
              },
            },
          },
        },
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // Calculate today's cost
    let todayCost = 0;
    todayUsage.forEach(log => {
      log.assembly.items.forEach(item => {
        todayCost += item.quantity * log.quantity * item.equipment.pricePerUnit;
      });
    });

    // Get monthly cost from assembly usage
    const currentMonthUsage = await prisma.assemblyUsageLog.findMany({
      where: {
        date: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
      },
      include: {
        assembly: {
          select: {
            items: {
              include: {
                equipment: {
                  select: { pricePerUnit: true },
                },
              },
            },
          },
        },
      },
    });

    let currentMonthCost = 0;
    currentMonthUsage.forEach(log => {
      log.assembly.items.forEach(item => {
        currentMonthCost += item.quantity * log.quantity * item.equipment.pricePerUnit;
      });
    });

    const previousMonthUsage = await prisma.assemblyUsageLog.findMany({
      where: {
        date: {
          gte: previousMonthStart,
          lte: previousMonthEnd,
        },
      },
      include: {
        assembly: {
          select: {
            items: {
              include: {
                equipment: {
                  select: { pricePerUnit: true },
                },
              },
            },
          },
        },
      },
    });

    let previousMonthCost = 0;
    previousMonthUsage.forEach(log => {
      log.assembly.items.forEach(item => {
        previousMonthCost += item.quantity * log.quantity * item.equipment.pricePerUnit;
      });
    });

    const costDelta = previousMonthCost > 0 
      ? ((currentMonthCost - previousMonthCost) / previousMonthCost) * 100 
      : 0;

    // Get monthly trends (last 6 months)
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      
      const monthLogs = await prisma.fieldWorkLog.findMany({
        where: {
          date: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      });

      const agg = aggregateFieldLogs(monthLogs);
      monthlyTrends.push({
        month: monthStart.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        strandHung: agg.strandHungFootage,
        fiberLashed: agg.fiberLashedFootage,
        hoursWorked: agg.hoursWorked,
        logs: monthLogs.length,
      });
    }

    // System stats
    const [equipmentCount, assemblyCount, userCount, teamCount] = await Promise.all([
      prisma.equipment.count({ where: { isArchived: false } }),
      prisma.assembly.count(),
      prisma.user.count(),
      prisma.team.count(),
    ]);

    return NextResponse.json({
      period: {
        current: {
          start: currentMonthStart.toISOString(),
          end: currentMonthEnd.toISOString(),
          label: currentMonthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        },
        previous: {
          start: previousMonthStart.toISOString(),
          end: previousMonthEnd.toISOString(),
          label: previousMonthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        },
      },
      metrics: {
        current: currentMetrics,
        previous: previousMetrics,
        deltas,
      },
      productivity: {
        uniqueWorkers: uniqueWorkers.size,
        topContributors,
        topLocations,
      },
      cost: {
        current: currentMonthCost,
        previous: previousMonthCost,
        delta: costDelta,
        today: todayCost,
      },
      trends: monthlyTrends,
      recentLogs,
      todayUsage: todayUsage.map(log => ({
        id: log.id,
        assemblyName: log.assembly.name,
        quantity: log.quantity,
        userName: log.user.name || log.user.email.split("@")[0],
        createdAt: log.createdAt,
      })),
      systemStats: {
        equipment: equipmentCount,
        assemblies: assemblyCount,
        users: userCount,
        teams: teamCount,
      },
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}

interface AggregatedMetrics {
  totalLogs: number;
  hoursWorked: number;
  strandHungFootage: number;
  polesAttached: number;
  fiberLashedFootage: number;
  fiberPulledFootage: number;
  drilledFootage: number;
  plowedFootage: number;
  handholesPlaced: number;
  vaultsPlaced: number;
  mstsInstalled: number;
  guysPlaced: number;
  slackLoops: number;
  risersInstalled: number;
  spliceCases: number;
}

interface FieldLogInput {
  hoursWorked: number;
  strandHungFootage: number | null;
  polesAttached: number | null;
  fiberLashedFootage: number | null;
  fiberPulledFootage: number | null;
  drilledFootage: number | null;
  plowedFootage: number | null;
  handholesPlaced: number | null;
  vaultsPlaced: number | null;
  mstsInstalled: number | null;
  guysPlaced: number | null;
  slackLoops: number | null;
  risersInstalled: number | null;
  spliceCases: number | null;
}

function aggregateFieldLogs(logs: FieldLogInput[]): AggregatedMetrics {
  const result: AggregatedMetrics = {
    totalLogs: 0,
    hoursWorked: 0,
    strandHungFootage: 0,
    polesAttached: 0,
    fiberLashedFootage: 0,
    fiberPulledFootage: 0,
    drilledFootage: 0,
    plowedFootage: 0,
    handholesPlaced: 0,
    vaultsPlaced: 0,
    mstsInstalled: 0,
    guysPlaced: 0,
    slackLoops: 0,
    risersInstalled: 0,
    spliceCases: 0,
  };

  for (const log of logs) {
    result.totalLogs += 1;
    result.hoursWorked += log.hoursWorked || 0;
    result.strandHungFootage += log.strandHungFootage || 0;
    result.polesAttached += log.polesAttached || 0;
    result.fiberLashedFootage += log.fiberLashedFootage || 0;
    result.fiberPulledFootage += log.fiberPulledFootage || 0;
    result.drilledFootage += log.drilledFootage || 0;
    result.plowedFootage += log.plowedFootage || 0;
    result.handholesPlaced += log.handholesPlaced || 0;
    result.vaultsPlaced += log.vaultsPlaced || 0;
    result.mstsInstalled += log.mstsInstalled || 0;
    result.guysPlaced += log.guysPlaced || 0;
    result.slackLoops += log.slackLoops || 0;
    result.risersInstalled += log.risersInstalled || 0;
    result.spliceCases += log.spliceCases || 0;
  }

  return result;
}

function calculateDeltas(
  current: AggregatedMetrics,
  previous: AggregatedMetrics
): Record<string, number> {
  const calcDelta = (curr: number, prev: number) => 
    prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0;

  return {
    totalLogs: calcDelta(current.totalLogs, previous.totalLogs),
    hoursWorked: calcDelta(current.hoursWorked, previous.hoursWorked),
    strandHungFootage: calcDelta(current.strandHungFootage, previous.strandHungFootage),
    polesAttached: calcDelta(current.polesAttached, previous.polesAttached),
    fiberLashedFootage: calcDelta(current.fiberLashedFootage, previous.fiberLashedFootage),
    fiberPulledFootage: calcDelta(current.fiberPulledFootage, previous.fiberPulledFootage),
    drilledFootage: calcDelta(current.drilledFootage, previous.drilledFootage),
    plowedFootage: calcDelta(current.plowedFootage, previous.plowedFootage),
    handholesPlaced: calcDelta(current.handholesPlaced, previous.handholesPlaced),
    vaultsPlaced: calcDelta(current.vaultsPlaced, previous.vaultsPlaced),
    mstsInstalled: calcDelta(current.mstsInstalled, previous.mstsInstalled),
    guysPlaced: calcDelta(current.guysPlaced, previous.guysPlaced),
    slackLoops: calcDelta(current.slackLoops, previous.slackLoops),
    risersInstalled: calcDelta(current.risersInstalled, previous.risersInstalled),
    spliceCases: calcDelta(current.spliceCases, previous.spliceCases),
  };
}

