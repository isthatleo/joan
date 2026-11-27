import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/api/utils";
import { filterContextByAccess, resolveCopilotAccess } from "@/lib/copilot/access";
import { buildQueryContext } from "@/lib/copilot/context";
import { copilotErrorResponse } from "@/lib/copilot/route-errors";
import { generateQueryAnswer } from "@/lib/copilot/service";
import { DEFAULT_QUERY_PROMPT } from "@/lib/copilot/types";
import { resolveDoctorContext } from "@/lib/doctor/server";

const requestSchema = z.object({
  question: z.string().trim().min(1).max(500).default(DEFAULT_QUERY_PROMPT),
  patientId: z.string().trim().min(1).max(200).optional(),
  queueId: z.string().trim().min(1).max(200).optional(),
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

  if (!checkRateLimit(`copilot-query:${doctor.id}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many copilot requests. Try again shortly." }, { status: 429 });
  }

  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid copilot request" }, { status: 400 });
  }

  try {
    const access = await resolveCopilotAccess(doctor.id);
    if (!access.hasClinicalAccess) {
      return NextResponse.json(
        { error: "Your role does not grant access to clinical data through Copilot." },
        { status: 403 }
      );
    }

    const copilotContext = await buildQueryContext({
      doctorId: doctor.id,
      tenantId: doctor.tenantId,
      patientId: body.patientId,
      queueId: body.queueId,
    });

    if (!copilotContext) {
      return NextResponse.json(
        { error: "That patient is not in your assigned care scope." },
        { status: 404 }
      );
    }

    const filteredContext = filterContextByAccess(copilotContext, access);
    const answer = await generateQueryAnswer({
      context: filteredContext,
      question: body.question,
      actor: { doctorId: doctor.id, tenantId: doctor.tenantId },
      scope: {
        tenantId: doctor.tenantId,
        userId: doctor.id,
        allowedCategories: Array.from(access.allowedCategories).sort(),
        factsReviewed: filteredContext.facts.length,
      },
    });

    return NextResponse.json(answer, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return copilotErrorResponse(error, "copilot/query");
  }
}
