import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { put, del } from "@vercel/blob";

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

// POST /api/job-plans/[id]/permits/[permitId]/documents - Upload document
export async function POST(
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

    // Only managers, admins, and superusers can upload documents
    if (!["MANAGER", "ADMIN", "SUPERUSER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only managers and admins can upload permit documents" },
        { status: 403 }
      );
    }

    const { id: jobPlanId, permitId } = await params;

    // Verify permit exists and belongs to job
    const permit = await prisma.jobPermit.findFirst({
      where: {
        id: permitId,
        jobPlanId,
      },
    });

    if (!permit) {
      return NextResponse.json({ error: "Permit not found" }, { status: 404 });
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PDF, JPEG, PNG, GIF, WebP" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB" },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob
    const blob = await put(`permits/${jobPlanId}/${permitId}/${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
    });

    // Save document metadata to database
    const document = await prisma.permitDocument.create({
      data: {
        jobPermitId: permitId,
        fileName: file.name,
        fileUrl: blob.url,
        fileType: file.type,
        fileSize: file.size,
        uploadedById: session.user.id,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Error uploading permit document:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
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
