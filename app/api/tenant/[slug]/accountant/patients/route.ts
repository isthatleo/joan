import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const slug = resolvedParams.slug;

    if (!slug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    // Get tenant by slug
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const tenantId = tenant.id;

    // Get all patients with their financial information
    const patients = await db.$queryRaw`
      SELECT
        p.id,
        p.full_name,
        p.email,
        p.phone,
        p.mrn,
        p.status,
        COUNT(DISTINCT i.id) as total_invoices,
        COALESCE(SUM(i.amount_due), 0) as total_outstanding,
        COALESCE(SUM(CASE WHEN pay.status = 'completed' THEN pay.amount ELSE 0 END), 0) as total_paid,
        MAX(pay.created_at) as last_payment_date,
        MAX(i.created_at) as last_invoice_date
      FROM patients p
      LEFT JOIN invoices i ON p.id = i.patient_id AND i.tenant_id = ${tenantId}
      LEFT JOIN payments pay ON i.id = pay.invoice_id AND pay.tenant_id = ${tenantId}
      WHERE p.tenant_id = ${tenantId}
      GROUP BY p.id, p.full_name, p.email, p.phone, p.mrn, p.status
      ORDER BY p.full_name ASC
    `;

    const formattedPatients = patients.map((patient: any) => ({
      id: patient.id,
      full_name: patient.full_name,
      email: patient.email,
      phone: patient.phone,
      mrn: patient.mrn,
      status: patient.status || "active",
      totalInvoices: Number(patient.total_invoices || 0),
      totalOutstanding: Number(patient.total_outstanding || 0),
      totalPaid: Number(patient.total_paid || 0),
      lastPaymentDate: patient.last_payment_date,
      lastInvoiceDate: patient.last_invoice_date,
    }));

    return NextResponse.json(formattedPatients);
  } catch (error) {
    console.error("Error fetching accountant patients:", error);
    return NextResponse.json(
      { error: "Failed to fetch patients" },
      { status: 500 }
    );
  }
}

