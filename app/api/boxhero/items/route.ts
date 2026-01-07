import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getNormalizedBoxHeroItems, getBoxHeroLocations } from "@/lib/boxhero";

export const dynamic = 'force-dynamic';

/**
 * GET /api/boxhero/items
 * Fetch items from BoxHero inventory (read-only)
 * Admin-only access
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can access BoxHero data
    if (!["ADMIN", "SUPERUSER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query params for optional location filtering
    const { searchParams } = new URL(request.url);
    const locationIdsParam = searchParams.get("location_ids");
    const locationIds = locationIdsParam 
      ? locationIdsParam.split(",").map(id => parseInt(id, 10)).filter(id => !isNaN(id))
      : undefined;

    // Fetch normalized items from BoxHero
    const items = await getNormalizedBoxHeroItems(locationIds);

    return NextResponse.json({
      items,
      count: items.length,
      source: "boxhero",
    });
  } catch (error) {
    console.error("Error fetching BoxHero items:", error);
    
    // Return helpful error message
    const message = error instanceof Error ? error.message : "Failed to fetch BoxHero items";
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

