import { NextRequest, NextResponse } from "next/server";
import { getReceptionQueue, getTenantBySlug } from "@/lib/receptionist/data";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const queue = await getReceptionQueue(tenant.id);
    return NextResponse.json(queue);
  } catch (error) {
    console.error("Failed to fetch receptionist queue:", error);
    return NextResponse.json({ error: "Failed to fetch receptionist queue" }, { status: 500 });
  }
}
