import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { fileResponse } from "@/lib/accountant/server";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  return fileResponse("Insurance claims export", "insurance-claims.csv", "text/plain");
}
