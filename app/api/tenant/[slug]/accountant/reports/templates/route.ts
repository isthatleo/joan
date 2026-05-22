import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json([
    { id: "financial-summary", name: "Financial Summary", category: "Financial", description: "High-level financial overview", frequency: "monthly" },
    { id: "revenue-analysis", name: "Revenue Analysis", category: "Financial", description: "Revenue performance by period", frequency: "weekly" },
    { id: "billing-report", name: "Billing Report", category: "Billing", description: "Invoices and collections", frequency: "weekly" },
  ]);
}
