import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTeamSchema, validateRequest } from "@/lib/validations";
import { writeRateLimit } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';

// GET /api/teams - List teams
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, teamId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Admin/Superuser sees all teams, Manager sees only their team
    let teams;
    if (user.role === "ADMIN" || user.role === "SUPERUSER") {
      teams = await prisma.team.findMany({
        include: {
          members: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              members: true,
              reports: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (user.role === "MANAGER" && user.teamId) {
      teams = await prisma.team.findMany({
        where: { id: user.teamId },
        include: {
          members: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              members: true,
              reports: true,
            },
          },
        },
      });
    } else {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json(teams);
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}

// POST /api/teams - Create a new team (Admin only)
export async function POST(request: NextRequest) {
  // Rate limit write operations
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

    if (!user || !["ADMIN", "SUPERUSER"].includes(user.role)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate input
    const validation = validateRequest(createTeamSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { name } = validation.data;

    const team = await prisma.team.create({
      data: {
        name,
        creatorId: session.user.id,
      },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            members: true,
            reports: true,
          },
        },
      },
    });

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    console.error("Error creating team:", error);
    return NextResponse.json(
      { error: "Failed to create team" },
      { status: 500 }
    );
  }
}
