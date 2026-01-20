import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/job-plans/[id]/map - Get map config and layers
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

    const jobPlan = await prisma.jobPlan.findUnique({
      where: { id },
      select: {
        id: true,
        mapCenter: true,
        mapZoom: true,
        measurementData: true,
        totalDistance: true,
        mapLayers: {
          orderBy: { zIndex: "asc" },
        },
      },
    });

    if (!jobPlan) {
      return NextResponse.json({ error: "Job plan not found" }, { status: 404 });
    }

    return NextResponse.json({
      center: jobPlan.mapCenter || { lat: 39.8283, lng: -98.5795 },
      zoom: jobPlan.mapZoom || 4,
      measurementData: jobPlan.measurementData,
      totalDistance: jobPlan.totalDistance,
      layers: jobPlan.mapLayers.map((layer) => ({
        id: layer.id,
        name: layer.name,
        type: layer.type,
        fileUrl: layer.fileUrl,
        geoJson: layer.geoJson,
        bounds: layer.bounds,
        opacity: layer.opacity,
        visible: layer.visible,
        zIndex: layer.zIndex,
      })),
    });
  } catch (error) {
    console.error("Error fetching map config:", error);
    return NextResponse.json(
      { error: "Failed to fetch map config" },
      { status: 500 }
    );
  }
}

// PATCH /api/job-plans/[id]/map - Update map center/zoom
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !["MANAGER", "ADMIN", "SUPERUSER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only managers and admins can update map config" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { center, zoom, measurementData, totalDistance } = body;

    const updateData: Record<string, unknown> = {};
    if (center) updateData.mapCenter = center;
    if (zoom !== undefined) updateData.mapZoom = zoom;
    if (measurementData !== undefined) updateData.measurementData = measurementData;
    if (totalDistance !== undefined) updateData.totalDistance = totalDistance;

    const jobPlan = await prisma.jobPlan.update({
      where: { id },
      data: updateData,
      select: {
        mapCenter: true,
        mapZoom: true,
        measurementData: true,
        totalDistance: true,
      },
    });

    return NextResponse.json({
      center: jobPlan.mapCenter,
      zoom: jobPlan.mapZoom,
      measurementData: jobPlan.measurementData,
      totalDistance: jobPlan.totalDistance,
    });
  } catch (error) {
    console.error("Error updating map config:", error);
    return NextResponse.json(
      { error: "Failed to update map config" },
      { status: 500 }
    );
  }
}
