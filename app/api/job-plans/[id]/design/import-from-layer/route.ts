import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/job-plans/[id]/design/import-from-layer - Import points from a map layer as nodes
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: jobPlanId } = await params;
    const body = await request.json();
    const { layerId, nodeTypeId, namePrefix = "P" } = body;

    if (!layerId) {
      return NextResponse.json(
        { error: "layerId is required" },
        { status: 400 }
      );
    }

    // Verify job exists
    const jobPlan = await prisma.jobPlan.findUnique({
      where: { id: jobPlanId },
      select: { id: true },
    });

    if (!jobPlan) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Get the layer with its GeoJSON
    const layer = await prisma.jobMapLayer.findUnique({
      where: { id: layerId, jobPlanId },
      select: { id: true, geoJson: true, name: true },
    });

    if (!layer) {
      return NextResponse.json({ error: "Layer not found" }, { status: 404 });
    }

    if (!layer.geoJson) {
      return NextResponse.json(
        { error: "Layer has no GeoJSON data" },
        { status: 400 }
      );
    }

    // Get or find the node type (default to "Pole" if not specified)
    let targetNodeTypeId = nodeTypeId;
    if (!targetNodeTypeId) {
      const poleType = await prisma.nodeType.findFirst({
        where: { 
          OR: [
            { name: { contains: "Pole", mode: "insensitive" } },
            { name: { contains: "pole", mode: "insensitive" } },
          ],
          isActive: true,
        },
        select: { id: true },
      });
      
      if (!poleType) {
        // Get the first available node type
        const firstType = await prisma.nodeType.findFirst({
          where: { isActive: true },
          orderBy: { order: "asc" },
          select: { id: true },
        });
        targetNodeTypeId = firstType?.id;
      } else {
        targetNodeTypeId = poleType.id;
      }
    }

    if (!targetNodeTypeId) {
      return NextResponse.json(
        { error: "No node types available" },
        { status: 400 }
      );
    }

    // Parse the GeoJSON and extract Point features
    const geoJson = layer.geoJson as unknown as GeoJSON.FeatureCollection;
    const pointFeatures = (geoJson.features || []).filter(
      (feature) => feature.geometry?.type === "Point"
    );

    if (pointFeatures.length === 0) {
      return NextResponse.json(
        { error: "No point features found in layer" },
        { status: 400 }
      );
    }

    // Get existing nodes count for this job to determine starting number
    const existingNodesCount = await prisma.mapNode.count({
      where: { jobPlanId },
    });

    // Create nodes for each point feature
    const createdNodes = [];
    let nodeNumber = existingNodesCount + 1;

    for (const feature of pointFeatures) {
      const coords = (feature.geometry as GeoJSON.Point).coordinates;
      const lng = coords[0];
      const lat = coords[1];

      // Try to get name from feature properties
      const props = feature.properties || {};
      let nodeName: string;

      // Check common property names for identifiers
      const nameProperty = 
        props.name || 
        props.Name || 
        props.NAME ||
        props.id ||
        props.ID ||
        props.label ||
        props.Label ||
        props.title ||
        props.Title ||
        props.description?.split('\n')[0]?.substring(0, 50) || // First line of description
        null;

      if (nameProperty && typeof nameProperty === "string" && nameProperty.trim()) {
        nodeName = nameProperty.trim();
      } else {
        // Generate sequential name like P-0001
        nodeName = `${namePrefix}-${String(nodeNumber).padStart(4, "0")}`;
      }

      const node = await prisma.mapNode.create({
        data: {
          jobPlanId,
          nodeTypeId: targetNodeTypeId,
          name: nodeName,
          lat,
          lng,
          properties: props as object,
        },
        include: {
          nodeType: {
            select: {
              id: true,
              name: true,
              icon: true,
              color: true,
              assemblyType: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      createdNodes.push(node);
      nodeNumber++;
    }

    return NextResponse.json({
      imported: createdNodes.length,
      nodes: createdNodes,
    });
  } catch (error) {
    console.error("Error importing nodes from layer:", error);
    return NextResponse.json(
      { error: "Failed to import nodes from layer" },
      { status: 500 }
    );
  }
}
