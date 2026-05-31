import { db } from "@/lib/db";
import { queues } from "@/lib/db/schema";
import { eq, and, asc, desc } from "drizzle-orm";

export class QueueService {
  async add(data: {
    tenantId: string;
    patientId: string;
    departmentId: string;
    priority?: string;
  }) {
    // Get the next position in the queue
    const lastQueue = await db.select()
      .from(queues)
      .where(and(
        eq(queues.tenantId, data.tenantId),
        eq(queues.departmentId, data.departmentId)
      ))
      .orderBy(desc(queues.position))
      .limit(1);

    const nextPosition = lastQueue.length > 0 ? (lastQueue[0]?.position ?? 0) + 1 : 1;

    // Generate queue number
    const queueNumber = `Q${nextPosition.toString().padStart(3, '0')}`;

    return db.insert(queues).values({
      tenantId: data.tenantId,
      patientId: data.patientId,
      departmentId: data.departmentId,
      queueNumber,
      status: "waiting",
      priority: data.priority || "normal",
      position: nextPosition,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
  }

  async callNext(tenantId: string, departmentId: string) {
    // Find the next patient in queue
    const nextPatient = await db.select()
      .from(queues)
      .where(and(
        eq(queues.tenantId, tenantId),
        eq(queues.departmentId, departmentId),
        eq(queues.status, "waiting")
      ))
      .orderBy(asc(queues.position))
      .limit(1);

    if (nextPatient.length === 0) {
      return null;
    }

    // Update the queue entry to called
    await db.update(queues)
      .set({
        status: "called",
        calledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(queues.id, nextPatient[0].id));

    return nextPatient[0];
  }

  async getQueueByDepartment(tenantId: string, departmentId: string) {
    return db.select()
      .from(queues)
      .where(and(
        eq(queues.tenantId, tenantId),
        eq(queues.departmentId, departmentId)
      ))
      .orderBy(asc(queues.position));
  }

  async completeQueueEntry(id: string) {
    return db.update(queues)
      .set({
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(queues.id, id));
  }
}
