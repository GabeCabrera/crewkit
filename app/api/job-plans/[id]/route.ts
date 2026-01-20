import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeRateLimit } from "@/lib/rate-limit";
import { 
  updateJobPlanSchema, 
  validateRequest, 
  validateStatusTransition,
  JobPlanStatus,
} from "@/lib/validations";

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
        permits: {
          include: {
            permitType: true,
            documents: {
              include: {
                uploadedBy: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
              orderBy: { uploadedAt: "desc" },
            },
          },
          orderBy: { createdAt: "asc" },
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
        mapLayers: {
          orderBy: { zIndex: "asc" },
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

    // Fetch existing plan with assignments and permits for status validation
    const existingPlan = await prisma.jobPlan.findUnique({
      where: { id },
      include: {
        assignments: {
          select: { id: true },
        },
        permits: {
          select: { id: true, isApproved: true },
        },
      },
    });

    if (!existingPlan) {
      return NextResponse.json({ error: "Job plan not found" }, { status: 404 });
    }

    const body = await request.json();

    // Validate request body with Zod schema
    const validation = validateRequest(updateJobPlanSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Build update data from validated fields (only non-undefined)
    const updateData: Record<string, unknown> = {};
    const validatedData = validation.data;
    
    for (const [key, value] of Object.entries(validatedData)) {
      if (value !== undefined) {
        // Convert date strings to Date objects for Prisma
        if ((key === "plannedStartDate" || key === "plannedEndDate" || 
             key === "signoffDate" || key === "completedAt") && value) {
          updateData[key] = new Date(value as string);
        } else {
          updateData[key] = value;
        }
      }
    }

    // Get current state with pending updates applied for validation
    const mergedState = { 
      ...existingPlan, 
      ...updateData,
      // Ensure assignments and permits are available for validation
      assignments: existingPlan.assignments,
      permits: existingPlan.permits,
    };

    // Validate status transition if status is being changed
    if (body.status && body.status !== existingPlan.status) {
      const transitionResult = validateStatusTransition(
        mergedState,
        body.status as JobPlanStatus
      );
      
      if (!transitionResult.valid) {
        return NextResponse.json(
          { 
            error: transitionResult.error,
            missingRequirements: transitionResult.missingRequirements,
          },
          { status: 400 }
        );
      }
    }

    // Auto-status logic for sign-off completion
    // Auto-update status to COMPLETED when signed off (only if currently IN_PROGRESS)
    if (body.foremanSignoff === true && existingPlan.status === "IN_PROGRESS" && !body.status) {
      updateData.status = "COMPLETED";
    }

    // Revert to IN_PROGRESS if sign-off is removed
    if (body.foremanSignoff === false && existingPlan.status === "COMPLETED" && !body.status) {
      updateData.status = "IN_PROGRESS";
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
        permits: {
          include: {
            permitType: true,
            documents: {
              include: {
                uploadedBy: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
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

    // Everyone except FIELD users can delete job plans
    if (user.role === "FIELD") {
      return NextResponse.json(
        { error: "Field users cannot delete job plans" },
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
