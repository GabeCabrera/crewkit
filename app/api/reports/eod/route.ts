import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET /api/reports/eod - List EOD reports with filters
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
    const teamId = searchParams.get("teamId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const createdById = searchParams.get("createdById");
    const workerId = searchParams.get("workerId");

    // Build where clause
    const where: {
      teamId?: string;
      date?: { gte?: Date; lte?: Date };
      createdById?: string;
      workersPresent?: { has: string };
    } = {};

    // Managers can only see their team's reports
    if (user.role === "MANAGER") {
      if (!user.teamId) {
        return NextResponse.json({ error: "You are not assigned to a team" }, { status: 403 });
      }
      where.teamId = user.teamId;
    } else if (teamId) {
      where.teamId = teamId;
    }

    // Date filters
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    // Filter by who created the report
    if (createdById) {
      where.createdById = createdById;
    }

    // Filter by worker who was present
    if (workerId) {
      where.workersPresent = { has: workerId };
    }

    const reports = await prisma.endOfDayReport.findMany({
      where,
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
      orderBy: { date: "desc" },
    });

    // Fetch worker names for each report
    const reportsWithWorkers = await Promise.all(
      reports.map(async (report) => {
        const workers = await prisma.user.findMany({
          where: { id: { in: report.workersPresent } },
          select: { id: true, name: true, email: true },
        });
        return { ...report, workers };
      })
    );

    return NextResponse.json(reportsWithWorkers);
  } catch (error) {
    console.error("Error fetching EOD reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}

// POST /api/reports/eod - Create an EOD report (Manager only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, teamId: true },
    });

    if (!user || !["MANAGER", "ADMIN", "SUPERUSER"].includes(user.role)) {
      return NextResponse.json({ error: "Manager or Admin access required" }, { status: 403 });
    }

    if (!user.teamId && user.role === "MANAGER") {
      return NextResponse.json({ error: "You are not assigned to a team" }, { status: 403 });
    }

    const body = await request.json();
    const {
      date,
      teamId,
      workersPresent,
      totalAssembliesUsed,
      totalItemsConsumed,
      totalFiberFootage,
      notes,
      issues,
    } = body;

    // Determine which team to use
    const reportTeamId = (user.role === "ADMIN" || user.role === "SUPERUSER") && teamId ? teamId : user.teamId;

    if (!reportTeamId) {
      return NextResponse.json({ error: "Team ID is required" }, { status: 400 });
    }

    if (!workersPresent || !Array.isArray(workersPresent)) {
      return NextResponse.json({ error: "Workers present is required" }, { status: 400 });
    }

    // Parse date
    const reportDate = date ? new Date(date) : new Date();
    reportDate.setHours(0, 0, 0, 0);

    // Check if report already exists for this team and date
    const existingReport = await prisma.endOfDayReport.findUnique({
      where: {
        date_teamId: {
          date: reportDate,
          teamId: reportTeamId,
        },
      },
    });

    if (existingReport) {
      return NextResponse.json(
        { error: "A report already exists for this team on this date" },
        { status: 409 }
      );
    }

    const report = await prisma.endOfDayReport.create({
      data: {
        date: reportDate,
        teamId: reportTeamId,
        createdById: session.user.id,
        workersPresent,
        totalAssembliesUsed: totalAssembliesUsed || 0,
        totalItemsConsumed: totalItemsConsumed || 0,
        totalFiberFootage: totalFiberFootage || null,
        notes: notes || null,
        issues: issues || null,
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

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error("Error creating EOD report:", error);
    return NextResponse.json(
      { error: "Failed to create report" },
      { status: 500 }
    );
  }
}

