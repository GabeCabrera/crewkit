import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeRateLimit } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';

// GET /api/job-plans/[id] - Get a single job plan with full details
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

    const jobPlan = await prisma.jobPlan.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            assignedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        comments: {
          where: { parentId: null }, // Only top-level comments
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            replies: {
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!jobPlan) {
      return NextResponse.json({ error: "Job plan not found" }, { status: 404 });
    }

    return NextResponse.json(jobPlan);
  } catch (error) {
    console.error("Error fetching job plan:", error);
    return NextResponse.json(
      { error: "Failed to fetch job plan" },
      { status: 500 }
    );
  }
}

// PATCH /api/job-plans/[id] - Update a job plan
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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only managers, admins, and superusers can update job plans
    if (!["MANAGER", "ADMIN", "SUPERUSER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only managers and admins can update job plans" },
        { status: 403 }
      );
    }

    const existingPlan = await prisma.jobPlan.findUnique({
      where: { id },
    });

    if (!existingPlan) {
      return NextResponse.json({ error: "Job plan not found" }, { status: 404 });
    }

    const body = await request.json();

    // Build update data - only include fields that are provided
    const updateData: Record<string, unknown> = {};
    
    const allowedFields = [
      "rmpPermitApproved", "sesdPermitApproved", "makeReadyComplete", "easementsClear",
      "jobName", "startPoleId", "endPoleId", "totalDistance",
      "strandFootage", "fiberFootage", "deadEnds", "tangents", "anchors",
      "trafficControl", "treeTrimming", "animalHazards", "waterRailCrossing",
      "foremanNotes", "status"
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const jobPlan = await prisma.jobPlan.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(jobPlan);
  } catch (error) {
    console.error("Error updating job plan:", error);
    return NextResponse.json(
      { error: "Failed to update job plan" },
      { status: 500 }
    );
  }
}

// DELETE /api/job-plans/[id] - Delete a job plan
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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only admins and superusers can delete job plans
    if (!["ADMIN", "SUPERUSER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only admins can delete job plans" },
        { status: 403 }
      );
    }

    const existingPlan = await prisma.jobPlan.findUnique({
      where: { id },
    });

    if (!existingPlan) {
      return NextResponse.json({ error: "Job plan not found" }, { status: 404 });
    }

    await prisma.jobPlan.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting job plan:", error);
    return NextResponse.json(
      { error: "Failed to delete job plan" },
      { status: 500 }
    );
  }
}
