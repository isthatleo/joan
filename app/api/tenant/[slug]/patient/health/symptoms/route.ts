import { NextRequest, NextResponse } from "next/server";
import { createPatientSymptomLog, resolvePatientPortalContext } from "@/lib/patient-portal/data";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const context = await resolvePatientPortalContext(request.headers, slug);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const body = await request.json();
  if (!body?.symptom || typeof body?.severity !== "number") {
    return NextResponse.json({ error: "Symptom and severity are required" }, { status: 400 });
  }

  const symptom = await createPatientSymptomLog(context.context, body);
  return NextResponse.json({ symptom }, { status: 201 });
}
