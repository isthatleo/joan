import { NextRequest, NextResponse } from "next/server";
import { getReceptionBookingProviders, getTenantBySlug } from "@/lib/receptionist/data";

const appointmentTypes = [
  { id: "consultation", name: "Consultation", duration: 30, description: "General clinical consultation" },
  { id: "follow_up", name: "Follow-up", duration: 20, description: "Scheduled follow-up review" },
  { id: "review", name: "Records Review", duration: 15, description: "Administrative or results review" },
  { id: "procedure", name: "Procedure Prep", duration: 45, description: "Pre-procedure coordination slot" },
];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const providers = await getReceptionBookingProviders(tenant.id);
    return NextResponse.json({
      appointmentTypes,
      providers,
    });
  } catch (error) {
    console.error("Failed to load receptionist appointment options:", error);
    return NextResponse.json({ error: "Failed to load receptionist appointment options" }, { status: 500 });
  }
}
