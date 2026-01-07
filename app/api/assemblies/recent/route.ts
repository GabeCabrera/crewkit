import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/assemblies/recent
 * Returns the user's recently used assemblies (unique, ordered by last used)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "5");
    const days = parseInt(searchParams.get("days") || "30");

    // Get usage logs from the last N days
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get recent usage logs grouped by assembly
    const recentLogs = await prisma.assemblyUsageLog.findMany({
      where: {
        userId: session.user.id,
        date: { gte: since },
        assembly: { status: "APPROVED" },
      },
      select: {
        assemblyId: true,
        createdAt: true,
        quantity: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get unique assembly IDs with their last used date and total usage
    const assemblyUsageMap = new Map<string, { lastUsed: Date; totalUsed: number }>();
    for (const log of recentLogs) {
      const existing = assemblyUsageMap.get(log.assemblyId);
      if (!existing) {
        assemblyUsageMap.set(log.assemblyId, {
          lastUsed: log.createdAt,
          totalUsed: log.quantity,
        });
      } else {
        existing.totalUsed += log.quantity;
      }
    }

    // Sort by last used and take top N
    const sortedIds = Array.from(assemblyUsageMap.entries())
      .sort((a, b) => b[1].lastUsed.getTime() - a[1].lastUsed.getTime())
      .slice(0, limit)
      .map(([id]) => id);

    if (sortedIds.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch full assembly data
    const assemblies = await prisma.assembly.findMany({
      where: {
        id: { in: sortedIds },
        status: "APPROVED",
      },
      select: {
        id: true,
        name: true,
        description: true,
        categories: true,
        items: {
          select: {
            id: true,
            equipmentId: true,
            quantity: true,
            equipment: {
              select: {
                id: true,
                name: true,
                sku: true,
                pricePerUnit: true,
                unitType: true,
              },
            },
          },
        },
      },
    });

    // Sort assemblies by the order in sortedIds and add usage stats
    const result = sortedIds
      .map((id) => {
        const assembly = assemblies.find((a) => a.id === id);
        const stats = assemblyUsageMap.get(id);
        if (!assembly) return null;
        return {
          ...assembly,
          lastUsed: stats?.lastUsed,
          totalUsed: stats?.totalUsed || 0,
        };
      })
      .filter(Boolean);

    // Return with no-cache headers to ensure fresh data on all devices
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache",
      },
    });
  } catch (error) {
    console.error("Error fetching recent assemblies:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent assemblies" },
      { status: 500 }
    );
  }
}

