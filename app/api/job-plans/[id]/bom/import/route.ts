import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeRateLimit } from "@/lib/rate-limit";
import JSZip from "jszip";
import { parseShapefiles, type ParsedBOM } from "@/lib/shapefile-parser";

export const dynamic = 'force-dynamic';

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// POST /api/job-plans/[id]/bom/import - Import BOM from shapefile ZIP
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResult = writeRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check user permissions
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !["MANAGER", "ADMIN", "SUPERUSER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only managers and admins can import BOM" },
        { status: 403 }
      );
    }

    // Check if job plan exists
    const jobPlan = await prisma.jobPlan.findUnique({
      where: { id },
      select: { id: true, jobName: true },
    });

    if (!jobPlan) {
      return NextResponse.json({ error: "Job plan not found" }, { status: 404 });
    }

    // Get the uploaded file
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 50MB" },
        { status: 400 }
      );
    }

    // Check file type (must be ZIP)
    if (!file.name.toLowerCase().endsWith(".zip")) {
      return NextResponse.json(
        { error: "File must be a ZIP archive containing shapefiles" },
        { status: 400 }
      );
    }

    // Read and parse the ZIP file
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Extract shapefile pairs (.shp and .dbf files)
    const shapefilePairs = new Map<string, { shp: ArrayBuffer; dbf: ArrayBuffer }>();
    const fileEntries: Record<string, JSZip.JSZipObject> = {};

    // First, collect all files
    zip.forEach((relativePath, zipEntry) => {
      if (!zipEntry.dir) {
        // Get just the filename without directory path
        const fileName = relativePath.split("/").pop() || relativePath;
        fileEntries[fileName.toLowerCase()] = zipEntry;
      }
    });

    // Find matching .shp and .dbf pairs
    for (const [fileName, entry] of Object.entries(fileEntries)) {
      if (fileName.endsWith(".shp")) {
        const baseName = fileName.slice(0, -4);
        const dbfFileName = baseName + ".dbf";
        const dbfEntry = fileEntries[dbfFileName];

        if (dbfEntry) {
          const shpBuffer = await entry.async("arraybuffer");
          const dbfBuffer = await dbfEntry.async("arraybuffer");
          shapefilePairs.set(baseName, { shp: shpBuffer, dbf: dbfBuffer });
        }
      }
    }

    if (shapefilePairs.size === 0) {
      return NextResponse.json(
        { error: "No valid shapefile pairs found in ZIP. Ensure .shp and .dbf files are present." },
        { status: 400 }
      );
    }

    // Parse the shapefiles
    let parsedBOM: ParsedBOM;
    try {
      parsedBOM = await parseShapefiles(shapefilePairs);
    } catch (parseError) {
      console.error("Shapefile parsing error:", parseError);
      return NextResponse.json(
        { error: "Failed to parse shapefiles. Ensure they are valid GIS files." },
        { status: 400 }
      );
    }

    // Delete existing BOM if present
    await prisma.jobBOM.deleteMany({
      where: { jobPlanId: id },
    });

    // Create new BOM with all data (including sourceFileId for layer management)
    const bom = await prisma.jobBOM.create({
      data: {
        jobPlanId: id,
        importedAt: new Date(),
        sourceFiles: parsedBOM.sourceFiles,
        fiberSegments: {
          create: parsedBOM.fiberSegments.map((seg) => ({
            segmentType: seg.segmentType,
            fiberCount: seg.fiberCount,
            footage: seg.footage,
            cableType: seg.cableType || null,
            description: seg.description || null,
            geometry: seg.geometry || null,
            sourceFileId: seg.sourceFileId || null,
          })),
        },
        infrastructure: {
          create: parsedBOM.infrastructure.map((item) => ({
            itemType: item.itemType,
            quantity: item.quantity,
            specs: item.specs || null,
            label: item.label || null,
            subPhase: item.subPhase || null,
            poleType: item.poleType || null,
            tailFootage: item.tailFootage || null,
            location: item.location || null,
            sourceFileId: item.sourceFileId || null,
          })),
        },
        conduitSegments: {
          create: parsedBOM.conduitSegments.map((seg) => ({
            conduitSize: seg.conduitSize,
            footage: seg.footage,
            conduitType: seg.conduitType || null,
            description: seg.description || null,
            geometry: seg.geometry || null,
            sourceFileId: seg.sourceFileId || null,
          })),
        },
      },
      include: {
        fiberSegments: true,
        infrastructure: true,
        conduitSegments: true,
      },
    });

    // Also update job plan with summary values for quick access
    await prisma.jobPlan.update({
      where: { id },
      data: {
        // Update total distance from BOM
        totalDistance: 
          parsedBOM.summary.totalBackboneFootage + 
          parsedBOM.summary.totalLateralFootage,
        // Update strand footage
        strandFootage: parsedBOM.summary.totalStrandFootage,
        // Update fiber footage (total of all fiber)
        fiberFootage: Object.values(parsedBOM.summary.fiberByCount).reduce((a, b) => a + b, 0),
        // Update pole count
        poleCount: parsedBOM.summary.poleCount,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully imported BOM from ${parsedBOM.sourceFiles.length} shapefiles`,
      bom: {
        id: bom.id,
        importedAt: bom.importedAt,
        sourceFiles: bom.sourceFiles,
        summary: parsedBOM.summary,
        counts: {
          fiberSegments: bom.fiberSegments.length,
          infrastructure: bom.infrastructure.length,
          conduitSegments: bom.conduitSegments.length,
        },
      },
    });
  } catch (error) {
    console.error("Error importing BOM:", error);
    return NextResponse.json(
      { error: "Failed to import BOM" },
      { status: 500 }
    );
  }
}
