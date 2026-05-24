import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, ilike, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventoryItems } from "@/lib/db/schema";
import { resolveDoctorContext } from "@/lib/doctor/server";
import { buildStockInfo, deriveMedicationMetadata } from "@/lib/doctor/prescriptions";

export async function GET(request: NextRequest) {
  const context = await resolveDoctorContext(request.headers);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const { doctor } = context;
  if (!doctor.tenantId) {
    return NextResponse.json({ error: "No tenant context" }, { status: 400 });
  }

  try {
    const search = request.nextUrl.searchParams.get("search")?.trim() || "";
    const rows = await db
      .select({
        id: inventoryItems.id,
        name: inventoryItems.name,
        stock: inventoryItems.stock,
        expiryDate: inventoryItems.expiryDate,
      })
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.tenantId, doctor.tenantId),
          isNull(inventoryItems.deletedAt),
          search ? ilike(inventoryItems.name, `%${search}%`) : undefined
        )
      )
      .orderBy(asc(inventoryItems.name))
      .limit(25);

    const medications = rows.map((row) => {
      const meta = deriveMedicationMetadata(row.name);
      return {
        id: row.id,
        name: meta.displayName,
        genericName: meta.genericName,
        strength: meta.strength,
        category: "Medication",
        dosage: meta.strength,
        manufacturer: null,
        stockInfo: buildStockInfo(row.stock),
        expiryDate: row.expiryDate,
      };
    });

    return NextResponse.json({ medications });
  } catch (error) {
    console.error("Doctor prescription medications API error:", error);
    return NextResponse.json({ error: "Failed to fetch medications" }, { status: 500 });
  }
}
