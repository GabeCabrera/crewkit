import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - List material usage logs for a job
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const logs = await prisma.materialUsageLog.findMany({
      where: { jobPlanId: params.id },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching material logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch material logs" },
      { status: 500 }
    );
  }
}

// POST - Create a new material usage log
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { date, strand, fiber, deadEnds, tangents, anchors, notes } = body;

    // Create the log
    const log = await prisma.materialUsageLog.create({
      data: {
        jobPlanId: params.id,
        date: new Date(date),
        strand,
        fiber,
        deadEnds,
        tangents,
        anchors,
        notes,
        createdById: session.user.id,
      },
    });

    // Update job totals
    await updateJobTotals(params.id);

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error("Error creating material log:", error);
    return NextResponse.json(
      { error: "Failed to create material log" },
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
