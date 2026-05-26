import { NextRequest, NextResponse } from "next/server";
import { resolvePatientPortalContext, submitPatientPayment } from "@/lib/patient-portal/data";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const context = await resolvePatientPortalContext(request.headers, slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });

  const body = await request.json();
  if (!body?.invoiceId || !body?.method || body?.amount === undefined) {
    return NextResponse.json({ error: "Invoice, amount, and method are required" }, { status: 400 });
  }

  const payment = await submitPatientPayment(context.context, body);
  return NextResponse.json({ payment }, { status: 201 });
}
