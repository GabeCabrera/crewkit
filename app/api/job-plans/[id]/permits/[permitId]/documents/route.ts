import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { del, handleUpload, type HandleUploadBody } from "@vercel/blob/client";

export const dynamic = 'force-dynamic';

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

// GET /api/job-plans/[id]/permits/[permitId]/documents - List documents for a permit
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; permitId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: jobPlanId, permitId } = await params;

    // Verify permit exists and belongs to job
    const permit = await prisma.jobPermit.findFirst({
      where: {
        id: permitId,
        jobPlanId,
      },
      include: {
        documents: {
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
        },
      },
    });

    if (!permit) {
      return NextResponse.json({ error: "Permit not found" }, { status: 404 });
    }

    return NextResponse.json(permit.documents);
  } catch (error) {
    console.error("Error fetching permit documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

// POST /api/job-plans/[id]/permits/[permitId]/documents - Handle client upload
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; permitId: string }> }
) {
  try {
    const { id: jobPlanId, permitId } = await params;
    const body = await request.json() as HandleUploadBody;

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
          throw new Error("Only managers and admins can upload permit documents");
        }

        // Verify permit exists and belongs to job
        const permit = await prisma.jobPermit.findFirst({
          where: {
            id: permitId,
            jobPlanId,
          },
        });

        if (!permit) {
          throw new Error("Permit not found");
        }

        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_FILE_SIZE,
          tokenPayload: JSON.stringify({
            userId: session.user.id,
            permitId,
            jobPlanId,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Save document metadata to database after successful upload
        try {
          const payload = JSON.parse(tokenPayload || "{}");
          
          await prisma.permitDocument.create({
            data: {
              jobPermitId: payload.permitId,
              fileName: blob.pathname.split('/').pop() || 'document',
              fileUrl: blob.url,
              fileType: blob.contentType || 'application/octet-stream',
              fileSize: blob.size,
              uploadedById: payload.userId,
            },
          });
        } catch (error) {
          console.error("Error saving document metadata:", error);
          throw new Error("Failed to save document metadata");
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("Error handling upload:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload document" },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

// DELETE /api/job-plans/[id]/permits/[permitId]/documents?documentId=xxx - Delete document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; permitId: string }> }
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
        { error: "Only managers and admins can delete permit documents" },
        { status: 403 }
      );
    }

    const { id: jobPlanId, permitId } = await params;
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json({ error: "Document ID required" }, { status: 400 });
    }

    // Verify document exists and belongs to permit
    const document = await prisma.permitDocument.findFirst({
      where: {
        id: documentId,
        jobPermitId: permitId,
        jobPermit: {
          jobPlanId,
        },
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
    await prisma.permitDocument.delete({
      where: { id: documentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting permit document:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
