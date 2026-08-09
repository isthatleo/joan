import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { executeScheduledReport, getDueScheduledReports } from "@/lib/accountant/scheduled-reports";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const secret = process.env.SCHEDULED_REPORTS_WORKER_SECRET;
  if (!secret) {
    console.error("[scheduled-reports-worker] SCHEDULED_REPORTS_WORKER_SECRET is not set — refusing to run.");
    return NextResponse.json({ error: "Scheduled reports worker is not configured" }, { status: 503 });
  }

  const provided = request.headers.get("x-scheduled-reports-secret") || "";
  const providedBuf = Buffer.from(provided);
  const secretBuf = Buffer.from(secret);
  const matches = providedBuf.length === secretBuf.length && crypto.timingSafeEqual(providedBuf, secretBuf);
  if (!matches) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const dueSchedules = await getDueScheduledReports(now);
  const completed: Array<{ scheduleId: string; reportId: string; nextRun: string; recipients: number; emailLogIds: string[] }> = [];
  const failed: Array<{ scheduleId: string; error: string }> = [];

  for (const schedule of dueSchedules) {
    const result = await executeScheduledReport(schedule);
    if (result.ok) {
      completed.push({
        scheduleId: result.scheduleId,
        reportId: result.reportId,
        nextRun: result.nextRun,
        recipients: result.recipients,
        emailLogIds: result.emailLogIds,
      });
    } else {
      failed.push({
        scheduleId: result.scheduleId,
        error: result.error,
      });
    }
  }

  return NextResponse.json({
    ranAt: now.toISOString(),
    dueSchedules: dueSchedules.length,
    completed,
    failed,
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
