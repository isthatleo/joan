import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  return NextResponse.json({
    id,
    patientName: "Insurance Claim Patient",
    insuranceProvider: "AAR",
    policyNumber: "POL-0001",
    claimAmount: 350,
    approvedAmount: 280,
    status: "under_review",
    submittedAt: new Date().toISOString(),
    documents: [],
    notes: "Claim detail page",
  });
}

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ success: true });
}
