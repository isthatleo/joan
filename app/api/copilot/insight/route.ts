import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { checkRateLimit } from "@/lib/api/utils";
import { filterContextByAccess } from "@/lib/copilot/access";
import { resolveCopilotRequestContext } from "@/lib/copilot/actor";
import { buildPatientContext } from "@/lib/copilot/context";
import { copilotErrorResponse } from "@/lib/copilot/route-errors";
import { generateNoteInsight } from "@/lib/copilot/service";
import { db } from "@/lib/db";
import { patients, queues } from "@/lib/db/schema";

const requestSchema = z.object({
  queueId: z.string().trim().min(1).max(200),
  patientId: z.string().trim().min(1).max(200),
  focus: z.enum(["assessment", "plan", "notes"]).default("assessment"),
});

export async function POST(request: NextRequest) {
  const gate = await resolveCopilotRequestContext(request.headers);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { actor, access } = gate;
  const scopeToAssignee = actor.isDoctor;

  if (!checkRateLimit(`copilot-insight:${actor.userId}`, 20, 60_000)) {
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
          eq(queues.tenantId, actor.tenantId),
          scopeToAssignee ? eq(queues.assignedTo, actor.userId) : undefined,
          eq(queues.patientId, patientId),
          isNull(queues.deletedAt)
        ),
        columns: { id: true },
      }),
      db.query.patients.findFirst({
        where: and(eq(patients.id, patientId), eq(patients.tenantId, actor.tenantId), isNull(patients.deletedAt)),
        columns: { id: true },
      }),
    ]);

    if (!queueEntry || !patient) {
      return NextResponse.json({ error: "Patient or queue entry not found" }, { status: 404 });
    }

    const copilotContext = await buildPatientContext({
      actorId: actor.userId,
      tenantId: actor.tenantId,
      patientId,
      queueId,
      scopeToAssignee,
    });
    if (!copilotContext) {
      return NextResponse.json({ error: "Patient or queue entry not found" }, { status: 404 });
    }

    const filteredContext = filterContextByAccess(copilotContext, access);
    const insight = await generateNoteInsight({
      context: filteredContext,
      focus,
      patientId,
      actor,
    });

    return NextResponse.json(insight, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return copilotErrorResponse(error, "copilot/insight");
  }
}
