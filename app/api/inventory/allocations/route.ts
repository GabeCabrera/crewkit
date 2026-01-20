import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/inventory/allocations - Get all allocations with summary
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins and managers can view allocations
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPERUSER" && session.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all allocations with equipment and job info
    const allocations = await prisma.jobMaterialAllocation.findMany({
      include: {
        equipment: {
          include: {
            inventory: true,
          },
        },
        jobPlan: {
          select: {
            id: true,
            jobName: true,
            status: true,
          },
        },
      },
    });

    // Get all jobs that have allocations
    const jobIds = Array.from(new Set(allocations.map((a) => a.jobPlanId)));
    const jobs = await prisma.jobPlan.findMany({
      where: { id: { in: jobIds } },
      select: {
        id: true,
        jobName: true,
        status: true,
      },
    });

    // Group allocations by equipment and calculate summaries
    const equipmentMap = new Map<string, {
      equipmentId: string;
      equipment: {
        id: string;
        name: string;
        sku: string;
        unitType: string;
        inventory?: { quantity: number } | null;
      };
      totalAllocated: number;
      inStock: number;
      available: number;
      allocations: typeof allocations;
    }>();

    for (const alloc of allocations) {
      const existing = equipmentMap.get(alloc.equipmentId);
      const inStock = alloc.equipment.inventory?.quantity || 0;

      if (existing) {
        existing.totalAllocated += alloc.quantity;
        existing.available = existing.inStock - existing.totalAllocated;
        existing.allocations.push(alloc);
      } else {
        equipmentMap.set(alloc.equipmentId, {
          equipmentId: alloc.equipmentId,
          equipment: {
            id: alloc.equipment.id,
            name: alloc.equipment.name,
            sku: alloc.equipment.sku,
            unitType: alloc.equipment.unitType,
            inventory: alloc.equipment.inventory,
          },
          totalAllocated: alloc.quantity,
          inStock,
          available: inStock - alloc.quantity,
          allocations: [alloc],
        });
      }
    }

    // Convert to array and sort by shortage first, then by total allocated
    const summaries = Array.from(equipmentMap.values()).sort((a, b) => {
      // Shortages first
      if (a.available < 0 && b.available >= 0) return -1;
      if (b.available < 0 && a.available >= 0) return 1;
      // Then by allocation amount
      return b.totalAllocated - a.totalAllocated;
    });

    return NextResponse.json({
      allocations: summaries,
      jobs,
    });
  } catch (error) {
    console.error("Error fetching allocations:", error);
    return NextResponse.json(
      { error: "Failed to fetch allocations" },
      { status: 500 }
    );
  }
}
