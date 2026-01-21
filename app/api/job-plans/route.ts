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

    const jobPlan = await prisma.jobPlan.create({
      data: {
        // Permits
        rmpPermitApproved: data.rmpPermitApproved,
        sesdPermitApproved: data.sesdPermitApproved,
        makeReadyComplete: data.makeReadyComplete,
        easementsClear: data.easementsClear,
        // Route
        jobName: data.jobName,
        jobNumber: data.jobNumber,
        locationName: data.locationName,
        vetroProjectUrl: data.vetroProjectUrl || null,
        totalDistance: data.totalDistance ?? 0,
        poleCount: data.poleCount ?? 0,
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
      },
    });

    return NextResponse.json(jobPlan, { status: 201 });
  } catch (error) {
    console.error("Error creating job plan:", error);
    return NextResponse.json(
      { error: "Failed to create job plan" },
      { status: 500 }
    );
  }
}
