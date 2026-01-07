import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/reports/eod/[id] - Get a single EOD report
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

    const report = await prisma.endOfDayReport.findUnique({
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
    if (user.role === "MANAGER" && report.teamId !== user.teamId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch worker details
    const workers = await prisma.user.findMany({
      where: { id: { in: report.workersPresent } },
      select: { id: true, name: true, email: true },
    });

    // Fetch detailed usage for workers on that date
    const startOfDay = new Date(report.date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(report.date);
    endOfDay.setHours(23, 59, 59, 999);

    const usageLogs = await prisma.assemblyUsageLog.findMany({
      where: {
        userId: { in: report.workersPresent },
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
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

    // Group usage by worker
    const usageByWorker = workers.map((worker) => {
      const workerLogs = usageLogs.filter((log) => log.userId === worker.id);
      const totalAssemblies = workerLogs.reduce((sum, log) => sum + log.quantity, 0);
      const totalItems = workerLogs.reduce((sum, log) => {
        return sum + log.quantity * log.assembly.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
      }, 0);

      return {
        worker,
        logs: workerLogs,
        totalAssemblies,
        totalItems,
      };
    });

    return NextResponse.json({
      ...report,
      workers,
      usageByWorker,
    });
  } catch (error) {
    console.error("Error fetching EOD report:", error);
    return NextResponse.json(
      { error: "Failed to fetch report" },
      { status: 500 }
    );
  }
}

// DELETE /api/reports/eod/[id] - Delete an EOD report (Admin only)
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
      select: { role: true },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    await prisma.endOfDayReport.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting EOD report:", error);
    return NextResponse.json(
      { error: "Failed to delete report" },
      { status: 500 }
    );
  }
}

