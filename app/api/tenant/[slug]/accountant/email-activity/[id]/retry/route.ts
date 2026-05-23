import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { db } from "@/lib/db";
import { emailSendLog } from "@/lib/db/schema";
import { sendEmail, sendEmailSchema } from "@/lib/email/send-email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug, id } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const [logEntry] = await db
      .select()
      .from(emailSendLog)
      .where(and(eq(emailSendLog.id, id), eq(emailSendLog.tenantId, tenantId)))
      .limit(1);

    if (!logEntry) {
      return NextResponse.json({ error: "Email log entry not found" }, { status: 404 });
    }

    const payload = (logEntry.metadata as { sendRequest?: unknown } | null)?.sendRequest;
    const parsed = sendEmailSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "This email log cannot be resent because the original payload is unavailable",
          details: parsed.error.flatten(),
        },
        { status: 409 }
      );
    }

    const result = await sendEmail(
      {
        ...parsed.data,
        tenantSlug: parsed.data.tenantSlug || slug,
      },
      {
        idempotencyKey: `email-log-retry/${id}/${Date.now()}`,
        sourceLogId: id,
      }
    );

    if (!result.ok) {
      return result.response;
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error("Failed to resend email:", error);
    return NextResponse.json({ error: "Failed to resend email" }, { status: 500 });
  }
}
