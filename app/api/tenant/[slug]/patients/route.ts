import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";

function formatPatient(patient: typeof patients.$inferSelect) {
  const fullName = [patient.firstName, patient.lastName].filter(Boolean).join(" ").trim();
  const mrn = patient.globalPatientId || null;

  return {
    id: patient.id,
    firstName: patient.firstName || "",
    lastName: patient.lastName || "",
    fullName,
    full_name: fullName,
    email: patient.email || "",
    phone: patient.phone || "",
    dob: patient.dob,
    gender: patient.gender || "",
    address: patient.address || "",
    mrn,
    medicalRecordNumber: mrn,
    createdAt: patient.createdAt,
    updatedAt: patient.updatedAt,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const rows = await db
      .select()
      .from(patients)
      .where(and(eq(patients.tenantId, tenantId), isNull(patients.deletedAt)))
      .orderBy(asc(patients.firstName), asc(patients.lastName))
      .limit(500);

    return NextResponse.json(rows.map(formatPatient));
  } catch (error) {
    console.error("Failed to fetch tenant patients:", error);
    return NextResponse.json({ error: "Failed to fetch patients" }, { status: 500 });
  }
}
