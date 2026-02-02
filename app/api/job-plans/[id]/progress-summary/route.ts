import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getJobProgressStats } from "@/lib/field-job-sync";

export const dynamic = 'force-dynamic';

// GET /api/job-plans/[id]/progress-summary - Get completion statistics for a job
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

    const stats = await getJobProgressStats(id);

    if (!stats) {
      return NextResponse.json({
        exists: false,
        message: "No BOM found for this job",
      });
    }

    return NextResponse.json({
      exists: true,
      ...stats,
    });
  } catch (error) {
    console.error("Error fetching progress summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress summary" },
      { status: 500 }
    );
  }
}
