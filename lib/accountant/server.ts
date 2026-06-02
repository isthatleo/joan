import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { invoiceItems, invoices, payments, tenantSettings, tenants } from "@/lib/db/schema"; // Added invoiceItems, invoices, payments, tenantSettings

export async function getTenantBySlug(slug: string) {
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);

  return tenant ?? null;
}

export async function getTenantIdBySlug(slug: string) {
  const tenant = await getTenantBySlug(slug);
  return tenant?.id ?? null;
}

export async function getInvoiceById(tenantId: string, invoiceId: string) {
  const invoiceData = await db.query.invoices.findFirst({
    where: and(eq(invoices.tenantId, tenantId), eq(invoices.id, invoiceId)),
    with: {
      items: true,
      payments: true,
    },
  });

  return invoiceData;
}

export async function getTenantBrandingSettings(tenantId: string) {
  const brandingSettings = await db.query.tenantSettings.findFirst({
    where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, "branding")),
  });

  const defaultBranding = {
    hospitalName: "Healthcare OS",
    logoUrl: null,
    address: "123 Health St, Medical City, HC 12345",
    contact: "contact@healthcareos.com",
    phone: "+1 (555) 123-4567",
  };

  if (!brandingSettings || !brandingSettings.value) {
    return defaultBranding;
  }

  const value = brandingSettings.value as Record<string, any>;
  return {
    hospitalName: value.hospitalName || defaultBranding.hospitalName,
    logoUrl: value.logoUrl || defaultBranding.logoUrl,
    address: value.address || defaultBranding.address,
    contact: value.contact || defaultBranding.contact,
    phone: value.phone || defaultBranding.phone,
  };
}

export function jsonArray<T>(value: unknown, fallback: T[] = []) {
  if (Array.isArray(value)) return value as T[];
  return fallback;
}

export function toCsv(rows: Array<Array<string | number | null | undefined>>) {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell == null ? "" : String(cell);
          return value.includes(",") || value.includes('"') || value.includes("\n")
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        })
        .join(",")
    )
    .join("\n");
}

export function fileResponse(body: BodyInit, filename: string, contentType: string) {
  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename=${filename}`,
    },
  });
}