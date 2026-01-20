import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 20902231; // Earth's radius in feet
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Apply sag/slack calculation to straight-line distance
function calculateCableFootage(
  straightLineDistance: number,
  spanCount: number = 1,
  sagPercentage: number = 3,
  slackLoopFootage: number = 0,
  spliceSlack: number = 0
): number {
  // Sag adds ~3% per span typically
  const sagMultiplier = 1 + sagPercentage / 100;
  const distanceWithSag = straightLineDistance * sagMultiplier;
  
  // Add slack loops and splice slack
  const totalFootage = distanceWithSag + slackLoopFootage + spliceSlack;
  
  return Math.ceil(totalFootage);
}

// POST /api/job-plans/[id]/design/routes - Create a new route
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
    const { 
      fromNodeId, 
      toNodeId, 
      routeType, 
      fiberCount, 
      footage: manualFootage,
      sagPercentage,
      slackLoopFootage,
      spliceSlack,
    } = body;

    // Validate required fields
    if (!fromNodeId || !toNodeId || !routeType) {
      return NextResponse.json(
        { error: "fromNodeId, toNodeId, and routeType are required" },
        { status: 400 }
      );
    }

    // Validate route type
    const validRouteTypes = ["strand_only", "fiber", "mst"];
    if (!validRouteTypes.includes(routeType)) {
      return NextResponse.json(
        { error: "Invalid route type. Must be: strand_only, fiber, or mst" },
        { status: 400 }
      );
    }

    // Validate fiber count for fiber/mst routes
    if ((routeType === "fiber" || routeType === "mst") && !fiberCount) {
      return NextResponse.json(
        { error: "fiberCount is required for fiber and mst routes" },
        { status: 400 }
      );
    }

    const validFiberCounts = [12, 24, 48, 96, 144, 288];
    if (fiberCount && !validFiberCounts.includes(fiberCount)) {
      return NextResponse.json(
        { error: "Invalid fiber count. Must be: 12, 24, 48, 96, 144, or 288" },
        { status: 400 }
      );
    }

    // Verify both nodes exist and belong to the job
    const [fromNode, toNode] = await Promise.all([
      prisma.mapNode.findFirst({ where: { id: fromNodeId, jobPlanId } }),
      prisma.mapNode.findFirst({ where: { id: toNodeId, jobPlanId } }),
    ]);

    if (!fromNode) {
      return NextResponse.json({ error: "From node not found" }, { status: 404 });
    }
    if (!toNode) {
      return NextResponse.json({ error: "To node not found" }, { status: 404 });
    }

    // Calculate footage if not manually provided
    let footage = manualFootage;
    if (!footage) {
      const straightLine = calculateDistance(
        fromNode.lat,
        fromNode.lng,
        toNode.lat,
        toNode.lng
      );
      footage = calculateCableFootage(
        straightLine,
        1,
        sagPercentage ?? 3,
        slackLoopFootage ?? 0,
        spliceSlack ?? 0
      );
    }

    const route = await prisma.mapRoute.create({
      data: {
        jobPlanId,
        fromNodeId,
        toNodeId,
        routeType,
        fiberCount: routeType === "strand_only" ? null : fiberCount,
        footage,
      },
      include: {
        fromNode: {
          select: {
            id: true,
            name: true,
            lat: true,
            lng: true,
            nodeType: {
              select: { name: true, icon: true, color: true },
            },
          },
        },
        toNode: {
          select: {
            id: true,
            name: true,
            lat: true,
            lng: true,
            nodeType: {
              select: { name: true, icon: true, color: true },
            },
          },
        },
      },
    });

    return NextResponse.json(route, { status: 201 });
  } catch (error) {
    console.error("Error creating route:", error);
    return NextResponse.json(
      { error: "Failed to create route" },
      { status: 500 }
    );
  }
}
