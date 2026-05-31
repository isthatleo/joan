import { db } from "@/lib/db";
import {
  tenants,
  users,
  appointments,
  visits,
  patients,
  branches,
  departments,
  userSettings,
  roles,
  rolePermissions,
  userRoles,
  userOverrides,
  patientAllergies,
  patientConditions,
  queues,
  diagnoses,
  vitals,
  prescriptions,
  prescriptionItems,
  inventoryItems,
  labOrders,
  labResults,
  invoices,
  invoiceItems,
  payments,
  insurancePolicies,
  claims,
  messages,
  notifications,
  auditLogs,
  provisioningRuns,
  otps,
  passwordResets,
  tenantSettings,
} from "@/lib/db/schema";
import { eq, desc, sql, and, inArray, isNotNull, isNull } from "drizzle-orm";

export class TenantService {
  async createTenant(data: {
    name: string;
    slug: string;
    plan: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
  }) {
    return db.insert(tenants).values({
      ...data,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
  }

  async getTenant(idOrSlug: string) {
    // Try to fetch by ID first, then by slug
    let tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, idOrSlug),
    });

    if (!tenant) {
      // If not found by ID, try by slug
      tenant = await db.query.tenants.findFirst({
        where: eq(tenants.slug, idOrSlug),
      });
    }

    return tenant;
  }

  async getTenantBySlug(slug: string) {
    return db.query.tenants.findFirst({
      where: eq(tenants.slug, slug),
    });
  }

  async getAllTenants(options?: {
    search?: string;
    plan?: string;
    status?: boolean;
    limit?: number;
    offset?: number;
    tenantId?: string; // Scope to specific tenant
    deleted?: boolean;
  }) {
    let query: any = db.select().from(tenants);

    const conditions = [];

    // If tenantId is provided, filter to that tenant
    if (options?.tenantId) {
      conditions.push(eq(tenants.id, options.tenantId));
    }

    if (options?.deleted) {
      conditions.push(isNotNull(tenants.deletedAt));
    } else {
      conditions.push(isNull(tenants.deletedAt));
    }

    if (options?.search) {
      const search = `%${options.search.trim()}%`;
      conditions.push(sql`(${tenants.name} ilike ${search} or ${tenants.slug} ilike ${search} or ${tenants.contactEmail} ilike ${search})`);
    }

    if (options?.plan) {
      conditions.push(eq(tenants.plan, options.plan));
    }

    if (options?.status !== undefined) {
      conditions.push(eq(tenants.isActive, options.status));
    }


    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    query = query.orderBy(desc(tenants.createdAt));

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.offset(options.offset);
    }

    return query;
  }

  async updateTenant(id: string, data: Partial<{
    name: string;
    slug: string;
    plan: string;
    contactEmail: string;
    contactPhone: string;
    address: string;
    city: string;
    country: string;
    timezone: string;
    logoUrl: string;
    isActive: boolean;
    provisioningStatus: string;
    scheduledPurgeAt: Date | null;
    deletedAt: Date | null;
  }>) {
    return db.update(tenants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
  }

  async suspendTenant(id: string) {
    return db.update(tenants)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
  }

  async activateTenant(id: string) {
    return db.update(tenants)
      .set({
        isActive: true,
        provisioningStatus: "active",
        deletedAt: null,
        scheduledPurgeAt: null,
        updatedAt: new Date(),
      } as any)
      .where(eq(tenants.id, id))
      .returning();
  }

  async deleteTenant(id: string) {
    console.log(`Starting tenant deletion for tenant ID: ${id}`);

    // Perform cascade delete in correct order to avoid foreign key constraints
    await db.transaction(async (tx) => {
      await tx.execute(sql`DELETE FROM message_call_sessions WHERE tenant_id = ${id}`);
      await tx.execute(sql`DELETE FROM message_presence WHERE tenant_id = ${id}`);
      await tx.execute(sql`DELETE FROM message_typing_states WHERE tenant_id = ${id}`);
      await tx.execute(sql`DELETE FROM messaging_settings WHERE tenant_id = ${id}`);
      await tx.execute(sql`DELETE FROM platform_invoices WHERE tenant_id = ${id}`);
      await tx.execute(sql`DELETE FROM feedbacks WHERE tenant_id = ${id}`);
      await tx.execute(sql`DELETE FROM activity_logs WHERE tenant_id = ${id}`);
      await tx.execute(sql`DELETE FROM security_events WHERE tenant_id = ${id}`);
      await tx.execute(sql`DELETE FROM ai_logs WHERE tenant_id = ${id}`);
      await tx.execute(sql`DELETE FROM user_sessions WHERE tenant_id = ${id}`);
      await tx.execute(sql`DELETE FROM device_fingerprints WHERE tenant_id = ${id}`);
      await tx.execute(sql`DELETE FROM integrations WHERE tenant_id = ${id}`);
      await tx.execute(sql`DELETE FROM system_metrics WHERE tenant_id = ${id}`);
      await tx.execute(sql`DELETE FROM system_alerts WHERE tenant_id = ${id}`);
      await tx.execute(sql`DELETE FROM system_configurations WHERE tenant_id = ${id}`);
      await tx.execute(sql`DELETE FROM email_send_log WHERE tenant_id = ${id}`);
      await tx.execute(sql`DELETE FROM accountant_reports WHERE tenant_id = ${id}`);
      await tx.execute(sql`DELETE FROM scheduled_accountant_reports WHERE tenant_id = ${id}`);
      await tx.execute(sql`DELETE FROM accountant_report_templates WHERE tenant_id = ${id}`);
      await tx.execute(sql`DELETE FROM tax_records WHERE tenant_id = ${id}`);
      await tx.execute(sql`DELETE FROM journal_entries WHERE tenant_id = ${id}`);
      await tx.execute(sql`DELETE FROM budgets WHERE tenant_id = ${id}`);
      await tx.execute(sql`DELETE FROM accounts_payable WHERE tenant_id = ${id}`);
      await tx.execute(sql`DELETE FROM expenses WHERE tenant_id = ${id}`);
      await tx.execute(sql`DELETE FROM care_plan_tasks WHERE care_plan_id IN (SELECT id FROM care_plans WHERE tenant_id = ${id})`);
      await tx.execute(sql`DELETE FROM care_plans WHERE tenant_id = ${id}`);
      await tx.execute(sql`DELETE FROM bed_assignments WHERE tenant_id = ${id}`);
      await tx.execute(sql`DELETE FROM medication_administrations WHERE tenant_id = ${id}`);
      await tx.execute(sql`DELETE FROM guardian_patients WHERE guardian_id IN (SELECT id FROM guardians WHERE tenant_id = ${id})`);
      await tx.execute(sql`DELETE FROM guardian_patients WHERE patient_id IN (SELECT id FROM patients WHERE tenant_id = ${id})`);
      await tx.execute(sql`DELETE FROM guardians WHERE tenant_id = ${id}`);

      console.log(`Getting user IDs for tenant ${id}`);
      // Get all user IDs for this tenant first
      const userIds = await tx.select({ id: users.id }).from(users).where(eq(users.tenantId, id));
      const userIdList = userIds.map(u => u.id);
      console.log(`Found ${userIdList.length} users for tenant ${id}`);

      console.log(`Deleting OTPs and password resets for tenant ${id}`);
      // Delete OTPs and password resets
      await tx.delete(otps).where(eq(otps.tenantId, id));
      await tx.delete(passwordResets).where(eq(passwordResets.tenantId, id));

      // Delete audit logs for this tenant's users
      if (userIdList.length > 0) {
        console.log(`Deleting audit logs for ${userIdList.length} users`);
        await tx.delete(auditLogs).where(inArray(auditLogs.userId, userIdList));
      }

      // Delete messages involving this tenant's users
      if (userIdList.length > 0) {
        console.log(`Deleting messages for ${userIdList.length} users`);
        await tx.delete(messages).where(inArray(messages.senderId, userIdList));
        await tx.delete(messages).where(inArray(messages.receiverId, userIdList));
      }

      console.log(`Deleting claims, insurance policies, and payments for tenant ${id}`);
      // Delete claims
      await tx.delete(claims).where(eq(claims.tenantId, id));

      // Delete insurance policies
      await tx.delete(insurancePolicies).where(eq(insurancePolicies.tenantId, id));

      // Delete payments
      await tx.delete(payments).where(eq(payments.tenantId, id));

      console.log(`Deleting invoices and invoice items for tenant ${id}`);
      // Delete invoice items and invoices
      const invoiceIds = await tx.select({ id: invoices.id }).from(invoices).where(eq(invoices.tenantId, id));
      console.log(`Found ${invoiceIds.length} invoices to delete`);
      for (const invoice of invoiceIds) {
        await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoice.id));
      }
      await tx.delete(invoices).where(eq(invoices.tenantId, id));

      console.log(`Deleting lab orders and results for tenant ${id}`);
      // Delete lab results and lab orders
      const labOrderIds = await tx.select({ id: labOrders.id }).from(labOrders).where(eq(labOrders.tenantId, id));
      console.log(`Found ${labOrderIds.length} lab orders to delete`);
      for (const labOrder of labOrderIds) {
        await tx.delete(labResults).where(eq(labResults.labOrderId, labOrder.id));
      }
      await tx.delete(labOrders).where(eq(labOrders.tenantId, id));

      console.log(`Deleting inventory, prescriptions, and related data for tenant ${id}`);
      // Delete inventory items
      await tx.delete(inventoryItems).where(eq(inventoryItems.tenantId, id));

      // Delete prescription items and prescriptions
      const prescriptionIds = await tx.select({ id: prescriptions.id }).from(prescriptions).where(eq(prescriptions.tenantId, id));
      console.log(`Found ${prescriptionIds.length} prescriptions to delete`);
      for (const prescription of prescriptionIds) {
        await tx.delete(prescriptionItems).where(eq(prescriptionItems.prescriptionId, prescription.id));
      }
      await tx.delete(prescriptions).where(eq(prescriptions.tenantId, id));

      console.log(`Deleting visits, diagnoses, and vitals for tenant ${id}`);
      // Delete diagnoses and vitals
      const visitIds = await tx.select({ id: visits.id }).from(visits).where(eq(visits.tenantId, id));
      console.log(`Found ${visitIds.length} visits to delete`);
      for (const visit of visitIds) {
        await tx.delete(diagnoses).where(eq(diagnoses.visitId, visit.id));
        await tx.delete(vitals).where(eq(vitals.visitId, visit.id));
      }

      // Delete visits
      await tx.delete(visits).where(eq(visits.tenantId, id));

      // Delete queues
      await tx.delete(queues).where(eq(queues.tenantId, id));

      // Delete appointments
      await tx.delete(appointments).where(eq(appointments.tenantId, id));

      console.log(`Deleting patients and related data for tenant ${id}`);
      // Delete patient allergies and conditions
      const patientIds = await tx.select({ id: patients.id }).from(patients).where(eq(patients.tenantId, id));
      console.log(`Found ${patientIds.length} patients to delete`);
      const patientIdList = patientIds.map(p => p.id);

      // Delete messages that reference these patients
      if (patientIdList.length > 0) {
        console.log(`Deleting messages for ${patientIdList.length} patients`);
        await tx.delete(messages).where(inArray(messages.patientId, patientIdList));
      }

      for (const patient of patientIds) {
        await tx.delete(patientAllergies).where(eq(patientAllergies.patientId, patient.id));
        await tx.delete(patientConditions).where(eq(patientConditions.patientId, patient.id));
      }

      // Delete patients
      await tx.delete(patients).where(eq(patients.tenantId, id));

      console.log(`Deleting user-related data for ${userIds.length} users`);
      // Delete user overrides, user roles, and user settings
      for (const user of userIds) {
        await tx.delete(userOverrides).where(eq(userOverrides.userId, user.id));
        await tx.delete(userSettings).where(eq(userSettings.userId, user.id));
        await tx.delete(userRoles).where(eq(userRoles.userId, user.id));
      }

      // Delete notifications
      await tx.delete(notifications).where(eq(notifications.tenantId, id));

      console.log(`Deleting tenant settings for tenant ${id}`);
      // Delete tenant settings
      await tx.delete(tenantSettings).where(eq(tenantSettings.tenantId, id));

      console.log(`Deleting roles and permissions for tenant ${id}`);
      // Delete role permissions and roles
      const roleIds = await tx.select({ id: roles.id }).from(roles).where(eq(roles.tenantId, id));
      console.log(`Found ${roleIds.length} roles to delete`);
      for (const role of roleIds) {
        await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, role.id));
      }
      await tx.delete(roles).where(eq(roles.tenantId, id));

      // Delete departments
      await tx.delete(departments).where(eq(departments.tenantId, id));

      // Delete branches
      await tx.delete(branches).where(eq(branches.tenantId, id));

      await tx.execute(sql`
        DO $$
        DECLARE
          tenant_uuid uuid := ${id}::uuid;
        BEGIN
          BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'session') THEN
              EXECUTE '
                DELETE FROM "session"
                WHERE "userId" IN (SELECT id::text FROM users WHERE tenant_id = $1)
                   OR "userId" IN (
                     SELECT au.id
                     FROM "user" au
                     INNER JOIN users app_user ON lower(app_user.email) = lower(au.email)
                     WHERE app_user.tenant_id = $1
                   )
              ' USING tenant_uuid;
            END IF;
          EXCEPTION WHEN OTHERS THEN
            NULL;
          END;

          BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'account') THEN
              EXECUTE '
                DELETE FROM "account"
                WHERE "userId" IN (SELECT id::text FROM users WHERE tenant_id = $1)
                   OR "userId" IN (
                     SELECT au.id
                     FROM "user" au
                     INNER JOIN users app_user ON lower(app_user.email) = lower(au.email)
                     WHERE app_user.tenant_id = $1
                   )
              ' USING tenant_uuid;
            END IF;
          EXCEPTION WHEN OTHERS THEN
            NULL;
          END;

          BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user') THEN
              EXECUTE '
                DELETE FROM "user"
                WHERE id IN (SELECT id::text FROM users WHERE tenant_id = $1)
                   OR lower(email) IN (SELECT lower(email) FROM users WHERE tenant_id = $1)
              ' USING tenant_uuid;
            END IF;
          EXCEPTION WHEN OTHERS THEN
            NULL;
          END;
        END $$;
      `);

      // Delete users
      await tx.delete(users).where(eq(users.tenantId, id));

      // Delete provisioning runs
      await tx.delete(provisioningRuns).where(eq(provisioningRuns.tenantId, id));

      // Delete tenant-scoped audit logs that reference the tenant directly.
      await tx.delete(auditLogs).where(eq(auditLogs.tenantId, id));

      await tx.execute(sql`
        DO $$
        DECLARE
          tenant_uuid uuid := ${id}::uuid;
          record_to_delete record;
          pass int;
        BEGIN
          FOR pass IN 1..8 LOOP
            FOR record_to_delete IN
              SELECT table_schema, table_name
              FROM information_schema.columns
              WHERE table_schema = 'public'
                AND column_name = 'tenant_id'
                AND table_name <> 'tenants'
            LOOP
              BEGIN
                EXECUTE format(
                  'DELETE FROM %I.%I WHERE tenant_id = $1',
                  record_to_delete.table_schema,
                  record_to_delete.table_name
                ) USING tenant_uuid;
              EXCEPTION WHEN OTHERS THEN
                NULL;
              END;
            END LOOP;
          END LOOP;
        END $$;
      `);

      console.log(`Finally deleting tenant record ${id}`);
      // Finally delete the tenant
      await tx.delete(tenants).where(eq(tenants.id, id));
    });

    console.log(`Tenant deletion completed successfully for tenant ID: ${id}`);
    return { success: true };
  }

  async getTenantStats() {
    const result = await db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`count(case when ${tenants.isActive} = true then 1 end)`,
        inactive: sql<number>`count(case when ${tenants.isActive} = false then 1 end)`,
      })
      .from(tenants);

    return result[0];
  }

  async getUsageStats() {
    try {
      const summaryResult = await db.execute(sql`
        WITH current_window AS (
          SELECT
            (SELECT count(*) FROM tenants WHERE is_active = true AND deleted_at IS NULL)::int AS active_tenants,
            (SELECT count(*) FROM users WHERE is_active = true AND deleted_at IS NULL)::int AS active_users,
            (SELECT count(*) FROM user_sessions WHERE is_active = true AND logout_at IS NULL AND expires_at > now())::int AS live_sessions,
            (SELECT count(*) FROM appointments WHERE deleted_at IS NULL)::int AS appointments_total,
            (SELECT count(*) FROM visits WHERE deleted_at IS NULL)::int AS visits_total,
            (SELECT count(*) FROM patients WHERE deleted_at IS NULL)::int AS patients_total,
            (SELECT count(*) FROM lab_orders WHERE deleted_at IS NULL)::int AS lab_orders_total,
            (SELECT count(*) FROM prescriptions WHERE deleted_at IS NULL)::int AS prescriptions_total,
            (SELECT count(*) FROM invoices WHERE deleted_at IS NULL)::int AS invoices_total,
            (SELECT count(*) FROM activity_logs WHERE timestamp >= now() - interval '30 days')::int AS activity_30d,
            (SELECT count(*) FROM security_events WHERE created_at >= now() - interval '30 days')::int AS security_30d,
            (SELECT avg(api_response_time) FROM system_metrics WHERE created_at >= now() - interval '24 hours')::numeric AS avg_response_time,
            (SELECT avg(memory_usage) FROM system_metrics WHERE created_at >= now() - interval '24 hours')::numeric AS avg_memory,
            (SELECT avg(cpu_usage) FROM system_metrics WHERE created_at >= now() - interval '24 hours')::numeric AS avg_cpu
        ),
        previous_window AS (
          SELECT
            (SELECT count(*) FROM activity_logs WHERE timestamp >= now() - interval '60 days' AND timestamp < now() - interval '30 days')::int AS activity_prev_30d,
            (SELECT count(*) FROM users WHERE created_at < now() - interval '30 days' AND deleted_at IS NULL)::int AS users_prev,
            (SELECT count(*) FROM patients WHERE created_at < now() - interval '30 days' AND deleted_at IS NULL)::int AS patients_prev
        )
        SELECT * FROM current_window, previous_window
      `) as any;
      const [summary] = summaryResult.rows || [];

      const row = summary || {};
      const toNum = (value: any) => Number(value || 0);
      const totalApiCalls =
        toNum(row.activity_30d) +
        toNum(row.appointments_total) * 4 +
        toNum(row.visits_total) * 6 +
        toNum(row.lab_orders_total) * 5 +
        toNum(row.prescriptions_total) * 5 +
        toNum(row.invoices_total) * 3;
      const totalActiveUsers = toNum(row.active_users);
      const totalStorageUsed =
        toNum(row.patients_total) * 2.5 * 1024 * 1024 +
        toNum(row.visits_total) * 1.25 * 1024 * 1024 +
        toNum(row.lab_orders_total) * 0.75 * 1024 * 1024 +
        toNum(row.invoices_total) * 0.25 * 1024 * 1024;
      const averageResponseTime = Math.round(toNum(row.avg_response_time) || 120);
      const systemLoad = Math.min(100, Math.round(((toNum(row.avg_cpu) || 0) * 0.55) + ((toNum(row.avg_memory) || 0) * 0.45)));
      const errorRate = totalApiCalls > 0 ? Number(((toNum(row.security_30d) / totalApiCalls) * 100).toFixed(3)) : 0;
      const uptime = Math.max(95, Number((100 - errorRate).toFixed(2)));
      const pct = (current: number, previous: number) => previous > 0 ? Number((((current - previous) / previous) * 100).toFixed(1)) : current > 0 ? 100 : 0;
      const apiCallsTrendPercent = pct(toNum(row.activity_30d), toNum(row.activity_prev_30d));
      const storageTrendPercent = pct(toNum(row.patients_total), toNum(row.patients_prev));
      const activeUsersTrendPercent = pct(totalActiveUsers, toNum(row.users_prev));
      const responseTimeTrendPercent = averageResponseTime > 250 ? 8 : averageResponseTime > 150 ? 2 : -3;

      const topResult = await db.execute(sql`
        SELECT
          t.id,
          t.slug,
          t.name,
          t.plan,
          coalesce(a.activity_count, 0)::int AS activity_count,
          coalesce(ap.appointment_count, 0)::int AS appointment_count,
          coalesce(v.visit_count, 0)::int AS visit_count,
          coalesce(p.patient_count, 0)::int AS patient_count,
          coalesce(lo.lab_count, 0)::int AS lab_count,
          coalesce(pr.prescription_count, 0)::int AS prescription_count,
          coalesce(inv.invoice_count, 0)::int AS invoice_count,
          coalesce(us.session_count, 0)::int AS session_count
        FROM tenants t
        LEFT JOIN (SELECT tenant_id, count(*) AS activity_count FROM activity_logs WHERE timestamp >= now() - interval '30 days' GROUP BY tenant_id) a ON a.tenant_id = t.id
        LEFT JOIN (SELECT tenant_id, count(*) AS appointment_count FROM appointments WHERE deleted_at IS NULL GROUP BY tenant_id) ap ON ap.tenant_id = t.id
        LEFT JOIN (SELECT tenant_id, count(*) AS visit_count FROM visits WHERE deleted_at IS NULL GROUP BY tenant_id) v ON v.tenant_id = t.id
        LEFT JOIN (SELECT tenant_id, count(*) AS patient_count FROM patients WHERE deleted_at IS NULL GROUP BY tenant_id) p ON p.tenant_id = t.id
        LEFT JOIN (SELECT tenant_id, count(*) AS lab_count FROM lab_orders WHERE deleted_at IS NULL GROUP BY tenant_id) lo ON lo.tenant_id = t.id
        LEFT JOIN (SELECT tenant_id, count(*) AS prescription_count FROM prescriptions WHERE deleted_at IS NULL GROUP BY tenant_id) pr ON pr.tenant_id = t.id
        LEFT JOIN (SELECT tenant_id, count(*) AS invoice_count FROM invoices WHERE deleted_at IS NULL GROUP BY tenant_id) inv ON inv.tenant_id = t.id
        LEFT JOIN (SELECT tenant_id, count(*) AS session_count FROM user_sessions WHERE is_active = true AND logout_at IS NULL AND expires_at > now() GROUP BY tenant_id) us ON us.tenant_id = t.id
        WHERE t.is_active = true AND t.deleted_at IS NULL
        ORDER BY (coalesce(a.activity_count, 0) + coalesce(ap.appointment_count, 0) * 4 + coalesce(v.visit_count, 0) * 6 + coalesce(lo.lab_count, 0) * 5 + coalesce(pr.prescription_count, 0) * 5 + coalesce(inv.invoice_count, 0) * 3) DESC
        LIMIT 10
      `) as any;
      const topRows = topResult.rows || [];

      const topConsumers = topRows.map((tenant: any) => ({
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        plan: tenant.plan,
        apiCalls: toNum(tenant.activity_count) + toNum(tenant.appointment_count) * 4 + toNum(tenant.visit_count) * 6 + toNum(tenant.lab_count) * 5 + toNum(tenant.prescription_count) * 5 + toNum(tenant.invoice_count) * 3,
        storageUsed: toNum(tenant.patient_count) * 2.5 * 1024 * 1024 + toNum(tenant.visit_count) * 1.25 * 1024 * 1024 + toNum(tenant.lab_count) * 0.75 * 1024 * 1024 + toNum(tenant.invoice_count) * 0.25 * 1024 * 1024,
        activeSessions: toNum(tenant.session_count),
        patientCount: toNum(tenant.patient_count),
      }));

      return {
        totalApiCalls,
        totalStorageUsed,
        totalActiveUsers,
        averageResponseTime,
        systemLoad,
        errorRate,
        uptime: Math.min(uptime, 99.99),
        apiCallsTrend: Math.max(0, Math.min(100, 100 - Math.abs(apiCallsTrendPercent))),
        apiCallsTrendPercent: Math.round(apiCallsTrendPercent * 10) / 10,
        storageConsumptionTrend: Math.max(0, Math.min(100, 100 - Math.abs(storageTrendPercent))),
        storageTrendPercent: Math.round(storageTrendPercent * 10) / 10,
        activeUsersTrend: Math.max(0, Math.min(100, 100 - Math.abs(activeUsersTrendPercent))),
        activeUsersTrendPercent: Math.round(activeUsersTrendPercent * 10) / 10,
        responseTimeTrend: Math.max(0, Math.min(100, 100 - Math.abs(responseTimeTrendPercent))),
        responseTimeTrendPercent,
        activeTenants: toNum(row.active_tenants),
        liveSessions: toNum(row.live_sessions),
        securityEvents30d: toNum(row.security_30d),
        totalPatients: toNum(row.patients_total),
        totalAppointments: toNum(row.appointments_total),
        totalVisits: toNum(row.visits_total),
        totalLabOrders: toNum(row.lab_orders_total),
        totalPrescriptions: toNum(row.prescriptions_total),
        totalInvoices: toNum(row.invoices_total),
        topConsumers,
      };
    } catch (error) {
      console.error("Error calculating usage stats:", error);
      return this.getDefaultTopConsumers();
    }
  }

  private getDefaultTopConsumers() {
    return {
      totalApiCalls: 0,
      totalStorageUsed: 0,
      totalActiveUsers: 0,
      averageResponseTime: 0,
      systemLoad: 0,
      errorRate: 0,
      uptime: 99.99,
      apiCallsTrend: 0,
      apiCallsTrendPercent: 0,
      storageConsumptionTrend: 0,
      storageTrendPercent: 0,
      activeUsersTrend: 0,
      activeUsersTrendPercent: 0,
      responseTimeTrend: 0,
      responseTimeTrendPercent: 0,
      topConsumers: [],
    };
  }
}
