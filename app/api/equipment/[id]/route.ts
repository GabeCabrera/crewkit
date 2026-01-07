import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/equipment/[id]
 * Fetch a single equipment item
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const equipment = await prisma.equipment.findUnique({
      where: { id: params.id },
      include: {
        inventory: true,
      },
    });

    if (!equipment) {
      return NextResponse.json(
        { error: "Equipment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(equipment);
  } catch (error) {
    console.error("Error fetching equipment:", error);
    return NextResponse.json(
      { error: "Failed to fetch equipment" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/equipment/[id]
 * Equipment is now managed via BoxHero sync - manual editing is disabled
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json(
    { 
      error: "Equipment is now managed via BoxHero sync. Please edit items in BoxHero and sync to update.",
      hint: "Use POST /api/boxhero/sync to sync equipment from BoxHero"
    },
    { status: 403 }
  );
}

/**
 * DELETE /api/equipment/[id]
 * Equipment is now managed via BoxHero sync - manual deletion is disabled
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json(
    { 
      error: "Equipment is now managed via BoxHero sync. Please remove items in BoxHero and sync to update.",
      hint: "Use POST /api/boxhero/sync to sync equipment from BoxHero"
    },
    { status: 403 }
  );
}
