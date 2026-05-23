import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendEmail, sendEmailSchema } from "@/lib/email/send-email";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const internalKey = request.headers.get("x-internal-key");

    if (!session?.user?.id && internalKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
    }

    const parsed = sendEmailSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const idempotencyKey = request.headers.get("x-idempotency-key")?.trim() || undefined;
    const result = await sendEmail(parsed.data, { idempotencyKey });
    if (!result.ok) {
      return result.response;
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Failed to send email:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
