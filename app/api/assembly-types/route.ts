import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET /api/assembly-types - List all types (optionally filter by category)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");

    const types = await prisma.assemblyType.findMany({
      where: categoryId ? { categoryId } : undefined,
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            assemblies: true,
          },
        },
      },
    });

    return NextResponse.json(types);
  } catch (error) {
    console.error("Error fetching assembly types:", error);
    return NextResponse.json(
      { error: "Failed to fetch types" },
      { status: 500 }
    );
  }
}

// PUT /api/assembly-types - Bulk reorder types
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !["SUPERUSER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { items } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "Items array is required" }, { status: 400 });
    }

    // Update all types with their new order
    await prisma.$transaction(
      items.map((item: { id: string; order: number }) =>
        prisma.assemblyType.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    );

    // Return updated types
    const types = await prisma.assemblyType.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            assemblies: true,
          },
        },
      },
    });

    return NextResponse.json(types);
  } catch (error) {
    console.error("Error reordering assembly types:", error);
    return NextResponse.json(
      { error: "Failed to reorder types" },
      { status: 500 }
    );
  }
}

// POST /api/assembly-types - Create a new type
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !["SUPERUSER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, categoryId, order } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!categoryId || typeof categoryId !== "string") {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }

    // Verify category exists
    const category = await prisma.assemblyCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Check for duplicate name within same category
    const existing = await prisma.assemblyType.findFirst({
      where: {
        name: name.trim(),
        categoryId,
      },
    });

    if (existing) {
      return NextResponse.json({ error: "A type with this name already exists in this category" }, { status: 400 });
    }

    const type = await prisma.assemblyType.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        categoryId,
        order: typeof order === "number" ? order : 0,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            assemblies: true,
          },
        },
      },
    });

    return NextResponse.json(type);
  } catch (error) {
    console.error("Error creating assembly type:", error);
    return NextResponse.json(
      { error: "Failed to create type" },
      { status: 500 }
    );
  }
}
