import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// PUT /api/teams/[id]/members - Assign/remove members (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { memberIds } = body;

    if (!Array.isArray(memberIds)) {
      return NextResponse.json({ error: "memberIds must be an array" }, { status: 400 });
    }

    // Verify team exists
    const team = await prisma.team.findUnique({
      where: { id: params.id },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // First, remove all current members from this team
    await prisma.user.updateMany({
      where: { teamId: params.id },
      data: { teamId: null },
    });

    // Then assign new members to this team
    if (memberIds.length > 0) {
      await prisma.user.updateMany({
        where: { id: { in: memberIds } },
        data: { teamId: params.id },
      });
    }

    // Return the updated team
    const updatedTeam = await prisma.team.findUnique({
      where: { id: params.id },
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

    return NextResponse.json(updatedTeam);
  } catch (error) {
    console.error("Error updating team members:", error);
    return NextResponse.json(
      { error: "Failed to update team members" },
      { status: 500 }
    );
  }
}

