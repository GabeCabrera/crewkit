import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

export const dynamic = 'force-dynamic';

// Validation schema for creating a project area
const createProjectAreaSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  prefix: z.string()
    .min(1, "Prefix is required")
    .max(10, "Prefix too long")
    .regex(/^[A-Z0-9]+$/, "Prefix must be uppercase letters and numbers only")
    .transform(val => val.toUpperCase()),
});

// GET /api/project-areas - List all project areas
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectAreas = await prisma.projectArea.findMany({
      where: { isArchived: false },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { jobPlans: true },
        },
      },
    });

    return NextResponse.json(projectAreas);
  } catch (error) {
    console.error("Error fetching project areas:", error);
    return NextResponse.json(
      { error: "Failed to fetch project areas" },
      { status: 500 }
    );
  }
}

// POST /api/project-areas - Create a new project area
export async function POST(request: NextRequest) {
  const rateLimitResult = writeRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

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

    // Only admins and superusers can create project areas
    if (!["ADMIN", "SUPERUSER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only admins can create project areas" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const result = createProjectAreaSchema.safeParse(body);

    if (!result.success) {
      const errorMessages = result.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return NextResponse.json({ error: errorMessages }, { status: 400 });
    }

    const { name, prefix } = result.data;

    // Check for existing name or prefix
    const existing = await prisma.projectArea.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: "insensitive" } },
          { prefix: prefix },
        ],
      },
    });

    if (existing) {
      if (existing.name.toLowerCase() === name.toLowerCase()) {
        return NextResponse.json(
          { error: "A project area with this name already exists" },
          { status: 400 }
        );
      }
      if (existing.prefix === prefix) {
        return NextResponse.json(
          { error: "A project area with this prefix already exists" },
          { status: 400 }
        );
      }
    }

    const projectArea = await prisma.projectArea.create({
      data: {
        name,
        prefix,
      },
      include: {
        _count: {
          select: { jobPlans: true },
        },
      },
    });

    return NextResponse.json(projectArea, { status: 201 });
  } catch (error) {
    console.error("Error creating project area:", error);
    return NextResponse.json(
      { error: "Failed to create project area" },
      { status: 500 }
    );
  }
}
