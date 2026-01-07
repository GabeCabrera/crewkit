import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { syncFromBoxHero, getSyncStats, SyncResult } from "@/lib/boxhero-sync";

export const dynamic = 'force-dynamic';

/**
 * POST /api/boxhero/sync
 * Trigger a sync from BoxHero to local database
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    console.log(`[API] BoxHero sync triggered by ${session.user.email}`);
    
    const result = await syncFromBoxHero();
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] BoxHero sync error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "Sync failed",
        errors: [String(error)],
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/boxhero/sync
 * Get current sync status and statistics
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const stats = await getSyncStats();
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error("[API] BoxHero sync status error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get sync status" },
      { status: 500 }
    );
  }
}

