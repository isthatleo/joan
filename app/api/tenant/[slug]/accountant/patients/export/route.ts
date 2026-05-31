import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

function escapePdfText(value: unknown) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .slice(0, 120);
}

function createPatientsPdf(rows: any[]) {
  const lines = [
    "Patient Financial Export",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Name | MRN | Invoices | Paid | Outstanding",
    ...rows.slice(0, 45).map((patient) =>
      `${patient.full_name || "Unknown"} | ${patient.mrn || "-"} | ${patient.total_invoices || 0} | ${patient.total_paid || 0} | ${patient.total_outstanding || 0}`
    ),
  ];

  const content = [
    "BT",
    "/F1 10 Tf",
    "50 780 Td",
    ...lines.map((line, index) => `${index === 0 ? "" : "0 -16 Td"}(${escapePdfText(line)}) Tj`),
    "ET",
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf);
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
        COALESCE(SUM(i.amount_due::numeric), 0) as total_outstanding,
        COALESCE(SUM(CASE WHEN pay.status = 'completed' THEN pay.amount::numeric ELSE 0 END), 0) as total_paid
      FROM patients p
      LEFT JOIN invoices i ON p.id = i.patient_id AND i.tenant_id = $1
      LEFT JOIN payments pay ON i.id = pay.invoice_id AND pay.tenant_id = $1
      WHERE p.tenant_id = $1
    `;

    const queryParams: any[] = [tenantId];

    if (ids.length > 0) {
      const placeholders = ids.map((_, i) => `$${i + 2}`).join(",");
      query += ` AND p.id IN (${placeholders})`;
      queryParams.push(...ids);
    }

    query += ` GROUP BY p.id, p.full_name, p.email, p.phone, p.mrn ORDER BY p.full_name ASC`;

    const patients = await db.$queryRaw(query, queryParams);

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
      const pdf = createPatientsPdf(patients as any[]);
      return new NextResponse(pdf, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": "attachment; filename=patients.pdf",
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

