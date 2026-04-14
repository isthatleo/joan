import { NextRequest, NextResponse } from "next/server";
import { PharmacyService } from "@/lib/services/pharmacy.service";

const service = new PharmacyService();

export async function GET(request: NextRequest) {
  try {
    const inventory = await service.getInventory("tenant-id");
    return NextResponse.json(inventory);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
  }
}
