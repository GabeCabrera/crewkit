import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBoxHeroLocations } from "@/lib/boxhero";

export const dynamic = 'force-dynamic';

/**
 * GET /api/boxhero/locations
 * Fetch locations from BoxHero (read-only)
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

    const locations = await getBoxHeroLocations();

    return NextResponse.json({
      locations,
      count: locations.length,
    });
  } catch (error) {
    console.error("Error fetching BoxHero locations:", error);
    
    const message = error instanceof Error ? error.message : "Failed to fetch BoxHero locations";
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

