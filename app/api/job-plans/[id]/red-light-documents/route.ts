import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { del } from "@vercel/blob";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

export const dynamic = 'force-dynamic';

// Valid check types for red light documents
const VALID_CHECK_TYPES = ["dot_permit", "row_confirmed", "power_lines", "traffic_control"];

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

// GET /api/job-plans/[id]/red-light-documents - List all red light documents for a job
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
      select: { id: true },
    });

    if (!jobPlan) {
      return NextResponse.json({ error: "Job plan not found" }, { status: 404 });
    }

    // Get all red light documents for this job
    const documents = await prisma.redLightDocument.findMany({
      where: { jobPlanId },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { uploadedAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching red light documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

// POST /api/job-plans/[id]/red-light-documents - Handle client upload
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobPlanId } = await params;
    
    // Check if this is a URL-encoded form with checkType or a blob upload
    const contentType = request.headers.get("content-type") || "";
    
    if (contentType.includes("application/json")) {
      const body = await request.json() as HandleUploadBody & { checkType?: string };
      
      // If it has a type field, it's a blob upload request
      if (body.type) {
        // Get checkType from query params for blob upload
        const { searchParams } = new URL(request.url);
        const checkType = searchParams.get("checkType");
        
        if (!checkType || !VALID_CHECK_TYPES.includes(checkType)) {
          return NextResponse.json(
            { error: "Invalid check type. Must be one of: " + VALID_CHECK_TYPES.join(", ") },
            { status: 400 }
          );
        }

        // Handle the client upload token request
        const jsonResponse = await handleUpload({
          body,
          request,
          onBeforeGenerateToken: async (pathname) => {
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
              throw new Error("Only managers and admins can upload red light documents");
            }

            // Verify job plan exists
            const jobPlan = await prisma.jobPlan.findUnique({
              where: { id: jobPlanId },
              select: { id: true },
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
                checkType,
              }),
            };
          },
          onUploadCompleted: async ({ blob, tokenPayload }) => {
            // Save document metadata to database after successful upload
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
              
              await prisma.redLightDocument.create({
                data: {
                  jobPlanId: payload.jobPlanId,
                  checkType: payload.checkType,
                  fileName: blob.pathname.split('/').pop() || 'document',
                  fileUrl: blob.url,
                  fileType: blob.contentType || 'application/octet-stream',
                  fileSize,
                  uploadedById: payload.userId,
                },
              });
            } catch (error) {
              console.error("Error saving red light document metadata:", error);
              throw new Error("Failed to save document metadata");
            }
          },
        });

        return NextResponse.json(jsonResponse);
      }
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error("Error handling upload:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload document" },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

// DELETE /api/job-plans/[id]/red-light-documents?documentId=xxx - Delete document
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

    // Only managers, admins, and superusers can delete documents
    if (!["MANAGER", "ADMIN", "SUPERUSER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only managers and admins can delete red light documents" },
        { status: 403 }
      );
    }

    const { id: jobPlanId } = await params;
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json({ error: "Document ID required" }, { status: 400 });
    }

    // Verify document exists and belongs to this job plan
    const document = await prisma.redLightDocument.findFirst({
      where: {
        id: documentId,
        jobPlanId,
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Delete from Vercel Blob
    try {
      await del(document.fileUrl);
    } catch (blobError) {
      console.error("Error deleting from blob storage:", blobError);
      // Continue with database deletion even if blob deletion fails
    }

    // Delete from database
    await prisma.redLightDocument.delete({
      where: { id: documentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting red light document:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
