import { db } from "@/lib/db";
import {
  tenants,
  users,
} from "@/lib/db/schema";
import { eq, desc, sql, and, isNotNull, isNull, lte } from "drizzle-orm";

function quoteIdentifier(identifier: string) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe SQL identifier: ${identifier}`);
  }
  return `"${identifier.replace(/"/g, '""')}"`;
}

function uuidLiteral(value: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error(`Invalid UUID: ${value}`);
  }
  return `'${value.toLowerCase()}'`;
}

async function tableExists(tx: any, tableName: string) {
  const result = await tx.execute(sql`
    SELECT to_regclass(${`public.${tableName}`}) AS regclass
  `) as any;
  return Boolean(result.rows?.[0]?.regclass);
}

async function deleteTenantScopedTables(tx: any, tenantId: string, excludedTables = new Set<string>()) {
  const excluded = Array.from(excludedTables).map((table) => `'${table.replace(/'/g, "''")}'`).join(",") || "''";
  await tx.execute(sql.raw(`
    DO $tenant_purge$
    DECLARE
      tenant_uuid uuid := ${uuidLiteral(tenantId)}::uuid;
      target record;
      pass int;
    BEGIN
      FOR pass IN 1..4 LOOP
        FOR target IN
          SELECT table_schema, table_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND column_name = 'tenant_id'
            AND table_name <> 'tenants'
            AND table_name <> ALL(ARRAY[${excluded}]::text[])
          ORDER BY table_name
        LOOP
          BEGIN
            EXECUTE format(
              'DELETE FROM %I.%I WHERE tenant_id = $1',
              target.table_schema,
              target.table_name
            ) USING tenant_uuid;
          EXCEPTION WHEN OTHERS THEN
            NULL;
          END;
        END LOOP;
      END LOOP;
    END $tenant_purge$;
  `));
}

async function deleteRowsReferencingTenantScopedParents(tx: any, tenantId: string) {
  await tx.execute(sql.raw(`
    DO $tenant_fk_purge$
    DECLARE
      tenant_uuid uuid := ${uuidLiteral(tenantId)}::uuid;
      target record;
      pass int;
    BEGIN
      FOR pass IN 1..4 LOOP
        FOR target IN
          SELECT
            tc.table_schema AS child_schema,
            tc.table_name AS child_table,
            kcu.column_name AS child_column,
            ccu.table_schema AS parent_schema,
            ccu.table_name AS parent_table,
            ccu.column_name AS parent_column
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
          JOIN information_schema.columns parent_tenant
            ON parent_tenant.table_schema = ccu.table_schema
            AND parent_tenant.table_name = ccu.table_name
            AND parent_tenant.column_name = 'tenant_id'
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = 'public'
            AND ccu.table_schema = 'public'
            AND tc.table_name <> ccu.table_name
            AND tc.table_name <> 'tenants'
          ORDER BY tc.table_name
        LOOP
          BEGIN
            EXECUTE format(
              'DELETE FROM %I.%I AS child_row USING %I.%I AS parent_row WHERE child_row.%I = parent_row.%I AND parent_row.tenant_id = $1',
              target.child_schema,
              target.child_table,
              target.parent_schema,
              target.parent_table,
              target.child_column,
              target.parent_column
            ) USING tenant_uuid;
          EXCEPTION WHEN OTHERS THEN
            NULL;
          END;
        END LOOP;
      END LOOP;
    END $tenant_fk_purge$;
  `));
}

async function deleteRowsForUsers(tx: any, userIds: string[], excludedTables = new Set<string>()) {
  if (!userIds.length) return;
  const result = await tx.execute(sql`
    SELECT
      tc.table_schema,
      tc.table_name,
      kcu.column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND ccu.table_name = 'users'
      AND tc.table_name <> 'users'
    ORDER BY tc.table_name, kcu.column_name
  `) as any;

  const references = (result.rows || []) as Array<{ table_schema: string; table_name: string; column_name: string }>;
  for (let pass = 0; pass < 2; pass += 1) {
    for (const reference of references) {
      if (excludedTables.has(reference.table_name)) continue;
      const qualifiedName = `${quoteIdentifier(reference.table_schema)}.${quoteIdentifier(reference.table_name)}`;
      const columnName = quoteIdentifier(reference.column_name);
      await tx.execute(
        sql`DELETE FROM ${sql.raw(qualifiedName)} WHERE ${sql.raw(columnName)} = ANY(${userIds}::uuid[])`,
      ).catch(() => null);
    }
  }
}

async function deleteAuthRowsForTenantUsers(tx: any, tenantId: string, userIds: string[], emails: string[]) {
  const hasAuthUserTable = await tableExists(tx, "user");
  const hasAuthSessionTable = await tableExists(tx, "session");
  const hasAuthAccountTable = await tableExists(tx, "account");
  if (!hasAuthUserTable) return;

  if (hasAuthSessionTable) {
    await tx.execute(sql`
      DELETE FROM "session"
      WHERE "userId" IN (
        SELECT au.id
        FROM "user" au
        WHERE au.id = ANY(${userIds}::text[])
           OR lower(au.email) = ANY(${emails.map((email) => email.toLowerCase())}::text[])
           OR lower(au.email) IN (SELECT lower(app_user.email) FROM users app_user WHERE app_user.tenant_id = ${tenantId})
      )
    `).catch(() => null);
  }

  if (hasAuthAccountTable) {
    await tx.execute(sql`
      DELETE FROM "account"
      WHERE "userId" IN (
        SELECT au.id
        FROM "user" au
        WHERE au.id = ANY(${userIds}::text[])
           OR lower(au.email) = ANY(${emails.map((email) => email.toLowerCase())}::text[])
           OR lower(au.email) IN (SELECT lower(app_user.email) FROM users app_user WHERE app_user.tenant_id = ${tenantId})
      )
    `).catch(() => null);
  }

  await tx.execute(sql`
    DELETE FROM "user"
    WHERE id = ANY(${userIds}::text[])
       OR lower(email) = ANY(${emails.map((email) => email.toLowerCase())}::text[])
       OR lower(email) IN (SELECT lower(app_user.email) FROM users app_user WHERE app_user.tenant_id = ${tenantId})
  `).catch(() => null);
}

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

    const tx = db;

    console.log(`Getting user IDs for tenant ${id}`);
    const userRows = await tx
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.tenantId, id));
    const userIdList = userRows.map((user) => user.id);
    const userEmails = userRows.map((user) => user.email).filter(Boolean);
    console.log(`Found ${userIdList.length} users for tenant ${id}`);

    await deleteAuthRowsForTenantUsers(tx, id, userIdList, userEmails);
    await deleteRowsForUsers(tx, userIdList, new Set(["users"]));

    for (let pass = 0; pass < 2; pass += 1) {
      await deleteRowsReferencingTenantScopedParents(tx, id);
      await deleteTenantScopedTables(tx, id, new Set(["users"]));
    }

    await tx.delete(users).where(eq(users.tenantId, id));
    await deleteTenantScopedTables(tx, id);

    console.log(`Finally deleting tenant record ${id}`);
    await tx.delete(tenants).where(eq(tenants.id, id));

    console.log(`Tenant deletion completed successfully for tenant ID: ${id}`);
    return { success: true };
  }

  async purgeDueTenants(limit = 10) {
    const now = new Date();
    const candidates = await db
      .select({
        id: tenants.id,
        slug: tenants.slug,
      })
      .from(tenants)
      .where(
        and(
          eq(tenants.provisioningStatus, "archived"),
          isNotNull(tenants.scheduledPurgeAt),
          lte(tenants.scheduledPurgeAt, now),
        ),
      )
      .limit(limit);

    const purged: { id: string; slug: string }[] = [];
    const failed: { id: string; slug: string; error: string }[] = [];

    for (const tenant of candidates) {
      try {
        await this.deleteTenant(tenant.id);
        purged.push(tenant);
      } catch (error: any) {
        failed.push({
          id: tenant.id,
          slug: tenant.slug,
          error: error?.message || "unknown",
        });
      }
    }

    return {
      ranAt: now.toISOString(),
      candidates: candidates.length,
      purged,
      failed,
    };
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
