import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

export const dynamic = 'force-dynamic';

// Validation schema for updating a project area
const updateProjectAreaSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  prefix: z.string()
    .min(1)
    .max(10)
    .regex(/^[A-Z0-9]+$/, "Prefix must be uppercase letters and numbers only")
    .transform(val => val.toUpperCase())
    .optional(),
});

// GET /api/project-areas/[id] - Get a single project area
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const projectArea = await prisma.projectArea.findUnique({
      where: { id },
      include: {
        _count: {
          select: { jobPlans: true },
        },
      },
    });

    if (!projectArea) {
      return NextResponse.json({ error: "Project area not found" }, { status: 404 });
    }

    return NextResponse.json(projectArea);
  } catch (error) {
    console.error("Error fetching project area:", error);
    return NextResponse.json(
      { error: "Failed to fetch project area" },
      { status: 500 }
    );
  }
}

// PATCH /api/project-areas/[id] - Update a project area
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Only admins and superusers can update project areas
    if (!["ADMIN", "SUPERUSER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only admins can update project areas" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const result = updateProjectAreaSchema.safeParse(body);

    if (!result.success) {
      const errorMessages = result.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return NextResponse.json({ error: errorMessages }, { status: 400 });
    }

    const existing = await prisma.projectArea.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Project area not found" }, { status: 404 });
    }

    const { name, prefix } = result.data;

    // Check for conflicts with other areas
    if (name || prefix) {
      const orConditions = [];
      if (name) {
        orConditions.push({ name: { equals: name, mode: "insensitive" as const } });
      }
      if (prefix) {
        orConditions.push({ prefix: prefix });
      }

      const conflicts = orConditions.length > 0 
        ? await prisma.projectArea.findFirst({
            where: {
              id: { not: id },
              OR: orConditions,
            },
          })
        : null;

      if (conflicts) {
        if (name && conflicts.name.toLowerCase() === name.toLowerCase()) {
          return NextResponse.json(
            { error: "A project area with this name already exists" },
            { status: 400 }
          );
        }
        if (prefix && conflicts.prefix === prefix) {
          return NextResponse.json(
            { error: "A project area with this prefix already exists" },
            { status: 400 }
          );
        }
      }
    }

    const projectArea = await prisma.projectArea.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(prefix && { prefix }),
      },
      include: {
        _count: {
          select: { jobPlans: true },
        },
      },
    });

    return NextResponse.json(projectArea);
  } catch (error) {
    console.error("Error updating project area:", error);
    return NextResponse.json(
      { error: "Failed to update project area" },
      { status: 500 }
    );
  }
}

// DELETE /api/project-areas/[id] - Archive a project area (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Only admins and superusers can archive project areas
    if (!["ADMIN", "SUPERUSER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only admins can archive project areas" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existing = await prisma.projectArea.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Project area not found" }, { status: 404 });
    }

    // Soft delete by setting isArchived to true
    await prisma.projectArea.update({
      where: { id },
      data: { isArchived: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error archiving project area:", error);
    return NextResponse.json(
      { error: "Failed to archive project area" },
      { status: 500 }
    );
  }
}
