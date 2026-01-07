import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAssemblyUsageSchema, validateRequest } from "@/lib/validations";
import { writeRateLimit } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Rate limit write operations
  const rateLimitResult = writeRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate input
    const validation = validateRequest(createAssemblyUsageSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { assemblyId, quantity = 1, modifiers } = validation.data;

    // Verify assembly exists and is approved
    const assembly = await prisma.assembly.findUnique({
      where: { id: assemblyId },
      include: {
        items: {
          include: {
            equipment: true,
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

    if (assembly.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Assembly must be approved before use" },
        { status: 400 }
      );
    }

    // Create usage log
    const usageLog = await prisma.assemblyUsageLog.create({
      data: {
        assemblyId,
        userId: session.user.id,
        quantity,
        ...(modifiers && { modifiers }),
      },
    });

    // Update inventory for each item in the assembly
    for (const item of assembly.items) {
      const totalQuantity = item.quantity * quantity;
      
      // Get current inventory
      const inventory = await prisma.inventory.findUnique({
        where: { equipmentId: item.equipmentId },
      });

      if (inventory) {
        const newQuantity = inventory.quantity - totalQuantity;
        if (newQuantity < 0) {
          return NextResponse.json(
            { error: `Insufficient inventory for ${item.equipment.name}` },
            { status: 400 }
          );
        }

        await prisma.inventory.update({
          where: { equipmentId: item.equipmentId },
          data: { quantity: newQuantity },
        });

        // Log the usage
        await prisma.equipmentLog.create({
          data: {
            equipmentId: item.equipmentId,
            userId: session.user.id,
            quantity: -totalQuantity,
            type: "USED",
            notes: `Used in assembly: ${assembly.name}`,
          },
        });
      }
    }

    // Handle modifiers (extra equipment)
    if (modifiers && Array.isArray(modifiers)) {
      for (const modifier of modifiers) {
        const inventory = await prisma.inventory.findUnique({
          where: { equipmentId: modifier.equipmentId },
        });

        if (inventory) {
          const newQuantity = inventory.quantity - modifier.quantity;
          if (newQuantity < 0) {
            return NextResponse.json(
              { error: `Insufficient inventory for modifier equipment` },
              { status: 400 }
            );
          }

          await prisma.inventory.update({
            where: { equipmentId: modifier.equipmentId },
            data: { quantity: newQuantity },
          });

          await prisma.equipmentLog.create({
            data: {
              equipmentId: modifier.equipmentId,
              userId: session.user.id,
              quantity: -modifier.quantity,
              type: "USED",
              notes: `Extra equipment used with assembly: ${assembly.name}`,
            },
          });
        }
      }
    }

    return NextResponse.json(usageLog, { status: 201 });
  } catch (error) {
    console.error("Error logging assembly usage:", error);
    return NextResponse.json(
      { error: "Failed to log assembly usage" },
      { status: 500 }
    );
  }
}
