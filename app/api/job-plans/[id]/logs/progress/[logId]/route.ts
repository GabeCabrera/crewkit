import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH - Update a progress log
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; logId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers+ can edit
    if (!["MANAGER", "ADMIN", "SUPERUSER"].includes(session.user.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { footage, poles, notes } = body;

    const log = await prisma.dailyProgressLog.update({
      where: { id: params.logId },
      data: {
        footage: footage !== undefined ? footage : undefined,
        poles: poles !== undefined ? poles : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
    });

    // Update job totals
    await updateJobTotals(params.id);

    return NextResponse.json(log);
  } catch (error) {
    console.error("Error updating progress log:", error);
    return NextResponse.json(
      { error: "Failed to update progress log" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a progress log
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; logId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers+ can delete
    if (!["MANAGER", "ADMIN", "SUPERUSER"].includes(session.user.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.dailyProgressLog.delete({
      where: { id: params.logId },
    });

    // Update job totals
    await updateJobTotals(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting progress log:", error);
    return NextResponse.json(
      { error: "Failed to delete progress log" },
      { status: 500 }
    );
  }
}

// Helper function to update job totals
async function updateJobTotals(jobId: string) {
  const logs = await prisma.dailyProgressLog.findMany({
    where: { jobPlanId: jobId },
  });

  const totalFootage = logs.reduce((sum, log) => sum + log.footage, 0);
  const totalPoles = logs.reduce((sum, log) => sum + log.poles, 0);

  await prisma.jobPlan.update({
    where: { id: jobId },
    data: {
      actualFootage: totalFootage,
      actualPolesComplete: totalPoles,
    },
  });
}
