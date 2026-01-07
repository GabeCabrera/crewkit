import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPERUSER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month"; // day, week, month, all

    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case "day":
        startDate.setHours(0, 0, 0, 0);
        break;
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
      default:
        startDate = new Date(0); // All time
    }

    // Equipment usage stats
    const equipmentUsage = await prisma.equipmentLog.groupBy({
      by: ["equipmentId"],
      where: {
        type: "USED",
        date: {
          gte: startDate,
        },
      },
      _sum: {
        quantity: true,
      },
      _count: {
        id: true,
      },
    });

    // Get equipment details
    const equipmentIds = equipmentUsage.map((e) => e.equipmentId);
    const equipment = await prisma.equipment.findMany({
      where: {
        id: {
          in: equipmentIds,
        },
      },
    });

    const equipmentUsageWithDetails = equipmentUsage.map((usage) => {
      const eq = equipment.find((e) => e.id === usage.equipmentId);
      return {
        equipmentId: usage.equipmentId,
        equipmentName: eq?.name || "Unknown",
        totalUsed: Math.abs(usage._sum.quantity || 0),
        usageCount: usage._count.id,
        cost: Math.abs(usage._sum.quantity || 0) * (eq?.pricePerUnit || 0),
      };
    });

    // Assembly usage stats
    const assemblyUsage = await prisma.assemblyUsageLog.groupBy({
      by: ["assemblyId"],
      where: {
        date: {
          gte: startDate,
        },
      },
      _sum: {
        quantity: true,
      },
      _count: {
        id: true,
      },
    });

    const assemblyIds = assemblyUsage.map((a) => a.assemblyId);
    const assemblies = await prisma.assembly.findMany({
      where: {
        id: {
          in: assemblyIds,
        },
      },
    });

    const assemblyUsageWithDetails = assemblyUsage.map((usage) => {
      const assembly = assemblies.find((a) => a.id === usage.assemblyId);
      return {
        assemblyId: usage.assemblyId,
        assemblyName: assembly?.name || "Unknown",
        totalUsed: usage._sum.quantity || 0,
        usageCount: usage._count.id,
      };
    });

    // Total cost calculation
    const totalCost = equipmentUsageWithDetails.reduce(
      (sum, item) => sum + item.cost,
      0
    );

    // Most common equipment
    const mostCommon = [...equipmentUsageWithDetails]
      .sort((a, b) => b.totalUsed - a.totalUsed)
      .slice(0, 10);

    // Most expensive
    const mostExpensive = [...equipmentUsageWithDetails]
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);

    // Daily averages
    const daysDiff = Math.max(
      1,
      Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    const avgCostPerDay = totalCost / daysDiff;

    return NextResponse.json({
      period,
      startDate,
      endDate: now,
      equipmentUsage: equipmentUsageWithDetails,
      assemblyUsage: assemblyUsageWithDetails,
      totalCost,
      avgCostPerDay,
      mostCommon,
      mostExpensive,
      totalEquipmentTypes: equipment.length,
      totalAssemblies: assemblies.length,
    });
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}


