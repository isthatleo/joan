import { NextRequest, NextResponse } from "next/server";
import { getTenantBySlug, searchReceptionPatients } from "@/lib/receptionist/data";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const query = request.nextUrl.searchParams.get("q") || "";
    const patients = await searchReceptionPatients(tenant.id, query);
    return NextResponse.json(patients);
  } catch (error) {
    console.error("Failed to search patients:", error);
    return NextResponse.json({ error: "Failed to search patients" }, { status: 500 });
  }
}
