import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const createPermitTypeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().max(500, "Description too long").optional().nullable(),
});

// GET /api/permit-types - List all permit types
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get("includeArchived") === "true";

    const permitTypes = await prisma.permitType.findMany({
      where: includeArchived ? {} : { isArchived: false },
      orderBy: [
        { isDefault: "desc" }, // Defaults first
        { name: "asc" },
      ],
    });

    return NextResponse.json(permitTypes);
  } catch (error) {
    console.error("Error fetching permit types:", error);
    return NextResponse.json(
      { error: "Failed to fetch permit types" },
      { status: 500 }
    );
  }
}

// POST /api/permit-types - Create custom permit type
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only managers, admins, and superusers can create permit types
    if (!["MANAGER", "ADMIN", "SUPERUSER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only managers and admins can create permit types" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = createPermitTypeSchema.safeParse(body);

    if (!validation.success) {
      const errorMessages = validation.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return NextResponse.json({ error: errorMessages }, { status: 400 });
    }

    const { name, description } = validation.data;

    // Check if name already exists
    const existing = await prisma.permitType.findUnique({
      where: { name },
    });

    if (existing) {
      // If archived, unarchive it
      if (existing.isArchived) {
        const unarchived = await prisma.permitType.update({
          where: { id: existing.id },
          data: { isArchived: false, description: description || existing.description },
        });
        return NextResponse.json(unarchived);
      }
      return NextResponse.json(
        { error: "A permit type with this name already exists" },
        { status: 400 }
      );
    }

    const permitType = await prisma.permitType.create({
      data: {
        name,
        description,
        isDefault: false,
      },
    });

    return NextResponse.json(permitType, { status: 201 });
  } catch (error) {
    console.error("Error creating permit type:", error);
    return NextResponse.json(
      { error: "Failed to create permit type" },
      { status: 500 }
    );
  }
}
