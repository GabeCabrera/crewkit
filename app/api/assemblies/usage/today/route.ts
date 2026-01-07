import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const allUsers = searchParams.get("all") === "true";

    // Get start and end of today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where: any = {
      date: {
        gte: today,
        lt: tomorrow,
      },
    };

    // If not admin/manager viewing all, only show own logs
    if (!allUsers || (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")) {
      where.userId = userId || session.user.id;
    }

    const usageLogs = await prisma.assemblyUsageLog.findMany({
      where,
      include: {
        assembly: {
          include: {
            items: {
              include: {
                equipment: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                    pricePerUnit: true,
                    unitType: true,
                    photoUrl: true,
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
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate summary stats
    const totalAssemblies = usageLogs.reduce((sum, log) => sum + log.quantity, 0);
    
    let totalCost = 0;
    let totalItems = 0;
    
    // Collect all modifier equipment IDs to batch fetch (fixes N+1 query)
    const allModifierIds = new Set<string>();
    for (const log of usageLogs) {
      if (log.modifiers && Array.isArray(log.modifiers)) {
        for (const mod of log.modifiers as { equipmentId: string; quantity: number }[]) {
          allModifierIds.add(mod.equipmentId);
        }
      }
    }
    
    // Batch fetch all modifier equipment prices in one query
    const modifierEquipment = allModifierIds.size > 0
      ? await prisma.equipment.findMany({
          where: { id: { in: Array.from(allModifierIds) } },
          select: { id: true, pricePerUnit: true },
        })
      : [];
    const modifierPriceMap = new Map(modifierEquipment.map(e => [e.id, e.pricePerUnit]));
    
    for (const log of usageLogs) {
      for (const item of log.assembly.items) {
        const itemCost = item.equipment.pricePerUnit * item.quantity * log.quantity;
        totalCost += itemCost;
        totalItems += item.quantity * log.quantity;
      }
      
      // Add modifiers cost using pre-fetched prices
      if (log.modifiers && Array.isArray(log.modifiers)) {
        for (const mod of log.modifiers as { equipmentId: string; quantity: number }[]) {
          const price = modifierPriceMap.get(mod.equipmentId);
          if (price !== undefined) {
            totalCost += price * mod.quantity;
            totalItems += mod.quantity;
          }
        }
      }
    }

    // Return with no-cache headers to ensure fresh data on all devices
    return NextResponse.json(
      {
        logs: usageLogs,
        summary: {
          totalAssemblies,
          totalItems,
          totalCost,
          logCount: usageLogs.length,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          "Pragma": "no-cache",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching today's usage:", error);
    return NextResponse.json(
      { error: "Failed to fetch today's usage" },
      { status: 500 }
    );
  }
}

