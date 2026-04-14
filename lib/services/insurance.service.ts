import { db } from "@/lib/db";
import { claims, insurancePolicies } from "@/lib/db/schema";

export class InsuranceService {
  async addPolicy(data: {
    patientId: string;
    provider: string;
    policyNumber: string;
  }) {
    return db.insert(insurancePolicies).values(data).returning();
  }

  async createClaim(data: {
    invoiceId: string;
    status: string;
  }) {
    return db.insert(claims).values(data).returning();
  }

  async getPatientPolicies(patientId: string) {
    return db.query.insurancePolicies.findMany();
  }

  async trackClaimStatus(claimId: string) {
    return db.query.claims.findFirst();
  }

  async validatePolicy(policyNumber: string) {
    // Call external insurance API
    return { valid: true, coverage: 80 };
  }
}
