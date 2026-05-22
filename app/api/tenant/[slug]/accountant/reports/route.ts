import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const reports = [
  {
    id: "financial-summary-latest",
    name: "Financial Summary",
    type: "financial",
    description: "Latest consolidated financial summary",
    createdAt: new Date().toISOString(),
    lastGenerated: new Date().toISOString(),
    status: "ready",
    format: "pdf",
    size: "124 KB",
  },
  {
    id: "billing-collections-latest",
    name: "Billing & Collections",
    type: "billing",
    description: "Open invoices, collections, and aging overview",
    createdAt: new Date().toISOString(),
    lastGenerated: new Date().toISOString(),
    status: "ready",
    format: "csv",
    size: "88 KB",
  },
];

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(reports);
}
