import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET /api/assemblies/usage/[id] - Get a single usage log
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const usageLog = await prisma.assemblyUsageLog.findUnique({
      where: { id: params.id },
      include: {
        assembly: {
          include: {
            items: {
              include: {
                equipment: true,
              },
            },
            category: true,
            type: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!usageLog) {
      return NextResponse.json({ error: "Usage log not found" }, { status: 404 });
    }

    // Only allow the user who created it or admins/managers to view
    if (
      usageLog.userId !== session.user.id &&
      !["SUPERUSER", "ADMIN", "MANAGER"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json(usageLog);
  } catch (error) {
    console.error("Error fetching usage log:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage log" },
      { status: 500 }
    );
  }
}

// PUT /api/assemblies/usage/[id] - Update modifiers on a usage log
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const usageLog = await prisma.assemblyUsageLog.findUnique({
      where: { id: params.id },
      include: {
        assembly: {
          include: {
            items: {
              include: {
                equipment: true,
              },
            },
          },
        },
      },
    });

    if (!usageLog) {
      return NextResponse.json({ error: "Usage log not found" }, { status: 404 });
    }

    // Only allow the user who created it or admins/managers to edit
    if (
      usageLog.userId !== session.user.id &&
      !["SUPERUSER", "ADMIN", "MANAGER"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { modifiers } = body;

    // Get old modifiers
    const oldModifiers = (usageLog.modifiers as any[]) || [];

    // Reverse old modifier inventory changes
    for (const oldMod of oldModifiers) {
      if (oldMod.equipmentId && oldMod.quantity > 0) {
        const inventory = await prisma.inventory.findUnique({
          where: { equipmentId: oldMod.equipmentId },
        });
        
        if (inventory) {
          await prisma.inventory.update({
            where: { equipmentId: oldMod.equipmentId },
            data: { quantity: inventory.quantity + oldMod.quantity },
          });
        }
      }
    }

    // Apply new modifier inventory changes
    if (modifiers && Array.isArray(modifiers)) {
      for (const modifier of modifiers) {
        if (modifier.equipmentId && modifier.quantity > 0) {
          const inventory = await prisma.inventory.findUnique({
            where: { equipmentId: modifier.equipmentId },
          });

          if (inventory) {
            const newQuantity = inventory.quantity - modifier.quantity;
            if (newQuantity < 0) {
              // Rollback: restore old modifiers
              for (const oldMod of oldModifiers) {
                if (oldMod.equipmentId && oldMod.quantity > 0) {
                  const inv = await prisma.inventory.findUnique({
                    where: { equipmentId: oldMod.equipmentId },
                  });
                  if (inv) {
                    await prisma.inventory.update({
                      where: { equipmentId: oldMod.equipmentId },
                      data: { quantity: inv.quantity - oldMod.quantity },
                    });
                  }
                }
              }
              return NextResponse.json(
                { error: "Insufficient inventory for modifier equipment" },
                { status: 400 }
              );
            }

            await prisma.inventory.update({
              where: { equipmentId: modifier.equipmentId },
              data: { quantity: newQuantity },
            });
          }
        }
      }
    }

    // Update the usage log
    const updatedLog = await prisma.assemblyUsageLog.update({
      where: { id: params.id },
      data: {
        modifiers: modifiers || null,
      },
      include: {
        assembly: {
          include: {
            items: {
              include: {
                equipment: true,
              },
            },
            category: true,
            type: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(updatedLog);
  } catch (error) {
    console.error("Error updating usage log:", error);
    return NextResponse.json(
      { error: "Failed to update usage log" },
      { status: 500 }
    );
  }
}

// DELETE /api/assemblies/usage/[id] - Delete a usage log and restore inventory
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const usageLog = await prisma.assemblyUsageLog.findUnique({
      where: { id: params.id },
      include: {
        assembly: {
          include: {
            items: {
              include: {
                equipment: true,
              },
            },
          },
        },
      },
    });

    if (!usageLog) {
      return NextResponse.json({ error: "Usage log not found" }, { status: 404 });
    }

    // Only allow the user who created it or admins/managers to delete
    if (
      usageLog.userId !== session.user.id &&
      !["SUPERUSER", "ADMIN", "MANAGER"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Restore inventory for assembly items
    for (const item of usageLog.assembly.items) {
      const totalQuantity = item.quantity * usageLog.quantity;
      
      const inventory = await prisma.inventory.findUnique({
        where: { equipmentId: item.equipmentId },
      });

      if (inventory) {
        await prisma.inventory.update({
          where: { equipmentId: item.equipmentId },
          data: { quantity: inventory.quantity + totalQuantity },
        });

        // Log the restoration
        await prisma.equipmentLog.create({
          data: {
            equipmentId: item.equipmentId,
            userId: session.user.id,
            quantity: totalQuantity,
            type: "RETURNED",
            notes: `Restored from deleted usage: ${usageLog.assembly.name}`,
          },
        });
      }
    }

    // Restore inventory for modifiers
    const modifiers = (usageLog.modifiers as any[]) || [];
    for (const modifier of modifiers) {
      if (modifier.equipmentId && modifier.quantity > 0) {
        const inventory = await prisma.inventory.findUnique({
          where: { equipmentId: modifier.equipmentId },
        });

        if (inventory) {
          await prisma.inventory.update({
            where: { equipmentId: modifier.equipmentId },
            data: { quantity: inventory.quantity + modifier.quantity },
          });

          await prisma.equipmentLog.create({
            data: {
              equipmentId: modifier.equipmentId,
              userId: session.user.id,
              quantity: modifier.quantity,
              type: "RETURNED",
              notes: `Restored modifier from deleted usage: ${usageLog.assembly.name}`,
            },
          });
        }
      }
    }

    // Delete the usage log
    await prisma.assemblyUsageLog.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting usage log:", error);
    return NextResponse.json(
      { error: "Failed to delete usage log" },
      { status: 500 }
    );
  }
}
