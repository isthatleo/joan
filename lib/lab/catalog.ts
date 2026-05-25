import { db } from "@/lib/db";
import { labOrders, tenantSettings } from "@/lib/db/schema";
import { and, desc, eq, isNull, sql } from "drizzle-orm";

export type LabCatalogItem = {
  id: string;
  name: string;
  code: string;
  category: string;
  turnaroundTime: string;
  price: number;
  usageCount: number;
};

function normalizeCatalogItem(item: any, fallbackIndex: number): LabCatalogItem {
  return {
    id: String(item.id || item.code || item.name || `catalog-${fallbackIndex}`),
    name: String(item.name || item.testName || "Unnamed test"),
    code: String(item.code || item.testCode || `TEST-${fallbackIndex + 1}`),
    category: String(item.category || "General"),
    turnaroundTime: String(item.turnaroundTime || "24h"),
    price: Number(item.price || 0),
    usageCount: Number(item.usageCount || 0),
  };
}

export async function getLabCatalog(tenantId: string): Promise<LabCatalogItem[]> {
  const storedCatalog = await db.query.tenantSettings.findFirst({
    where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, "lab_test_catalog")),
  });

  const storedItems = Array.isArray(storedCatalog?.value) ? storedCatalog.value.map(normalizeCatalogItem) : [];
  if (storedItems.length) {
    return storedItems;
  }

  const rows = await db
    .select({
      name: labOrders.testName,
      code: labOrders.testCode,
      category: labOrders.category,
      usageCount: sql<number>`count(*)::int`,
    })
    .from(labOrders)
    .where(and(eq(labOrders.tenantId, tenantId), isNull(labOrders.deletedAt)))
    .groupBy(labOrders.testName, labOrders.testCode, labOrders.category)
    .orderBy(desc(sql`count(*)`));

  return rows.map((row, index) =>
    normalizeCatalogItem(
      {
        id: row.code || row.name || `catalog-${index}`,
        name: row.name,
        code: row.code,
        category: row.category,
        turnaroundTime: "24h",
        price: 0,
        usageCount: row.usageCount,
      },
      index
    )
  );
}
