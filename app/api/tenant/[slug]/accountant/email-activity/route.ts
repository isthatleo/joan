import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { db } from "@/lib/db";
import { emailSendLog } from "@/lib/db/schema";

type EmailTag = { name?: string; value?: string };

function normalizeTagValue(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  return String(value).trim();
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

    const url = new URL(request.url);
    const status = url.searchParams.get("status")?.trim().toLowerCase();
    const template = url.searchParams.get("template")?.trim();
    const tag = url.searchParams.get("tag")?.trim().toLowerCase();
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(200, Math.max(10, Number(url.searchParams.get("pageSize") || "50")));

    const conditions = [eq(emailSendLog.tenantId, tenantId)];
    if (status) conditions.push(eq(emailSendLog.status, status));
    if (template) conditions.push(eq(emailSendLog.template, template));

    const rows = await db
      .select()
      .from(emailSendLog)
      .where(and(...conditions))
      .orderBy(desc(emailSendLog.createdAt))
      .limit(1000);

    const filteredRows = !tag
      ? rows
      : rows.filter((row) => {
          const tags = Array.isArray((row.metadata as { tags?: EmailTag[] } | null)?.tags)
            ? (((row.metadata as { tags?: EmailTag[] }).tags || []) as EmailTag[])
            : [];

          return tags.some((entry) => {
            const normalizedName = normalizeTagValue(entry.name).toLowerCase();
            const normalizedValue = normalizeTagValue(entry.value).toLowerCase();
            return normalizedName.includes(tag) || normalizedValue.includes(tag);
          });
        });

    const templates = Array.from(new Set(rows.map((row) => row.template).filter(Boolean)));
    const statuses = Array.from(new Set(rows.map((row) => row.status).filter(Boolean)));
    const tags = Array.from(
      new Set(
        rows.flatMap((row) => {
          const rowTags = Array.isArray((row.metadata as { tags?: EmailTag[] } | null)?.tags)
            ? (((row.metadata as { tags?: EmailTag[] }).tags || []) as EmailTag[])
            : [];
          return rowTags
            .flatMap((entry) => [normalizeTagValue(entry.name), normalizeTagValue(entry.value)])
            .filter(Boolean);
        })
      )
    ).sort((a, b) => a.localeCompare(b));
    const paginatedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

    return NextResponse.json({
      items: paginatedRows,
      filters: {
        templates,
        statuses,
        tags,
      },
      pagination: {
        page,
        pageSize,
        total: filteredRows.length,
        totalPages: Math.max(1, Math.ceil(filteredRows.length / pageSize)),
      },
    });
  } catch (error) {
    console.error("Failed to fetch email activity:", error);
    return NextResponse.json({ error: "Failed to fetch email activity" }, { status: 500 });
  }
}
