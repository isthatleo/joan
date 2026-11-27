import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { checkRateLimit } from "@/lib/api/utils";
import { buildPatientContext } from "@/lib/copilot/context";
import { copilotErrorResponse } from "@/lib/copilot/route-errors";
import { generateNoteInsight } from "@/lib/copilot/service";
import { db } from "@/lib/db";
import { patients, queues } from "@/lib/db/schema";
import { resolveDoctorContext } from "@/lib/doctor/server";

const requestSchema = z.object({
  queueId: z.string().trim().min(1).max(200),
  patientId: z.string().trim().min(1).max(200),
  focus: z.enum(["assessment", "plan", "notes"]).default("assessment"),
});

export async function POST(request: NextRequest) {
  const context = await resolveDoctorContext(request.headers);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const { doctor } = context;
  if (!doctor.tenantId) {
    return NextResponse.json({ error: "Tenant context required" }, { status: 403 });
  }

  if (!checkRateLimit(`copilot-insight:${doctor.id}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many copilot requests. Try again shortly." }, { status: 429 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid note insight request" }, { status: 400 });
    }

    const { queueId, patientId, focus } = parsed.data;

    const [queueEntry, patient] = await Promise.all([
      db.query.queues.findFirst({
        where: and(
          eq(queues.id, queueId),
          eq(queues.tenantId, doctor.tenantId),
          eq(queues.assignedTo, doctor.id),
          eq(queues.patientId, patientId),
          isNull(queues.deletedAt)
        ),
        columns: { id: true },
      }),
      db.query.patients.findFirst({
        where: and(eq(patients.id, patientId), eq(patients.tenantId, doctor.tenantId), isNull(patients.deletedAt)),
        columns: { id: true },
      }),
    ]);

    if (!queueEntry || !patient) {
      return NextResponse.json({ error: "Patient or queue entry not found" }, { status: 404 });
    }

    const copilotContext = await buildPatientContext({
      doctorId: doctor.id,
      tenantId: doctor.tenantId,
      patientId,
      queueId,
    });
    if (!copilotContext) {
      return NextResponse.json({ error: "Patient or queue entry not found" }, { status: 404 });
    }

    const insight = await generateNoteInsight({
      context: copilotContext,
      focus,
      patientId,
      actor: { doctorId: doctor.id, tenantId: doctor.tenantId },
    });

    return NextResponse.json(insight, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return copilotErrorResponse(error, "copilot/insight");
  }
}
