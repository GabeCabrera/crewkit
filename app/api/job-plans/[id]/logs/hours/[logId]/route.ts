import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH - Update a hours log
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
    const { hours, notes } = body;

    const log = await prisma.crewHoursLog.update({
      where: { id: params.logId },
      data: {
        hours: hours !== undefined ? hours : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
    });

    // Update job totals
    await updateJobTotals(params.id);

    return NextResponse.json(log);
  } catch (error) {
    console.error("Error updating hours log:", error);
    return NextResponse.json(
      { error: "Failed to update hours log" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a hours log
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

    await prisma.crewHoursLog.delete({
      where: { id: params.logId },
    });

    // Update job totals
    await updateJobTotals(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting hours log:", error);
    return NextResponse.json(
      { error: "Failed to delete hours log" },
      { status: 500 }
    );
  }
}

// Helper function to update job totals
async function updateJobTotals(jobId: string) {
  const logs = await prisma.crewHoursLog.findMany({
    where: { jobPlanId: jobId },
  });

  const totalHours = logs.reduce((sum, log) => sum + log.hours, 0);

  await prisma.jobPlan.update({
    where: { id: jobId },
    data: {
      totalCrewHours: totalHours,
    },
  });
}
