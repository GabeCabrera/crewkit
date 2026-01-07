import { z } from "zod";

/**
 * Environment variable validation schema
 * This ensures all required environment variables are present and valid
 * at build/startup time rather than failing at runtime.
 */
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // NextAuth
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters"),
  NEXTAUTH_URL: z.string().url().optional(),

  // BoxHero (optional)
  BOXHERO_API_TOKEN: z.string().optional(),

  // Node environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

/**
 * Validated environment variables
 * Access these instead of process.env directly for type safety
 */
function validateEnv() {
  // Only validate on server side
  if (typeof window !== "undefined") {
    return {} as z.infer<typeof envSchema>;
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(
      "❌ Invalid environment variables:",
      parsed.error.flatten().fieldErrors
    );
    throw new Error("Invalid environment variables. Check server logs for details.");
  }

  return parsed.data;
}

export const env = validateEnv();

// Type export for use in other files
export type Env = z.infer<typeof envSchema>;

