import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/node-types/[id] - Get a single node type
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const nodeType = await prisma.nodeType.findUnique({
      where: { id },
      include: {
        assemblyType: {
          select: {
            id: true,
            name: true,
            category: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!nodeType) {
      return NextResponse.json(
        { error: "Node type not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(nodeType);
  } catch (error) {
    console.error("Error fetching node type:", error);
    return NextResponse.json(
      { error: "Failed to fetch node type" },
      { status: 500 }
    );
  }
}

// PATCH /api/node-types/[id] - Update a node type (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can update node types
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPERUSER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, icon, color, assemblyTypeId, order, isActive } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (icon !== undefined) updateData.icon = icon;
    if (color !== undefined) updateData.color = color;
    if (assemblyTypeId !== undefined) updateData.assemblyTypeId = assemblyTypeId;
    if (order !== undefined) updateData.order = order;
    if (isActive !== undefined) updateData.isActive = isActive;

    const nodeType = await prisma.nodeType.update({
      where: { id },
      data: updateData,
      include: {
        assemblyType: {
          select: {
            id: true,
            name: true,
            category: {
              select: { name: true },
            },
          },
        },
      },
    });

    return NextResponse.json(nodeType);
  } catch (error) {
    console.error("Error updating node type:", error);
    return NextResponse.json(
      { error: "Failed to update node type" },
      { status: 500 }
    );
  }
}

// DELETE /api/node-types/[id] - Delete a node type (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can delete node types
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPERUSER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Check if any nodes are using this type
    const nodesUsingType = await prisma.mapNode.count({
      where: { nodeTypeId: id },
    });

    if (nodesUsingType > 0) {
      // Soft delete instead of hard delete
      await prisma.nodeType.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({ 
        message: "Node type deactivated (in use by existing nodes)",
        deactivated: true 
      });
    }

    await prisma.nodeType.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Node type deleted" });
  } catch (error) {
    console.error("Error deleting node type:", error);
    return NextResponse.json(
      { error: "Failed to delete node type" },
      { status: 500 }
    );
  }
}
