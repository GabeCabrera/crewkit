import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET /api/assembly-categories/[id] - Get a single category with its types
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const category = await prisma.assemblyCategory.findUnique({
      where: { id: params.id },
      include: {
        types: {
          orderBy: [{ order: "asc" }, { name: "asc" }],
          include: {
            _count: {
              select: { assemblies: true },
            },
          },
        },
        _count: {
          select: {
            types: true,
            assemblies: true,
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error("Error fetching assembly category:", error);
    return NextResponse.json(
      { error: "Failed to fetch category" },
      { status: 500 }
    );
  }
}

// PUT /api/assembly-categories/[id] - Update a category
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

    const existing = await prisma.assemblyCategory.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, order } = body;

    // Check for duplicate name (excluding current category)
    if (name && name.trim() !== existing.name) {
      const duplicate = await prisma.assemblyCategory.findUnique({
        where: { name: name.trim() },
      });

      if (duplicate) {
        return NextResponse.json({ error: "A category with this name already exists" }, { status: 400 });
      }
    }

    const category = await prisma.assemblyCategory.update({
      where: { id: params.id },
      data: {
        name: name?.trim() ?? existing.name,
        description: description !== undefined ? (description?.trim() || null) : existing.description,
        order: typeof order === "number" ? order : existing.order,
      },
      include: {
        _count: {
          select: {
            types: true,
            assemblies: true,
          },
        },
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("Error updating assembly category:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

// DELETE /api/assembly-categories/[id] - Delete a category
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

    const existing = await prisma.assemblyCategory.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Check for dependent types
    const typesCount = await prisma.assemblyType.count({
      where: { categoryId: params.id },
    });

    if (typesCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete category: ${typesCount} type(s) exist in this category. Delete or reassign them first.` },
        { status: 400 }
      );
    }

    // Check for dependent assemblies
    const assembliesCount = await prisma.assembly.count({
      where: { categoryId: params.id },
    });

    if (assembliesCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete category: ${assembliesCount} assembly(ies) exist in this category. Delete or reassign them first.` },
        { status: 400 }
      );
    }

    await prisma.assemblyCategory.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting assembly category:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
