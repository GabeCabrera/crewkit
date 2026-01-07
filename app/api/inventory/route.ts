import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

/**
 * GET /api/inventory
 * Fetch inventory with pagination and smart filters
 * Query params:
 *   - search: filter by equipment name or SKU
 *   - status: "in_stock" | "low_stock" | "out_of_stock"
 *   - unitType: filter by unit type (e.g., "UNIT", "BOX", "FOOT")
 *   - page: page number (1-indexed, default: 1)
 *   - limit: items per page (default: 20, max: 100)
 *   - all: "true" to fetch all items without pagination
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const unitType = searchParams.get("unitType");
    const fetchAll = searchParams.get("all") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    // Build where clause
    const where: any = {};
    
    // Search filter (equipment name or SKU)
    if (search) {
      where.equipment = {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { sku: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    // Unit type filter
    if (unitType) {
      where.equipment = {
        ...where.equipment,
        unitType: unitType,
      };
    }

    // Stock status filter
    if (status === "out_of_stock") {
      where.quantity = 0;
    } else if (status === "low_stock") {
      where.quantity = { gt: 0, lte: 5 };
    } else if (status === "in_stock") {
      where.quantity = { gt: 5 };
    }

    // Get summary stats (always fetch for the filter counts)
    const [totalItems, lowStockCount, outOfStockCount, inStockCount] = await Promise.all([
      prisma.inventory.count(),
      prisma.inventory.count({ where: { quantity: { gt: 0, lte: 5 } } }),
      prisma.inventory.count({ where: { quantity: 0 } }),
      prisma.inventory.count({ where: { quantity: { gt: 5 } } }),
    ]);

    // Get unique unit types for filter dropdown
    const unitTypes = await prisma.equipment.findMany({
      where: { isArchived: false },
      select: { unitType: true },
      distinct: ["unitType"],
    });

    // Fetch all without pagination
    if (fetchAll) {
      const inventory = await prisma.inventory.findMany({
        where,
        include: {
          equipment: {
            select: {
              id: true,
              name: true,
              sku: true,
              unitType: true,
              photoUrl: true,
            },
          },
        },
        orderBy: {
          equipment: { name: "asc" },
        },
      });

      return NextResponse.json({
        data: inventory,
        summary: {
          total: totalItems,
          inStock: inStockCount,
          lowStock: lowStockCount,
          outOfStock: outOfStockCount,
        },
        unitTypes: unitTypes.map((u) => u.unitType),
      });
    }

    // Paginated query
    const [inventory, filteredCount] = await Promise.all([
      prisma.inventory.findMany({
        where,
        include: {
          equipment: {
            select: {
              id: true,
              name: true,
              sku: true,
              unitType: true,
              photoUrl: true,
            },
          },
        },
        orderBy: {
          equipment: { name: "asc" },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.inventory.count({ where }),
    ]);

    const totalPages = Math.ceil(filteredCount / limit);

    return NextResponse.json({
      data: inventory,
      pagination: {
        page,
        limit,
        totalCount: filteredCount,
        totalPages,
        hasMore: page < totalPages,
      },
      summary: {
        total: totalItems,
        inStock: inStockCount,
        lowStock: lowStockCount,
        outOfStock: outOfStockCount,
      },
      unitTypes: unitTypes.map((u) => u.unitType),
    });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only Admin and Manager can directly modify inventory
    if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
      return NextResponse.json(
        { error: "Only managers and admins can directly modify inventory" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { equipmentId, quantity, type, notes } = body;

    if (!equipmentId || quantity === undefined) {
      return NextResponse.json(
        { error: "Equipment ID and quantity are required" },
        { status: 400 }
      );
    }

    // Get current inventory
    const currentInventory = await prisma.inventory.findUnique({
      where: { equipmentId },
    });

    if (!currentInventory) {
      return NextResponse.json(
        { error: "Equipment inventory not found" },
        { status: 404 }
      );
    }

    // Calculate new quantity based on type
    let newQuantity = currentInventory.quantity;
    if (type === "ADD") {
      newQuantity += Math.abs(quantity);
    } else if (type === "REMOVE" || type === "USED") {
      newQuantity -= Math.abs(quantity);
    } else if (type === "RETURNED") {
      newQuantity += Math.abs(quantity);
    } else {
      newQuantity = quantity; // Direct set
    }

    if (newQuantity < 0) {
      return NextResponse.json(
        { error: "Insufficient inventory" },
        { status: 400 }
      );
    }

    // Update inventory
    const updatedInventory = await prisma.inventory.update({
      where: { equipmentId },
      data: {
        quantity: newQuantity,
      },
      include: {
        equipment: true,
      },
    });

    // Create log entry
    await prisma.equipmentLog.create({
      data: {
        equipmentId,
        userId: session.user.id,
        quantity: type === "ADD" || type === "RETURNED" ? Math.abs(quantity) : -Math.abs(quantity),
        type: type || "ADD",
        notes,
      },
    });

    return NextResponse.json(updatedInventory, { status: 200 });
  } catch (error: any) {
    console.error("Error updating inventory:", error);
    return NextResponse.json(
      { error: "Failed to update inventory" },
      { status: 500 }
    );
  }
}


