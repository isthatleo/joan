import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { createReportTemplate, listReportTemplates } from "@/lib/accountant/report-service";
import { parseJsonBody, validateFinancePayload } from "@/lib/accountant/finance-api";
import { reportTemplateCreateSchema } from "@/lib/accountant/route-schemas";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const rows = await listReportTemplates(tenantId);
    return NextResponse.json(
      rows.map((row) => ({
        id: row.id,
        key: row.key,
        name: row.name,
        type: row.type,
        category: row.category,
        description: row.description || "",
        frequency: row.frequency,
        estimatedTime: row.estimatedTime || "1-2 minutes",
        config: row.config || {},
        isSystem: row.isSystem,
      }))
    );
  } catch (error) {
    console.error("Failed to fetch report templates:", error);
    return NextResponse.json({ error: "Failed to fetch report templates" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const jsonResult = await parseJsonBody(request);
    if (!jsonResult.ok) return jsonResult.response;
    const parsed = validateFinancePayload(reportTemplateCreateSchema, jsonResult.data);
    if (!parsed.ok) return parsed.response;

    const baseKey =
      parsed.data.key ||
      parsed.data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    const created = await createReportTemplate(tenantId, {
      key: `${baseKey}-${Date.now()}`,
      name: parsed.data.name,
      type: parsed.data.type,
      category: parsed.data.category,
      description: parsed.data.description,
      frequency: parsed.data.frequency,
      estimatedTime: parsed.data.estimatedTime,
      config: parsed.data.config,
      isSystem: false,
    });

    return NextResponse.json({ id: created.id, success: true }, { status: 201 });
  } catch (error) {
    console.error("Failed to create report template:", error);
    return NextResponse.json({ error: "Failed to create report template" }, { status: 500 });
  }
}
