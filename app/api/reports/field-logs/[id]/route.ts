import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET /api/reports/field-logs/[id] - Get a single field report with assembly usage
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const report = await prisma.fieldWorkLog.findUnique({
      where: { id: params.id },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Managers can only view their own team's reports
    if (user.role === "MANAGER" && report.teamId && report.teamId !== user.teamId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch assembly usage for the same date
    const startOfDay = new Date(report.date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(report.date);
    endOfDay.setHours(23, 59, 59, 999);

    // Build filter based on team
    const usageFilter: {
      date: { gte: Date; lte: Date };
      user?: { teamId: string };
    } = {
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    };

    if (report.teamId) {
      usageFilter.user = { teamId: report.teamId };
    }

    const usageLogs = await prisma.assemblyUsageLog.findMany({
      where: usageFilter,
      include: {
        assembly: {
          select: {
            id: true,
            name: true,
            items: {
              include: {
                equipment: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                    pricePerUnit: true,
                  },
                },
              },
            },
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
    });

    // Calculate totals
    const totalAssemblies = usageLogs.reduce((sum, log) => sum + log.quantity, 0);
    const totalItems = usageLogs.reduce((sum, log) => {
      return sum + log.quantity * log.assembly.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);
    const totalCost = usageLogs.reduce((sum, log) => {
      return sum + log.quantity * log.assembly.items.reduce((itemSum, item) => {
        return itemSum + item.quantity * item.equipment.pricePerUnit;
      }, 0);
    }, 0);

    return NextResponse.json({
      ...report,
      assemblyUsage: {
        logs: usageLogs,
        totalAssemblies,
        totalItems,
        totalCost,
      },
    });
  } catch (error) {
    console.error("Error fetching field report:", error);
    return NextResponse.json(
      { error: "Failed to fetch report" },
      { status: 500 }
    );
  }
}

// PUT /api/reports/field-logs/[id] - Update a field report
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, teamId: true },
    });

    // Only SUPERUSER, ADMIN, and MANAGER can edit
    if (!user || !["SUPERUSER", "ADMIN", "MANAGER"].includes(user.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const existing = await prisma.fieldWorkLog.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Managers can only edit their own team's reports
    if (user.role === "MANAGER" && existing.teamId && existing.teamId !== user.teamId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();

    // Parse date if provided
    let date = existing.date;
    if (body.date) {
      date = new Date(body.date);
    }

    const updated = await prisma.fieldWorkLog.update({
      where: { id: params.id },
      data: {
        date,
        location: body.location ?? existing.location,
        workersNames: body.workersNames ?? existing.workersNames,
        workerCount: body.workerCount ?? existing.workerCount,
        hoursWorked: body.hoursWorked ?? existing.hoursWorked,
        teamId: body.teamId !== undefined ? body.teamId : existing.teamId,
        // Aerial metrics
        strandHungFootage: body.strandHungFootage ?? existing.strandHungFootage,
        polesAttached: body.polesAttached ?? existing.polesAttached,
        fiberLashedFootage: body.fiberLashedFootage ?? existing.fiberLashedFootage,
        fiberPulledFootage: body.fiberPulledFootage ?? existing.fiberPulledFootage,
        // Underground metrics
        drilledFootage: body.drilledFootage ?? existing.drilledFootage,
        plowedFootage: body.plowedFootage ?? existing.plowedFootage,
        trenchedFootage: body.trenchedFootage ?? existing.trenchedFootage,
        conduitPlacedFootage: body.conduitPlacedFootage ?? existing.conduitPlacedFootage,
        conduitSize: body.conduitSize ?? existing.conduitSize,
        // Infrastructure
        handholesPlaced: body.handholesPlaced ?? existing.handholesPlaced,
        vaultsPlaced: body.vaultsPlaced ?? existing.vaultsPlaced,
        mstsInstalled: body.mstsInstalled ?? existing.mstsInstalled,
        guysPlaced: body.guysPlaced ?? existing.guysPlaced,
        slackLoops: body.slackLoops ?? existing.slackLoops,
        risersInstalled: body.risersInstalled ?? existing.risersInstalled,
        spliceCases: body.spliceCases ?? existing.spliceCases,
        anchorsPlaced: body.anchorsPlaced ?? existing.anchorsPlaced,
        snowshoesPlaced: body.snowshoesPlaced ?? existing.snowshoesPlaced,
        // Notes
        notes: body.notes ?? existing.notes,
        issues: body.issues ?? existing.issues,
        submittedBy: body.submittedBy ?? existing.submittedBy,
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating field report:", error);
    return NextResponse.json(
      { error: "Failed to update report" },
      { status: 500 }
    );
  }
}

// DELETE /api/reports/field-logs/[id] - Delete a field report
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, teamId: true },
    });

    // Only SUPERUSER, ADMIN, and MANAGER can delete
    if (!user || !["SUPERUSER", "ADMIN", "MANAGER"].includes(user.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const existing = await prisma.fieldWorkLog.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Managers can only delete their own team's reports
    if (user.role === "MANAGER" && existing.teamId && existing.teamId !== user.teamId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await prisma.fieldWorkLog.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting field report:", error);
    return NextResponse.json(
      { error: "Failed to delete report" },
      { status: 500 }
    );
  }
}
