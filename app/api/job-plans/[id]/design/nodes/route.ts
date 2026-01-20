import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/job-plans/[id]/design/nodes - Create a new node
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: jobPlanId } = await params;
    const body = await request.json();
    const { nodeTypeId, name, lat, lng, properties } = body;

    // Validate required fields
    if (!nodeTypeId || lat === undefined || lng === undefined) {
      return NextResponse.json(
        { error: "nodeTypeId, lat, and lng are required" },
        { status: 400 }
      );
    }

    // Verify job exists and user has access
    const jobPlan = await prisma.jobPlan.findUnique({
      where: { id: jobPlanId },
      select: { id: true, createdById: true },
    });

    if (!jobPlan) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Verify node type exists
    const nodeType = await prisma.nodeType.findUnique({
      where: { id: nodeTypeId },
    });

    if (!nodeType) {
      return NextResponse.json({ error: "Node type not found" }, { status: 404 });
    }

    const node = await prisma.mapNode.create({
      data: {
        jobPlanId,
        nodeTypeId,
        name,
        lat,
        lng,
        properties,
      },
      include: {
        nodeType: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
            assemblyType: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(node, { status: 201 });
  } catch (error) {
    console.error("Error creating node:", error);
    return NextResponse.json(
      { error: "Failed to create node" },
      { status: 500 }
    );
  }
}
