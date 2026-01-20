import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeRateLimit } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';

// POST /api/job-plans/[id]/assign - Assign users to a job plan
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

    // Only managers, admins, and superusers can assign users
    if (!["MANAGER", "ADMIN", "SUPERUSER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only managers and admins can assign users to jobs" },
        { status: 403 }
      );
    }

    const jobPlan = await prisma.jobPlan.findUnique({
      where: { id },
    });

    if (!jobPlan) {
      return NextResponse.json({ error: "Job plan not found" }, { status: 404 });
    }

    const body = await request.json();
    const { userIds } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "userIds array is required" },
        { status: 400 }
      );
    }

    // Verify all users exist
    const usersToAssign = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });

    if (usersToAssign.length !== userIds.length) {
      return NextResponse.json(
        { error: "One or more users not found" },
        { status: 400 }
      );
    }

    // Create assignments and notifications
    const assignments = [];
    const notifications = [];

    for (const userId of userIds) {
      // Check if already assigned
      const existing = await prisma.jobAssignment.findUnique({
        where: {
          jobPlanId_userId: {
            jobPlanId: id,
            userId,
          },
        },
      });

      if (!existing) {
        assignments.push({
          jobPlanId: id,
          userId,
          assignedById: session.user.id,
        });

        // Create notification for the assigned user
        if (userId !== session.user.id) {
          notifications.push({
            type: "JOB_ASSIGNED" as const,
            userId,
            jobPlanId: id,
            title: "New Job Assignment",
            message: `You have been assigned to "${jobPlan.jobName}"`,
          });
        }
      }
    }

    // Create all assignments
    if (assignments.length > 0) {
      await prisma.jobAssignment.createMany({
        data: assignments,
      });
    }

    // Create all notifications
    if (notifications.length > 0) {
      await prisma.notification.createMany({
        data: notifications,
      });
    }

    // Return updated job plan with assignments
    const updatedJobPlan = await prisma.jobPlan.findUnique({
      where: { id },
      include: {
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

    return NextResponse.json(updatedJobPlan);
  } catch (error) {
    console.error("Error assigning users:", error);
    return NextResponse.json(
      { error: "Failed to assign users" },
      { status: 500 }
    );
  }
}

// DELETE /api/job-plans/[id]/assign - Remove user assignment
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

    // Only managers, admins, and superusers can remove assignments
    if (!["MANAGER", "ADMIN", "SUPERUSER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only managers and admins can remove assignments" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId query parameter is required" },
        { status: 400 }
      );
    }

    const assignment = await prisma.jobAssignment.findUnique({
      where: {
        jobPlanId_userId: {
          jobPlanId: id,
          userId,
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    await prisma.jobAssignment.delete({
      where: {
        jobPlanId_userId: {
          jobPlanId: id,
          userId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing assignment:", error);
    return NextResponse.json(
      { error: "Failed to remove assignment" },
      { status: 500 }
    );
  }
}
