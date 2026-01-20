import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH - Update an issue log
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; logId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers+ can edit
    if (!["MANAGER", "ADMIN", "SUPERUSER"].includes(session.user.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { description, severity, resolved } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};
    
    if (description !== undefined) {
      updateData.description = description;
    }
    
    if (severity !== undefined) {
      if (!["LOW", "MEDIUM", "HIGH"].includes(severity)) {
        return NextResponse.json(
          { error: "Invalid severity level" },
          { status: 400 }
        );
      }
      updateData.severity = severity;
    }
    
    if (resolved !== undefined) {
      updateData.resolved = resolved;
      updateData.resolvedAt = resolved ? new Date() : null;
    }

    const log = await prisma.issueLog.update({
      where: { id: params.logId },
      data: updateData,
    });

    return NextResponse.json(log);
  } catch (error) {
    console.error("Error updating issue log:", error);
    return NextResponse.json(
      { error: "Failed to update issue log" },
      { status: 500 }
    );
  }
}

// DELETE - Delete an issue log
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; logId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers+ can delete
    if (!["MANAGER", "ADMIN", "SUPERUSER"].includes(session.user.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.issueLog.delete({
      where: { id: params.logId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting issue log:", error);
    return NextResponse.json(
      { error: "Failed to delete issue log" },
      { status: 500 }
    );
  }
}
