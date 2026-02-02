import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assembly = await prisma.assembly.findUnique({
      where: { id: params.id },
      include: {
        category: {
          select: { id: true, name: true },
        },
        type: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            equipment: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!assembly) {
      return NextResponse.json(
        { error: "Assembly not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(assembly);
  } catch (error) {
    console.error("Error fetching assembly:", error);
    return NextResponse.json(
      { error: "Failed to fetch assembly" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, status, items, isLegacy } = body;

    // Role-based access control for editing assemblies
    // Admin: Full access to all assemblies
    // Manager: Can edit any assembly and approve/reject
    // Field: Can only edit their own drafts or rejected assemblies
    if (!["ADMIN", "SUPERUSER", "MANAGER"].includes(session.user.role)) {
      // Field users can only edit their own drafts
      const existing = await prisma.assembly.findUnique({
        where: { id: params.id },
      });
      
      if (!existing) {
        return NextResponse.json({ error: "Assembly not found" }, { status: 404 });
      }
      
      if (existing.createdById !== session.user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      
      if (existing.status !== "DRAFT" && existing.status !== "REJECTED") {
        return NextResponse.json(
          { error: "Can only edit draft or rejected assemblies" },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (isLegacy !== undefined) updateData.isLegacy = isLegacy;
    if (body.categories !== undefined) updateData.categories = Array.isArray(body.categories) ? body.categories : [];
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId || null;
    if (body.typeId !== undefined) updateData.typeId = body.typeId || null;

    // If items are provided, delete existing and create new ones
    if (items && Array.isArray(items)) {
      // Delete existing items
      await prisma.assemblyItem.deleteMany({
        where: { assemblyId: params.id },
      });

      // Update assembly with new items
      const assembly = await prisma.assembly.update({
        where: { id: params.id },
        data: {
          ...updateData,
          items: {
            create: items.map((item: any) => ({
              equipmentId: item.equipmentId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          category: {
            select: { id: true, name: true },
          },
          type: {
            select: { id: true, name: true },
          },
          items: {
            include: {
              equipment: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return NextResponse.json(assembly);
    }

    // Update without items
    const assembly = await prisma.assembly.update({
      where: { id: params.id },
      data: updateData,
      include: {
        category: {
          select: { id: true, name: true },
        },
        type: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            equipment: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(assembly);
  } catch (error: any) {
    console.error("Error updating assembly:", error);
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Assembly not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update assembly" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if assembly exists and get related counts
    const existing = await prisma.assembly.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            usageLogs: true,
            jobPlanAssemblies: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Assembly not found" }, { status: 404 });
    }

    // Role-based access control for deleting assemblies
    // Admin: Can delete any assembly
    // Manager: Can delete any assembly
    // Field: Can only delete their own drafts
    if (!["ADMIN", "SUPERUSER", "MANAGER"].includes(session.user.role)) {
      // Field users can only delete their own drafts
      if (existing.createdById !== session.user.id || existing.status !== "DRAFT") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Check if assembly is used in job plans
    if (existing._count.jobPlanAssemblies > 0) {
      return NextResponse.json(
        { 
          error: `Cannot delete: This assembly is used in ${existing._count.jobPlanAssemblies} job plan(s). Remove it from those jobs first.` 
        },
        { status: 400 }
      );
    }

    // Delete related records in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete usage logs first
      if (existing._count.usageLogs > 0) {
        await tx.assemblyUsageLog.deleteMany({
          where: { assemblyId: params.id },
        });
      }

      // Delete the assembly (items are cascade deleted via schema)
      await tx.assembly.delete({
        where: { id: params.id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting assembly:", error);
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Assembly not found" },
        { status: 404 }
      );
    }
    if (error.code === "P2003") {
      return NextResponse.json(
        { error: "Cannot delete: Assembly has related records" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to delete assembly" },
      { status: 500 }
    );
  }
}
