import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { queues } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const departmentId = searchParams.get("departmentId");
    const status = searchParams.get("status");

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    let query = db.select().from(queues).where(eq(queues.tenantId, tenantId));

    if (departmentId) {
      query = query.where(eq(queues.departmentId, departmentId));
    }

    if (status) {
      query = query.where(eq(queues.status, status));
    }

    // Order by position
    query = query.orderBy(asc(queues.position));

    const queueList = await query;
    return NextResponse.json(queueList);
  } catch (error) {
    console.error("Error fetching queue:", error);
    return NextResponse.json({ error: "Failed to fetch queue" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { tenantId, patientId, departmentId, priority = "normal" } = data;

    if (!tenantId || !patientId || !departmentId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get next position
    const existingQueue = await db.query.queues.findMany({
      where: and(
        eq(queues.tenantId, tenantId),
        eq(queues.departmentId, departmentId)
      ),
    });

    const nextPosition = existingQueue.length + 1;
    const queueNumber = `Q${Date.now().toString().slice(-4)}`;

    const [queueItem] = await db.insert(queues).values({
      tenantId,
      patientId,
      departmentId,
      queueNumber,
      status: "waiting",
      priority,
      position: nextPosition,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json(queueItem, { status: 201 });
  } catch (error) {
    console.error("Error adding to queue:", error);
    return NextResponse.json({ error: "Failed to add to queue" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Queue ID required" }, { status: 400 });
    }

    const data = await request.json();
    const { status, assignedTo } = data;

    const updateData: any = { updatedAt: new Date() };

    if (status) {
      updateData.status = status;
      if (status === "called") {
        updateData.calledAt = new Date();
      } else if (status === "completed") {
        updateData.completedAt = new Date();
      }
    }

    if (assignedTo) {
      updateData.assignedTo = assignedTo;
    }

    const [queueItem] = await db.update(queues)
      .set(updateData)
      .where(eq(queues.id, id))
      .returning();

    return NextResponse.json(queueItem);
  } catch (error) {
    console.error("Error updating queue:", error);
    return NextResponse.json({ error: "Failed to update queue" }, { status: 500 });
  }
}

