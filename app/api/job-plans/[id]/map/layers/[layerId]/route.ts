import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { del } from "@vercel/blob";

export const dynamic = "force-dynamic";

// PATCH /api/job-plans/[id]/map/layers/[layerId] - Update a layer
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; layerId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: jobPlanId, layerId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !["MANAGER", "ADMIN", "SUPERUSER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only managers and admins can update map layers" },
        { status: 403 }
      );
    }

    // Verify layer exists and belongs to this job plan
    const existingLayer = await prisma.jobMapLayer.findFirst({
      where: { id: layerId, jobPlanId },
    });

    if (!existingLayer) {
      return NextResponse.json({ error: "Layer not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, opacity, visible, zIndex, bounds, geoJson } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (opacity !== undefined) updateData.opacity = opacity;
    if (visible !== undefined) updateData.visible = visible;
    if (zIndex !== undefined) updateData.zIndex = zIndex;
    if (bounds !== undefined) updateData.bounds = bounds;
    if (geoJson !== undefined) updateData.geoJson = geoJson;

    const layer = await prisma.jobMapLayer.update({
      where: { id: layerId },
      data: updateData,
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
    console.error("Error updating map layer:", error);
    return NextResponse.json(
      { error: "Failed to update map layer" },
      { status: 500 }
    );
  }
}

// DELETE /api/job-plans/[id]/map/layers/[layerId] - Delete a layer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; layerId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: jobPlanId, layerId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !["MANAGER", "ADMIN", "SUPERUSER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only managers and admins can delete map layers" },
        { status: 403 }
      );
    }

    // Verify layer exists and belongs to this job plan
    const existingLayer = await prisma.jobMapLayer.findFirst({
      where: { id: layerId, jobPlanId },
    });

    if (!existingLayer) {
      return NextResponse.json({ error: "Layer not found" }, { status: 404 });
    }

    // Delete the file from Vercel Blob if it exists
    if (existingLayer.fileUrl) {
      try {
        await del(existingLayer.fileUrl);
      } catch (e) {
        console.warn("Failed to delete blob file:", e);
        // Continue with deletion even if blob deletion fails
      }
    }

    await prisma.jobMapLayer.delete({
      where: { id: layerId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting map layer:", error);
    return NextResponse.json(
      { error: "Failed to delete map layer" },
      { status: 500 }
    );
  }
}
