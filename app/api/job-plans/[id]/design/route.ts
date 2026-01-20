import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/job-plans/[id]/design - Get all design elements (nodes, routes, allocations)
export async function GET(
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
      select: { 
        id: true,
        totalStrandFootage: true,
      },
    });

    if (!jobPlan) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Fetch nodes with their types
    const nodes = await prisma.mapNode.findMany({
      where: { jobPlanId },
      include: {
        nodeType: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
            assemblyType: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Fetch routes with connected nodes
    const routes = await prisma.mapRoute.findMany({
      where: { jobPlanId },
      include: {
        fromNode: {
          select: {
            id: true,
            name: true,
            lat: true,
            lng: true,
            nodeType: {
              select: { name: true, icon: true, color: true },
            },
          },
        },
        toNode: {
          select: {
            id: true,
            name: true,
            lat: true,
            lng: true,
            nodeType: {
              select: { name: true, icon: true, color: true },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Fetch material allocations
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
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      nodes,
      routes,
      allocations,
      totalStrandFootage: jobPlan.totalStrandFootage ?? 0,
    });
  } catch (error) {
    console.error("Error fetching design data:", error);
    return NextResponse.json(
      { error: "Failed to fetch design data" },
      { status: 500 }
    );
  }
}
