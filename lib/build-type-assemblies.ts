/**
 * Build Type to Assembly Mapping
 * 
 * Defines which assembly types and material categories are needed
 * for each job build type. Used to filter detected map features
 * and auto-populate BOM.
 */

import type { AssemblyType, DetectedAssembly } from "./assembly-detection";

// ============================================================================
// JOB BUILD TYPE DEFINITIONS
// ============================================================================

export type JobBuildType = "full_build" | "strand_build" | "fiber_build" | "peripheral_build";

export const JOB_BUILD_TYPE_LABELS: Record<JobBuildType, string> = {
  full_build: "Full Build",
  strand_build: "Strand",
  fiber_build: "Fiber",
  peripheral_build: "Peripheral",
};

export const JOB_BUILD_TYPE_DESCRIPTIONS: Record<JobBuildType, string> = {
  full_build: "Complete build including strand, fiber, and all peripherals",
  strand_build: "Strand installation only - pole hardware, strand, anchors, guys",
  fiber_build: "Fiber installation only - lashing, fiber cable, splices on existing strand",
  peripheral_build: "Peripheral work only - MSTs, drops, slack loops",
};

// ============================================================================
// ASSEMBLY TYPE MAPPING BY BUILD TYPE
// ============================================================================

/**
 * Assembly types (slugs) that are included in each build type.
 * Used to filter detected features when calculating BOM.
 */
export const BUILD_TYPE_ASSEMBLY_TYPES: Record<JobBuildType, AssemblyType[] | "*"> = {
  // Full Build - includes everything
  full_build: "*",
  
  // Strand Build - pole attachments, strand hardware, anchors
  strand_build: [
    "strand.terminal",
    "strand.tangent",
    "strand.corner",
    "strand.junction",
    "hardware.anchor",
  ],
  
  // Fiber Build - fiber lashing, pole attachments, splices
  fiber_build: [
    "fiber.terminal",
    "fiber.tangent",
    "fiber.corner",
    "fiber.junction",
    "fiber.splice",
    "underground.riser",
  ],
  
  // Peripheral Build - MSTs, drops, slack loops
  peripheral_build: [
    "service.mst",
    "service.mst2",
    "service.mst6",
    "service.mst8",
    "fiber.slack",
    "service.pedestal",
    "underground.handhole",
    "underground.vault",
  ],
};

/**
 * Infrastructure types from map features that are included in each build type.
 * These map to the itemType field from shapefile parsing.
 */
export const BUILD_TYPE_INFRA_TYPES: Record<JobBuildType, string[] | "*"> = {
  full_build: "*",
  
  strand_build: [
    "pole",
    "guy",
    "anchor",
  ],
  
  fiber_build: [
    "splice",
    "riser",
  ],
  
  peripheral_build: [
    "mst",
    "slack_loop",
    "pedestal",
    "handhole",
    "vault",
    "crossing",
  ],
};

/**
 * Fiber segment types that are included in each build type.
 * These map to the segmentType field from fiber segments.
 */
export const BUILD_TYPE_FIBER_SEGMENTS: Record<JobBuildType, string[] | "*"> = {
  full_build: "*",
  
  strand_build: [
    "strand", // Just the messenger wire
  ],
  
  fiber_build: [
    "backbone",
    "lateral",
  ],
  
  peripheral_build: [
    "mst_tail",
    "drop",
  ],
};

/**
 * Whether conduit/underground is included in each build type.
 */
export const BUILD_TYPE_INCLUDES_UNDERGROUND: Record<JobBuildType, boolean> = {
  full_build: true,
  strand_build: false,
  fiber_build: false,
  peripheral_build: true, // Pedestals, handholes may have conduit connections
};

// ============================================================================
// FILTERING FUNCTIONS
// ============================================================================

/**
 * Check if an assembly type is included in a build type
 */
export function isAssemblyTypeIncluded(
  assemblyType: AssemblyType,
  buildType: JobBuildType
): boolean {
  const included = BUILD_TYPE_ASSEMBLY_TYPES[buildType];
  if (included === "*") return true;
  return included.includes(assemblyType);
}

/**
 * Check if an infrastructure type is included in a build type
 */
export function isInfraTypeIncluded(
  infraType: string,
  buildType: JobBuildType
): boolean {
  const included = BUILD_TYPE_INFRA_TYPES[buildType];
  if (included === "*") return true;
  return included.includes(infraType.toLowerCase());
}

/**
 * Check if a fiber segment type is included in a build type
 */
export function isFiberSegmentIncluded(
  segmentType: string,
  buildType: JobBuildType
): boolean {
  const included = BUILD_TYPE_FIBER_SEGMENTS[buildType];
  if (included === "*") return true;
  return included.includes(segmentType.toLowerCase());
}

/**
 * Filter detected assemblies by build type
 */
export function filterAssembliesByBuildType(
  detectedAssemblies: DetectedAssembly[],
  buildType: JobBuildType
): DetectedAssembly[] {
  if (buildType === "full_build") {
    return detectedAssemblies;
  }
  
  return detectedAssemblies.filter(assembly => {
    // Check by detected assembly type
    const effectiveType = assembly.userOverride || assembly.detectedAssemblyType;
    if (isAssemblyTypeIncluded(effectiveType, buildType)) {
      return true;
    }
    
    // Check by infrastructure type
    if (isInfraTypeIncluded(assembly.featureType, buildType)) {
      return true;
    }
    
    return false;
  });
}

// ============================================================================
// BOM CALCULATION
// ============================================================================

/**
 * Summary of required assemblies for a job
 */
export interface RequiredAssemblySummary {
  assemblyType: AssemblyType;
  quantity: number;
  fromFeatures: string[]; // Feature IDs that contributed to this count
  totalTailFootage?: number; // Total MST tail footage for this assembly type
}

/**
 * Calculate required assemblies from detected features filtered by build type
 */
export function calculateRequiredAssemblies(
  detectedAssemblies: DetectedAssembly[],
  buildType: JobBuildType
): RequiredAssemblySummary[] {
  const filtered = filterAssembliesByBuildType(detectedAssemblies, buildType);
  
  // Group by effective assembly type
  const grouped = new Map<AssemblyType, { quantity: number; fromFeatures: string[]; totalTailFootage: number }>();
  
  for (const assembly of filtered) {
    const effectiveType = assembly.userOverride || assembly.detectedAssemblyType;
    
    if (!grouped.has(effectiveType)) {
      grouped.set(effectiveType, { quantity: 0, fromFeatures: [], totalTailFootage: 0 });
    }
    
    const entry = grouped.get(effectiveType)!;
    entry.quantity += 1;
    entry.fromFeatures.push(assembly.featureId);
    // Aggregate tail footage for MSTs
    if (assembly.tailFootage) {
      entry.totalTailFootage += assembly.tailFootage;
    }
  }
  
  // Convert to array
  return Array.from(grouped.entries()).map(([assemblyType, data]) => ({
    assemblyType,
    quantity: data.quantity,
    fromFeatures: data.fromFeatures,
    totalTailFootage: data.totalTailFootage > 0 ? data.totalTailFootage : undefined,
  }));
}

/**
 * Get assembly type counts filtered by build type
 */
export function getFilteredAssemblyTypeCounts(
  detectedAssemblies: DetectedAssembly[],
  buildType: JobBuildType
): Record<AssemblyType, number> {
  const filtered = filterAssembliesByBuildType(detectedAssemblies, buildType);
  
  const counts: Partial<Record<AssemblyType, number>> = {};
  
  for (const assembly of filtered) {
    const effectiveType = assembly.userOverride || assembly.detectedAssemblyType;
    counts[effectiveType] = (counts[effectiveType] || 0) + 1;
  }
  
  return counts as Record<AssemblyType, number>;
}

// ============================================================================
// FOOTAGE CALCULATION BY BUILD TYPE
// ============================================================================

export interface FilteredFootageSummary {
  aerialFootage: number;
  undergroundFootage: number;
  slackFootage: number;
  totalFootage: number;
  // Breakdown
  strandFootage: number;      // Only for strand_build
  fiberLashFootage: number;   // Only for fiber_build  
  peripheralFootage: number;  // MST tails, drops
}

/**
 * Determine if footage should be included based on build type and segment type
 */
export function shouldIncludeFootage(
  segmentType: string,
  buildType: JobBuildType,
  isUnderground: boolean
): boolean {
  // Check underground inclusion
  if (isUnderground && !BUILD_TYPE_INCLUDES_UNDERGROUND[buildType]) {
    return false;
  }
  
  // Check segment type inclusion
  return isFiberSegmentIncluded(segmentType, buildType);
}
