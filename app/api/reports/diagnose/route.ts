import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get total count
    const totalCount = await prisma.fieldWorkLog.count();

    // Get counts by submitter
    const bySubmitter = await prisma.fieldWorkLog.groupBy({
      by: ["submittedBy"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    // Get counts by month
    const allLogs = await prisma.fieldWorkLog.findMany({
      select: { id: true, date: true, location: true, submittedBy: true, createdAt: true },
      orderBy: { date: "desc" },
    });

    const byMonth: Record<string, number> = {};
    allLogs.forEach((log) => {
      const month = new Date(log.date).toISOString().slice(0, 7); // YYYY-MM
      byMonth[month] = (byMonth[month] || 0) + 1;
    });

    // Find potential duplicates (same date + location + submitter)
    const duplicateCheck: Record<string, { count: number; ids: string[] }> = {};
    allLogs.forEach((log) => {
      const key = `${new Date(log.date).toISOString().split("T")[0]}|${log.location.toLowerCase().trim()}|${log.submittedBy.toLowerCase().trim()}`;
      if (!duplicateCheck[key]) {
        duplicateCheck[key] = { count: 0, ids: [] };
      }
      duplicateCheck[key].count++;
      duplicateCheck[key].ids.push(log.id);
    });

    const duplicates = Object.entries(duplicateCheck)
      .filter(([, v]) => v.count > 1)
      .map(([key, v]) => ({ key, count: v.count, ids: v.ids }));

    // Get earliest and latest dates
    const dateRange = {
      earliest: allLogs.length > 0 ? allLogs[allLogs.length - 1].date : null,
      latest: allLogs.length > 0 ? allLogs[0].date : null,
    };

    // Check for records created recently (might be test data)
    const recentlyCreated = allLogs.filter((log) => {
      const createdAt = new Date(log.createdAt);
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return createdAt > oneWeekAgo;
    }).length;

    return NextResponse.json({
      totalCount,
      bySubmitter,
      byMonth: Object.entries(byMonth)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([month, count]) => ({ month, count })),
      duplicates: {
        count: duplicates.reduce((acc, d) => acc + d.count - 1, 0), // Extra records from duplicates
        details: duplicates.slice(0, 20), // First 20 duplicate groups
      },
      dateRange,
      recentlyCreated,
    });
  } catch (error) {
    console.error("Error diagnosing logs:", error);
    return NextResponse.json({ error: "Failed to diagnose" }, { status: 500 });
  }
}

// DELETE endpoint to remove duplicates
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action } = await request.json();

    if (action === "remove-duplicates") {
      // Find all duplicates and keep only the first one
      const allLogs = await prisma.fieldWorkLog.findMany({
        select: { id: true, date: true, location: true, submittedBy: true, createdAt: true },
        orderBy: { createdAt: "asc" }, // Keep oldest
      });

      const seen = new Set<string>();
      const toDelete: string[] = [];

      allLogs.forEach((log) => {
        const key = `${new Date(log.date).toISOString().split("T")[0]}|${log.location.toLowerCase().trim()}|${log.submittedBy.toLowerCase().trim()}`;
        if (seen.has(key)) {
          toDelete.push(log.id);
        } else {
          seen.add(key);
        }
      });

      if (toDelete.length > 0) {
        await prisma.fieldWorkLog.deleteMany({
          where: { id: { in: toDelete } },
        });
      }

      return NextResponse.json({
        deleted: toDelete.length,
        remaining: allLogs.length - toDelete.length,
      });
    }

    if (action === "clear-all") {
      const result = await prisma.fieldWorkLog.deleteMany({});
      return NextResponse.json({ deleted: result.count });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error cleaning logs:", error);
    return NextResponse.json({ error: "Failed to clean" }, { status: 500 });
  }
}

