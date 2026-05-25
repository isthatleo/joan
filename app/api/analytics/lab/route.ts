import { NextRequest } from "next/server";
import { GET as getPerformance } from "@/app/api/lab/performance/route";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return getPerformance(request);
}
