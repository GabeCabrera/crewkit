import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeRateLimit } from "@/lib/rate-limit";
import { createJobPlanSchema, validateRequest } from "@/lib/validations";

export const dynamic = 'force-dynamic';

// GET /api/job-plans - List all job plans
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const assignedToMe = searchParams.get("assignedToMe") === "true";

    // Build the where clause
    const where: Record<string, unknown> = {};
    
    if (status) {
      where.status = status;
    }

    // Field users only see jobs assigned to them
    if (user.role === "FIELD" || assignedToMe) {
      where.assignments = {
        some: {
          userId: user.id,
        },
      };
    }

    const jobPlans = await prisma.jobPlan.findMany({
      where,
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
        projectArea: {
          select: {
            id: true,
            name: true,
            prefix: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(jobPlans);
  } catch (error) {
    console.error("Error fetching job plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch job plans" },
      { status: 500 }
    );
  }
}

/**
 * Generate a standardized job name from project area
 * Format: {PREFIX}-{MMYY}-{SEQ}
 * Example: WM-0126-001
 */
function generateJobName(prefix: string, sequenceNumber: number): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  const seq = String(sequenceNumber).padStart(3, '0');
  return `${prefix}-${month}${year}-${seq}`;
}

// POST /api/job-plans - Create a new job plan
export async function POST(request: NextRequest) {
  const rateLimitResult = writeRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only managers, admins, and superusers can create job plans
    if (!["MANAGER", "ADMIN", "SUPERUSER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only managers and admins can create job plans" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate request body with Zod schema
    const validation = validateRequest(createJobPlanSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const data = validation.data;

    // If projectAreaId is provided, auto-generate job name
    let jobName = data.jobName;
    let sequenceNumber: number | null = null;
    let projectAreaId: string | null = null;

    if (data.projectAreaId) {
      // Use a transaction to atomically get and increment the sequence number
      const result = await prisma.$transaction(async (tx) => {
        // Get and lock the project area
        const projectArea = await tx.projectArea.findUnique({
          where: { id: data.projectAreaId! },
        });

        if (!projectArea) {
          throw new Error("Project area not found");
        }

        if (projectArea.isArchived) {
          throw new Error("Cannot create jobs in an archived project area");
        }

        // Get the current sequence number
        const currentSeq = projectArea.nextSeq;

        // Increment the sequence number
        await tx.projectArea.update({
          where: { id: data.projectAreaId! },
          data: { nextSeq: currentSeq + 1 },
        });

        return {
          prefix: projectArea.prefix,
          sequenceNumber: currentSeq,
          projectAreaId: projectArea.id,
        };
      });

      jobName = generateJobName(result.prefix, result.sequenceNumber);
      sequenceNumber = result.sequenceNumber;
      projectAreaId = result.projectAreaId;
    }

    // Ensure jobName is defined (validation guarantees either jobName or projectAreaId is provided)
    if (!jobName) {
      return NextResponse.json(
        { error: "Job name is required when not using a project area" },
        { status: 400 }
      );
    }

    const jobPlan = await prisma.jobPlan.create({
      data: {
        // Permits
        rmpPermitApproved: data.rmpPermitApproved,
        sesdPermitApproved: data.sesdPermitApproved,
        makeReadyComplete: data.makeReadyComplete,
        easementsClear: data.easementsClear,
        // Route
        jobName,
        jobNumber: data.jobNumber,
        locationName: data.locationName,
        vetroProjectUrl: data.vetroProjectUrl || null,
        totalDistance: data.totalDistance ?? 0,
        poleCount: data.poleCount ?? 0,
        // Project Area (for standardized naming)
        projectAreaId,
        sequenceNumber,
        // Materials (with defaults based on totalDistance)
        strandFootage: data.strandFootage ?? data.totalDistance ?? 0,
        fiberFootage: data.fiberFootage ?? Math.round((data.totalDistance ?? 0) * 1.1),
        deadEnds: data.deadEnds ?? 0,
        tangents: data.tangents ?? 0,
        anchors: data.anchors ?? 0,
        // Hazards
        trafficControl: data.trafficControl,
        treeTrimming: data.treeTrimming,
        animalHazards: data.animalHazards,
        waterRailCrossing: data.waterRailCrossing,
        foremanNotes: data.foremanNotes,
        // Scheduling
        plannedStartDate: data.plannedStartDate ? new Date(data.plannedStartDate) : null,
        plannedEndDate: data.plannedEndDate ? new Date(data.plannedEndDate) : null,
        estimatedDuration: data.estimatedDuration,
        durationUnit: data.durationUnit,
        // Status and Priority
        status: data.status,
        priority: data.priority,
        // Creator
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
        projectArea: true,
      },
    });

    return NextResponse.json(jobPlan, { status: 201 });
  } catch (error) {
    console.error("Error creating job plan:", error);
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message === "Project area not found") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message === "Cannot create jobs in an archived project area") {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    
    return NextResponse.json(
      { error: "Failed to create job plan" },
      { status: 500 }
    );
  }
}
