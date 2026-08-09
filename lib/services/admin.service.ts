import { db } from "@/lib/db";
import { users, roles, departments } from "@/lib/db/schema";

export class AdminService {
  async createStaff(data: {
    tenantId: string;
    email: string;
    fullName: string;
    passwordHash: string;
  }) {
    return db.insert(users).values(data).returning();
  }

  async createDepartment(data: {
    tenantId: string;
    name: string;
  }) {
    return db.insert(departments).values(data).returning();
  }

  async createRole(data: {
    tenantId: string;
    name: string;
  }) {
    return db.insert(roles).values(data).returning();
  }

  async getStaffList(tenantId: string) {
    return db.query.users.findMany({
      where: (users, { eq }) => eq(users.tenantId, tenantId),
    });
  }

  async getDepartmentList(tenantId: string) {
    return db.query.departments.findMany({
      where: (departments, { eq }) => eq(departments.tenantId, tenantId),
    });
  }

  async getAttendanceLogs(staffId: string) {
    // Track attendance
    return [];
  }
}
