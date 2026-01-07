import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAssemblySchema, validateRequest } from "@/lib/validations";
import { writeRateLimit } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const approved = searchParams.get("approved");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const fetchAll = searchParams.get("all") === "true";

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (approved === "true") {
      where.status = "APPROVED";
    }

    // For dropdown/combobox use cases that need all items
    if (fetchAll) {
      const assemblies = await prisma.assembly.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          categories: true,
          items: {
            select: {
              id: true,
              equipmentId: true,
              quantity: true,
              equipment: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  pricePerUnit: true,
                  unitType: true,
                },
              },
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      return NextResponse.json(assemblies);
    }

    // Paginated query for list views
    const [assemblies, totalCount] = await Promise.all([
      prisma.assembly.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          categories: true,
          createdAt: true,
          items: {
            select: {
              id: true,
              equipmentId: true,
              quantity: true,
              equipment: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  pricePerUnit: true,
                  unitType: true,
                },
              },
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
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.assembly.count({ where }),
    ]);

    return NextResponse.json({
      assemblies,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching assemblies:", error);
    return NextResponse.json(
      { error: "Failed to fetch assemblies" },
      { status: 500 }
    );
  }
}

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
    const validation = validateRequest(createAssemblySchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { name, description, items, categories, status } = validation.data;

    // Determine status based on role
    let assemblyStatus = status || "DRAFT";
    if (session.user.role === "MANAGER" && !status) {
      assemblyStatus = "PENDING_APPROVAL";
    } else if ((session.user.role === "ADMIN" || session.user.role === "SUPERUSER") && !status) {
      assemblyStatus = "APPROVED";
    }

    const assembly = await prisma.assembly.create({
      data: {
        name,
        description,
        status: assemblyStatus,
        categories: categories || [],
        createdById: session.user.id,
        items: {
          create: items.map((item) => ({
            equipmentId: item.equipmentId,
            quantity: item.quantity,
          })),
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        categories: true,
        createdAt: true,
        items: {
          select: {
            id: true,
            equipmentId: true,
            quantity: true,
            equipment: {
              select: {
                id: true,
                name: true,
                sku: true,
                pricePerUnit: true,
                unitType: true,
              },
            },
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

    return NextResponse.json(assembly, { status: 201 });
  } catch (error) {
    console.error("Error creating assembly:", error);
    return NextResponse.json(
      { error: "Failed to create assembly" },
      { status: 500 }
    );
  }
}
