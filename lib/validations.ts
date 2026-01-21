import { z } from "zod";

/**
 * Centralized validation schemas for API input validation
 */

// ==========================================
// User Schemas
// ==========================================
export const createUserSchema = z.object({
  email: z.string().email("Invalid email format"),
  name: z.string().min(1, "Name is required").max(100, "Name too long").optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password too long"),
  role: z.enum(["SUPERUSER", "ADMIN", "MANAGER", "FIELD"], {
    errorMap: () => ({ message: "Role must be SUPERUSER, ADMIN, MANAGER, or FIELD" }),
  }),
  teamId: z.string().cuid().optional().nullable(),
});

export const updateUserSchema = z.object({
  email: z.string().email("Invalid email format").optional(),
  name: z.string().min(1).max(100).optional(),
  password: z.string().min(8).max(100).optional(),
  role: z.enum(["SUPERUSER", "ADMIN", "MANAGER", "FIELD"]).optional(),
  teamId: z.string().cuid().optional().nullable(),
});

// ==========================================
// Team Schemas
// ==========================================
export const createTeamSchema = z.object({
  name: z
    .string()
    .min(1, "Team name is required")
    .max(100, "Team name too long")
    .transform((val) => val.trim()),
});

export const updateTeamSchema = z.object({
  name: z
    .string()
    .min(1, "Team name is required")
    .max(100, "Team name too long")
    .transform((val) => val.trim())
    .optional(),
});

// ==========================================
// Assembly Schemas
// ==========================================
export const assemblyItemSchema = z.object({
  equipmentId: z.string().cuid("Invalid equipment ID"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
});

export const createAssemblySchema = z.object({
  name: z
    .string()
    .min(1, "Assembly name is required")
    .max(200, "Assembly name too long"),
  description: z.string().max(1000, "Description too long").optional().nullable(),
  items: z
    .array(assemblyItemSchema)
    .min(1, "At least one item is required"),
  categories: z.array(z.string()).optional().default([]),
  categoryId: z.string().cuid("Invalid category ID").optional().nullable(),
  typeId: z.string().cuid("Invalid type ID").optional().nullable(),
  status: z.enum(["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED"]).optional(),
});

export const updateAssemblySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  items: z.array(assemblyItemSchema).min(1).optional(),
  categories: z.array(z.string()).optional(),
  categoryId: z.string().cuid("Invalid category ID").optional().nullable(),
  typeId: z.string().cuid("Invalid type ID").optional().nullable(),
  status: z.enum(["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED"]).optional(),
});

// ==========================================
// Assembly Usage Schema
// ==========================================
export const assemblyUsageModifierSchema = z.object({
  equipmentId: z.string().cuid("Invalid equipment ID"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
});

export const createAssemblyUsageSchema = z.object({
  assemblyId: z.string().cuid("Invalid assembly ID"),
  quantity: z.number().int().min(1, "Quantity must be at least 1").default(1),
  modifiers: z.array(assemblyUsageModifierSchema).optional().nullable(),
  date: z.string().datetime().optional(),
});

// ==========================================
// Equipment Schemas
// ==========================================
export const updateEquipmentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  pricePerUnit: z.number().min(0).optional(),
  unitType: z.enum(["UNIT", "BOX", "CASE", "PALLET", "FOOT", "YARD", "POUND", "OTHER"]).optional(),
  isArchived: z.boolean().optional(),
});

// ==========================================
// Report Schemas
// ==========================================
export const createEodReportSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
  teamId: z.string().cuid("Invalid team ID"),
  workersPresent: z.array(z.string().cuid()).min(1, "At least one worker required"),
  notes: z.string().max(2000).optional().nullable(),
  issues: z.string().max(2000).optional().nullable(),
});

// ==========================================
// Job Plan Schemas
// ==========================================
export const jobPlanStatusSchema = z.enum(["DRAFT", "READY", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);
export const jobPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
export const issueSeveritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

export type JobPlanStatus = z.infer<typeof jobPlanStatusSchema>;

// Job Plan creation - permits are now managed via dynamic JobPermit system
export const createJobPlanSchema = z.object({
  // Route Details
  // jobName is optional if projectAreaId is provided (will be auto-generated)
  jobName: z.string().min(1, "Job name is required").max(200, "Job name too long").optional(),
  jobNumber: z.string().max(50, "Job number too long").optional().nullable(),
  locationName: z.string().max(200, "Location name too long").optional().nullable(),
  vetroProjectUrl: z.string().url("Invalid URL format").max(500, "URL too long").optional().nullable().or(z.literal("")),
  totalDistance: z.number().min(0, "Distance must be 0 or greater").default(0),
  poleCount: z.number().int().min(0, "Pole count must be 0 or greater").default(0),
  
  // Project Area for standardized naming (auto-generates jobName)
  projectAreaId: z.string().cuid("Invalid project area ID").optional().nullable(),
  
  // Materials (optional with defaults)
  strandFootage: z.number().min(0).optional(),
  fiberFootage: z.number().min(0).optional(),
  deadEnds: z.number().int().min(0).optional().default(0),
  tangents: z.number().int().min(0).optional().default(0),
  anchors: z.number().int().min(0).optional().default(0),
  
  // Legacy permit fields (optional, kept for backwards compatibility)
  // New dynamic permits are managed via JobPermit relation
  rmpPermitApproved: z.boolean().optional().default(false),
  sesdPermitApproved: z.boolean().optional().default(false),
  makeReadyComplete: z.boolean().optional().default(false),
  easementsClear: z.boolean().optional().default(false),
  
  // Hazards (optional with defaults)
  trafficControl: z.boolean().optional().default(false),
  treeTrimming: z.boolean().optional().default(false),
  animalHazards: z.boolean().optional().default(false),
  waterRailCrossing: z.boolean().optional().default(false),
  foremanNotes: z.string().max(2000).optional().nullable(),
  
  // Scheduling (optional)
  plannedStartDate: z.string().datetime().optional().nullable(),
  plannedEndDate: z.string().datetime().optional().nullable(),
  estimatedDuration: z.number().min(0).optional().nullable(),
  durationUnit: z.enum(["hours", "days"]).optional().nullable(),
  
  // Status/Priority (optional with defaults)
  status: jobPlanStatusSchema.optional().default("DRAFT"),
  priority: jobPrioritySchema.optional().default("MEDIUM"),
}).refine(
  (data) => data.jobName || data.projectAreaId,
  { message: "Either jobName or projectAreaId is required", path: ["jobName"] }
);

// ==========================================
// Job Status Transition Validation
// ==========================================

// Type for permit data in validation
export interface PermitForValidation {
  id: string;
  isApproved: boolean;
}

// Type for job data used in status transition validation
export interface JobForStatusValidation {
  status: JobPlanStatus;
  // Legacy permit fields (for backwards compatibility)
  rmpPermitApproved?: boolean;
  sesdPermitApproved?: boolean;
  makeReadyComplete?: boolean;
  easementsClear?: boolean;
  // Red Light Check fields
  redLightDotPermit?: boolean;
  redLightRowConfirmed?: boolean;
  redLightPowerLines?: boolean;
  redLightTrafficControl?: boolean;
  redLightPrintVerified?: boolean;
  redLightCleared?: boolean;
  // New dynamic permits
  permits?: PermitForValidation[];
  // Route info
  jobName: string;
  jobNumber?: string | null;
  locationName?: string | null;
  vetroProjectUrl?: string | null;
  totalDistance: number;
  poleCount?: number;
  plannedStartDate: string | Date | null;
  assignments?: { id: string }[];
}

// Check if Red Light Check is cleared (new system)
export function isRedLightCleared(job: JobForStatusValidation): boolean {
  const zoneACleared = (job.redLightDotPermit ?? false) && (job.redLightRowConfirmed ?? false);
  const zoneBCleared = (job.redLightPowerLines ?? false) && (job.redLightTrafficControl ?? false);
  const zoneCCleared = job.redLightPrintVerified ?? false;
  return zoneACleared && zoneBCleared && zoneCCleared;
}

// Check if all permits are verified
// Uses Red Light Check if available, then dynamic permits, falls back to legacy boolean fields
export function hasAllPermitsVerified(job: JobForStatusValidation): boolean {
  // First, check if Red Light Check fields are set (new system)
  const hasRedLightFields = 
    job.redLightDotPermit !== undefined || 
    job.redLightRowConfirmed !== undefined ||
    job.redLightPowerLines !== undefined ||
    job.redLightTrafficControl !== undefined ||
    job.redLightPrintVerified !== undefined;
  
  if (hasRedLightFields) {
    return isRedLightCleared(job);
  }
  
  // If job has dynamic permits, use those
  if (job.permits && job.permits.length > 0) {
    return job.permits.every(permit => permit.isApproved);
  }
  
  // Fall back to legacy boolean fields for backwards compatibility
  return Boolean(
    job.rmpPermitApproved &&
    job.sesdPermitApproved &&
    job.makeReadyComplete &&
    job.easementsClear
  );
}

// Check if route details are complete
export function hasRouteComplete(job: JobForStatusValidation): boolean {
  return (
    !!job.jobName &&
    job.jobName.trim() !== "" &&
    job.totalDistance > 0
  );
}

// Check if crew is assigned
export function hasCrewAssigned(job: JobForStatusValidation): boolean {
  return Array.isArray(job.assignments) && job.assignments.length > 0;
}

// Check if job is scheduled
export function hasSchedule(job: JobForStatusValidation): boolean {
  return job.plannedStartDate != null;
}

// Validation result type
export interface StatusTransitionResult {
  valid: boolean;
  error?: string;
  missingRequirements?: string[];
}

// Validate status transition
export function validateStatusTransition(
  job: JobForStatusValidation,
  newStatus: JobPlanStatus
): StatusTransitionResult {
  const currentStatus = job.status;
  
  // Same status - always allowed
  if (currentStatus === newStatus) {
    return { valid: true };
  }

  // CANCELLED - allowed from DRAFT or READY
  if (newStatus === "CANCELLED") {
    if (currentStatus === "DRAFT" || currentStatus === "READY") {
      return { valid: true };
    }
    return {
      valid: false,
      error: "Can only cancel jobs that are in Draft or Ready status",
    };
  }

  // COMPLETED - only from IN_PROGRESS
  if (newStatus === "COMPLETED") {
    if (currentStatus === "IN_PROGRESS") {
      return { valid: true };
    }
    return {
      valid: false,
      error: "Can only complete jobs that are In Progress",
    };
  }

  // READY - requires permits + route
  if (newStatus === "READY") {
    const missing: string[] = [];
    
    if (!hasAllPermitsVerified(job)) {
      missing.push("All permits must be verified");
    }
    if (!hasRouteComplete(job)) {
      missing.push("Route details must be complete (name, poles, distance)");
    }
    
    if (missing.length > 0) {
      return {
        valid: false,
        error: `Cannot move to Ready: ${missing.join(", ")}`,
        missingRequirements: missing,
      };
    }
    return { valid: true };
  }

  // IN_PROGRESS - requires READY status + crew + schedule
  if (newStatus === "IN_PROGRESS") {
    const missing: string[] = [];
    
    // Must come from READY status
    if (currentStatus !== "READY") {
      missing.push("Job must be in Ready status first");
    }
    
    if (!hasCrewAssigned(job)) {
      missing.push("At least one crew member must be assigned");
    }
    if (!hasSchedule(job)) {
      missing.push("Start date must be scheduled");
    }
    
    if (missing.length > 0) {
      return {
        valid: false,
        error: `Cannot move to In Progress: ${missing.join(", ")}`,
        missingRequirements: missing,
      };
    }
    return { valid: true };
  }

  // DRAFT - going back to draft (only from READY)
  if (newStatus === "DRAFT") {
    if (currentStatus === "READY") {
      return { valid: true };
    }
    return {
      valid: false,
      error: "Can only move back to Draft from Ready status",
    };
  }

  return { valid: false, error: "Invalid status transition" };
}

// Get available status options for a job
export function getAvailableStatusOptions(job: JobForStatusValidation): {
  status: JobPlanStatus;
  available: boolean;
  reason?: string;
}[] {
  const statuses: JobPlanStatus[] = ["DRAFT", "READY", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
  
  return statuses.map((status) => {
    const result = validateStatusTransition(job, status);
    return {
      status,
      available: result.valid,
      reason: result.error,
    };
  });
}

export const updateJobPlanSchema = z.object({
  // Route Details
  jobName: z.string().min(1).max(200).optional(),
  jobNumber: z.string().max(50).optional().nullable(),
  locationName: z.string().max(200).optional().nullable(),
  locationAddress: z.string().max(500).optional().nullable(),
  locationLat: z.number().min(-90).max(90).optional().nullable(),
  locationLng: z.number().min(-180).max(180).optional().nullable(),
  vetroProjectUrl: z.string().url().max(500).optional().nullable().or(z.literal("")),
  
  // Build Spec
  primaryMethod: z.enum(["aerial", "underground", "both"]).optional().nullable(),
  constructionType: z.enum(["new_strand", "overlash", "adss", "ug_dip"]).optional().nullable(),
  cableProfile: z.string().max(100).optional().nullable(),
  sagTensionSpec: z.string().max(200).optional().nullable(),
  
  // Scope Breakdown
  totalDistance: z.number().min(0).optional(),
  aerialFootage: z.number().min(0).optional(),
  undergroundFootage: z.number().min(0).optional(),
  slackLoopFootage: z.number().min(0).optional(),
  poleCount: z.number().int().min(0).optional(),
  makeReadyRequired: z.boolean().optional(),
  
  // Access & Logistics
  gateCode: z.string().max(100).optional().nullable(),
  poleOwner: z.string().max(200).optional().nullable(),
  trafficControlTier: z.enum(["none", "cones", "flaggers"]).optional().nullable(),
  siteContactName: z.string().max(100).optional().nullable(),
  siteContactPhone: z.string().max(50).optional().nullable(),
  
  // Materials
  strandFootage: z.number().min(0).optional(),
  fiberFootage: z.number().min(0).optional(),
  deadEnds: z.number().int().min(0).optional(),
  tangents: z.number().int().min(0).optional(),
  anchors: z.number().int().min(0).optional(),
  
  // Legacy Permits (kept for backwards compatibility)
  rmpPermitApproved: z.boolean().optional(),
  sesdPermitApproved: z.boolean().optional(),
  makeReadyComplete: z.boolean().optional(),
  easementsClear: z.boolean().optional(),
  
  // Red Light Check - Zone A (Legal)
  redLightDotPermit: z.boolean().optional(),
  redLightRowConfirmed: z.boolean().optional(),
  dotPermitNumber: z.string().max(100).optional().nullable(),
  rowConfirmationNotes: z.string().max(2000).optional().nullable(),
  
  // Red Light Check - Zone B (Safety)
  redLightPowerLines: z.boolean().optional(),
  redLightTrafficControl: z.boolean().optional(),
  powerLineNotes: z.string().max(2000).optional().nullable(),
  
  // Red Light Check - Zone C (Design)
  redLightPrintVerified: z.boolean().optional(),
  printVerificationNotes: z.string().max(2000).optional().nullable(),
  
  // Red Light Master Status (auto-computed, but can be overridden)
  redLightCleared: z.boolean().optional(),
  redLightClearedAt: z.string().datetime().optional().nullable(),
  redLightClearedById: z.string().cuid().optional().nullable(),
  
  // Hazards
  trafficControl: z.boolean().optional(),
  treeTrimming: z.boolean().optional(),
  animalHazards: z.boolean().optional(),
  waterRailCrossing: z.boolean().optional(),
  foremanNotes: z.string().max(2000).optional().nullable(),
  
  // Scheduling
  plannedStartDate: z.string().datetime().optional().nullable(),
  plannedEndDate: z.string().datetime().optional().nullable(),
  estimatedDuration: z.number().min(0).optional().nullable(),
  durationUnit: z.enum(["hours", "days"]).optional().nullable(),
  
  // Construction actuals
  actualFootage: z.number().min(0).optional(),
  actualPolesComplete: z.number().int().min(0).optional(),
  actualStrandUsed: z.number().min(0).optional(),
  actualFiberUsed: z.number().min(0).optional(),
  actualDeadEnds: z.number().int().min(0).optional(),
  actualTangents: z.number().int().min(0).optional(),
  actualAnchors: z.number().int().min(0).optional(),
  totalCrewHours: z.number().min(0).optional(),
  
  // Reporting
  foremanSignoff: z.boolean().optional(),
  signoffDate: z.string().datetime().optional().nullable(),
  lessonsLearned: z.string().max(5000).optional().nullable(),
  completedAt: z.string().datetime().optional().nullable(),
  
  // Status/Priority
  status: jobPlanStatusSchema.optional(),
  priority: jobPrioritySchema.optional(),
});

// Daily Progress Log Schema
export const createProgressLogSchema = z.object({
  date: z.string().datetime("Invalid date format"),
  footage: z.number().min(0, "Footage must be positive"),
  poles: z.number().int().min(0, "Poles must be positive").optional().default(0),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateProgressLogSchema = z.object({
  footage: z.number().min(0).optional(),
  poles: z.number().int().min(0).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

// Material Usage Log Schema
export const createMaterialLogSchema = z.object({
  date: z.string().datetime("Invalid date format"),
  strand: z.number().min(0).optional().nullable(),
  fiber: z.number().min(0).optional().nullable(),
  deadEnds: z.number().int().min(0).optional().nullable(),
  tangents: z.number().int().min(0).optional().nullable(),
  anchors: z.number().int().min(0).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

// Crew Hours Log Schema
export const createCrewHoursLogSchema = z.object({
  date: z.string().datetime("Invalid date format"),
  userId: z.string().cuid("Invalid user ID"),
  userName: z.string().max(100).optional().nullable(),
  hours: z.number().min(0, "Hours must be positive").max(24, "Hours cannot exceed 24"),
  notes: z.string().max(2000).optional().nullable(),
});

// Issue Log Schema
export const createIssueLogSchema = z.object({
  date: z.string().datetime("Invalid date format"),
  description: z.string().min(1, "Description is required").max(2000, "Description too long"),
  severity: issueSeveritySchema.optional().default("MEDIUM"),
});

export const updateIssueLogSchema = z.object({
  description: z.string().min(1).max(2000).optional(),
  severity: issueSeveritySchema.optional(),
  resolved: z.boolean().optional(),
});

// ==========================================
// Utility: Validate and parse with error response
// ==========================================
export function validateRequest<T>(
  schema: z.Schema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string; details: z.ZodError } {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const errorMessages = result.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join(", ");
    return { success: false, error: errorMessages, details: result.error };
  }
  
  return { success: true, data: result.data };
}

// Type exports for use in route handlers
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type CreateAssemblyInput = z.infer<typeof createAssemblySchema>;
export type UpdateAssemblyInput = z.infer<typeof updateAssemblySchema>;
export type CreateAssemblyUsageInput = z.infer<typeof createAssemblyUsageSchema>;
export type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>;
export type CreateEodReportInput = z.infer<typeof createEodReportSchema>;
export type CreateJobPlanInput = z.infer<typeof createJobPlanSchema>;
export type UpdateJobPlanInput = z.infer<typeof updateJobPlanSchema>;
export type CreateProgressLogInput = z.infer<typeof createProgressLogSchema>;
export type UpdateProgressLogInput = z.infer<typeof updateProgressLogSchema>;
export type CreateMaterialLogInput = z.infer<typeof createMaterialLogSchema>;
export type CreateCrewHoursLogInput = z.infer<typeof createCrewHoursLogSchema>;
export type CreateIssueLogInput = z.infer<typeof createIssueLogSchema>;
export type UpdateIssueLogInput = z.infer<typeof updateIssueLogSchema>;

