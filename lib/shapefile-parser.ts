/**
 * Shapefile Parser for GIS Design Data
 * 
 * Parses shapefiles exported from Vetro/GIS systems and extracts
 * Bill of Materials (BOM) data for fiber construction jobs.
 * 
 * Supported layers:
 * - Backbone: Main fiber routes with count and footage
 * - Lateral: Lateral fiber routes
 * - Strand: Strand/messenger wire footage
 * - MSTs: Multi-Service Terminals
 * - MSTTails: MST tail cables
 * - Boxes: Vaults, handholes, pedestals
 * - Conduit: Underground conduit with sizes
 * - SPLs: Splice locations
 * - Poles: Pole locations with metadata
 * - Guys: Guy wires/anchors
 * - Risers: Pole risers
 * - SlackLoops: Slack loop locations
 * - Crossings: Road/rail crossings
 */

import * as shapefile from "shapefile";
import {
  point as turfPoint,
  lineString as turfLineString,
  distance as turfDistance,
  length as turfLength,
  nearestPointOnLine,
  pointToLineDistance,
  lineSlice,
} from "@turf/turf";
import type { LineString, Position } from "geojson";

// ============================================================================
// SEGMENT SPLITTING CONFIGURATION
// ============================================================================

// Snap radius for finding poles near a line segment (meters)
const POLE_SNAP_RADIUS_METERS = 8;

// Minimum segment length to consider splitting (feet)
// Segments shorter than this won't be split further
const MIN_SEGMENT_LENGTH_FEET = 10;

// ============================================================================
// SEGMENT SPLITTING UTILITIES
// ============================================================================

/**
 * Extract all pole coordinates from parsed infrastructure items.
 * Returns array of [longitude, latitude] coordinate pairs.
 */
function extractPoleCoordinates(infrastructure: ParsedInfrastructure[]): [number, number][] {
  const poleCoords: [number, number][] = [];
  
  for (const item of infrastructure) {
    if (item.itemType === "pole" && item.location?.coordinates) {
      const coords = item.location.coordinates;
      if (coords.length >= 2) {
        poleCoords.push([coords[0], coords[1]]);
      }
    }
  }
  
  return poleCoords;
}

/**
 * Represents a pole's position along a line segment
 */
interface PoleAlongLine {
  /** Original pole coordinates [lng, lat] */
  poleCoords: [number, number];
  /** Point on the line closest to the pole */
  pointOnLine: Position;
  /** Distance along the line from start (in kilometers) */
  distanceAlong: number;
  /** Distance from pole to the line (in meters) */
  distanceToLine: number;
}

/**
 * Find all poles within snap distance of a LineString, sorted by position along the line.
 * Excludes poles that are at the very start or end of the line (within snap radius of endpoints).
 * 
 * @param lineGeom - The LineString geometry to check
 * @param poleCoords - Array of pole coordinates to check
 * @param snapRadiusMeters - Maximum distance from line for a pole to be considered "on" it
 * @returns Array of poles along the line, sorted by distance from start
 */
function findPolesAlongLine(
  lineGeom: LineString,
  poleCoords: [number, number][],
  snapRadiusMeters: number = POLE_SNAP_RADIUS_METERS
): PoleAlongLine[] {
  if (!lineGeom.coordinates || lineGeom.coordinates.length < 2) {
    return [];
  }
  
  const line = turfLineString(lineGeom.coordinates);
  const lineStart = lineGeom.coordinates[0] as [number, number];
  const lineEnd = lineGeom.coordinates[lineGeom.coordinates.length - 1] as [number, number];
  
  const polesOnLine: PoleAlongLine[] = [];
  
  for (const coords of poleCoords) {
    try {
      const polePt = turfPoint(coords);
      
      // Check if pole is within snap distance of the line
      const distToLine = pointToLineDistance(polePt, line, { units: "meters" });
      if (distToLine > snapRadiusMeters) {
        continue;
      }
      
      // Check if pole is at the start or end of the line (skip these)
      const distToStart = turfDistance(polePt, turfPoint(lineStart), { units: "meters" });
      const distToEnd = turfDistance(polePt, turfPoint(lineEnd), { units: "meters" });
      
      if (distToStart <= snapRadiusMeters || distToEnd <= snapRadiusMeters) {
        // Pole is at an endpoint, don't split here
        continue;
      }
      
      // Find nearest point on line and its distance along
      const nearestPt = nearestPointOnLine(line, polePt);
      const pointOnLine = nearestPt.geometry.coordinates;
      const distanceAlong = nearestPt.properties.location || 0; // km from start
      
      polesOnLine.push({
        poleCoords: coords,
        pointOnLine,
        distanceAlong,
        distanceToLine: distToLine,
      });
    } catch (e) {
      // Skip invalid coordinates
      continue;
    }
  }
  
  // Sort by distance along the line
  polesOnLine.sort((a, b) => a.distanceAlong - b.distanceAlong);
  
  return polesOnLine;
}

/**
 * Split a LineString at multiple points, returning an array of LineStrings.
 * 
 * @param lineGeom - The original LineString geometry
 * @param splitPoints - Points along the line where splits should occur (must be sorted by distance)
 * @returns Array of LineString geometries representing the split segments
 */
function splitLineAtPoints(
  lineGeom: LineString,
  splitPoints: Position[]
): LineString[] {
  if (!lineGeom.coordinates || lineGeom.coordinates.length < 2) {
    return [lineGeom];
  }
  
  if (splitPoints.length === 0) {
    return [lineGeom];
  }
  
  const line = turfLineString(lineGeom.coordinates);
  const results: LineString[] = [];
  
  // Start point for the first segment
  let currentStart = turfPoint(lineGeom.coordinates[0] as [number, number]);
  
  // Create segments between each split point
  for (const splitPoint of splitPoints) {
    const splitPt = turfPoint(splitPoint as [number, number]);
    
    try {
      // Slice from current start to this split point
      const sliced = lineSlice(currentStart, splitPt, line);
      
      if (sliced.geometry.coordinates.length >= 2) {
        results.push(sliced.geometry);
      }
      
      // Move start to this split point for next segment
      currentStart = splitPt;
    } catch (e) {
      // If slice fails, continue to next point
      console.warn("Error slicing line at point:", e);
      continue;
    }
  }
  
  // Create final segment from last split point to end
  const endPoint = turfPoint(
    lineGeom.coordinates[lineGeom.coordinates.length - 1] as [number, number]
  );
  
  try {
    const finalSlice = lineSlice(currentStart, endPoint, line);
    if (finalSlice.geometry.coordinates.length >= 2) {
      results.push(finalSlice.geometry);
    }
  } catch (e) {
    console.warn("Error creating final line slice:", e);
  }
  
  // If no valid segments were created, return original
  if (results.length === 0) {
    return [lineGeom];
  }
  
  return results;
}

/**
 * Calculate footage from a LineString geometry using Turf.js
 * @param geom - LineString geometry
 * @returns Distance in feet
 */
function calculateFootageFromLineString(geom: LineString): number {
  try {
    const line = turfLineString(geom.coordinates);
    const lengthKm = turfLength(line, { units: "kilometers" });
    // Convert km to feet (1 km = 3280.84 feet)
    return lengthKm * 3280.84;
  } catch (e) {
    return 0;
  }
}

/**
 * Split fiber/strand segments at pole locations to create pole-to-pole segments.
 * This creates natural selection units that match physical construction.
 * 
 * @param fiberSegments - Original parsed fiber segments
 * @param infrastructure - Parsed infrastructure (to extract pole locations)
 * @param snapRadiusMeters - Distance threshold for considering a pole "on" a line
 * @returns New array of fiber segments, split at pole locations
 */
function splitSegmentsAtPoles(
  fiberSegments: ParsedFiberSegment[],
  infrastructure: ParsedInfrastructure[],
  snapRadiusMeters: number = POLE_SNAP_RADIUS_METERS
): ParsedFiberSegment[] {
  // Extract all pole coordinates
  const poleCoords = extractPoleCoordinates(infrastructure);
  
  if (poleCoords.length === 0) {
    // No poles to split at, return original segments
    return fiberSegments;
  }
  
  const splitSegments: ParsedFiberSegment[] = [];
  let totalSplits = 0;
  
  for (const segment of fiberSegments) {
    // Skip segments without geometry
    if (!segment.geometry || segment.geometry.type !== "LineString") {
      splitSegments.push(segment);
      continue;
    }
    
    const lineGeom = segment.geometry as LineString;
    
    // Skip very short segments
    const originalFootage = calculateFootageFromLineString(lineGeom);
    if (originalFootage < MIN_SEGMENT_LENGTH_FEET) {
      splitSegments.push(segment);
      continue;
    }
    
    // Find poles along this line
    const polesOnLine = findPolesAlongLine(lineGeom, poleCoords, snapRadiusMeters);
    
    if (polesOnLine.length === 0) {
      // No poles to split at, keep original segment
      splitSegments.push(segment);
      continue;
    }
    
    // Get the split points (points on line closest to each pole)
    const splitPoints = polesOnLine.map(p => p.pointOnLine);
    
    // Split the line at these points
    const splitGeometries = splitLineAtPoints(lineGeom, splitPoints);
    
    if (splitGeometries.length <= 1) {
      // Splitting didn't produce multiple segments, keep original
      splitSegments.push(segment);
      continue;
    }
    
    // Create new segment records for each split portion
    for (let i = 0; i < splitGeometries.length; i++) {
      const splitGeom = splitGeometries[i];
      const splitFootage = calculateFootageFromLineString(splitGeom);
      
      // Skip very short split segments (could be artifacts)
      if (splitFootage < MIN_SEGMENT_LENGTH_FEET) {
        continue;
      }
      
      // Create new segment inheriting properties from original
      const newSegment: ParsedFiberSegment = {
        segmentType: segment.segmentType,
        fiberCount: segment.fiberCount,
        footage: Math.round(splitFootage * 100) / 100, // Round to 2 decimal places
        cableType: segment.cableType,
        description: segment.description 
          ? `${segment.description} (${i + 1}/${splitGeometries.length})`
          : undefined,
        geometry: splitGeom,
        sourceFileId: segment.sourceFileId,
      };
      
      splitSegments.push(newSegment);
    }
    
    totalSplits += splitGeometries.length - 1; // Count actual splits (new segments - 1)
  }
  
  if (totalSplits > 0) {
    console.log(`Split ${totalSplits} fiber segments at pole locations. Total segments: ${splitSegments.length}`);
  }
  
  return splitSegments;
}

// Types for parsed BOM data
export interface ParsedFiberSegment {
  segmentType: "backbone" | "lateral" | "drop" | "mst_tail" | "strand";
  fiberCount: number;
  footage: number;
  cableType?: string;
  description?: string;
  geometry?: GeoJSON.Geometry;
  sourceFileId?: string; // Name of source shapefile for layer management
}

export interface ParsedInfrastructure {
  itemType: string;
  quantity: number;
  specs?: string;
  label?: string;
  subPhase?: string;
  poleType?: string; // Pole type from shapefile (Terminal, Tangent, Corner, Junction, etc.)
  location?: GeoJSON.Point;
  sourceFileId?: string; // Name of source shapefile for layer management
  tailFootage?: number; // MST tail cable length in feet
}

export interface ParsedConduitSegment {
  conduitSize: string;
  footage: number;
  conduitType?: string;
  description?: string;
  geometry?: GeoJSON.Geometry;
  sourceFileId?: string; // Name of source shapefile for layer management
}

export interface ParsedBOM {
  fiberSegments: ParsedFiberSegment[];
  infrastructure: ParsedInfrastructure[];
  conduitSegments: ParsedConduitSegment[];
  sourceFiles: string[];
  summary: BOMSummary;
}

export interface BOMSummary {
  totalBackboneFootage: number;
  totalLateralFootage: number;
  totalStrandFootage: number;
  totalConduitFootage: number;
  fiberByCount: Record<number, number>; // fiberCount -> total footage
  mstCount: number;
  vaultCount: number;
  handholeCount: number;
  spliceCount: number;
  poleCount: number;
  riserCount: number;
  guyCount: number;
  slackLoopCount: number;
  crossingCount: number;
}

// Layer name patterns to identify layer types
const LAYER_PATTERNS: Record<string, RegExp> = {
  backbone: /backbone/i,
  lateral: /lateral/i,
  strand: /strand/i,
  msts: /msts?$/i,
  mstTails: /msttails?/i,
  boxes: /boxes?/i,
  conduit: /conduit/i,
  spls: /spls?/i,
  poles: /poles?/i,
  guys: /guys?/i,
  risers: /risers?/i,
  slackLoops: /slackloops?/i,
  crossings: /crossings?/i,
};

/**
 * Extract layer type from filename
 */
function getLayerType(filename: string): string | null {
  // Remove path and extension, get base name
  const baseName = filename.replace(/^.*[\\/]/, "").replace(/\.(shp|dbf|shx|prj|cpg)$/i, "");
  
  // Try to match against known patterns
  for (const [layerType, pattern] of Object.entries(LAYER_PATTERNS)) {
    if (pattern.test(baseName)) {
      return layerType;
    }
  }
  
  return null;
}

/**
 * Parse a shapefile buffer and return GeoJSON features
 */
async function parseShapefileBuffer(
  shpBuffer: ArrayBuffer,
  dbfBuffer: ArrayBuffer
): Promise<GeoJSON.FeatureCollection> {
  const source = await shapefile.open(shpBuffer, dbfBuffer);
  const features: GeoJSON.Feature[] = [];
  
  let result = await source.read();
  while (!result.done) {
    if (result.value) {
      features.push(result.value);
    }
    result = await source.read();
  }
  
  return {
    type: "FeatureCollection",
    features,
  };
}

/**
 * Parse backbone/lateral fiber layers
 */
function parseFiberLayer(
  features: GeoJSON.Feature[],
  segmentType: "backbone" | "lateral",
  sourceFileId: string
): ParsedFiberSegment[] {
  return features.map((feature) => {
    const props = feature.properties || {};
    
    // Handle different property naming conventions
    const fiberCount = props["Count#"] || props["count"] || props["Count"] || 0;
    const footage = props["length(ft)"] || props["Length"] || props["length"] || 0;
    const id = props["ID"] || props["id"] || "";
    
    return {
      segmentType,
      fiberCount: Number(fiberCount) || 0,
      footage: Number(footage) || 0,
      description: id ? String(id) : undefined,
      geometry: feature.geometry || undefined,
      sourceFileId,
    };
  }).filter(seg => seg.footage > 0);
}

/**
 * Parse strand layer
 */
function parseStrandLayer(features: GeoJSON.Feature[], sourceFileId: string): ParsedFiberSegment[] {
  return features.map((feature) => {
    const props = feature.properties || {};
    const footage = props["length(ft)"] || props["Length"] || props["length"] || 0;
    
    return {
      segmentType: "strand" as const,
      fiberCount: 0, // Strand doesn't have fiber count
      footage: Number(footage) || 0,
      geometry: feature.geometry || undefined,
      sourceFileId,
    };
  }).filter(seg => seg.footage > 0);
}

/**
 * Parse MST tail layer
 */
function parseMSTTailLayer(features: GeoJSON.Feature[], sourceFileId: string): ParsedFiberSegment[] {
  return features.map((feature) => {
    const props = feature.properties || {};
    const footage = props["length(ft)"] || props["Length"] || 0;
    const count = props["Count"] || props["count"] || 0;
    const id = props["ID"] || props["id"] || "";
    
    return {
      segmentType: "mst_tail" as const,
      fiberCount: Number(count) || 0,
      footage: Number(footage) || 0,
      description: id ? String(id) : undefined,
      geometry: feature.geometry || undefined,
      sourceFileId,
    };
  }).filter(seg => seg.footage > 0);
}

/**
 * Parse conduit layer
 */
function parseConduitLayer(features: GeoJSON.Feature[], sourceFileId: string): ParsedConduitSegment[] {
  return features.map((feature) => {
    const props = feature.properties || {};
    let size = props["Size"] || props["size"] || "";
    const footage = props["length(ft)"] || props["Length"] || props["length"] || 0;
    
    // Normalize size (remove quotes if present)
    size = String(size).replace(/['"]/g, "").trim();
    
    return {
      conduitSize: size || "unknown",
      footage: Number(footage) || 0,
      geometry: feature.geometry || undefined,
      sourceFileId,
    };
  }).filter(seg => seg.footage > 0);
}

/**
 * Parse MST layer
 */
function parseMSTLayer(features: GeoJSON.Feature[], sourceFileId: string): ParsedInfrastructure[] {
  return features.map((feature) => {
    const props = feature.properties || {};
    const ports = props["Ports"] || props["ports"] || 0;
    const placement = props["Placement"] || "";
    const id = props["ID"] || props["id"] || "";
    const length = props["Length"] || props["length"] || 0; // MST tail cable length
    
    return {
      itemType: "mst",
      quantity: 1,
      specs: ports ? `${ports}-port${placement ? ` (${placement})` : ""}` : undefined,
      label: id ? String(id) : undefined,
      location: feature.geometry?.type === "Point" ? feature.geometry : undefined,
      sourceFileId,
      tailFootage: Number(length) || undefined, // Include tail footage if available
    };
  });
}

/**
 * Parse boxes layer (vaults, handholes, pedestals)
 */
function parseBoxesLayer(features: GeoJSON.Feature[], sourceFileId: string): ParsedInfrastructure[] {
  return features.map((feature) => {
    const props = feature.properties || {};
    const size = props["Size"] || props["size"] || "";
    const id = props["ID"] || props["id"] || "";
    
    // Determine box type from size field
    let itemType = "box";
    const sizeUpper = String(size).toUpperCase();
    if (sizeUpper.includes("VLT") || sizeUpper.includes("VAULT")) {
      itemType = "vault";
    } else if (sizeUpper.includes("HH") || sizeUpper.includes("HANDHOLE")) {
      itemType = "handhole";
    } else if (sizeUpper.includes("PED") || sizeUpper.includes("PEDESTAL")) {
      itemType = "pedestal";
    }
    
    return {
      itemType,
      quantity: 1,
      specs: size ? String(size) : undefined,
      label: id ? String(id) : undefined,
      location: feature.geometry?.type === "Point" ? feature.geometry : undefined,
      sourceFileId,
    };
  });
}

/**
 * Parse splice layer
 */
function parseSpliceLayer(features: GeoJSON.Feature[], sourceFileId: string): ParsedInfrastructure[] {
  return features.map((feature) => {
    const props = feature.properties || {};
    const size = props["Size"] || props["size"] || "";
    const id = props["ID"] || props["id"] || "";
    
    return {
      itemType: "splice",
      quantity: 1,
      specs: size ? `Size ${size}` : undefined,
      label: id ? String(id) : undefined,
      location: feature.geometry?.type === "Point" ? feature.geometry : undefined,
      sourceFileId,
    };
  });
}

/**
 * Parse poles layer
 */
function parsePolesLayer(features: GeoJSON.Feature[], sourceFileId: string): ParsedInfrastructure[] {
  return features.map((feature) => {
    const props = feature.properties || {};
    const poleClass = props["Class"] || "";
    const height = props["Height"] || "";
    const number = props["Number"] || props["Pole_UUID"] || "";
    const subPhase = props["SubPhase"] || "";
    // Read pole type from shapefile - try common field name variations
    const poleType = props["Pole_Type"] || props["PoleType"] || props["Type"] || props["POLE_TYPE"] || "";
    
    let specs = "";
    if (poleClass && height) {
      specs = `Class ${poleClass}, ${height}ft`;
    } else if (poleClass) {
      specs = `Class ${poleClass}`;
    } else if (height) {
      specs = `${height}ft`;
    }
    
    return {
      itemType: "pole",
      quantity: 1,
      specs: specs || undefined,
      label: number ? String(number) : undefined,
      subPhase: subPhase ? String(subPhase) : undefined,
      poleType: poleType ? String(poleType) : undefined,
      location: feature.geometry?.type === "Point" ? feature.geometry : undefined,
      sourceFileId,
    };
  });
}

/**
 * Parse simple count layers (guys, risers)
 */
function parseSimpleCountLayer(
  features: GeoJSON.Feature[],
  itemType: string,
  sourceFileId: string
): ParsedInfrastructure[] {
  return features.map((feature) => {
    const props = feature.properties || {};
    const num = props["Num"] || props["num"] || 1;
    const id = props["ID"] || props["id"] || "";
    
    return {
      itemType,
      quantity: Number(num) || 1,
      label: id ? String(id) : undefined,
      location: feature.geometry?.type === "Point" ? feature.geometry : undefined,
      sourceFileId,
    };
  });
}

/**
 * Parse slack loops layer
 */
function parseSlackLoopsLayer(features: GeoJSON.Feature[], sourceFileId: string): ParsedInfrastructure[] {
  return features.map((feature) => {
    const props = feature.properties || {};
    const count = props["Count#"] || 0;
    const length = props["Length"] || 0;
    const desc = props["KMLDES"] || "";
    
    return {
      itemType: "slack_loop",
      quantity: 1,
      specs: desc ? String(desc) : (length ? `${length}ft of ${count}ct` : undefined),
      location: feature.geometry?.type === "Point" ? feature.geometry : undefined,
      sourceFileId,
    };
  });
}

/**
 * Parse crossings layer
 */
function parseCrossingsLayer(features: GeoJSON.Feature[], sourceFileId: string): ParsedInfrastructure[] {
  return features.map((feature) => {
    const props = feature.properties || {};
    const crossingNum = props["Crossing#"] || "";
    const id = props["ID"] || "";
    
    return {
      itemType: "crossing",
      quantity: 1,
      specs: id ? String(id) : undefined,
      label: crossingNum ? `Crossing ${crossingNum}` : undefined,
      location: feature.geometry?.type === "Point" ? feature.geometry : undefined,
      sourceFileId,
    };
  });
}

/**
 * Calculate BOM summary statistics
 */
function calculateSummary(bom: Omit<ParsedBOM, "summary">): BOMSummary {
  const summary: BOMSummary = {
    totalBackboneFootage: 0,
    totalLateralFootage: 0,
    totalStrandFootage: 0,
    totalConduitFootage: 0,
    fiberByCount: {},
    mstCount: 0,
    vaultCount: 0,
    handholeCount: 0,
    spliceCount: 0,
    poleCount: 0,
    riserCount: 0,
    guyCount: 0,
    slackLoopCount: 0,
    crossingCount: 0,
  };
  
  // Process fiber segments
  for (const seg of bom.fiberSegments) {
    if (seg.segmentType === "backbone") {
      summary.totalBackboneFootage += seg.footage;
    } else if (seg.segmentType === "lateral") {
      summary.totalLateralFootage += seg.footage;
    } else if (seg.segmentType === "strand") {
      summary.totalStrandFootage += seg.footage;
    }
    
    // Track footage by fiber count
    if (seg.fiberCount > 0) {
      summary.fiberByCount[seg.fiberCount] = 
        (summary.fiberByCount[seg.fiberCount] || 0) + seg.footage;
    }
  }
  
  // Process conduit
  for (const seg of bom.conduitSegments) {
    summary.totalConduitFootage += seg.footage;
  }
  
  // Process infrastructure
  for (const item of bom.infrastructure) {
    switch (item.itemType) {
      case "mst":
        summary.mstCount += item.quantity;
        break;
      case "vault":
        summary.vaultCount += item.quantity;
        break;
      case "handhole":
        summary.handholeCount += item.quantity;
        break;
      case "splice":
        summary.spliceCount += item.quantity;
        break;
      case "pole":
        summary.poleCount += item.quantity;
        break;
      case "riser":
        summary.riserCount += item.quantity;
        break;
      case "guy":
        summary.guyCount += item.quantity;
        break;
      case "slack_loop":
        summary.slackLoopCount += item.quantity;
        break;
      case "crossing":
        summary.crossingCount += item.quantity;
        break;
    }
  }
  
  return summary;
}

/**
 * Main entry point: Parse a collection of shapefiles into BOM data
 * 
 * @param files - Map of filename to ArrayBuffer pairs for .shp and .dbf files
 * @returns Parsed BOM data
 */
export async function parseShapefiles(
  files: Map<string, { shp: ArrayBuffer; dbf: ArrayBuffer }>
): Promise<ParsedBOM> {
  const bom: Omit<ParsedBOM, "summary"> = {
    fiberSegments: [],
    infrastructure: [],
    conduitSegments: [],
    sourceFiles: [],
  };
  
  for (const [filename, buffers] of files.entries()) {
    const layerType = getLayerType(filename);
    if (!layerType) {
      console.warn(`Unknown layer type for file: ${filename}`);
      continue;
    }
    
    bom.sourceFiles.push(filename);
    
    // Use filename as sourceFileId for layer management
    const sourceFileId = filename;
    
    try {
      const geojson = await parseShapefileBuffer(buffers.shp, buffers.dbf);
      const features = geojson.features;
      
      switch (layerType) {
        case "backbone":
          bom.fiberSegments.push(...parseFiberLayer(features, "backbone", sourceFileId));
          break;
        case "lateral":
          bom.fiberSegments.push(...parseFiberLayer(features, "lateral", sourceFileId));
          break;
        case "strand":
          bom.fiberSegments.push(...parseStrandLayer(features, sourceFileId));
          break;
        case "mstTails":
          bom.fiberSegments.push(...parseMSTTailLayer(features, sourceFileId));
          break;
        case "conduit":
          bom.conduitSegments.push(...parseConduitLayer(features, sourceFileId));
          break;
        case "msts":
          bom.infrastructure.push(...parseMSTLayer(features, sourceFileId));
          break;
        case "boxes":
          bom.infrastructure.push(...parseBoxesLayer(features, sourceFileId));
          break;
        case "spls":
          bom.infrastructure.push(...parseSpliceLayer(features, sourceFileId));
          break;
        case "poles":
          bom.infrastructure.push(...parsePolesLayer(features, sourceFileId));
          break;
        case "guys":
          bom.infrastructure.push(...parseSimpleCountLayer(features, "guy", sourceFileId));
          break;
        case "risers":
          bom.infrastructure.push(...parseSimpleCountLayer(features, "riser", sourceFileId));
          break;
        case "slackLoops":
          bom.infrastructure.push(...parseSlackLoopsLayer(features, sourceFileId));
          break;
        case "crossings":
          bom.infrastructure.push(...parseCrossingsLayer(features, sourceFileId));
          break;
      }
    } catch (error) {
      console.error(`Error parsing ${filename}:`, error);
    }
  }
  
  // Post-processing: Split fiber segments at pole locations
  // This creates pole-to-pole segments for better selection granularity
  const splitFiberSegments = splitSegmentsAtPoles(
    bom.fiberSegments,
    bom.infrastructure,
    POLE_SNAP_RADIUS_METERS
  );
  
  return {
    ...bom,
    fiberSegments: splitFiberSegments,
    summary: calculateSummary({ ...bom, fiberSegments: splitFiberSegments }),
  };
}

/**
 * Parse shapefiles from file paths (server-side only)
 * Reads .shp and .dbf files from the filesystem
 */
export async function parseShapefilesFromPaths(
  shpPaths: string[]
): Promise<ParsedBOM> {
  // This uses the simpler shapefile.read() which handles file paths directly
  const bom: Omit<ParsedBOM, "summary"> = {
    fiberSegments: [],
    infrastructure: [],
    conduitSegments: [],
    sourceFiles: [],
  };
  
  for (const shpPath of shpPaths) {
    const layerType = getLayerType(shpPath);
    if (!layerType) {
      console.warn(`Unknown layer type for file: ${shpPath}`);
      continue;
    }
    
    const filename = shpPath.replace(/^.*[\\/]/, "");
    bom.sourceFiles.push(filename);
    
    // Use filename as sourceFileId for layer management
    const sourceFileId = filename;
    
    try {
      const geojson = await shapefile.read(shpPath);
      const features = geojson.features;
      
      switch (layerType) {
        case "backbone":
          bom.fiberSegments.push(...parseFiberLayer(features, "backbone", sourceFileId));
          break;
        case "lateral":
          bom.fiberSegments.push(...parseFiberLayer(features, "lateral", sourceFileId));
          break;
        case "strand":
          bom.fiberSegments.push(...parseStrandLayer(features, sourceFileId));
          break;
        case "mstTails":
          bom.fiberSegments.push(...parseMSTTailLayer(features, sourceFileId));
          break;
        case "conduit":
          bom.conduitSegments.push(...parseConduitLayer(features, sourceFileId));
          break;
        case "msts":
          bom.infrastructure.push(...parseMSTLayer(features, sourceFileId));
          break;
        case "boxes":
          bom.infrastructure.push(...parseBoxesLayer(features, sourceFileId));
          break;
        case "spls":
          bom.infrastructure.push(...parseSpliceLayer(features, sourceFileId));
          break;
        case "poles":
          bom.infrastructure.push(...parsePolesLayer(features, sourceFileId));
          break;
        case "guys":
          bom.infrastructure.push(...parseSimpleCountLayer(features, "guy", sourceFileId));
          break;
        case "risers":
          bom.infrastructure.push(...parseSimpleCountLayer(features, "riser", sourceFileId));
          break;
        case "slackLoops":
          bom.infrastructure.push(...parseSlackLoopsLayer(features, sourceFileId));
          break;
        case "crossings":
          bom.infrastructure.push(...parseCrossingsLayer(features, sourceFileId));
          break;
      }
    } catch (error) {
      console.error(`Error parsing ${shpPath}:`, error);
    }
  }
  
  // Post-processing: Split fiber segments at pole locations
  // This creates pole-to-pole segments for better selection granularity
  const splitFiberSegments = splitSegmentsAtPoles(
    bom.fiberSegments,
    bom.infrastructure,
    POLE_SNAP_RADIUS_METERS
  );
  
  return {
    ...bom,
    fiberSegments: splitFiberSegments,
    summary: calculateSummary({ ...bom, fiberSegments: splitFiberSegments }),
  };
}
