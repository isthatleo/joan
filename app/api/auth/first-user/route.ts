import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { count } from "drizzle-orm";

export async function GET() {
  try {
    const result = await db.select({ count: count() }).from(users);
    const isFirst = result[0].count === 0;
    return NextResponse.json({ isFirst });
  } catch (error) {
    console.error("Error checking first user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
