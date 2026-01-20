import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH - Update a material log
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

    const log = await prisma.materialUsageLog.update({
      where: { id: params.logId },
      data: {
        strand: body.strand,
        fiber: body.fiber,
        deadEnds: body.deadEnds,
        tangents: body.tangents,
        anchors: body.anchors,
        notes: body.notes,
      },
    });

    // Update job totals
    await updateJobTotals(params.id);

    return NextResponse.json(log);
  } catch (error) {
    console.error("Error updating material log:", error);
    return NextResponse.json(
      { error: "Failed to update material log" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a material log
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

    await prisma.materialUsageLog.delete({
      where: { id: params.logId },
    });

    // Update job totals
    await updateJobTotals(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting material log:", error);
    return NextResponse.json(
      { error: "Failed to delete material log" },
      { status: 500 }
    );
  }
}

// Helper function to update job totals
async function updateJobTotals(jobId: string) {
  const logs = await prisma.materialUsageLog.findMany({
    where: { jobPlanId: jobId },
  });

  const totals = logs.reduce(
    (acc, log) => ({
      strand: acc.strand + (log.strand || 0),
      fiber: acc.fiber + (log.fiber || 0),
      deadEnds: acc.deadEnds + (log.deadEnds || 0),
      tangents: acc.tangents + (log.tangents || 0),
      anchors: acc.anchors + (log.anchors || 0),
    }),
    { strand: 0, fiber: 0, deadEnds: 0, tangents: 0, anchors: 0 }
  );

  await prisma.jobPlan.update({
    where: { id: jobId },
    data: {
      actualStrandUsed: totals.strand,
      actualFiberUsed: totals.fiber,
      actualDeadEnds: totals.deadEnds,
      actualTangents: totals.tangents,
      actualAnchors: totals.anchors,
    },
  });
}
