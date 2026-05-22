import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json([
    {
      id: "scheduled-financial-summary",
      templateId: "financial-summary",
      name: "Monthly Financial Summary",
      frequency: "monthly",
      nextRun: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      recipients: ["finance@hospital.local"],
      format: "pdf",
      isActive: true,
    },
  ]);
}
