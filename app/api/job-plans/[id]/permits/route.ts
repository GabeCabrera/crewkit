import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const addPermitSchema = z.object({
  permitTypeId: z.string().cuid("Invalid permit type ID"),
});

const updatePermitSchema = z.object({
  isApproved: z.boolean().optional(),
  notes: z.string().max(2000).optional().nullable(),
});

// GET /api/job-plans/[id]/permits - List permits for a job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: jobPlanId } = await params;

    // Verify job exists
    const jobPlan = await prisma.jobPlan.findUnique({
      where: { id: jobPlanId },
      select: { id: true },
    });

    if (!jobPlan) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const permits = await prisma.jobPermit.findMany({
      where: { jobPlanId },
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
    });

    return NextResponse.json(permits);
  } catch (error) {
    console.error("Error fetching job permits:", error);
    return NextResponse.json(
      { error: "Failed to fetch permits" },
      { status: 500 }
    );
  }
}

// POST /api/job-plans/[id]/permits - Add permit to job
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Only managers, admins, and superusers can add permits
    if (!["MANAGER", "ADMIN", "SUPERUSER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only managers and admins can add permits" },
        { status: 403 }
      );
    }

    const { id: jobPlanId } = await params;

    // Verify job exists
    const jobPlan = await prisma.jobPlan.findUnique({
      where: { id: jobPlanId },
      select: { id: true },
    });

    if (!jobPlan) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = addPermitSchema.safeParse(body);

    if (!validation.success) {
      const errorMessages = validation.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return NextResponse.json({ error: errorMessages }, { status: 400 });
    }

    const { permitTypeId } = validation.data;

    // Verify permit type exists
    const permitType = await prisma.permitType.findUnique({
      where: { id: permitTypeId },
    });

    if (!permitType) {
      return NextResponse.json({ error: "Permit type not found" }, { status: 404 });
    }

    // Check if permit already exists for this job
    const existingPermit = await prisma.jobPermit.findUnique({
      where: {
        jobPlanId_permitTypeId: {
          jobPlanId,
          permitTypeId,
        },
      },
    });

    if (existingPermit) {
      return NextResponse.json(
        { error: "This permit type is already added to the job" },
        { status: 400 }
      );
    }

    const permit = await prisma.jobPermit.create({
      data: {
        jobPlanId,
        permitTypeId,
      },
      include: {
        permitType: true,
        documents: true,
      },
    });

    return NextResponse.json(permit, { status: 201 });
  } catch (error) {
    console.error("Error adding permit to job:", error);
    return NextResponse.json(
      { error: "Failed to add permit" },
      { status: 500 }
    );
  }
}

// PATCH /api/job-plans/[id]/permits?permitId=xxx - Update permit
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Only managers, admins, and superusers can update permits
    if (!["MANAGER", "ADMIN", "SUPERUSER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only managers and admins can update permits" },
        { status: 403 }
      );
    }

    const { id: jobPlanId } = await params;
    const { searchParams } = new URL(request.url);
    const permitId = searchParams.get("permitId");

    if (!permitId) {
      return NextResponse.json({ error: "Permit ID required" }, { status: 400 });
    }

    // Verify permit exists and belongs to job
    const existingPermit = await prisma.jobPermit.findFirst({
      where: {
        id: permitId,
        jobPlanId,
      },
    });

    if (!existingPermit) {
      return NextResponse.json({ error: "Permit not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = updatePermitSchema.safeParse(body);

    if (!validation.success) {
      const errorMessages = validation.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return NextResponse.json({ error: errorMessages }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (validation.data.isApproved !== undefined) {
      updateData.isApproved = validation.data.isApproved;
    }
    if (validation.data.notes !== undefined) {
      updateData.notes = validation.data.notes;
    }

    const permit = await prisma.jobPermit.update({
      where: { id: permitId },
      data: updateData,
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
    });

    return NextResponse.json(permit);
  } catch (error) {
    console.error("Error updating permit:", error);
    return NextResponse.json(
      { error: "Failed to update permit" },
      { status: 500 }
    );
  }
}

// DELETE /api/job-plans/[id]/permits?permitId=xxx - Remove permit from job
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Only managers, admins, and superusers can delete permits
    if (!["MANAGER", "ADMIN", "SUPERUSER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only managers and admins can remove permits" },
        { status: 403 }
      );
    }

    const { id: jobPlanId } = await params;
    const { searchParams } = new URL(request.url);
    const permitId = searchParams.get("permitId");

    if (!permitId) {
      return NextResponse.json({ error: "Permit ID required" }, { status: 400 });
    }

    // Verify permit exists and belongs to job
    const existingPermit = await prisma.jobPermit.findFirst({
      where: {
        id: permitId,
        jobPlanId,
      },
    });

    if (!existingPermit) {
      return NextResponse.json({ error: "Permit not found" }, { status: 404 });
    }

    // Delete permit (cascades to documents in database)
    // Note: This doesn't delete files from Vercel Blob - consider adding cleanup
    await prisma.jobPermit.delete({
      where: { id: permitId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing permit:", error);
    return NextResponse.json(
      { error: "Failed to remove permit" },
      { status: 500 }
    );
  }
}
