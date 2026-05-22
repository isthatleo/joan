import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { fileResponse } from "@/lib/accountant/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { id } = await params;
  const format = new URL(request.url).searchParams.get("format") || "pdf";
  return fileResponse(`Report ${id} (${format})`, `report-${id}.${format}`, "text/plain");
}
