import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - List crew hours logs for a job
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const logs = await prisma.crewHoursLog.findMany({
      where: { jobPlanId: params.id },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching hours logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch hours logs" },
      { status: 500 }
    );
  }
}

// POST - Create a new crew hours log
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
    const { date, userId, userName, hours, notes } = body;

    // Create the log
    const log = await prisma.crewHoursLog.create({
      data: {
        jobPlanId: params.id,
        date: new Date(date),
        userId,
        userName,
        hours: hours || 0,
        notes,
        createdById: session.user.id,
      },
    });

    // Update job totals
    await updateJobTotals(params.id);

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error("Error creating hours log:", error);
    return NextResponse.json(
      { error: "Failed to create hours log" },
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
