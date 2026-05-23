import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { claims, insurancePolicies } from "@/lib/db/schema";

export async function findOrCreateInsurancePolicy(
  tenantId: string,
  patientId: string,
  provider: string,
  policyNumber: string
) {
  const [existing] = await db
    .select()
    .from(insurancePolicies)
    .where(
      and(
        eq(insurancePolicies.tenantId, tenantId),
        eq(insurancePolicies.patientId, patientId),
        eq(insurancePolicies.provider, provider),
        eq(insurancePolicies.policyNumber, policyNumber)
      )
    )
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(insurancePolicies)
    .values({
      tenantId,
      patientId,
      provider,
      policyNumber,
    })
    .returning();

  return created;
}

export async function createClaimRecord(values: typeof claims.$inferInsert) {
  const [created] = await db.insert(claims).values(values).returning();
  return created;
}
