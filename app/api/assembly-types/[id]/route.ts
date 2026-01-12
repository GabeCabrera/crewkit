import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET /api/assembly-types/[id] - Get a single type with its assemblies
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const type = await prisma.assemblyType.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        assemblies: {
          where: { status: "APPROVED" },
          orderBy: { name: "asc" },
          include: {
            items: {
              include: {
                equipment: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            assemblies: true,
          },
        },
      },
    });

    if (!type) {
      return NextResponse.json({ error: "Type not found" }, { status: 404 });
    }

    return NextResponse.json(type);
  } catch (error) {
    console.error("Error fetching assembly type:", error);
    return NextResponse.json(
      { error: "Failed to fetch type" },
      { status: 500 }
    );
  }
}

// PUT /api/assembly-types/[id] - Update a type
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const existing = await prisma.assemblyType.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Type not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, categoryId, order } = body;

    // If changing category, verify it exists
    if (categoryId && categoryId !== existing.categoryId) {
      const category = await prisma.assemblyCategory.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        return NextResponse.json({ error: "Category not found" }, { status: 404 });
      }
    }

    const targetCategoryId = categoryId || existing.categoryId;

    // Check for duplicate name in target category (excluding current type)
    if (name && (name.trim() !== existing.name || categoryId !== existing.categoryId)) {
      const duplicate = await prisma.assemblyType.findFirst({
        where: {
          name: name.trim(),
          categoryId: targetCategoryId,
          NOT: { id: params.id },
        },
      });

      if (duplicate) {
        return NextResponse.json({ error: "A type with this name already exists in this category" }, { status: 400 });
      }
    }

    const type = await prisma.assemblyType.update({
      where: { id: params.id },
      data: {
        name: name?.trim() ?? existing.name,
        description: description !== undefined ? (description?.trim() || null) : existing.description,
        categoryId: targetCategoryId,
        order: typeof order === "number" ? order : existing.order,
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
    console.error("Error updating assembly type:", error);
    return NextResponse.json(
      { error: "Failed to update type" },
      { status: 500 }
    );
  }
}

// DELETE /api/assembly-types/[id] - Delete a type
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const existing = await prisma.assemblyType.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Type not found" }, { status: 404 });
    }

    // Check for dependent assemblies
    const assembliesCount = await prisma.assembly.count({
      where: { typeId: params.id },
    });

    if (assembliesCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete type: ${assembliesCount} assembly(ies) use this type. Delete or reassign them first.` },
        { status: 400 }
      );
    }

    await prisma.assemblyType.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting assembly type:", error);
    return NextResponse.json(
      { error: "Failed to delete type" },
      { status: 500 }
    );
  }
}
