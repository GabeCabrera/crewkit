/**
 * Selection utilities for map-based layer selection
 * Uses Turf.js for geospatial operations
 */

import { booleanPointInPolygon, booleanIntersects, length } from "@turf/turf";
import type { Feature, Polygon, MultiPolygon, Point, LineString, MultiLineString, GeoJsonProperties } from "geojson";

// ============================================================================
// SAG/TENSION CONSTANTS
// ============================================================================

/**
 * Default sag factor for aerial cable (2%)
 * Accounts for:
 * - Cable sag between poles due to gravity
 * - Wrap-around at pole attachments
 * - Temperature expansion allowance
 * - Industry standard for fiber optic aerial construction
 */
export const DEFAULT_SAG_FACTOR = 0.02; // 2%

/**
 * Underground has no sag, but may have slight allowance for bends
 */
export const UNDERGROUND_FACTOR = 0.0; // 0%

// ============================================================================
// FOOTAGE CALCULATION
// ============================================================================

export interface FootageOptions {
  /** Sag/tension factor to add (default: 2% for aerial, 0% for underground) */
  sagFactor?: number;
  /** Whether this is aerial (applies sag) or underground (no sag) */
  isAerial?: boolean;
}

/**
 * Calculate footage from LineString geometry using Turf.js geodesic distance.
 * Includes sag/tension factor for aerial routes (default 2%).
 * 
 * @param geometry - LineString or MultiLineString geometry
 * @param options - Optional settings for sag factor
 * @returns Distance in feet including sag allowance
 */
export function calculateFootageFromGeometry(
  geometry: LineString | MultiLineString | null | undefined,
  options?: FootageOptions
): number {
  if (!geometry) return 0;
  
  try {
    // Turf length calculates geodesic distance (great-circle)
    const lengthKm = length(
      { type: "Feature", geometry, properties: {} },
      { units: "kilometers" }
    );
    // Convert kilometers to feet (1 km = 3280.84 feet)
    const horizontalFeet = lengthKm * 3280.84;
    
    // Apply sag factor
    // Default: aerial gets 2% sag, underground gets 0%
    let sagFactor: number;
    if (options?.sagFactor !== undefined) {
      sagFactor = options.sagFactor;
    } else if (options?.isAerial === false) {
      sagFactor = UNDERGROUND_FACTOR;
    } else {
      // Default to aerial with standard sag
      sagFactor = DEFAULT_SAG_FACTOR;
    }
    
    return horizontalFeet * (1 + sagFactor);
  } catch (error) {
    console.error("Error calculating footage from geometry:", error);
    return 0;
  }
}

/**
 * Calculate aerial footage with sag factor (default 2%)
 */
export function calculateAerialFootage(
  geometry: LineString | MultiLineString | null | undefined,
  sagFactor: number = DEFAULT_SAG_FACTOR
): number {
  return calculateFootageFromGeometry(geometry, { sagFactor, isAerial: true });
}

/**
 * Calculate underground footage (no sag)
 */
export function calculateUndergroundFootage(
  geometry: LineString | MultiLineString | null | undefined
): number {
  return calculateFootageFromGeometry(geometry, { sagFactor: 0, isAerial: false });
}

/**
 * Calculate total footage from an array of LineString geometries
 */
export function calculateTotalFootageFromGeometries(
  geometries: (LineString | MultiLineString | null | undefined)[],
  options?: FootageOptions
): number {
  return geometries.reduce((total, geom) => total + calculateFootageFromGeometry(geom, options), 0);
}

/**
 * Check if a feature intersects with a selection polygon
 */
export function featureIntersectsPolygon(
  feature: Feature<Point | LineString, GeoJsonProperties>,
  polygon: Feature<Polygon | MultiPolygon>
): boolean {
  if (!feature.geometry || !polygon.geometry) {
    return false;
  }

  // For points, check if they're inside the polygon
  if (feature.geometry.type === "Point") {
    return booleanPointInPolygon(feature.geometry, polygon);
  }

  // For lines, check if they intersect with the polygon
  if (feature.geometry.type === "LineString") {
    return booleanIntersects(feature, polygon);
  }

  return false;
}

/**
 * Get all unique sourceFileIds from features that intersect with a polygon
 */
export function getIntersectingFileIds(
  drawnPolygon: Feature<Polygon | MultiPolygon>,
  features: Feature<Point | LineString, GeoJsonProperties>[]
): string[] {
  const fileIds = new Set<string>();

  for (const feature of features) {
    const sourceFileId = feature.properties?.sourceFileId;
    if (!sourceFileId) continue;

    if (featureIntersectsPolygon(feature, drawnPolygon)) {
      fileIds.add(sourceFileId);
    }
  }

  return Array.from(fileIds);
}

/**
 * Get all features that belong to specific sourceFileIds
 */
export function filterFeaturesByFileIds<T extends Feature>(
  features: T[],
  fileIds: Set<string>
): T[] {
  if (fileIds.size === 0) return features;
  return features.filter((f) => {
    const sourceFileId = f.properties?.sourceFileId;
    return sourceFileId && fileIds.has(sourceFileId);
  });
}

/**
 * Group features by their sourceFileId
 */
export function groupFeaturesByFileId<T extends Feature>(
  features: T[]
): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  for (const feature of features) {
    const sourceFileId = feature.properties?.sourceFileId || "unknown";
    const existing = groups.get(sourceFileId) || [];
    existing.push(feature);
    groups.set(sourceFileId, existing);
  }

  return groups;
}

/**
 * Calculate statistics for a group of features
 */
export interface FeatureStats {
  featureCount: number;
  pointCount: number;
  lineCount: number;
  totalFootage: number;
}

export function calculateFeatureStats<T extends Feature>(
  features: T[]
): FeatureStats {
  let pointCount = 0;
  let lineCount = 0;
  let totalFootage = 0;

  for (const feature of features) {
    if (feature.geometry?.type === "Point") {
      pointCount++;
    } else if (feature.geometry?.type === "LineString") {
      lineCount++;
      totalFootage += (feature.properties?.footage || 0) as number;
    }
  }

  return {
    featureCount: features.length,
    pointCount,
    lineCount,
    totalFootage,
  };
}

/**
 * Calculate statistics grouped by sourceFileId
 */
export function calculateStatsByFileId<T extends Feature>(
  features: T[]
): Map<string, FeatureStats> {
  const grouped = groupFeaturesByFileId(features);
  const stats = new Map<string, FeatureStats>();

  grouped.forEach((groupFeatures, fileId) => {
    stats.set(fileId, calculateFeatureStats(groupFeatures));
  });

  return stats;
}

/**
 * Selected features grouped by type for feature-based selection
 */
export interface SelectedFeatures {
  fiberIds: string[];
  infraIds: string[];
  conduitIds: string[];
}

/**
 * Get individual feature IDs that intersect with a polygon, grouped by type.
 * This enables feature-based selection (selecting specific poles, fiber segments, etc.)
 * rather than file-based selection.
 */
export function getIntersectingFeatureIds(
  drawnPolygon: Feature<Polygon | MultiPolygon>,
  features: Feature<Point | LineString, GeoJsonProperties>[]
): SelectedFeatures {
  const fiberIds: string[] = [];
  const infraIds: string[] = [];
  const conduitIds: string[] = [];

  for (const feature of features) {
    const featureId = feature.properties?.id || feature.id;
    if (!featureId) continue;

    if (featureIntersectsPolygon(feature, drawnPolygon)) {
      const featureType = feature.properties?.featureType;
      
      if (featureType === "fiber") {
        fiberIds.push(String(featureId));
      } else if (featureType === "infrastructure") {
        infraIds.push(String(featureId));
      } else if (featureType === "conduit") {
        conduitIds.push(String(featureId));
      }
    }
  }

  return { fiberIds, infraIds, conduitIds };
}

/**
 * Check if any features are selected
 */
export function hasSelectedFeatures(selected: SelectedFeatures): boolean {
  return selected.fiberIds.length > 0 || 
         selected.infraIds.length > 0 || 
         selected.conduitIds.length > 0;
}

/**
 * Get total count of selected features
 */
export function getSelectedFeatureCount(selected: SelectedFeatures): number {
  return selected.fiberIds.length + selected.infraIds.length + selected.conduitIds.length;
}
