import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET /api/reports/eod/summary - Get today's usage summary for team
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
    const dateParam = searchParams.get("date");
    const teamIdParam = searchParams.get("teamId");

    // Determine team
    let teamId: string | null = null;
    if ((user.role === "ADMIN" || user.role === "SUPERUSER") && teamIdParam) {
      teamId = teamIdParam;
    } else if (user.role === "MANAGER") {
      teamId = user.teamId;
    } else if ((user.role === "ADMIN" || user.role === "SUPERUSER") && !teamIdParam) {
      // Admin/Superuser without team filter - get all teams
      teamId = null;
    }

    if (user.role === "MANAGER" && !teamId) {
      return NextResponse.json({ error: "You are not assigned to a team" }, { status: 403 });
    }

    // Parse date (default to today)
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get team members
    let teamMembers;
    if (teamId) {
      teamMembers = await prisma.user.findMany({
        where: { teamId },
        select: { id: true, name: true, email: true, role: true },
      });
    } else {
      // For admin without team filter, show all users
      teamMembers = await prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, teamId: true },
      });
    }

    const memberIds = teamMembers.map((m) => m.id);

    // Get usage logs for the day
    const usageLogs = await prisma.assemblyUsageLog.findMany({
      where: {
        userId: { in: memberIds },
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
            categories: true,
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

    // Calculate totals
    let totalAssembliesUsed = 0;
    let totalItemsConsumed = 0;
    let totalFiberFootage = 0;

    usageLogs.forEach((log) => {
      totalAssembliesUsed += log.quantity;
      log.assembly.items.forEach((item) => {
        totalItemsConsumed += item.quantity * log.quantity;
      });
      // Check for fiber category
      if (log.assembly.categories?.some((c: string) => c.toLowerCase().includes("fiber"))) {
        // Estimate footage from modifiers if available
        if (log.modifiers && typeof log.modifiers === "object") {
          const mods = log.modifiers as { footage?: number };
          if (mods.footage) {
            totalFiberFootage += mods.footage;
          }
        }
      }
    });

    // Group usage by worker
    const usageByWorker = teamMembers
      .filter((m) => m.role === "FIELD" || m.role === "MANAGER")
      .map((member) => {
        const memberLogs = usageLogs.filter((log) => log.userId === member.id);
        const memberAssemblies = memberLogs.reduce((sum, log) => sum + log.quantity, 0);
        const memberItems = memberLogs.reduce((sum, log) => {
          return sum + log.quantity * log.assembly.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
        }, 0);

        return {
          user: member,
          hasActivity: memberLogs.length > 0,
          totalAssemblies: memberAssemblies,
          totalItems: memberItems,
          logs: memberLogs,
        };
      });

    // Check if report already exists for this date
    let existingReport = null;
    if (teamId) {
      existingReport = await prisma.endOfDayReport.findUnique({
        where: {
          date_teamId: {
            date: startOfDay,
            teamId,
          },
        },
      });
    }

    return NextResponse.json({
      date: startOfDay.toISOString().split("T")[0],
      teamId,
      teamMembers,
      usageByWorker,
      totals: {
        assembliesUsed: totalAssembliesUsed,
        itemsConsumed: totalItemsConsumed,
        fiberFootage: totalFiberFootage || null,
      },
      reportExists: !!existingReport,
      existingReportId: existingReport?.id || null,
    });
  } catch (error) {
    console.error("Error fetching EOD summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch summary" },
      { status: 500 }
    );
  }
}

