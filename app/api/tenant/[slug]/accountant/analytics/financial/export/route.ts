import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { fileResponse, toCsv } from "@/lib/accountant/server";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  return fileResponse(
    toCsv([
      ["Metric", "Value"],
      ["Generated At", new Date().toISOString()],
      ["Format", new URL(request.url).searchParams.get("format") || "pdf"],
    ]),
    "financial-analysis.csv",
    "text/csv"
  );
}
