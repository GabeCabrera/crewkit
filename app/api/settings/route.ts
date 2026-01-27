import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET /api/settings - Get system settings (public for navbar)
export async function GET() {
  try {
    // Get or create settings
    let settings = await prisma.systemSettings.findUnique({
      where: { id: "settings" },
    });

    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: { 
          id: "settings", 
          companyName: "CrewKit",
          workDays: "[1,2,3,4]", // Mon-Thu default
          shiftHours: 12,
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PUT /api/settings - Update system settings
// companyName: SUPERUSER only
// workDays, shiftHours: ADMIN or SUPERUSER
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperuser = session.user.role === "SUPERUSER";
    const isAdmin = session.user.role === "ADMIN" || isSuperuser;

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Only admins can update system settings" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { companyName, workDays, shiftHours } = body;

    // Build update object based on what's provided and permissions
    const updateData: {
      companyName?: string;
      workDays?: string;
      shiftHours?: number;
      updatedById: string;
    } = {
      updatedById: session.user.id,
    };

    // Company name update (SUPERUSER only)
    if (companyName !== undefined) {
      if (!isSuperuser) {
        return NextResponse.json(
          { error: "Only superusers can update company name" },
          { status: 403 }
        );
      }

      if (!companyName || typeof companyName !== "string") {
        return NextResponse.json(
          { error: "Company name is required" },
          { status: 400 }
        );
      }

      if (companyName.length > 50) {
        return NextResponse.json(
          { error: "Company name must be 50 characters or less" },
          { status: 400 }
        );
      }

      updateData.companyName = companyName.trim();
    }

    // Work days update (ADMIN+)
    if (workDays !== undefined) {
      // Validate JSON array of day numbers
      try {
        const days = typeof workDays === "string" ? JSON.parse(workDays) : workDays;
        if (!Array.isArray(days)) {
          throw new Error("Invalid format");
        }
        // Validate each day is 0-6
        for (const day of days) {
          if (typeof day !== "number" || day < 0 || day > 6) {
            throw new Error("Invalid day value");
          }
        }
        if (days.length === 0) {
          return NextResponse.json(
            { error: "At least one work day must be selected" },
            { status: 400 }
          );
        }
        updateData.workDays = JSON.stringify(days.sort((a: number, b: number) => a - b));
      } catch {
        return NextResponse.json(
          { error: "Invalid work days format" },
          { status: 400 }
        );
      }
    }

    // Shift hours update (ADMIN+)
    if (shiftHours !== undefined) {
      const hours = Number(shiftHours);
      if (isNaN(hours) || hours < 1 || hours > 24) {
        return NextResponse.json(
          { error: "Shift hours must be between 1 and 24" },
          { status: 400 }
        );
      }
      updateData.shiftHours = hours;
    }

    // Must have something to update
    if (Object.keys(updateData).length === 1) {
      // Only updatedById
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const settings = await prisma.systemSettings.upsert({
      where: { id: "settings" },
      update: updateData,
      create: {
        id: "settings",
        companyName: updateData.companyName || "CrewKit",
        workDays: updateData.workDays || "[1,2,3,4]",
        shiftHours: updateData.shiftHours || 12,
        updatedById: session.user.id,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
