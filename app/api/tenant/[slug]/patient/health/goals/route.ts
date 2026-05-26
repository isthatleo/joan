import { NextRequest, NextResponse } from "next/server";
import { createPatientHealthGoal, resolvePatientPortalContext } from "@/lib/patient-portal/data";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const context = await resolvePatientPortalContext(request.headers, slug);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const body = await request.json();
  if (!body?.title || !body?.target || !body?.unit) {
    return NextResponse.json({ error: "Title, target, and unit are required" }, { status: 400 });
  }

  const goal = await createPatientHealthGoal(context.context, body);
  return NextResponse.json({ goal }, { status: 201 });
}
