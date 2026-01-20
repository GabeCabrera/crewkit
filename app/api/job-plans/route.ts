import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeRateLimit } from "@/lib/rate-limit";

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

    // Validate required fields (use undefined/null check to allow 0 for numeric fields)
    const requiredFields = ["jobName", "startPoleId", "endPoleId", "totalDistance"];
    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null || body[field] === "") {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    const jobPlan = await prisma.jobPlan.create({
      data: {
        // Permits
        rmpPermitApproved: body.rmpPermitApproved ?? false,
        sesdPermitApproved: body.sesdPermitApproved ?? false,
        makeReadyComplete: body.makeReadyComplete ?? false,
        easementsClear: body.easementsClear ?? false,
        // Route
        jobName: body.jobName,
        startPoleId: body.startPoleId,
        endPoleId: body.endPoleId,
        totalDistance: body.totalDistance,
        // Materials
        strandFootage: body.strandFootage ?? body.totalDistance,
        fiberFootage: body.fiberFootage ?? Math.round(body.totalDistance * 1.1),
        deadEnds: body.deadEnds ?? 0,
        tangents: body.tangents ?? 0,
        anchors: body.anchors ?? 0,
        // Hazards
        trafficControl: body.trafficControl ?? false,
        treeTrimming: body.treeTrimming ?? false,
        animalHazards: body.animalHazards ?? false,
        waterRailCrossing: body.waterRailCrossing ?? false,
        foremanNotes: body.foremanNotes ?? null,
        // Status - default to DRAFT for new jobs created via quick-create flow
        status: body.status ?? "DRAFT",
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
