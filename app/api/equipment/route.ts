import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/equipment
 * Fetch equipment with pagination (filters out archived by default)
 * Query params:
 *   - includeArchived: "true" to include archived items
 *   - search: filter by name, sku, or description
 *   - page: page number (1-indexed, default: 1)
 *   - limit: items per page (default: 10, max: 100)
 *   - all: "true" to fetch all items without pagination (for dropdowns, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get("includeArchived") === "true";
    const search = searchParams.get("search");
    const fetchAll = searchParams.get("all") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));

    const where: any = {};
    
    // Filter out archived unless explicitly requested
    if (!includeArchived) {
      where.isArchived = false;
    }
    
    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // If fetching all (for dropdowns, comboboxes, etc.)
    if (fetchAll) {
      const equipment = await prisma.equipment.findMany({
        where,
        include: {
          inventory: true,
        },
        orderBy: {
          name: "asc",
        },
      });
      return NextResponse.json(equipment);
    }

    // Paginated query
    const [equipment, totalCount] = await Promise.all([
      prisma.equipment.findMany({
        where,
        include: {
          inventory: true,
        },
        orderBy: {
          name: "asc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.equipment.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: equipment,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching equipment:", error);
    return NextResponse.json(
      { error: "Failed to fetch equipment" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/equipment
 * Equipment is now managed via BoxHero sync - manual creation is disabled
 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      error: "Equipment is now managed via BoxHero sync. Please add items in BoxHero and sync to update.",
      hint: "Use POST /api/boxhero/sync to sync equipment from BoxHero"
    },
    { status: 403 }
  );
}
