import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Fiber count to equipment mapping (you may need to adjust based on your inventory)
const FIBER_EQUIPMENT_MAP: Record<number, string> = {
  12: "FIBER-12",
  24: "FIBER-24", 
  48: "FIBER-48",
  96: "FIBER-96",
  144: "FIBER-144",
  288: "FIBER-288",
};

interface MaterialEntry {
  quantity: number;
  unit: string;
  sources: string[];
}

// POST /api/job-plans/[id]/design/calculate - Recalculate materials
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: jobPlanId } = await params;

    // Verify job exists
    const jobPlan = await prisma.jobPlan.findUnique({
      where: { id: jobPlanId },
    });

    if (!jobPlan) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Materials map: equipmentId -> { quantity, unit, sources }
    const materials: Map<string, MaterialEntry> = new Map();

    // Helper function to add material
    const addMaterial = (
      equipmentId: string,
      quantity: number,
      unit: string,
      source: string
    ) => {
      const existing = materials.get(equipmentId);
      if (existing) {
        existing.quantity += quantity;
        existing.sources.push(source);
      } else {
        materials.set(equipmentId, { quantity, unit, sources: [source] });
      }
    };

    // 1. Get all nodes with their assembly types
    const nodes = await prisma.mapNode.findMany({
      where: { jobPlanId },
      include: {
        nodeType: {
          include: {
            assemblyType: {
              include: {
                assemblies: {
                  where: { status: "APPROVED" },
                  include: {
                    items: {
                      include: {
                        equipment: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // 2. For each node, add assembly materials
    for (const node of nodes) {
      const assemblies = node.nodeType.assemblyType?.assemblies || [];
      for (const assembly of assemblies) {
        for (const item of assembly.items) {
          addMaterial(
            item.equipmentId,
            item.quantity,
            item.equipment.unitType,
            `node:${node.id}`
          );
        }
      }
    }

    // 3. Get all routes
    const routes = await prisma.mapRoute.findMany({
      where: { jobPlanId },
    });

    // 4. Track strand footage separately (not inventory-linked)
    let totalStrandFootage = 0;

    // Track fiber by count for summary
    const fiberByCount: Record<number, number> = {};

    // 5. For each route, calculate materials
    for (const route of routes) {
      if (route.routeType === "strand_only") {
        // Strand only - track footage (not inventory)
        totalStrandFootage += route.footage;
      } else if (route.routeType === "fiber") {
        // Fiber + Strand - strand footage + fiber
        totalStrandFootage += route.footage;
        if (route.fiberCount) {
          fiberByCount[route.fiberCount] = 
            (fiberByCount[route.fiberCount] || 0) + route.footage;
          
          // Look up fiber equipment by count
          const fiberSku = FIBER_EQUIPMENT_MAP[route.fiberCount];
          if (fiberSku) {
            const fiberEquipment = await prisma.equipment.findFirst({
              where: { sku: fiberSku },
            });
            if (fiberEquipment) {
              addMaterial(
                fiberEquipment.id,
                route.footage,
                "FOOT",
                `route:${route.id}`
              );
            }
          }
        }
      } else if (route.routeType === "mst") {
        // MST: Fiber only, no strand
        if (route.fiberCount) {
          fiberByCount[route.fiberCount] = 
            (fiberByCount[route.fiberCount] || 0) + route.footage;
          
          const fiberSku = FIBER_EQUIPMENT_MAP[route.fiberCount];
          if (fiberSku) {
            const fiberEquipment = await prisma.equipment.findFirst({
              where: { sku: fiberSku },
            });
            if (fiberEquipment) {
              addMaterial(
                fiberEquipment.id,
                route.footage,
                "FOOT",
                `route:${route.id}`
              );
            }
          }
        }
      }
    }

    // 6. Update strand footage on job plan
    await prisma.jobPlan.update({
      where: { id: jobPlanId },
      data: { totalStrandFootage },
    });

    // 7. Upsert allocations
    // First, delete existing allocations for this job
    await prisma.jobMaterialAllocation.deleteMany({
      where: { jobPlanId },
    });

    // Then create new allocations
    if (materials.size > 0) {
      await prisma.jobMaterialAllocation.createMany({
        data: Array.from(materials.entries()).map(([equipmentId, data]) => ({
          jobPlanId,
          equipmentId,
          quantity: data.quantity,
          unit: data.unit,
          source: "auto",
          sourceDetails: data.sources,
        })),
      });
    }

    // Fetch updated allocations
    const allocations = await prisma.jobMaterialAllocation.findMany({
      where: { jobPlanId },
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            sku: true,
            unitType: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      totalStrandFootage,
      fiberByCount,
      allocations,
      nodeCount: nodes.length,
      routeCount: routes.length,
    });
  } catch (error) {
    console.error("Error calculating materials:", error);
    return NextResponse.json(
      { error: "Failed to calculate materials" },
      { status: 500 }
    );
  }
}
