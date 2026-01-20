"use client";

import { useCallback, useState } from "react";
import JSZip from "jszip";
import { kml as kmlToGeoJSON } from "@tmcw/togeojson";

export interface ParsedKMZResult {
  geoJson: GeoJSON.FeatureCollection;
  name: string;
  groundOverlays: GroundOverlay[];
}

export interface GroundOverlay {
  name: string;
  href: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  rotation?: number;
  imageBlob?: Blob;
}

export function useKMZParser() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Parse a KML string into GeoJSON and extract ground overlays
   */
  const parseKML = useCallback((kmlText: string, fileName: string): ParsedKMZResult => {
    const parser = new DOMParser();
    const kmlDoc = parser.parseFromString(kmlText, "text/xml");

    // Check for parse errors
    const parseError = kmlDoc.querySelector("parsererror");
    if (parseError) {
      throw new Error("Invalid KML format");
    }

    // Convert to GeoJSON using togeojson library
    const geoJson = kmlToGeoJSON(kmlDoc) as GeoJSON.FeatureCollection;

    // Extract ground overlays (images placed on the map)
    const groundOverlays: GroundOverlay[] = [];
    const overlayElements = kmlDoc.querySelectorAll("GroundOverlay");

    overlayElements.forEach((overlay) => {
      const name = overlay.querySelector("name")?.textContent || "Overlay";
      const href = overlay.querySelector("Icon > href")?.textContent || "";
      const latLonBox = overlay.querySelector("LatLonBox");

      if (latLonBox) {
        const north = parseFloat(latLonBox.querySelector("north")?.textContent || "0");
        const south = parseFloat(latLonBox.querySelector("south")?.textContent || "0");
        const east = parseFloat(latLonBox.querySelector("east")?.textContent || "0");
        const west = parseFloat(latLonBox.querySelector("west")?.textContent || "0");
        const rotation = parseFloat(latLonBox.querySelector("rotation")?.textContent || "0");

        groundOverlays.push({
          name,
          href,
          bounds: { north, south, east, west },
          rotation: rotation !== 0 ? rotation : undefined,
        });
      }
    });

    // Extract name from KML document
    const documentName =
      kmlDoc.querySelector("Document > name")?.textContent ||
      kmlDoc.querySelector("Folder > name")?.textContent ||
      fileName.replace(/\.(kmz|kml)$/i, "");

    return {
      geoJson,
      name: documentName,
      groundOverlays,
    };
  }, []);

  /**
   * Parse a KMZ file (zipped KML with embedded images)
   */
  const parseKMZ = useCallback(
    async (file: File): Promise<ParsedKMZResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const zip = await JSZip.loadAsync(file);

        // Find the KML file inside the KMZ
        const kmlFileNames = Object.keys(zip.files).filter(
          (name) => name.toLowerCase().endsWith(".kml") && !zip.files[name].dir
        );

        if (kmlFileNames.length === 0) {
          throw new Error("No KML file found in KMZ archive");
        }

        const kmlFile = zip.files[kmlFileNames[0]];
        const kmlText = await kmlFile.async("text");
        const result = parseKML(kmlText, file.name);

        // Extract embedded images for ground overlays
        for (const overlay of result.groundOverlays) {
          if (overlay.href && !overlay.href.startsWith("http")) {
            // Internal reference to a file in the KMZ
            const imagePath = overlay.href.replace(/^\//, "");
            const imageFile = zip.files[imagePath];

            if (imageFile) {
              const imageBlob = await imageFile.async("blob");
              overlay.imageBlob = imageBlob;
            }
          }
        }

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to parse KMZ file";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [parseKML]
  );

  /**
   * Parse a KML file
   */
  const parseKMLFile = useCallback(
    async (file: File): Promise<ParsedKMZResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const kmlText = await file.text();
        const result = parseKML(kmlText, file.name);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to parse KML file";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [parseKML]
  );

  /**
   * Parse either KMZ or KML file based on extension
   */
  const parseFile = useCallback(
    async (file: File): Promise<ParsedKMZResult> => {
      const extension = file.name.toLowerCase().split(".").pop();

      if (extension === "kmz") {
        return parseKMZ(file);
      } else if (extension === "kml") {
        return parseKMLFile(file);
      } else {
        throw new Error("Unsupported file format. Please upload a KMZ or KML file.");
      }
    },
    [parseKMZ, parseKMLFile]
  );

  return {
    parseFile,
    parseKMZ,
    parseKMLFile,
    isLoading,
    error,
  };
}
