import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

/**
 * Centralized error handler for API routes
 * Automatically captures errors and provides formatted responses
 */
export function handleApiError(error: unknown, context: string) {
  console.error(`[API Error] ${context}:`, error);

  if (process.env.NODE_ENV === "production") {
    Sentry.captureException(error, {
      tags: {
        context,
        apiEndpoint: true,
      },
    });
  }

  if (error instanceof Error) {
    return NextResponse.json(
      {
        error: error.message,
        context,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      error: "An unexpected error occurred",
      context,
      timestamp: new Date().toISOString(),
    },
    { status: 500 }
  );
}

/**
 * Format successful API response
 */
export function successApiResponse(data: any, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Format error API response
 */
export function errorApiResponse(message: string, status = 400, details?: any) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(details && { details }),
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Validate request has required authentication
 */
export function validateAuthHeader(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Safely parse JSON request body
 */
export async function safeParseJson(request: NextRequest) {
  try {
    return await request.json();
  } catch (error) {
    throw new Error("Invalid JSON in request body");
  }
}

/**
 * Create paginated response
 */
export function createPaginatedResponse(
  items: any[],
  total: number,
  limit: number,
  offset: number
) {
  return {
    items,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
      pages: Math.ceil(total / limit),
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Rate limit check (simplified client-side tracking)
 */
const rateLimitMap = new Map<string, number[]>();

export function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const requests = rateLimitMap.get(identifier) || [];

  // Remove old requests outside window
  const recentRequests = requests.filter((time) => now - time < windowMs);

  if (recentRequests.length >= limit) {
    return false;
  }

  recentRequests.push(now);
  rateLimitMap.set(identifier, recentRequests);

  return true;
}

/**
 * Log API request metrics
 */
export function logApiMetrics(
  method: string,
  path: string,
  status: number,
  duration: number
) {
  const logLevel = status < 400 ? "info" : status < 500 ? "warn" : "error";
  console.log(
    `[${method}] ${path} - ${status} (${duration}ms)`
  );
}

/**
 * Get client IP address
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0] : "unknown";
}

