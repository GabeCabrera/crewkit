import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeRateLimit } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';

// POST /api/job-plans/[id]/duplicate - Duplicate a job plan
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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only managers, admins, and superusers can duplicate job plans
    if (!["MANAGER", "ADMIN", "SUPERUSER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only managers and admins can duplicate job plans" },
        { status: 403 }
      );
    }

    // Fetch the original job plan
    const original = await prisma.jobPlan.findUnique({
      where: { id },
    });

    if (!original) {
      return NextResponse.json({ error: "Job plan not found" }, { status: 404 });
    }

    // Create a duplicate with "Copy of" prefix and reset progress fields
    const duplicate = await prisma.jobPlan.create({
      data: {
        // Planning - Permits (reset to unchecked for new job)
        rmpPermitApproved: false,
        sesdPermitApproved: false,
        makeReadyComplete: false,
        easementsClear: false,
        // Planning - Route (copy with new name)
        jobName: `Copy of ${original.jobName}`,
        startPoleId: original.startPoleId,
        endPoleId: original.endPoleId,
        totalDistance: original.totalDistance,
        // Planning - Materials (copy planned values)
        strandFootage: original.strandFootage,
        fiberFootage: original.fiberFootage,
        deadEnds: original.deadEnds,
        tangents: original.tangents,
        anchors: original.anchors,
        // Planning - Hazards (copy)
        trafficControl: original.trafficControl,
        treeTrimming: original.treeTrimming,
        animalHazards: original.animalHazards,
        waterRailCrossing: original.waterRailCrossing,
        foremanNotes: original.foremanNotes,
        // Planning - Scheduling (clear dates for new job)
        plannedStartDate: null,
        plannedEndDate: null,
        estimatedDuration: original.estimatedDuration,
        durationUnit: original.durationUnit,
        // Construction Progress (reset to 0)
        actualFootage: 0,
        actualPolesComplete: 0,
        actualStrandUsed: 0,
        actualFiberUsed: 0,
        actualDeadEnds: 0,
        actualTangents: 0,
        actualAnchors: 0,
        totalCrewHours: 0,
        // Reporting (reset)
        foremanSignoff: false,
        signoffDate: null,
        lessonsLearned: null,
        completedAt: null,
        // Status and Priority (start as draft, copy priority)
        status: "DRAFT",
        priority: original.priority,
        // Creator (set to current user)
        createdById: session.user.id,
      },
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
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });

    return NextResponse.json(duplicate, { status: 201 });
  } catch (error) {
    console.error("Error duplicating job plan:", error);
    return NextResponse.json(
      { error: "Failed to duplicate job plan" },
      { status: 500 }
    );
  }
}
