import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

// Helper to check if user has admin-level access
function hasAdminAccess(role: string): boolean {
  return role === "SUPERUSER" || role === "ADMIN";
}

// GET /api/users/[id] - Get a single user
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!currentUser || !hasAdminAccess(currentUser.role)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        teamId: true,
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - Update a user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!currentUser || !hasAdminAccess(currentUser.role)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get the target user to check their role
    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
      select: { role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // SUPERUSER protection: only SUPERUSER can edit SUPERUSER accounts
    if (targetUser.role === "SUPERUSER" && currentUser.role !== "SUPERUSER") {
      return NextResponse.json(
        { error: "Only superusers can modify superuser accounts" },
        { status: 403 }
      );
    }

    // ADMIN protection: regular ADMINs cannot edit other ADMINs
    if (targetUser.role === "ADMIN" && currentUser.role === "ADMIN" && params.id !== session.user.id) {
      return NextResponse.json(
        { error: "Admins cannot modify other admin accounts" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, role, teamId, password } = body;

    // Prevent role escalation
    if (role === "SUPERUSER" && currentUser.role !== "SUPERUSER") {
      return NextResponse.json(
        { error: "Only superusers can assign superuser role" },
        { status: 403 }
      );
    }

    // Regular ADMIN cannot promote users to ADMIN
    if (role === "ADMIN" && currentUser.role !== "SUPERUSER") {
      return NextResponse.json(
        { error: "Only superusers can assign admin role" },
        { status: 403 }
      );
    }

    // Build update data
    const updateData: {
      name?: string;
      email?: string;
      role?: "SUPERUSER" | "ADMIN" | "MANAGER" | "FIELD";
      teamId?: string | null;
      password?: string;
    } = {};

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (teamId !== undefined) updateData.teamId = teamId || null;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        teamId: true,
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!currentUser || !hasAdminAccess(currentUser.role)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Prevent deleting yourself
    if (params.id === session.user.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    // Get the target user to check their role
    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
      select: { role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // SUPERUSER protection: only SUPERUSER can delete SUPERUSER accounts
    if (targetUser.role === "SUPERUSER" && currentUser.role !== "SUPERUSER") {
      return NextResponse.json(
        { error: "Only superusers can delete superuser accounts" },
        { status: 403 }
      );
    }

    // ADMIN protection: regular ADMINs cannot delete other ADMINs
    if (targetUser.role === "ADMIN" && currentUser.role === "ADMIN") {
      return NextResponse.json(
        { error: "Admins cannot delete other admin accounts" },
        { status: 403 }
      );
    }

    // Delete related records first to avoid foreign key constraints
    // Delete assembly usage logs
    await prisma.assemblyUsageLog.deleteMany({
      where: { userId: params.id },
    });

    // Delete equipment logs
    await prisma.equipmentLog.deleteMany({
      where: { userId: params.id },
    });

    // Delete assemblies created by this user (and their items will cascade)
    await prisma.assembly.deleteMany({
      where: { createdById: params.id },
    });

    // Reassign teams created by this user to the current admin, or delete if no members
    const teamsCreated = await prisma.team.findMany({
      where: { creatorId: params.id },
      include: { _count: { select: { members: true } } },
    });

    for (const team of teamsCreated) {
      if (team._count.members === 0) {
        await prisma.team.delete({ where: { id: team.id } });
      } else {
        // Reassign to current user
        await prisma.team.update({
          where: { id: team.id },
          data: { creatorId: session.user.id },
        });
      }
    }

    // Delete EOD reports created by this user
    await prisma.endOfDayReport.deleteMany({
      where: { createdById: params.id },
    });

    // Now delete the user
    await prisma.user.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
