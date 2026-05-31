/**
 * Role-Specific Analytics Service
 * Provides analytics endpoints for each role
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/helpers";
import {
  appointments,
  departments,
  guardianPatients,
  inventoryItems,
  invoices,
  labOrders,
  patients,
  payments,
  prescriptions,
  users,
  visits,
  vitals,
} from "@/lib/db/schema";
import { count, eq, sql } from "drizzle-orm";

async function tableCount(table: any) {
  const [row] = await db.select({ value: count() }).from(table);
  return Number(row?.value || 0);
}

async function statusCount(table: any, status: string) {
  const [row] = await db.select({ value: count() }).from(table).where(eq(table.status, status));
  return Number(row?.value || 0);
}

export async function getRoleAnalytics(role: string) {
  const allUsers = await db.select().from(users);
  const allPatients = await db.select().from(patients);
  const allAppointments = await db.select().from(appointments);
  const allVisits = await db.select().from(visits);
  const revenueResult = await db.execute(sql`
    SELECT
      coalesce(sum(nullif(regexp_replace(coalesce(i.total_amount, i.amount, '0'), '[^0-9.-]', '', 'g'), '')::numeric), 0)::numeric AS total_revenue,
      count(*) FILTER (WHERE lower(coalesce(i.status, '')) IN ('pending', 'sent', 'overdue', 'unpaid'))::int AS pending_invoices,
      coalesce((SELECT sum(nullif(regexp_replace(coalesce(p.amount, '0'), '[^0-9.-]', '', 'g'), '')::numeric) FROM payments p WHERE lower(coalesce(p.status, '')) IN ('paid', 'completed', 'success', 'successful') AND p.deleted_at IS NULL), 0)::numeric AS collected,
      coalesce(sum(nullif(regexp_replace(coalesce(i.amount_due, i.total_amount, i.amount, '0'), '[^0-9.-]', '', 'g'), '')::numeric) FILTER (WHERE lower(coalesce(i.status, '')) IN ('pending', 'sent', 'overdue', 'unpaid')), 0)::numeric AS outstanding
    FROM invoices i
    WHERE i.deleted_at IS NULL
  `) as any;
  const revenue = revenueResult.rows?.[0] || {};

  const baseMetrics = {
    timestamp: new Date(),
    role,
  };

  switch (role) {
    case "doctor":
      return {
        ...baseMetrics,
        patients: allPatients.length,
        appointments: allAppointments.length,
        completed: allAppointments.filter((a) => a.status === "completed").length,
        pending: allAppointments.filter((a) => a.status === "scheduled").length,
        visits: allVisits.length,
      };

    case "nurse":
      return {
        ...baseMetrics,
        patients: allPatients.length,
        visits: allVisits.length,
        vitals: await tableCount(vitals),
      };

    case "lab_technician":
      return {
        ...baseMetrics,
        tests: await tableCount(labOrders),
        completed: await statusCount(labOrders, "completed"),
        pending: await statusCount(labOrders, "pending"),
      };

    case "pharmacist":
      return {
        ...baseMetrics,
        prescriptions: await tableCount(prescriptions),
        dispensed: await statusCount(prescriptions, "dispensed"),
        pending: await statusCount(prescriptions, "pending"),
        inventory_items: await tableCount(inventoryItems),
      };

    case "accountant":
      return {
        ...baseMetrics,
        total_revenue: Number(revenue.total_revenue || 0),
        pending_invoices: Number(revenue.pending_invoices || 0),
        collected: Number(revenue.collected || 0),
        outstanding: Number(revenue.outstanding || 0),
      };

    case "receptionist":
      return {
        ...baseMetrics,
        appointments: allAppointments.length,
        checkedIn: allAppointments.filter((a) => a.status === "completed").length,
        waitingRoom: allAppointments.filter((a) => a.status === "scheduled").length,
      };

    case "patient":
      return {
        ...baseMetrics,
        appointments: allAppointments.length,
        records: allPatients.length,
        prescriptions: await tableCount(prescriptions),
      };

    case "guardian":
      return {
        ...baseMetrics,
        dependents: await tableCount(guardianPatients),
        appointments: allAppointments.length,
        records: allPatients.length,
      };

    case "hospital_admin":
      return {
        ...baseMetrics,
        users: allUsers.length,
        patients: allPatients.length,
        appointments: allAppointments.length,
        departments: await tableCount(departments),
        staff: allUsers.filter((u) => u.isActive).length,
      };

    default:
      return {
        ...baseMetrics,
        error: "Unknown role",
      };
  }
}

export async function handleRoleAnalytics(req: NextRequest, role: string) {
  try {
    const analytics = await getRoleAnalytics(role);
    return NextResponse.json({ data: analytics });
  } catch (error: any) {
    console.error(`Error fetching ${role} analytics:`, error);
    return NextResponse.json(
      { error: `Failed to fetch ${role} analytics` },
      { status: 500 }
    );
  }
}

