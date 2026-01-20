import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import JSZip from "jszip";
import { kml as kmlToGeoJSON } from "@tmcw/togeojson";
import { DOMParser } from "@xmldom/xmldom";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

interface GroundOverlay {
  name: string;
  href: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

// POST /api/job-plans/[id]/map/upload - Upload KMZ/KML/Image files
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: jobPlanId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !["MANAGER", "ADMIN", "SUPERUSER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only managers and admins can upload map files" },
        { status: 403 }
      );
    }

    // Verify job plan exists
    const jobPlan = await prisma.jobPlan.findUnique({
      where: { id: jobPlanId },
      select: { id: true },
    });

    if (!jobPlan) {
      return NextResponse.json({ error: "Job plan not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const fileType = formData.get("type") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const createdLayers: Array<{
      id: string;
      name: string;
      type: string;
      fileUrl: string | null;
      geoJson: Prisma.JsonValue | null;
      bounds: Prisma.JsonValue | null;
      opacity: number;
      visible: boolean;
      zIndex: number;
    }> = [];

    // Get the highest zIndex for this job plan
    const maxZIndexLayer = await prisma.jobMapLayer.findFirst({
      where: { jobPlanId },
      orderBy: { zIndex: "desc" },
      select: { zIndex: true },
    });

    let currentZIndex = (maxZIndexLayer?.zIndex ?? -1) + 1;

    // Handle image overlay upload
    if (fileType === "image_overlay" || fileName.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
      // Upload image to Vercel Blob
      const blob = await put(`map-overlays/${jobPlanId}/${file.name}`, file, {
        access: "public",
      });

      // Create layer with placeholder bounds (user will need to set them)
      const layer = await prisma.jobMapLayer.create({
        data: {
          jobPlanId,
          name: file.name.replace(/\.[^/.]+$/, ""),
          type: "image_overlay",
          fileUrl: blob.url,
          opacity: 0.7,
          visible: true,
          zIndex: currentZIndex,
        },
      });

      return NextResponse.json({
        id: layer.id,
        name: layer.name,
        type: layer.type,
        fileUrl: layer.fileUrl,
        geoJson: layer.geoJson,
        bounds: layer.bounds,
        opacity: layer.opacity,
        visible: layer.visible,
        zIndex: layer.zIndex,
      });
    }

    // Handle KMZ file
    if (fileName.endsWith(".kmz")) {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);

      // Find the KML file inside the KMZ
      let kmlFileContent: string | null = null;

      const kmlFileNames = Object.keys(zip.files).filter(
        (name) => name.toLowerCase().endsWith(".kml") && !zip.files[name].dir
      );

      if (kmlFileNames.length > 0) {
        const kmlFile = zip.files[kmlFileNames[0]];
        kmlFileContent = await kmlFile.async("text");
      }

      if (!kmlFileContent) {
        return NextResponse.json(
          { error: "No KML file found in KMZ archive" },
          { status: 400 }
        );
      }

      const { geoJson, name, groundOverlays } = parseKML(kmlFileContent, file.name);

      // Upload the original KMZ file for reference
      const kmzBlob = await put(`map-layers/${jobPlanId}/${file.name}`, file, {
        access: "public",
      });

      // Create main GeoJSON layer
      if (geoJson.features && geoJson.features.length > 0) {
        const layer = await prisma.jobMapLayer.create({
          data: {
            jobPlanId,
            name: name || file.name.replace(/\.[^/.]+$/, ""),
            type: "kmz",
            fileUrl: kmzBlob.url,
            geoJson: geoJson as unknown as Prisma.InputJsonValue,
            opacity: 1.0,
            visible: true,
            zIndex: currentZIndex++,
          },
        });

        createdLayers.push({
          id: layer.id,
          name: layer.name,
          type: layer.type,
          fileUrl: layer.fileUrl,
          geoJson: layer.geoJson,
          bounds: layer.bounds,
          opacity: layer.opacity,
          visible: layer.visible,
          zIndex: layer.zIndex,
        });
      }

      // Handle ground overlays (images embedded in KMZ)
      for (const overlay of groundOverlays) {
        if (overlay.href && !overlay.href.startsWith("http")) {
          const imagePath = overlay.href.replace(/^\//, "");
          const imageFile = zip.files[imagePath];

          if (imageFile) {
            const imageBlob = await imageFile.async("blob");
            const imageBuffer = await imageBlob.arrayBuffer();

            // Upload the embedded image
            const uploadedBlob = await put(
              `map-overlays/${jobPlanId}/${overlay.name || "overlay"}.png`,
              new Blob([imageBuffer]),
              { access: "public" }
            );

            const bounds: [[number, number], [number, number]] = [
              [overlay.bounds.south, overlay.bounds.west],
              [overlay.bounds.north, overlay.bounds.east],
            ];

            const overlayLayer = await prisma.jobMapLayer.create({
              data: {
                jobPlanId,
                name: overlay.name || "Ground Overlay",
                type: "image_overlay",
                fileUrl: uploadedBlob.url,
                bounds: bounds as Prisma.InputJsonValue,
                opacity: 0.7,
                visible: true,
                zIndex: currentZIndex++,
              },
            });

            createdLayers.push({
              id: overlayLayer.id,
              name: overlayLayer.name,
              type: overlayLayer.type,
              fileUrl: overlayLayer.fileUrl,
              geoJson: overlayLayer.geoJson,
              bounds: overlayLayer.bounds,
              opacity: overlayLayer.opacity,
              visible: overlayLayer.visible,
              zIndex: overlayLayer.zIndex,
            });
          }
        }
      }

      // Return the first layer (or all if multiple)
      if (createdLayers.length === 1) {
        return NextResponse.json(createdLayers[0]);
      }
      return NextResponse.json(createdLayers);
    }

    // Handle KML file
    if (fileName.endsWith(".kml")) {
      const kmlText = await file.text();
      const { geoJson, name } = parseKML(kmlText, file.name);

      // Upload the original KML file for reference
      const kmlBlob = await put(`map-layers/${jobPlanId}/${file.name}`, file, {
        access: "public",
      });

      const layer = await prisma.jobMapLayer.create({
        data: {
          jobPlanId,
          name: name || file.name.replace(/\.[^/.]+$/, ""),
          type: "kml",
          fileUrl: kmlBlob.url,
          geoJson: geoJson as unknown as Prisma.InputJsonValue,
          opacity: 1.0,
          visible: true,
          zIndex: currentZIndex,
        },
      });

      return NextResponse.json({
        id: layer.id,
        name: layer.name,
        type: layer.type,
        fileUrl: layer.fileUrl,
        geoJson: layer.geoJson,
        bounds: layer.bounds,
        opacity: layer.opacity,
        visible: layer.visible,
        zIndex: layer.zIndex,
      });
    }

    return NextResponse.json(
      { error: "Unsupported file format. Please upload a KMZ, KML, or image file." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error uploading map file:", error);
    return NextResponse.json(
      { error: "Failed to upload map file" },
      { status: 500 }
    );
  }
}

// Parse KML text into GeoJSON
function parseKML(
  kmlText: string,
  fileName: string
): {
  geoJson: GeoJSON.FeatureCollection;
  name: string;
  groundOverlays: GroundOverlay[];
} {
  const parser = new DOMParser();
  const kmlDoc = parser.parseFromString(kmlText, "text/xml");

  // Convert to GeoJSON
  const geoJson = kmlToGeoJSON(kmlDoc) as GeoJSON.FeatureCollection;

  // Extract ground overlays
  const groundOverlays: GroundOverlay[] = [];
  const overlayElements = kmlDoc.getElementsByTagName("GroundOverlay");

  for (let i = 0; i < overlayElements.length; i++) {
    const overlay = overlayElements[i];
    const nameEl = overlay.getElementsByTagName("name")[0];
    const hrefEl = overlay.getElementsByTagName("href")[0];
    const latLonBox = overlay.getElementsByTagName("LatLonBox")[0];

    if (latLonBox) {
      const north = parseFloat(
        latLonBox.getElementsByTagName("north")[0]?.textContent || "0"
      );
      const south = parseFloat(
        latLonBox.getElementsByTagName("south")[0]?.textContent || "0"
      );
      const east = parseFloat(
        latLonBox.getElementsByTagName("east")[0]?.textContent || "0"
      );
      const west = parseFloat(
        latLonBox.getElementsByTagName("west")[0]?.textContent || "0"
      );

      groundOverlays.push({
        name: nameEl?.textContent || "Overlay",
        href: hrefEl?.textContent || "",
        bounds: { north, south, east, west },
      });
    }
  }

  // Extract document name
  const docNameEl = kmlDoc.getElementsByTagName("name")[0];
  const documentName =
    docNameEl?.textContent || fileName.replace(/\.(kmz|kml)$/i, "");

  return {
    geoJson,
    name: documentName,
    groundOverlays,
  };
}
