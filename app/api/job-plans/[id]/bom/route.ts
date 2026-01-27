import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET /api/job-plans/[id]/bom - Get BOM for a job plan
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

    // Check if job plan exists
    const jobPlan = await prisma.jobPlan.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!jobPlan) {
      return NextResponse.json({ error: "Job plan not found" }, { status: 404 });
    }

    // Get BOM with all related data
    const bom = await prisma.jobBOM.findUnique({
      where: { jobPlanId: id },
      include: {
        fiberSegments: {
          orderBy: [
            { segmentType: "asc" },
            { fiberCount: "desc" },
          ],
        },
        infrastructure: {
          orderBy: [
            { itemType: "asc" },
            { quantity: "desc" },
          ],
        },
        conduitSegments: {
          orderBy: [
            { conduitSize: "asc" },
          ],
        },
      },
    });

    if (!bom) {
      return NextResponse.json({ 
        exists: false,
        message: "No BOM imported for this job" 
      });
    }

    // Calculate summary statistics
    const summary = calculateBOMSummary(bom);

    return NextResponse.json({
      exists: true,
      bom: {
        ...bom,
        summary,
      },
    });
  } catch (error) {
    console.error("Error fetching BOM:", error);
    return NextResponse.json(
      { error: "Failed to fetch BOM" },
      { status: 500 }
    );
  }
}

// DELETE /api/job-plans/[id]/bom - Delete BOM for a job plan
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        { error: "Only managers and admins can delete BOM" },
        { status: 403 }
      );
    }

    // Delete existing BOM (cascade will delete related records)
    await prisma.jobBOM.deleteMany({
      where: { jobPlanId: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting BOM:", error);
    return NextResponse.json(
      { error: "Failed to delete BOM" },
      { status: 500 }
    );
  }
}

// Helper function to calculate BOM summary
function calculateBOMSummary(bom: {
  fiberSegments: Array<{ segmentType: string; fiberCount: number; footage: number }>;
  infrastructure: Array<{ itemType: string; quantity: number }>;
  conduitSegments: Array<{ conduitSize: string; footage: number }>;
}) {
  const summary = {
    totalBackboneFootage: 0,
    totalLateralFootage: 0,
    totalStrandFootage: 0,
    totalConduitFootage: 0,
    fiberByCount: {} as Record<number, number>,
    conduitBySize: {} as Record<string, number>,
    mstCount: 0,
    vaultCount: 0,
    handholeCount: 0,
    pedestalCount: 0,
    spliceCount: 0,
    poleCount: 0,
    riserCount: 0,
    guyCount: 0,
    slackLoopCount: 0,
    crossingCount: 0,
  };

  // Process fiber segments
  for (const seg of bom.fiberSegments) {
    if (seg.segmentType === "backbone") {
      summary.totalBackboneFootage += seg.footage;
    } else if (seg.segmentType === "lateral") {
      summary.totalLateralFootage += seg.footage;
    } else if (seg.segmentType === "strand") {
      summary.totalStrandFootage += seg.footage;
    }

    if (seg.fiberCount > 0) {
      summary.fiberByCount[seg.fiberCount] =
        (summary.fiberByCount[seg.fiberCount] || 0) + seg.footage;
    }
  }

  // Process conduit
  for (const seg of bom.conduitSegments) {
    summary.totalConduitFootage += seg.footage;
    summary.conduitBySize[seg.conduitSize] =
      (summary.conduitBySize[seg.conduitSize] || 0) + seg.footage;
  }

  // Process infrastructure
  for (const item of bom.infrastructure) {
    switch (item.itemType) {
      case "mst":
        summary.mstCount += item.quantity;
        break;
      case "vault":
        summary.vaultCount += item.quantity;
        break;
      case "handhole":
        summary.handholeCount += item.quantity;
        break;
      case "pedestal":
        summary.pedestalCount += item.quantity;
        break;
      case "splice":
        summary.spliceCount += item.quantity;
        break;
      case "pole":
        summary.poleCount += item.quantity;
        break;
      case "riser":
        summary.riserCount += item.quantity;
        break;
      case "guy":
        summary.guyCount += item.quantity;
        break;
      case "slack_loop":
        summary.slackLoopCount += item.quantity;
        break;
      case "crossing":
        summary.crossingCount += item.quantity;
        break;
    }
  }

  return summary;
}
