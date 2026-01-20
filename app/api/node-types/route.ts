import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/node-types - List all active node types
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const nodeTypes = await prisma.nodeType.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
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

    return NextResponse.json(nodeTypes);
  } catch (error) {
    console.error("Error fetching node types:", error);
    return NextResponse.json(
      { error: "Failed to fetch node types" },
      { status: 500 }
    );
  }
}

// POST /api/node-types - Create a new node type (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can create node types
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPERUSER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, icon, color, assemblyTypeId, order } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Check for existing node type with same name
    const existing = await prisma.nodeType.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Node type with this name already exists" },
        { status: 400 }
      );
    }

    const nodeType = await prisma.nodeType.create({
      data: {
        name,
        icon,
        color,
        assemblyTypeId,
        order: order ?? 0,
      },
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

    return NextResponse.json(nodeType, { status: 201 });
  } catch (error) {
    console.error("Error creating node type:", error);
    return NextResponse.json(
      { error: "Failed to create node type" },
      { status: 500 }
    );
  }
}
