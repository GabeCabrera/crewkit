import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeRateLimit, readRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// GET /api/job-plans/[id]/bom/segments - List all segments for a job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResult = readRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get the BOM for this job
    const bom = await prisma.jobBOM.findUnique({
      where: { jobPlanId: id },
      select: {
        id: true,
        sourceFiles: true,
        segments: {
          orderBy: { order: "asc" },
        },
      },
    });

    // If no BOM exists yet, return empty arrays (not an error)
    if (!bom) {
      return NextResponse.json({
        segments: [],
        sourceFiles: [],
        unassignedFiles: [],
      });
    }

    // Calculate which files are assigned to segments
    const assignedFileIds = new Set(bom.segments.flatMap((s) => s.fileIds));
    const unassignedFiles = bom.sourceFiles.filter(
      (f) => !assignedFileIds.has(f)
    );

    return NextResponse.json({
      segments: bom.segments,
      sourceFiles: bom.sourceFiles,
      unassignedFiles,
    });
  } catch (error) {
    console.error("Error fetching segments:", error);
    return NextResponse.json(
      { error: "Failed to fetch segments" },
      { status: 500 }
    );
  }
}

// POST /api/job-plans/[id]/bom/segments - Create a new segment
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

    // Check user permissions
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !["MANAGER", "ADMIN", "SUPERUSER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only managers and admins can create segments" },
        { status: 403 }
      );
    }

    // Get the BOM for this job
    const bom = await prisma.jobBOM.findUnique({
      where: { jobPlanId: id },
      select: { id: true, segments: true },
    });

    if (!bom) {
      return NextResponse.json({ error: "BOM not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, fileIds, color } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Segment name is required" },
        { status: 400 }
      );
    }

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json(
        { error: "At least one file must be selected" },
        { status: 400 }
      );
    }

    // Get the next order value
    const maxOrder = bom.segments.reduce(
      (max, seg) => Math.max(max, seg.order),
      -1
    );

    // Create the segment
    const segment = await prisma.jobSegment.create({
      data: {
        bomId: bom.id,
        name: name.trim(),
        fileIds,
        color: color || null,
        order: maxOrder + 1,
      },
    });

    return NextResponse.json({ segment }, { status: 201 });
  } catch (error) {
    console.error("Error creating segment:", error);
    return NextResponse.json(
      { error: "Failed to create segment" },
      { status: 500 }
    );
  }
}

// PATCH /api/job-plans/[id]/bom/segments - Update a segment
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
        { error: "Only managers and admins can update segments" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { segmentId, name, fileIds, color, order } = body;

    if (!segmentId) {
      return NextResponse.json(
        { error: "Segment ID is required" },
        { status: 400 }
      );
    }

    // Verify the segment belongs to this job's BOM
    const segment = await prisma.jobSegment.findUnique({
      where: { id: segmentId },
      include: {
        bom: {
          select: { jobPlanId: true },
        },
      },
    });

    if (!segment || segment.bom.jobPlanId !== id) {
      return NextResponse.json(
        { error: "Segment not found" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: {
      name?: string;
      fileIds?: string[];
      color?: string | null;
      order?: number;
    } = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim() === "") {
        return NextResponse.json(
          { error: "Segment name cannot be empty" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (fileIds !== undefined) {
      if (!Array.isArray(fileIds)) {
        return NextResponse.json(
          { error: "fileIds must be an array" },
          { status: 400 }
        );
      }
      updateData.fileIds = fileIds;
    }

    if (color !== undefined) {
      updateData.color = color || null;
    }

    if (order !== undefined) {
      updateData.order = order;
    }

    // Update the segment
    const updatedSegment = await prisma.jobSegment.update({
      where: { id: segmentId },
      data: updateData,
    });

    return NextResponse.json({ segment: updatedSegment });
  } catch (error) {
    console.error("Error updating segment:", error);
    return NextResponse.json(
      { error: "Failed to update segment" },
      { status: 500 }
    );
  }
}

// DELETE /api/job-plans/[id]/bom/segments - Delete a segment
export async function DELETE(
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
        { error: "Only managers and admins can delete segments" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const segmentId = searchParams.get("segmentId");

    if (!segmentId) {
      return NextResponse.json(
        { error: "Segment ID is required" },
        { status: 400 }
      );
    }

    // Verify the segment belongs to this job's BOM
    const segment = await prisma.jobSegment.findUnique({
      where: { id: segmentId },
      include: {
        bom: {
          select: { jobPlanId: true },
        },
      },
    });

    if (!segment || segment.bom.jobPlanId !== id) {
      return NextResponse.json(
        { error: "Segment not found" },
        { status: 404 }
      );
    }

    // Delete the segment (files become unassigned)
    await prisma.jobSegment.delete({
      where: { id: segmentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting segment:", error);
    return NextResponse.json(
      { error: "Failed to delete segment" },
      { status: 500 }
    );
  }
}
