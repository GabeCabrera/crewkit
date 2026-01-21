import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { del } from "@vercel/blob";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

export const dynamic = 'force-dynamic';

// Max file size: 25MB (construction prints can be large)
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

// GET /api/job-plans/[id]/prints - List construction prints for a job
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

    // Verify job exists
    const jobPlan = await prisma.jobPlan.findUnique({
      where: { id: jobPlanId },
      select: {
        id: true,
        constructionPrints: {
          orderBy: { uploadedAt: "desc" },
        },
      },
    });

    if (!jobPlan) {
      return NextResponse.json({ error: "Job plan not found" }, { status: 404 });
    }

    return NextResponse.json(jobPlan.constructionPrints);
  } catch (error) {
    console.error("Error fetching construction prints:", error);
    return NextResponse.json(
      { error: "Failed to fetch construction prints" },
      { status: 500 }
    );
  }
}

// POST /api/job-plans/[id]/prints - Handle client upload for construction prints
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobPlanId } = await params;
    const body = await request.json() as HandleUploadBody;

    // Handle the client upload token request
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        // Authenticate user
        const session = await getServerSession(authOptions);
        if (!session) {
          throw new Error("Unauthorized");
        }

        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { role: true },
        });

        if (!user || !["MANAGER", "ADMIN", "SUPERUSER"].includes(user.role)) {
          throw new Error("Only managers and admins can upload construction prints");
        }

        // Verify job plan exists
        const jobPlan = await prisma.jobPlan.findUnique({
          where: { id: jobPlanId },
        });

        if (!jobPlan) {
          throw new Error("Job plan not found");
        }

        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_FILE_SIZE,
          tokenPayload: JSON.stringify({
            userId: session.user.id,
            jobPlanId,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Save print metadata to database after successful upload
        try {
          const payload = JSON.parse(tokenPayload || "{}");
          
          // Get file size from blob URL via HEAD request
          let fileSize = 0;
          try {
            const headResponse = await fetch(blob.url, { method: 'HEAD' });
            const contentLength = headResponse.headers.get('content-length');
            if (contentLength) {
              fileSize = parseInt(contentLength, 10);
            }
          } catch {
            // If we can't get the size, default to 0
          }
          
          await prisma.constructionPrint.create({
            data: {
              jobPlanId: payload.jobPlanId,
              fileName: blob.pathname.split('/').pop() || 'construction-print',
              fileUrl: blob.url,
              fileType: blob.contentType || 'application/octet-stream',
              fileSize,
              uploadedById: payload.userId,
            },
          });
        } catch (error) {
          console.error("Error saving construction print metadata:", error);
          throw new Error("Failed to save construction print metadata");
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("Error handling upload:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload construction print" },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

// DELETE /api/job-plans/[id]/prints?printId=xxx - Delete construction print
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only managers, admins, and superusers can delete prints
    if (!["MANAGER", "ADMIN", "SUPERUSER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only managers and admins can delete construction prints" },
        { status: 403 }
      );
    }

    const { id: jobPlanId } = await params;
    const { searchParams } = new URL(request.url);
    const printId = searchParams.get("printId");

    if (!printId) {
      return NextResponse.json({ error: "Print ID required" }, { status: 400 });
    }

    // Verify print exists and belongs to job
    const print = await prisma.constructionPrint.findFirst({
      where: {
        id: printId,
        jobPlanId,
      },
    });

    if (!print) {
      return NextResponse.json({ error: "Construction print not found" }, { status: 404 });
    }

    // Delete from Vercel Blob
    try {
      await del(print.fileUrl);
    } catch (blobError) {
      console.error("Error deleting from blob storage:", blobError);
      // Continue with database deletion even if blob deletion fails
    }

    // Delete from database
    await prisma.constructionPrint.delete({
      where: { id: printId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting construction print:", error);
    return NextResponse.json(
      { error: "Failed to delete construction print" },
      { status: 500 }
    );
  }
}
