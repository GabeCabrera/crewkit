import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - List progress logs for a job
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const logs = await prisma.dailyProgressLog.findMany({
      where: { jobPlanId: params.id },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching progress logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress logs" },
      { status: 500 }
    );
  }
}

// POST - Create a new progress log
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
    const { date, footage, poles, notes } = body;

    // Create the log
    const log = await prisma.dailyProgressLog.create({
      data: {
        jobPlanId: params.id,
        date: new Date(date),
        footage: footage || 0,
        poles: poles || 0,
        notes,
        createdById: session.user.id,
      },
    });

    // Update job totals
    await updateJobTotals(params.id);

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error("Error creating progress log:", error);
    return NextResponse.json(
      { error: "Failed to create progress log" },
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

  // Get current job to check status
  const job = await prisma.jobPlan.findUnique({
    where: { id: jobId },
  });

  // Determine if status should change
  let newStatus = job?.status;
  if (job?.status === "READY" && (totalFootage > 0 || totalPoles > 0)) {
    newStatus = "IN_PROGRESS";
  }

  await prisma.jobPlan.update({
    where: { id: jobId },
    data: {
      actualFootage: totalFootage,
      actualPolesComplete: totalPoles,
      status: newStatus,
    },
  });
}
