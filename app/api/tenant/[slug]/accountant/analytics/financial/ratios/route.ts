import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json([
    { name: "Current Ratio", value: 1.9, benchmark: 1.5, status: "good", description: "Short-term liquidity coverage" },
    { name: "Profit Margin", value: 18.4, benchmark: 15, status: "good", description: "Profitability against revenue" },
    { name: "Debt Ratio", value: 42.1, benchmark: 35, status: "warning", description: "Debt load relative to assets" },
    { name: "Return on Assets", value: 11.6, benchmark: 10, status: "good", description: "Asset efficiency" },
  ]);
}
