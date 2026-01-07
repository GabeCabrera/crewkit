import { NextRequest, NextResponse } from "next/server";

/**
 * Simple in-memory rate limiter
 * 
 * Note: This is suitable for single-server deployments.
 * For multi-instance/serverless deployments, use Redis-based rate limiting:
 * - Upstash Rate Limit: https://github.com/upstash/ratelimit
 * - or similar Redis-based solution
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory store - cleared on server restart
const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  rateLimitStore.forEach((record, key) => {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  });
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

/**
 * Check rate limit for a given identifier
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { limit: 100, windowSeconds: 60 }
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const key = identifier;

  let record = rateLimitStore.get(key);

  // Reset if window has passed
  if (!record || now > record.resetTime) {
    record = {
      count: 0,
      resetTime: now + windowMs,
    };
  }

  record.count++;
  rateLimitStore.set(key, record);

  const remaining = Math.max(0, config.limit - record.count);
  const success = record.count <= config.limit;

  return {
    success,
    remaining,
    reset: record.resetTime,
  };
}

/**
 * Get client IP from request
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback
  return "unknown";
}

/**
 * Rate limit middleware helper for API routes
 * 
 * Usage:
 * ```ts
 * export async function POST(request: NextRequest) {
 *   const rateLimitResult = rateLimit(request);
 *   if (rateLimitResult) return rateLimitResult;
 *   // ... rest of handler
 * }
 * ```
 */
export function rateLimit(
  request: NextRequest,
  config: RateLimitConfig = { limit: 100, windowSeconds: 60 }
): NextResponse | null {
  const ip = getClientIp(request);
  const path = new URL(request.url).pathname;
  const identifier = `${ip}:${path}`;

  const result = checkRateLimit(identifier, config);

  if (!result.success) {
    return NextResponse.json(
      { 
        error: "Too many requests. Please try again later.",
        retryAfter: Math.ceil((result.reset - Date.now()) / 1000)
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": config.limit.toString(),
          "X-RateLimit-Remaining": result.remaining.toString(),
          "X-RateLimit-Reset": result.reset.toString(),
          "Retry-After": Math.ceil((result.reset - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  return null;
}

/**
 * Stricter rate limit for authentication routes
 */
export function authRateLimit(request: NextRequest): NextResponse | null {
  return rateLimit(request, { limit: 10, windowSeconds: 60 });
}

/**
 * Rate limit for write operations (POST, PUT, DELETE)
 */
export function writeRateLimit(request: NextRequest): NextResponse | null {
  return rateLimit(request, { limit: 30, windowSeconds: 60 });
}

