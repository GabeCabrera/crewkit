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
        data: { id: "settings", companyName: "CrewKit" },
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

// PUT /api/settings - Update system settings (SUPERUSER only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only SUPERUSER can update settings
    if (session.user.role !== "SUPERUSER") {
      return NextResponse.json(
        { error: "Only superusers can update system settings" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { companyName } = body;

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

    const settings = await prisma.systemSettings.upsert({
      where: { id: "settings" },
      update: {
        companyName: companyName.trim(),
        updatedById: session.user.id,
      },
      create: {
        id: "settings",
        companyName: companyName.trim(),
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

