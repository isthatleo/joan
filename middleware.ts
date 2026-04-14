import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Log audit
  await db.insert(auditLogs).values({
    userId: "current-user-id", // Get from session
    action: request.method,
    entity: request.nextUrl.pathname,
    entityId: "id-if-applicable",
    metadata: { query: request.nextUrl.search },
  });

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
