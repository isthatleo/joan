import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.BETTER_AUTH_SECRET || "");

export async function verifyAuth(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    return { authenticated: false, user: null };
  }

  try {
    const verified = await jwtVerify(token, secret);
    return { authenticated: true, user: verified.payload };
  } catch (error) {
    return { authenticated: false, user: null };
  }
}

export function requireAuth(roles?: string[]) {
  return async (request: NextRequest) => {
    const auth = await verifyAuth(request);

    if (!auth.authenticated) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (roles && !roles.includes(auth.user?.role as string)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    return null;
  };
}

export function errorResponse(message: string, status: number = 500) {
  return NextResponse.json({ error: message }, { status });
}

export function successResponse(data: any, status: number = 200) {
  return NextResponse.json(data, { status });
}

