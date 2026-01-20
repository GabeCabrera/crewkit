import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/job-plans/[id]/design/nodes/[nodeId] - Update a node
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: jobPlanId, nodeId } = await params;
    const body = await request.json();
    const { nodeTypeId, name, lat, lng, properties } = body;

    // Verify node exists and belongs to job
    const existingNode = await prisma.mapNode.findFirst({
      where: { id: nodeId, jobPlanId },
    });

    if (!existingNode) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (nodeTypeId !== undefined) updateData.nodeTypeId = nodeTypeId;
    if (name !== undefined) updateData.name = name;
    if (lat !== undefined) updateData.lat = lat;
    if (lng !== undefined) updateData.lng = lng;
    if (properties !== undefined) updateData.properties = properties;

    const node = await prisma.mapNode.update({
      where: { id: nodeId },
      data: updateData,
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

    return NextResponse.json(node);
  } catch (error) {
    console.error("Error updating node:", error);
    return NextResponse.json(
      { error: "Failed to update node" },
      { status: 500 }
    );
  }
}

// DELETE /api/job-plans/[id]/design/nodes/[nodeId] - Delete a node
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: jobPlanId, nodeId } = await params;

    // Verify node exists and belongs to job
    const existingNode = await prisma.mapNode.findFirst({
      where: { id: nodeId, jobPlanId },
    });

    if (!existingNode) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    // Delete node (routes will cascade delete due to schema)
    await prisma.mapNode.delete({
      where: { id: nodeId },
    });

    return NextResponse.json({ message: "Node deleted" });
  } catch (error) {
    console.error("Error deleting node:", error);
    return NextResponse.json(
      { error: "Failed to delete node" },
      { status: 500 }
    );
  }
}
