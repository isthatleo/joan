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

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";
    const ids = searchParams.get("ids")?.split(",") || [];


    // Get patients data
    let query = `
      SELECT
        p.id,
        p.full_name,
        p.email,
        p.phone,
        p.mrn,
        COUNT(DISTINCT i.id) as total_invoices,
        COALESCE(SUM(i.amount_due), 0) as total_outstanding,
        COALESCE(SUM(CASE WHEN pay.status = 'completed' THEN pay.amount ELSE 0 END), 0) as total_paid
      FROM patients p
      LEFT JOIN invoices i ON p.id = i.patient_id AND i.tenant_id = $1
      LEFT JOIN payments pay ON i.id = pay.invoice_id AND pay.tenant_id = $1
      WHERE p.tenant_id = $1
    `;

    const params: any[] = [tenantId];

    if (ids.length > 0) {
      const placeholders = ids.map((_, i) => `$${i + 2}`).join(",");
      query += ` AND p.id IN (${placeholders})`;
      params.push(...ids);
    }

    query += ` GROUP BY p.id, p.full_name, p.email, p.phone, p.mrn ORDER BY p.full_name ASC`;

    const patients = await db.$queryRaw(query, params);

    if (format === "csv") {
      // Generate CSV
      const headers = [
        "Full Name",
        "Email",
        "Phone",
        "MRN",
        "Total Invoices",
        "Total Paid",
        "Outstanding Balance",
      ];
      const rows = (patients as any[]).map((p) => [
        p.full_name,
        p.email,
        p.phone || "",
        p.mrn || "",
        p.total_invoices,
        p.total_paid,
        p.total_outstanding,
      ]);

      const csv = [
        headers.join(","),
        ...rows.map((row) =>
          row
            .map((cell) =>
              typeof cell === "string" && cell.includes(",")
                ? `"${cell}"`
                : cell
            )
            .join(",")
        ),
      ].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=patients.csv",
        },
      });
    } else if (format === "pdf") {
      // For now, return a simple text-based PDF info
      // In production, use a library like pdfkit
      return new NextResponse("PDF export coming soon", {
        headers: {
          "Content-Type": "text/plain",
        },
      });
    }

    return NextResponse.json(patients);
  } catch (error) {
    console.error("Error exporting patients:", error);
    return NextResponse.json(
      { error: "Failed to export patients" },
      { status: 500 }
    );
  }
}

