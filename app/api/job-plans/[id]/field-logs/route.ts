import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getJobFieldLogs, getJobFieldLogsSummary } from "@/lib/field-job-sync";

// GET - Get field logs linked to a job plan
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const summaryOnly = searchParams.get("summary") === "true";

    if (summaryOnly) {
      const summary = await getJobFieldLogsSummary(params.id);
      return NextResponse.json(summary);
    }

    const logs = await getJobFieldLogs(params.id);
    const summary = await getJobFieldLogsSummary(params.id);

    return NextResponse.json({ logs, summary });
  } catch (error) {
    console.error("Error fetching job field logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch field logs" },
      { status: 500 }
    );
  }
}
