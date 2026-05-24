export type MedicationStockStatus = "in_stock" | "low_stock" | "out_of_stock";

export function parseStockAmount(value: string | null | undefined) {
  const amount = Number(value || "0");
  return Number.isFinite(amount) ? amount : 0;
}

export function deriveMedicationMetadata(name: string | null | undefined) {
  const normalized = String(name || "").trim();
  const strengthMatch = normalized.match(/(\d+(?:\.\d+)?\s?(?:mg|mcg|g|ml|iu|units|%))/i);
  const genericName = normalized.replace(/\s*[\(\-].*$/, "").trim() || normalized || null;

  return {
    displayName: normalized,
    genericName,
    strength: strengthMatch?.[1] ?? null,
  };
}

export function buildStockInfo(stock: string | null | undefined) {
  const totalQuantity = parseStockAmount(stock);
  const minStockLevel = 10;
  let status: MedicationStockStatus = "in_stock";

  if (totalQuantity <= 0) {
    status = "out_of_stock";
  } else if (totalQuantity <= minStockLevel) {
    status = "low_stock";
  }

  return {
    totalQuantity,
    minStockLevel,
    isLowStock: status === "low_stock",
    isOutOfStock: status === "out_of_stock",
    status,
  };
}

export function formatPatientName(firstName: string | null | undefined, lastName: string | null | undefined) {
  return `${firstName || ""} ${lastName || ""}`.trim() || "Unknown patient";
}
