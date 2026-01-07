import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/reports/field-logs - Get field work logs with filters and aggregations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || user.role === "FIELD") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const location = searchParams.get("location");
    const submittedBy = searchParams.get("submittedBy");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const aggregateOnly = searchParams.get("aggregate") === "true";

    // Build where clause
    const where: {
      date?: { gte?: Date; lte?: Date };
      location?: { contains: string; mode: "insensitive" };
      submittedBy?: { contains: string; mode: "insensitive" };
    } = {};

    if (startDate) {
      where.date = { ...where.date, gte: new Date(startDate) };
    }
    if (endDate) {
      where.date = { ...where.date, lte: new Date(endDate) };
    }
    if (location) {
      where.location = { contains: location, mode: "insensitive" };
    }
    if (submittedBy) {
      where.submittedBy = { contains: submittedBy, mode: "insensitive" };
    }

    // Get aggregated stats
    const aggregations = await prisma.fieldWorkLog.aggregate({
      where,
      _sum: {
        hoursWorked: true,
        strandHungFootage: true,
        polesAttached: true,
        fiberLashedFootage: true,
        fiberPulledFootage: true,
        drilledFootage: true,
        plowedFootage: true,
        handholesPlaced: true,
        vaultsPlaced: true,
        mstsInstalled: true,
        guysPlaced: true,
        slackLoops: true,
        risersInstalled: true,
        spliceCases: true,
        anchorsPlaced: true,
        snowshoesPlaced: true,
        conduitPlacedFootage: true,
        trenchedFootage: true,
      },
      _count: true,
    });

    // Get unique workers count
    const allLogs = await prisma.fieldWorkLog.findMany({
      where,
      select: { workersNames: true },
    });
    const uniqueWorkers = new Set<string>();
    allLogs.forEach((log) => {
      log.workersNames.forEach((w) => uniqueWorkers.add(w));
    });

    // Get unique locations
    const locations = await prisma.fieldWorkLog.groupBy({
      by: ["location"],
      where,
      _count: true,
      orderBy: { _count: { location: "desc" } },
      take: 50,
    });

    // Get unique submitters
    const submitters = await prisma.fieldWorkLog.groupBy({
      by: ["submittedBy"],
      where,
      _count: true,
      orderBy: { _count: { submittedBy: "desc" } },
    });

    if (aggregateOnly) {
      return NextResponse.json({
        summary: {
          totalLogs: aggregations._count,
          totalHoursWorked: aggregations._sum.hoursWorked || 0,
          uniqueWorkers: uniqueWorkers.size,
          aerial: {
            strandHungFootage: aggregations._sum.strandHungFootage || 0,
            polesAttached: aggregations._sum.polesAttached || 0,
            fiberLashedFootage: aggregations._sum.fiberLashedFootage || 0,
          },
          underground: {
            fiberPulledFootage: aggregations._sum.fiberPulledFootage || 0,
            drilledFootage: aggregations._sum.drilledFootage || 0,
            plowedFootage: aggregations._sum.plowedFootage || 0,
            trenchedFootage: aggregations._sum.trenchedFootage || 0,
            conduitPlacedFootage: aggregations._sum.conduitPlacedFootage || 0,
          },
          infrastructure: {
            handholesPlaced: aggregations._sum.handholesPlaced || 0,
            vaultsPlaced: aggregations._sum.vaultsPlaced || 0,
            mstsInstalled: aggregations._sum.mstsInstalled || 0,
            guysPlaced: aggregations._sum.guysPlaced || 0,
            slackLoops: aggregations._sum.slackLoops || 0,
            risersInstalled: aggregations._sum.risersInstalled || 0,
            spliceCases: aggregations._sum.spliceCases || 0,
            anchorsPlaced: aggregations._sum.anchorsPlaced || 0,
            snowshoesPlaced: aggregations._sum.snowshoesPlaced || 0,
          },
        },
        locations: locations.map((l) => ({ name: l.location, count: l._count })),
        submitters: submitters.map((s) => ({ name: s.submittedBy, count: s._count })),
      });
    }

    // Get paginated logs
    const total = await prisma.fieldWorkLog.count({ where });
    const logs = await prisma.fieldWorkLog.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalLogs: aggregations._count,
        totalHoursWorked: aggregations._sum.hoursWorked || 0,
        uniqueWorkers: uniqueWorkers.size,
        aerial: {
          strandHungFootage: aggregations._sum.strandHungFootage || 0,
          polesAttached: aggregations._sum.polesAttached || 0,
          fiberLashedFootage: aggregations._sum.fiberLashedFootage || 0,
        },
        underground: {
          fiberPulledFootage: aggregations._sum.fiberPulledFootage || 0,
          drilledFootage: aggregations._sum.drilledFootage || 0,
          plowedFootage: aggregations._sum.plowedFootage || 0,
          trenchedFootage: aggregations._sum.trenchedFootage || 0,
          conduitPlacedFootage: aggregations._sum.conduitPlacedFootage || 0,
        },
        infrastructure: {
          handholesPlaced: aggregations._sum.handholesPlaced || 0,
          vaultsPlaced: aggregations._sum.vaultsPlaced || 0,
          mstsInstalled: aggregations._sum.mstsInstalled || 0,
          guysPlaced: aggregations._sum.guysPlaced || 0,
          slackLoops: aggregations._sum.slackLoops || 0,
          risersInstalled: aggregations._sum.risersInstalled || 0,
          spliceCases: aggregations._sum.spliceCases || 0,
          anchorsPlaced: aggregations._sum.anchorsPlaced || 0,
          snowshoesPlaced: aggregations._sum.snowshoesPlaced || 0,
        },
      },
      locations: locations.map((l) => ({ name: l.location, count: l._count })),
      submitters: submitters.map((s) => ({ name: s.submittedBy, count: s._count })),
    });
  } catch (error) {
    console.error("Error fetching field logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch field logs" },
      { status: 500 }
    );
  }
}

