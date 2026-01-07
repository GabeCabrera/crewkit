import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

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

    const { id } = params;

    // Find the usage log
    const usageLog = await prisma.assemblyUsageLog.findUnique({
      where: { id },
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
      return NextResponse.json(
        { error: "Usage log not found" },
        { status: 404 }
      );
    }

    // Only the user who created the log or an admin can delete it
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (usageLog.userId !== session.user.id && currentUser?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "You can only delete your own usage logs" },
        { status: 403 }
      );
    }

    // Check if the log is from today (field users can only delete same-day logs)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const logDate = new Date(usageLog.date);
    logDate.setHours(0, 0, 0, 0);

    if (logDate.getTime() !== today.getTime() && currentUser?.role === "FIELD") {
      return NextResponse.json(
        { error: "You can only delete today's usage logs" },
        { status: 403 }
      );
    }

    // Restore inventory for each item in the assembly
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
            type: "ADJUSTED",
            notes: `Restored from deleted usage: ${usageLog.assembly.name}`,
          },
        });
      }
    }

    // Restore inventory for modifiers if any
    if (usageLog.modifiers && Array.isArray(usageLog.modifiers)) {
      for (const modifier of usageLog.modifiers as { equipmentId: string; quantity: number }[]) {
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
              type: "ADJUSTED",
              notes: `Restored from deleted usage modifier`,
            },
          });
        }
      }
    }

    // Delete the usage log
    await prisma.assemblyUsageLog.delete({
      where: { id },
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

