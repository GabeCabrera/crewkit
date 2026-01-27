import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeRateLimit } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';

// GET /api/job-plans/[id]/bom/selection - Get selection state
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const bom = await prisma.jobBOM.findUnique({
      where: { jobPlanId: id },
      select: {
        id: true,
        selectionBoundary: true,
        selectedPhases: true,
        fiberSegments: {
          select: {
            id: true,
            isSelected: true,
          },
        },
        infrastructure: {
          select: {
            id: true,
            isSelected: true,
            isCompleted: true,
          },
        },
        conduitSegments: {
          select: {
            id: true,
            isSelected: true,
          },
        },
      },
    });

    if (!bom) {
      return NextResponse.json({ 
        exists: false,
        message: "No BOM found for this job" 
      });
    }

    // Build arrays of selected IDs for easy consumption by frontend
    const selectedFiberIds = bom.fiberSegments.filter(s => s.isSelected).map(s => s.id);
    const selectedInfraIds = bom.infrastructure.filter(i => i.isSelected).map(i => i.id);
    const selectedConduitIds = bom.conduitSegments.filter(c => c.isSelected).map(c => c.id);

    return NextResponse.json({
      exists: true,
      selectionBoundary: bom.selectionBoundary,
      selectedPhases: bom.selectedPhases,
      // Selected feature IDs for route design
      selectedFiberIds,
      selectedInfraIds,
      selectedConduitIds,
      // Legacy format for backward compatibility
      infrastructureSelection: bom.infrastructure.reduce((acc, item) => {
        acc[item.id] = { isSelected: item.isSelected, isCompleted: item.isCompleted };
        return acc;
      }, {} as Record<string, { isSelected: boolean; isCompleted: boolean }>),
    });
  } catch (error) {
    console.error("Error fetching selection:", error);
    return NextResponse.json(
      { error: "Failed to fetch selection" },
      { status: 500 }
    );
  }
}

// PATCH /api/job-plans/[id]/bom/selection - Update selection state
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResult = writeRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check user permissions
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !["MANAGER", "ADMIN", "SUPERUSER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only managers and admins can update selection" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { selectionBoundary, selectedPhases, selectedFiberIds, selectedInfraIds, selectedConduitIds } = body;

    // Find BOM
    const bom = await prisma.jobBOM.findUnique({
      where: { jobPlanId: id },
      select: { id: true },
    });

    if (!bom) {
      return NextResponse.json({ error: "No BOM found for this job" }, { status: 404 });
    }

    // Update BOM selection state
    const updateData: Record<string, unknown> = {};
    
    if (selectionBoundary !== undefined) {
      updateData.selectionBoundary = selectionBoundary;
    }
    
    if (selectedPhases !== undefined) {
      updateData.selectedPhases = selectedPhases;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.jobBOM.update({
        where: { id: bom.id },
        data: updateData,
      });
    }

    // Update fiber selection if provided
    if (selectedFiberIds !== undefined) {
      // First, set all to not selected
      await prisma.jobFiberSegment.updateMany({
        where: { bomId: bom.id },
        data: { isSelected: false },
      });

      // Then, set selected ones
      if (selectedFiberIds.length > 0) {
        await prisma.jobFiberSegment.updateMany({
          where: {
            bomId: bom.id,
            id: { in: selectedFiberIds },
          },
          data: { isSelected: true },
        });
      }
    }

    // Update infrastructure selection if provided
    if (selectedInfraIds !== undefined) {
      // First, set all to not selected
      await prisma.jobInfrastructure.updateMany({
        where: { bomId: bom.id },
        data: { isSelected: false },
      });

      // Then, set selected ones
      if (selectedInfraIds.length > 0) {
        await prisma.jobInfrastructure.updateMany({
          where: {
            bomId: bom.id,
            id: { in: selectedInfraIds },
          },
          data: { isSelected: true },
        });
      }
    }

    // Update conduit selection if provided
    if (selectedConduitIds !== undefined) {
      // First, set all to not selected
      await prisma.jobConduitSegment.updateMany({
        where: { bomId: bom.id },
        data: { isSelected: false },
      });

      // Then, set selected ones
      if (selectedConduitIds.length > 0) {
        await prisma.jobConduitSegment.updateMany({
          where: {
            bomId: bom.id,
            id: { in: selectedConduitIds },
          },
          data: { isSelected: true },
        });
      }
    }

    // Calculate and update job plan totals from selection
    const selectedInfra = await prisma.jobInfrastructure.findMany({
      where: {
        bomId: bom.id,
        isSelected: true,
      },
    });

    const selectedFiber = await prisma.jobFiberSegment.findMany({
      where: { 
        bomId: bom.id,
        isSelected: true,
      },
    });

    // Calculate totals
    let totalFootage = 0;
    let poleCount = 0;
    let totalFiberFootage = 0;

    selectedFiber.forEach((seg) => {
      if (seg.segmentType === "backbone" || seg.segmentType === "lateral") {
        totalFootage += seg.footage;
      }
      totalFiberFootage += seg.footage;
    });

    selectedInfra.forEach((item) => {
      if (item.itemType === "pole") {
        poleCount += item.quantity;
      }
    });

    return NextResponse.json({
      success: true,
      message: "Selection saved",
      totals: {
        totalFootage,
        poleCount,
        fiberFootage: totalFiberFootage,
      },
    });
  } catch (error) {
    console.error("Error updating selection:", error);
    return NextResponse.json(
      { error: "Failed to update selection" },
      { status: 500 }
    );
  }
}

// POST /api/job-plans/[id]/bom/selection/complete - Mark infrastructure item as complete
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResult = writeRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { infrastructureId, isCompleted } = body;

    if (!infrastructureId) {
      return NextResponse.json({ error: "infrastructureId required" }, { status: 400 });
    }

    // Find the infrastructure item and verify it belongs to this job
    const item = await prisma.jobInfrastructure.findFirst({
      where: {
        id: infrastructureId,
        bom: { jobPlanId: id },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Infrastructure item not found" }, { status: 404 });
    }

    // Update completion status
    const updated = await prisma.jobInfrastructure.update({
      where: { id: infrastructureId },
      data: {
        isCompleted: isCompleted ?? true,
        completedAt: isCompleted ? new Date() : null,
        completedById: isCompleted ? session.user.id : null,
      },
    });

    return NextResponse.json({
      success: true,
      item: {
        id: updated.id,
        isCompleted: updated.isCompleted,
        completedAt: updated.completedAt,
      },
    });
  } catch (error) {
    console.error("Error updating completion:", error);
    return NextResponse.json(
      { error: "Failed to update completion" },
      { status: 500 }
    );
  }
}
