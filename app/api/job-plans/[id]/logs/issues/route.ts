import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - List issue logs for a job
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const logs = await prisma.issueLog.findMany({
      where: { jobPlanId: params.id },
      orderBy: [{ resolved: "asc" }, { date: "desc" }],
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching issue logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch issue logs" },
      { status: 500 }
    );
  }
}

// POST - Create a new issue log
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
    const { date, description, severity } = body;

    // Validate severity
    if (!["LOW", "MEDIUM", "HIGH"].includes(severity)) {
      return NextResponse.json(
        { error: "Invalid severity level" },
        { status: 400 }
      );
    }

    // Create the log
    const log = await prisma.issueLog.create({
      data: {
        jobPlanId: params.id,
        date: new Date(date),
        description,
        severity,
        createdById: session.user.id,
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error("Error creating issue log:", error);
    return NextResponse.json(
      { error: "Failed to create issue log" },
      { status: 500 }
    );
  }
}
