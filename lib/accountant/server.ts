import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";

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
