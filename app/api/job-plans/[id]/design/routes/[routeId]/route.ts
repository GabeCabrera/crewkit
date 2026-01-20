import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/job-plans/[id]/design/routes/[routeId] - Update a route
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; routeId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: jobPlanId, routeId } = await params;
    const body = await request.json();
    const { routeType, fiberCount, footage } = body;

    // Verify route exists and belongs to job
    const existingRoute = await prisma.mapRoute.findFirst({
      where: { id: routeId, jobPlanId },
    });

    if (!existingRoute) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    // Validate route type if provided
    if (routeType) {
      const validRouteTypes = ["strand_only", "fiber", "mst"];
      if (!validRouteTypes.includes(routeType)) {
        return NextResponse.json(
          { error: "Invalid route type. Must be: strand_only, fiber, or mst" },
          { status: 400 }
        );
      }
    }

    // Validate fiber count if provided
    if (fiberCount) {
      const validFiberCounts = [12, 24, 48, 96, 144, 288];
      if (!validFiberCounts.includes(fiberCount)) {
        return NextResponse.json(
          { error: "Invalid fiber count. Must be: 12, 24, 48, 96, 144, or 288" },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (routeType !== undefined) {
      updateData.routeType = routeType;
      // Clear fiberCount if switching to strand_only
      if (routeType === "strand_only") {
        updateData.fiberCount = null;
      }
    }
    if (fiberCount !== undefined) updateData.fiberCount = fiberCount;
    if (footage !== undefined) updateData.footage = footage;

    const route = await prisma.mapRoute.update({
      where: { id: routeId },
      data: updateData,
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
    });

    return NextResponse.json(route);
  } catch (error) {
    console.error("Error updating route:", error);
    return NextResponse.json(
      { error: "Failed to update route" },
      { status: 500 }
    );
  }
}

// DELETE /api/job-plans/[id]/design/routes/[routeId] - Delete a route
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; routeId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: jobPlanId, routeId } = await params;

    // Verify route exists and belongs to job
    const existingRoute = await prisma.mapRoute.findFirst({
      where: { id: routeId, jobPlanId },
    });

    if (!existingRoute) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    await prisma.mapRoute.delete({
      where: { id: routeId },
    });

    return NextResponse.json({ message: "Route deleted" });
  } catch (error) {
    console.error("Error deleting route:", error);
    return NextResponse.json(
      { error: "Failed to delete route" },
      { status: 500 }
    );
  }
}
