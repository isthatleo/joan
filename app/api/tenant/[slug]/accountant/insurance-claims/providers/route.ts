import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json([
    { id: "aar", name: "AAR", claimsCount: 12, approvalRate: 82, averageProcessingDays: 7 },
    { id: "jubilee", name: "Jubilee", claimsCount: 9, approvalRate: 76, averageProcessingDays: 10 },
    { id: "aetna", name: "Aetna", claimsCount: 7, approvalRate: 68, averageProcessingDays: 12 },
  ]);
}
