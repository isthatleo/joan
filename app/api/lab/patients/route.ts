import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { resolveLabContext } from "@/lib/lab/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const context = await resolveLabContext(request.headers, slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });

  const rows = await db.query.patients.findMany({
    where: and(eq(patients.tenantId, context.technician.tenantId), isNull(patients.deletedAt)),
    orderBy: desc(patients.updatedAt),
    limit: 100,
  });

  return NextResponse.json({
    patients: rows.map((patient) => ({
      id: patient.id,
      firstName: patient.firstName || "",
      lastName: patient.lastName || "",
      fullName: patient.fullName || `${patient.firstName || ""} ${patient.lastName || ""}`.trim(),
    })),
  });
}
