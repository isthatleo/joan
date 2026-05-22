import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { users } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    // Get doctor's user record to verify role
    const doctorUser = await db
      .select()
      .from(users)
      .where(and(eq(users.id, session.user.id), eq(users.role, "doctor")))
      .limit(1);

    if (!doctorUser.length) {
      return NextResponse.json({ error: "Doctor access required" }, { status: 403 });
    }

    // Generate mock alerts for demo purposes
    // In a real application, these would come from a notifications/alerts table
    const alerts = [
      {
        id: "1",
        type: "warning" as const,
        title: "Lab Results Pending Review",
        message: "3 lab results are ready for your review",
      },
      {
        id: "2",
        type: "info" as const,
        title: "Appointment Reminder",
        message: "You have 2 appointments scheduled for today",
      },
    ];

    return NextResponse.json(alerts);

  } catch (error) {
    console.error("Doctor alerts API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

