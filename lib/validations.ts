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
  role: z.enum(["ADMIN", "MANAGER", "FIELD"], {
    errorMap: () => ({ message: "Role must be ADMIN, MANAGER, or FIELD" }),
  }),
  teamId: z.string().cuid().optional().nullable(),
});

export const updateUserSchema = z.object({
  email: z.string().email("Invalid email format").optional(),
  name: z.string().min(1).max(100).optional(),
  password: z.string().min(8).max(100).optional(),
  role: z.enum(["ADMIN", "MANAGER", "FIELD"]).optional(),
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
  status: z.enum(["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED"]).optional(),
});

export const updateAssemblySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  items: z.array(assemblyItemSchema).min(1).optional(),
  categories: z.array(z.string()).optional(),
  status: z.enum(["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED"]).optional(),
});

// ==========================================
// Assembly Usage Schema
// ==========================================
export const createAssemblyUsageSchema = z.object({
  assemblyId: z.string().cuid("Invalid assembly ID"),
  quantity: z.number().int().min(1, "Quantity must be at least 1").default(1),
  modifiers: z.record(z.any()).optional().nullable(),
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

