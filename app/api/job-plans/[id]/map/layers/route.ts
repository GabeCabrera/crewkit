import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/job-plans/[id]/map/layers - Add a new layer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: jobPlanId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !["MANAGER", "ADMIN", "SUPERUSER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only managers and admins can add map layers" },
        { status: 403 }
      );
    }

    // Verify job plan exists
    const jobPlan = await prisma.jobPlan.findUnique({
      where: { id: jobPlanId },
      select: { id: true },
    });

    if (!jobPlan) {
      return NextResponse.json({ error: "Job plan not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, type, fileUrl, geoJson, bounds, opacity = 1.0, visible = true } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: "Name and type are required" },
        { status: 400 }
      );
    }

    // Get the highest zIndex for this job plan
    const maxZIndexLayer = await prisma.jobMapLayer.findFirst({
      where: { jobPlanId },
      orderBy: { zIndex: "desc" },
      select: { zIndex: true },
    });

    const newZIndex = (maxZIndexLayer?.zIndex ?? -1) + 1;

    const layer = await prisma.jobMapLayer.create({
      data: {
        jobPlanId,
        name,
        type,
        fileUrl,
        geoJson,
        bounds,
        opacity,
        visible,
        zIndex: newZIndex,
      },
    });

    return NextResponse.json({
      id: layer.id,
      name: layer.name,
      type: layer.type,
      fileUrl: layer.fileUrl,
      geoJson: layer.geoJson,
      bounds: layer.bounds,
      opacity: layer.opacity,
      visible: layer.visible,
      zIndex: layer.zIndex,
    });
  } catch (error) {
    console.error("Error adding map layer:", error);
    return NextResponse.json(
      { error: "Failed to add map layer" },
      { status: 500 }
    );
  }
}

// GET /api/job-plans/[id]/map/layers - List all layers
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: jobPlanId } = await params;

    const layers = await prisma.jobMapLayer.findMany({
      where: { jobPlanId },
      orderBy: { zIndex: "asc" },
    });

    return NextResponse.json(
      layers.map((layer) => ({
        id: layer.id,
        name: layer.name,
        type: layer.type,
        fileUrl: layer.fileUrl,
        geoJson: layer.geoJson,
        bounds: layer.bounds,
        opacity: layer.opacity,
        visible: layer.visible,
        zIndex: layer.zIndex,
      }))
    );
  } catch (error) {
    console.error("Error fetching map layers:", error);
    return NextResponse.json(
      { error: "Failed to fetch map layers" },
      { status: 500 }
    );
  }
}
