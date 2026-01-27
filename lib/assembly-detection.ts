/**
 * Assembly Detection Logic
 * 
 * Auto-detects assembly types based on GIS features using spatial topology:
 * - Terminal Pole: Dead end with only 1 strand connection
 * - Tangent Pole: Pass-through with 2 connections forming ~180° (straight line)
 * - Corner Pole: 2 connections forming a sharp angle
 * - Junction Pole: 3+ strand connections (T-pole, branch point)
 * - Other assemblies based on infrastructure type
 */

import { 
  point as turfPoint, 
  distance as turfDistance,
  nearestPointOnLine,
  lineString,
  bearing as turfBearing,
  pointToLineDistance,
} from "@turf/turf";
import type { Feature, Point, LineString, Position } from "geojson";

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

// Buffer radius for spatial snap - finds segments within this distance of pole
// Increased from 3m to 8m (~25ft) for better GIS data tolerance
const SNAP_RADIUS_METERS = 8;

// Stricter threshold for matching pole to segment endpoint (start/end of line)
// Used to determine if pole is at a true line terminus vs mid-line
const ENDPOINT_SNAP_METERS = 5;

// Angle tolerance for tangent classification (degrees from 180°)
// If angle is 180° ± this value, pole is considered tangent (straight pass-through)
// Increased from 20° to 25° for more forgiving classification
const TANGENT_ANGLE_TOLERANCE = 25;

// Bearing tolerance for grouping segments on same physical path
// Segments with bearings within this tolerance are considered the same physical route
const PATH_BEARING_TOLERANCE = 20;

// Distance tolerance for grouping connection points as same physical path
// If two segment connections are within this distance, they're likely the same path
const PATH_DISTANCE_TOLERANCE = 3; // meters

// Legacy threshold (kept for backward compatibility)
const ENDPOINT_THRESHOLD_METERS = 15;

// ============================================================================
// ASSEMBLY TYPES
// ============================================================================

// Assembly types that map to infrastructure
export type AssemblyType = 
  | "Terminal Pole"      // Dead end - 1 connection
  | "Tangent Pole"       // Straight pass-through - 2 connections, ~180°
  | "Corner Pole"        // Angle change - 2 connections, sharp angle
  | "Junction Pole"      // Branch point - 3+ connections
  | "Intermediate Pole"  // Legacy: kept for backward compatibility
  | "Splice Case"
  | "MST"                // Generic MST (unknown port count)
  | "MST 2-Port"         // 2-port MST
  | "MST 6-Port"         // 6-port MST
  | "Riser"
  | "Vault"
  | "Handhole"
  | "Pedestal"
  | "Guy/Anchor"
  | "Crossing"
  | "Slack Loop"
  | "Unknown";

// Detected assembly for a feature
export interface DetectedAssembly {
  featureId: string;
  featureType: string;  // "pole", "splice", "mst", etc.
  label?: string;       // Pole number, etc.
  detectedAssemblyType: AssemblyType;
  confidence: "high" | "medium" | "low";
  userOverride?: AssemblyType;
  location?: [number, number]; // [lng, lat]
  tailFootage?: number; // MST tail cable length in feet
}

// Input types
export interface PoleFeature {
  id: string;
  itemType: string;
  label?: string;
  specs?: string;
  poleType?: string; // Pole type from shapefile (Terminal, Tangent, Corner, Junction, etc.)
  location?: { type: "Point"; coordinates: [number, number] };
}

export interface FiberSegmentFeature {
  id: string;
  segmentType: string;
  geometry?: unknown;
}

export interface InfrastructureFeature {
  id: string;
  itemType: string;
  label?: string;
  specs?: string;
  poleType?: string; // Pole type from shapefile (Terminal, Tangent, Corner, Junction, etc.)
  quantity: number;
  location?: { type: "Point"; coordinates: [number, number] };
  tailFootage?: number; // MST tail cable length in feet
}

// ============================================================================
// SHAPEFILE POLE TYPE MAPPING
// ============================================================================

/**
 * Map pole type values from shapefile to AssemblyType.
 * Returns null if the type is unknown or should fall back to auto-detection.
 * 
 * @param shapefileType - The Pole_Type value from the shapefile
 * @returns Mapped AssemblyType or null if unknown
 */
export function mapShapefilePoleType(shapefileType: string): AssemblyType | null {
  if (!shapefileType) return null;
  
  const normalized = shapefileType.toLowerCase().trim();
  
  // Terminal pole variations
  if (
    normalized.includes("terminal") || 
    normalized.includes("dead end") || 
    normalized.includes("deadend") ||
    normalized === "te" ||
    normalized === "term"
  ) {
    return "Terminal Pole";
  }
  
  // Tangent pole variations
  if (
    normalized.includes("tangent") || 
    normalized.includes("straight") ||
    normalized.includes("inline") ||
    normalized.includes("in-line") ||
    normalized === "ta" ||
    normalized === "tang"
  ) {
    return "Tangent Pole";
  }
  
  // Corner pole variations
  if (
    normalized.includes("corner") || 
    normalized.includes("angle") ||
    normalized.includes("turn") ||
    normalized === "co" ||
    normalized === "corn"
  ) {
    return "Corner Pole";
  }
  
  // Junction pole variations
  if (
    normalized.includes("junction") || 
    normalized.includes("branch") || 
    normalized.includes("t-pole") ||
    normalized.includes("tpole") ||
    normalized.includes("3-way") ||
    normalized.includes("3way") ||
    normalized.includes("intersection") ||
    normalized === "ju" ||
    normalized === "junc"
  ) {
    return "Junction Pole";
  }
  
  // Riser variations
  if (
    normalized.includes("riser") ||
    normalized === "ri"
  ) {
    return "Riser";
  }
  
  // Unknown type - fall back to auto-detection
  return null;
}

// ============================================================================
// SPATIAL TOPOLOGY UTILITIES
// ============================================================================

/**
 * Represents a connection between a pole and a strand/fiber segment
 */
export interface SegmentConnection {
  segmentId: string;
  segmentType: string;
  /** The point on the line closest to the pole */
  connectionPoint: Position;
  /** The "outward" point - direction the line goes away from the pole */
  outwardPoint: Position;
  /** Whether this connects at the start of the line */
  isStart: boolean;
  /** Whether this connects at the end of the line */
  isEnd: boolean;
  /** Distance from pole to the connection point in meters */
  distance: number;
}

/**
 * Find all strand/fiber segments that connect to a pole within the snap radius.
 * Uses spatial buffer approach rather than exact coordinate matching.
 * 
 * Enhanced to:
 * - Better detect true endpoints vs mid-line connections
 * - Use stable bearing calculation by sampling points along the segment
 * - Distinguish between terminal poles (at line ends) and pass-through poles
 * 
 * @param poleCoords - [lng, lat] coordinates of the pole
 * @param fiberSegments - Array of fiber/strand segments to check
 * @param radiusMeters - Buffer radius in meters (default: SNAP_RADIUS_METERS)
 * @returns Array of connections found within the buffer
 */
export function findConnectedSegments(
  poleCoords: [number, number],
  fiberSegments: FiberSegmentFeature[],
  radiusMeters: number = SNAP_RADIUS_METERS
): SegmentConnection[] {
  const connections: SegmentConnection[] = [];
  const pt = turfPoint(poleCoords);
  
  for (const seg of fiberSegments) {
    if (!seg.geometry) continue;
    
    const geom = seg.geometry as LineString;
    if (geom.type !== "LineString" || !geom.coordinates || geom.coordinates.length < 2) {
      continue;
    }
    
    try {
      const line = lineString(geom.coordinates);
      
      // Calculate distance from pole to the line
      const distToLine = pointToLineDistance(pt, line, { units: "meters" });
      
      // Skip if line is too far from pole
      if (distToLine > radiusMeters) {
        continue;
      }
      
      // Find the nearest point on the line to the pole
      const snapped = nearestPointOnLine(line, pt);
      const connectionPoint = snapped.geometry.coordinates as Position;
      
      // Determine if connection is at start, end, or middle of line
      // Use stricter ENDPOINT_SNAP_METERS for endpoint detection
      const startCoord = geom.coordinates[0];
      const endCoord = geom.coordinates[geom.coordinates.length - 1];
      
      const distToStart = turfDistance(pt, turfPoint(startCoord as [number, number]), { units: "meters" });
      const distToEnd = turfDistance(pt, turfPoint(endCoord as [number, number]), { units: "meters" });
      
      // Use stricter tolerance for true endpoint detection
      const isAtStart = distToStart <= ENDPOINT_SNAP_METERS;
      const isAtEnd = distToEnd <= ENDPOINT_SNAP_METERS;
      
      // Also track if pole is "near" (within snap radius) for legacy compatibility
      const isNearStart = distToStart <= radiusMeters;
      const isNearEnd = distToEnd <= radiusMeters;
      
      // Determine the "outward" direction using stable bearing calculation
      let outwardPoint: Position;
      let isStart: boolean;
      let isEnd: boolean;
      
      if (isAtStart && !isAtEnd) {
        // Truly at start endpoint - this is a terminal connection from this segment's perspective
        isStart = true;
        isEnd = false;
        // Use stable bearing calculation
        const stableBearing = getStableOutwardBearing(poleCoords, geom, true);
        // Calculate outward point at a reasonable distance in the bearing direction
        const outwardDist = 0.015; // ~15m in degrees (rough approximation)
        outwardPoint = [
          poleCoords[0] + outwardDist * Math.sin(stableBearing * Math.PI / 180),
          poleCoords[1] + outwardDist * Math.cos(stableBearing * Math.PI / 180),
        ];
      } else if (isAtEnd && !isAtStart) {
        // Truly at end endpoint - this is a terminal connection from this segment's perspective
        isStart = false;
        isEnd = true;
        // Use stable bearing calculation
        const stableBearing = getStableOutwardBearing(poleCoords, geom, false);
        const outwardDist = 0.015;
        outwardPoint = [
          poleCoords[0] + outwardDist * Math.sin(stableBearing * Math.PI / 180),
          poleCoords[1] + outwardDist * Math.cos(stableBearing * Math.PI / 180),
        ];
      } else if (isNearStart && !isNearEnd) {
        // Near start but not exactly at endpoint
        isStart = true;
        isEnd = false;
        outwardPoint = geom.coordinates.length > 1 
          ? geom.coordinates[Math.min(2, geom.coordinates.length - 1)]
          : geom.coordinates[0];
      } else if (isNearEnd && !isNearStart) {
        // Near end but not exactly at endpoint
        isStart = false;
        isEnd = true;
        outwardPoint = geom.coordinates.length > 1 
          ? geom.coordinates[Math.max(0, geom.coordinates.length - 3)]
          : geom.coordinates[geom.coordinates.length - 1];
      } else {
        // Connected in middle or at both ends (very short segment)
        // Use the snapped point's index to determine direction
        const snappedIndex = snapped.properties.index || 0;
        if (snappedIndex < geom.coordinates.length / 2) {
          // Closer to start - outward toward end
          isStart = true;
          isEnd = false;
          outwardPoint = endCoord;
        } else {
          // Closer to end - outward toward start
          isStart = false;
          isEnd = true;
          outwardPoint = startCoord;
        }
      }
      
      connections.push({
        segmentId: seg.id,
        segmentType: seg.segmentType,
        connectionPoint,
        outwardPoint,
        isStart,
        isEnd,
        distance: distToLine,
      });
      
    } catch (e) {
      // Skip invalid geometries
      console.warn(`Skipping invalid geometry for segment ${seg.id}:`, e);
      continue;
    }
  }
  
  return connections;
}

// ============================================================================
// BEARING & ANGLE CALCULATION UTILITIES
// ============================================================================

/**
 * Calculate the bearing (heading) from one point to another.
 * Uses Turf.js bearing function for accurate geodesic calculation.
 * 
 * @param from - [lng, lat] starting point
 * @param to - [lng, lat] destination point
 * @returns Bearing in degrees (0-360, where 0=North, 90=East, 180=South, 270=West)
 */
export function calculateBearing(
  from: [number, number] | Position,
  to: [number, number] | Position
): number {
  const fromPt = turfPoint(from as [number, number]);
  const toPt = turfPoint(to as [number, number]);
  
  // Turf bearing returns -180 to 180
  const bearing = turfBearing(fromPt, toPt);
  
  // Normalize to 0-360
  return normalizeBearing(bearing);
}

/**
 * Normalize a bearing to 0-360 degrees
 */
export function normalizeBearing(bearing: number): number {
  let normalized = bearing % 360;
  if (normalized < 0) normalized += 360;
  return normalized;
}

/**
 * Calculate the interior angle between two bearings.
 * This gives the angle at a pole where two lines meet.
 * 
 * For example:
 * - Two lines going opposite directions (in/out): ~180° (straight through = tangent)
 * - Two lines at right angles: ~90° or ~270°
 * - Two lines in same direction: ~0° or ~360° (shouldn't happen for valid connections)
 * 
 * @param bearing1 - First bearing in degrees (0-360)
 * @param bearing2 - Second bearing in degrees (0-360)
 * @returns Interior angle in degrees (0-360)
 */
export function calculateInteriorAngle(bearing1: number, bearing2: number): number {
  // Normalize both bearings
  const b1 = normalizeBearing(bearing1);
  const b2 = normalizeBearing(bearing2);
  
  // Calculate the absolute difference
  let diff = Math.abs(b1 - b2);
  
  // The interior angle is the smaller of the two possible angles
  // But for pole classification, we want the angle between the OUTWARD directions
  // If both connections point outward from the pole, we want the angle between them
  
  // For tangent pole: lines go opposite directions, so outward bearings differ by ~180°
  // Interior angle = 180° means straight through
  
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Determine if an angle indicates a tangent (straight pass-through) pole.
 * A tangent pole has two connections forming approximately 180° (straight line).
 * 
 * @param angle - The interior angle between two connection bearings
 * @param tolerance - Degrees of tolerance from 180° (default: TANGENT_ANGLE_TOLERANCE)
 * @returns true if the angle indicates a tangent configuration
 */
export function isTangentAngle(
  angle: number,
  tolerance: number = TANGENT_ANGLE_TOLERANCE
): boolean {
  // Tangent = angle is close to 180° (lines go opposite directions)
  return angle >= (180 - tolerance) && angle <= (180 + tolerance);
}

/**
 * Calculate a more stable outward bearing by sampling multiple points along the segment.
 * This helps avoid issues with very short segments or segments with many vertices near the pole.
 * 
 * @param poleCoords - [lng, lat] coordinates of the pole
 * @param segment - The line geometry
 * @param isNearStart - Whether the pole is near the start of the line
 * @param sampleDistanceMeters - How far along the line to sample for bearing (default 15m)
 */
function getStableOutwardBearing(
  poleCoords: [number, number],
  segment: LineString,
  isNearStart: boolean,
  sampleDistanceMeters: number = 15
): number {
  const coords = segment.coordinates;
  if (coords.length < 2) {
    return 0;
  }
  
  // Get the point that's approximately sampleDistanceMeters away from the pole
  // along the line in the outward direction
  let targetPoint: Position;
  
  if (isNearStart) {
    // Pole is at start - look toward the end of the line
    // Find the first point that's at least sampleDistanceMeters away
    let accumulatedDistance = 0;
    targetPoint = coords[coords.length - 1]; // Default to end
    
    for (let i = 0; i < coords.length - 1; i++) {
      const segDist = turfDistance(
        turfPoint(coords[i] as [number, number]),
        turfPoint(coords[i + 1] as [number, number]),
        { units: "meters" }
      );
      accumulatedDistance += segDist;
      
      if (accumulatedDistance >= sampleDistanceMeters) {
        targetPoint = coords[i + 1];
        break;
      }
    }
  } else {
    // Pole is at end - look toward the start of the line
    let accumulatedDistance = 0;
    targetPoint = coords[0]; // Default to start
    
    for (let i = coords.length - 1; i > 0; i--) {
      const segDist = turfDistance(
        turfPoint(coords[i] as [number, number]),
        turfPoint(coords[i - 1] as [number, number]),
        { units: "meters" }
      );
      accumulatedDistance += segDist;
      
      if (accumulatedDistance >= sampleDistanceMeters) {
        targetPoint = coords[i - 1];
        break;
      }
    }
  }
  
  return calculateBearing(poleCoords, targetPoint as [number, number]);
}

/**
 * Check if two connection points are close enough to be considered the same physical path.
 * This helps identify when multiple fiber segments (e.g., backbone + strand) share the same route.
 */
function areConnectionsOnSamePath(
  conn1: SegmentConnection,
  conn2: SegmentConnection,
  poleCoords: [number, number],
  bearingTolerance: number = PATH_BEARING_TOLERANCE,
  distanceTolerance: number = PATH_DISTANCE_TOLERANCE
): boolean {
  // Check if outward points are very close together (same physical path)
  const pointDistance = turfDistance(
    turfPoint(conn1.outwardPoint as [number, number]),
    turfPoint(conn2.outwardPoint as [number, number]),
    { units: "meters" }
  );
  
  if (pointDistance <= distanceTolerance) {
    return true;
  }
  
  // Check if bearings are similar
  const bearing1 = calculateBearing(poleCoords, conn1.outwardPoint as [number, number]);
  const bearing2 = calculateBearing(poleCoords, conn2.outwardPoint as [number, number]);
  
  const bearingDiff = Math.abs(normalizeBearing(bearing1) - normalizeBearing(bearing2));
  const normalizedDiff = bearingDiff > 180 ? 360 - bearingDiff : bearingDiff;
  
  return normalizedDiff <= bearingTolerance;
}

/**
 * Deduplicate connections that might be from the same physical path.
 * Multiple fiber segments (different fiber counts) can share the same strand path.
 * This groups by both proximity of connection points and similar bearing.
 * 
 * @param connections - Raw connections found
 * @param poleCoords - Pole coordinates for bearing calculation
 * @param bearingTolerance - Degrees within which bearings are considered same direction
 * @returns Deduplicated connections representing unique physical paths
 */
export function deduplicateConnections(
  connections: SegmentConnection[],
  poleCoords: [number, number],
  bearingTolerance: number = PATH_BEARING_TOLERANCE
): SegmentConnection[] {
  if (connections.length <= 1) return connections;
  
  // Group connections by physical path using union-find approach
  const groups: SegmentConnection[][] = [];
  
  for (const conn of connections) {
    let foundGroup = false;
    
    for (const group of groups) {
      // Check if this connection belongs to any existing group
      if (areConnectionsOnSamePath(conn, group[0], poleCoords, bearingTolerance)) {
        group.push(conn);
        foundGroup = true;
        break;
      }
    }
    
    if (!foundGroup) {
      groups.push([conn]);
    }
  }
  
  // Return one representative from each group (prefer the one closest to pole)
  return groups.map(group => {
    return group.reduce((best, conn) => 
      conn.distance < best.distance ? conn : best
    );
  });
}

/**
 * Extract all endpoints from fiber segments (LineStrings)
 * Returns a list of [lng, lat] coordinates representing line start/end points
 */
export function extractLineEndpoints(fiberSegments: FiberSegmentFeature[]): Position[] {
  const endpoints: Position[] = [];
  
  for (const seg of fiberSegments) {
    if (!seg.geometry) continue;
    
    const geom = seg.geometry as LineString;
    if (geom.type !== "LineString" || !geom.coordinates || geom.coordinates.length < 2) {
      continue;
    }
    
    // Add start and end points
    endpoints.push(geom.coordinates[0]);
    endpoints.push(geom.coordinates[geom.coordinates.length - 1]);
  }
  
  return endpoints;
}

/**
 * Check if a point is near any of the given endpoints
 */
function isNearEndpoint(
  pointCoords: [number, number],
  endpoints: Position[],
  thresholdMeters: number = ENDPOINT_THRESHOLD_METERS
): boolean {
  const pt = turfPoint(pointCoords);
  
  for (const endpoint of endpoints) {
    const endPt = turfPoint(endpoint as [number, number]);
    const dist = turfDistance(pt, endPt, { units: "meters" });
    if (dist <= thresholdMeters) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if a point is along a line (not at endpoints)
 * Returns true if the point is close to the line but not at its endpoints
 */
function isAlongLine(
  pointCoords: [number, number],
  fiberSegments: FiberSegmentFeature[],
  thresholdMeters: number = ENDPOINT_THRESHOLD_METERS
): boolean {
  const pt = turfPoint(pointCoords);
  
  for (const seg of fiberSegments) {
    if (!seg.geometry) continue;
    
    const geom = seg.geometry as LineString;
    if (geom.type !== "LineString" || !geom.coordinates || geom.coordinates.length < 2) {
      continue;
    }
    
    try {
      const line = lineString(geom.coordinates);
      const snapped = nearestPointOnLine(line, pt);
      const dist = turfDistance(pt, snapped, { units: "meters" });
      
      if (dist <= thresholdMeters) {
        return true;
      }
    } catch (e) {
      // Skip invalid geometries
      continue;
    }
  }
  
  return false;
}

/**
 * Pole type detection result with additional metadata
 */
export interface PoleTypeResult {
  type: AssemblyType;
  confidence: "high" | "medium" | "low";
  /** Number of unique strand/fiber connections (graph degree) */
  connectionCount: number;
  /** Interior angle between connections (only for 2-connection poles) */
  interiorAngle?: number;
  /** The connections found for debugging/display */
  connections?: SegmentConnection[];
  /** Reason for the classification (e.g., "From shapefile: Terminal") */
  reason?: string;
}

/**
 * Count how many connections are at true segment endpoints (start or end of line).
 * A terminal pole should have all its connections be at segment endpoints.
 * A pass-through pole would have connections in the middle of segments.
 */
function countEndpointConnections(connections: SegmentConnection[]): {
  atEndpoint: number;
  midLine: number;
} {
  let atEndpoint = 0;
  let midLine = 0;
  
  for (const conn of connections) {
    if (conn.isStart || conn.isEnd) {
      atEndpoint++;
    } else {
      midLine++;
    }
  }
  
  return { atEndpoint, midLine };
}

/**
 * Detect pole type using spatial topology analysis.
 * 
 * This uses an improved "snap, dedupe, and analyze" approach:
 * 1. Buffer Check: Find all strand segments within SNAP_RADIUS_METERS of the pole
 * 2. Path Deduplication: Group segments that share the same physical path
 * 3. Degree Count: Count unique physical paths (graph degree)
 * 4. Endpoint Analysis: Check if connections are at true line endpoints
 * 5. Angle Analysis: For 2-connection poles, calculate the interior angle
 * 
 * Classification:
 * - Degree 0: Terminal (isolated, no strand found - possible data gap)
 * - Degree 1: Terminal (dead end - pole at end of a single fiber run)
 * - Degree 2 + angle ~180° (±25°): Tangent (straight pass-through)
 * - Degree 2 + angle outside 180°±25°: Corner (direction change)
 * - Degree 3+: Junction (T-pole, branch point, intersection)
 */
export function detectPoleType(
  pole: PoleFeature,
  endpoints: Position[], // Legacy parameter, kept for API compatibility
  fiberSegments: FiberSegmentFeature[]
): PoleTypeResult {
  // Handle missing location
  if (!pole.location?.coordinates) {
    return { 
      type: "Intermediate Pole", 
      confidence: "low",
      connectionCount: 0,
    };
  }
  
  // Check if pole type is available from shapefile - use it with high confidence
  if (pole.poleType) {
    const mappedType = mapShapefilePoleType(pole.poleType);
    if (mappedType && (
      mappedType === "Terminal Pole" ||
      mappedType === "Tangent Pole" ||
      mappedType === "Corner Pole" ||
      mappedType === "Junction Pole"
    )) {
      return {
        type: mappedType,
        confidence: "high",
        connectionCount: 0, // Not calculated when using shapefile type
        connections: [],
        reason: `From shapefile: ${pole.poleType}`,
      };
    }
  }
  
  const coords = pole.location.coordinates as [number, number];
  
  // Step 1: Find all segments within the snap radius
  const rawConnections = findConnectedSegments(coords, fiberSegments, SNAP_RADIUS_METERS);
  
  // Step 2: Deduplicate connections by physical path (bearing + proximity)
  // This handles multiple fiber types (backbone, lateral, strand) on the same route
  const connections = deduplicateConnections(rawConnections, coords, PATH_BEARING_TOLERANCE);
  const degree = connections.length;
  
  // Step 3: Analyze endpoint vs mid-line connections
  const { atEndpoint, midLine } = countEndpointConnections(rawConnections);
  
  // Step 4: Classify by degree, endpoint analysis, and angle
  
  // Degree 0: No connections found - isolated pole or data gap
  if (degree === 0) {
    // Fall back to legacy endpoint check for backward compatibility
    if (isNearEndpoint(coords, endpoints)) {
      return { 
        type: "Terminal Pole", 
        confidence: "medium",
        connectionCount: 0,
        connections: [],
      };
    }
    // No connections found at all - likely a data gap, default to low confidence
    return { 
      type: "Intermediate Pole", 
      confidence: "low",
      connectionCount: 0,
      connections: [],
    };
  }
  
  // Degree 1: Single physical path connection - dead end / terminal
  if (degree === 1) {
    // High confidence terminal if the connection is at a true segment endpoint
    const confidence = atEndpoint > 0 ? "high" : "medium";
    return { 
      type: "Terminal Pole", 
      confidence,
      connectionCount: 1,
      connections,
    };
  }
  
  // Degree 2: Two physical path connections - check angle for Tangent vs Corner
  if (degree === 2) {
    const bearing1 = calculateBearing(coords, connections[0].outwardPoint as [number, number]);
    const bearing2 = calculateBearing(coords, connections[1].outwardPoint as [number, number]);
    const angle = calculateInteriorAngle(bearing1, bearing2);
    
    if (isTangentAngle(angle, TANGENT_ANGLE_TOLERANCE)) {
      return { 
        type: "Tangent Pole", 
        confidence: "high",
        connectionCount: 2,
        interiorAngle: angle,
        connections,
      };
    } else {
      return { 
        type: "Corner Pole", 
        confidence: "high",
        connectionCount: 2,
        interiorAngle: angle,
        connections,
      };
    }
  }
  
  // Degree 3+: Junction / T-Pole / Intersection
  // These are where multiple fiber routes meet, branch, or cross
  return { 
    type: "Junction Pole", 
    confidence: "high",
    connectionCount: degree,
    connections,
  };
}

/**
 * Map infrastructure type to assembly type
 */
function mapInfraToAssemblyType(itemType: string, specs?: string): AssemblyType {
  switch (itemType.toLowerCase()) {
    case "pole":
      return "Intermediate Pole"; // Will be refined by detectPoleType
    case "splice":
      return "Splice Case";
    case "mst":
      // Differentiate MST by port count from specs
      if (specs) {
        const specsLower = specs.toLowerCase();
        if (specsLower.includes("2-port") || specsLower.includes("2 port")) {
          return "MST 2-Port";
        }
        if (specsLower.includes("6-port") || specsLower.includes("6 port")) {
          return "MST 6-Port";
        }
      }
      return "MST"; // Generic MST if port count unknown
    case "riser":
      return "Riser";
    case "vault":
      return "Vault";
    case "handhole":
      return "Handhole";
    case "pedestal":
      return "Pedestal";
    case "guy":
    case "anchor":
      return "Guy/Anchor";
    case "crossing":
      return "Crossing";
    case "slack_loop":
      return "Slack Loop";
    default:
      return "Unknown";
  }
}

/**
 * Detect assembly types for all selected infrastructure features
 */
export function detectAssemblyTypes(
  infrastructure: InfrastructureFeature[],
  fiberSegments: FiberSegmentFeature[]
): DetectedAssembly[] {
  const results: DetectedAssembly[] = [];
  
  // Extract all line endpoints for pole detection
  const endpoints = extractLineEndpoints(fiberSegments);
  
  for (const item of infrastructure) {
    let detectedType: AssemblyType;
    let confidence: "high" | "medium" | "low" = "high";
    
    if (item.itemType === "pole") {
      // Special handling for poles - detect terminal vs intermediate
      // Pass poleType from shapefile if available for high-confidence detection
      const detection = detectPoleType(
        {
          id: item.id,
          itemType: item.itemType,
          label: item.label,
          specs: item.specs,
          poleType: item.poleType,
          location: item.location,
        },
        endpoints,
        fiberSegments
      );
      detectedType = detection.type;
      confidence = detection.confidence;
    } else {
      // Map other infrastructure types to assembly types
      detectedType = mapInfraToAssemblyType(item.itemType, item.specs);
    }
    
    results.push({
      featureId: item.id,
      featureType: item.itemType,
      label: item.label,
      detectedAssemblyType: detectedType,
      confidence,
      location: item.location?.coordinates,
      tailFootage: item.tailFootage, // Pass through MST tail footage
    });
  }
  
  return results;
}

/**
 * Get summary counts by assembly type
 */
export function getAssemblyTypeCounts(
  detections: DetectedAssembly[]
): Record<AssemblyType, number> {
  const counts: Record<AssemblyType, number> = {
    "Terminal Pole": 0,
    "Tangent Pole": 0,
    "Corner Pole": 0,
    "Junction Pole": 0,
    "Intermediate Pole": 0,
    "Splice Case": 0,
    "MST": 0,
    "MST 2-Port": 0,
    "MST 6-Port": 0,
    "Riser": 0,
    "Vault": 0,
    "Handhole": 0,
    "Pedestal": 0,
    "Guy/Anchor": 0,
    "Crossing": 0,
    "Slack Loop": 0,
    "Unknown": 0,
  };
  
  for (const detection of detections) {
    // Use override if set, otherwise use detected type
    const type = detection.userOverride || detection.detectedAssemblyType;
    counts[type] = (counts[type] || 0) + 1;
  }
  
  return counts;
}

/**
 * Update user override for a specific feature
 */
export function setAssemblyOverride(
  detections: DetectedAssembly[],
  featureId: string,
  newType: AssemblyType
): DetectedAssembly[] {
  return detections.map(d => 
    d.featureId === featureId 
      ? { ...d, userOverride: newType }
      : d
  );
}

/**
 * Clear user override for a specific feature
 */
export function clearAssemblyOverride(
  detections: DetectedAssembly[],
  featureId: string
): DetectedAssembly[] {
  return detections.map(d => 
    d.featureId === featureId 
      ? { ...d, userOverride: undefined }
      : d
  );
}

/**
 * Get the effective assembly type (override or detected)
 */
export function getEffectiveAssemblyType(detection: DetectedAssembly): AssemblyType {
  return detection.userOverride || detection.detectedAssemblyType;
}
