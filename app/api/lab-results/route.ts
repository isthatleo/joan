import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { labResults } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const labOrderId = searchParams.get("labOrderId");

    if (!labOrderId) {
      return NextResponse.json({ error: "Lab order ID required" }, { status: 400 });
    }

    const results = await db.query.labResults.findMany({
      where: eq(labResults.labOrderId, labOrderId),
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching lab results:", error);
    return NextResponse.json({ error: "Failed to fetch lab results" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { labOrderId, resultData, fileUrl } = data;

    if (!labOrderId || !resultData) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [result] = await db.insert(labResults).values({
      labOrderId,
      resultData,
      fileUrl,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating lab result:", error);
    return NextResponse.json({ error: "Failed to create lab result" }, { status: 500 });
  }
}

