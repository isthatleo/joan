import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { getReceptionAppointments } from "@/lib/receptionist/data";

function normalize(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function inDateRange(value: string | null, range: string) {
  if (range === "all") return true;
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (range === "today") {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (range === "7d") {
    start.setHours(0, 0, 0, 0);
    end.setDate(now.getDate() + 7);
    end.setHours(23, 59, 59, 999);
  } else if (range === "30d") {
    start.setHours(0, 0, 0, 0);
    end.setDate(now.getDate() + 30);
    end.setHours(23, 59, 59, 999);
  } else if (range === "past") {
    return date < now;
  }

  return date >= start && date <= end;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const status = normalize(request.nextUrl.searchParams.get("status") || "all");
    const range = normalize(request.nextUrl.searchParams.get("range") || "30d");
    const search = normalize(request.nextUrl.searchParams.get("search"));
    const patientId = request.nextUrl.searchParams.get("patientId") || undefined;

    const appointments = await getReceptionAppointments(tenantId, { patientId });
    const rows = appointments.filter((appointment) => {
      const matchesStatus = status === "all" || normalize(appointment.status) === status;
      const matchesRange = inDateRange(appointment.scheduledAt, range || "30d");
      const haystack = normalize([
        appointment.patientName,
        appointment.medicalRecordNumber,
        appointment.patientPhone,
        appointment.patientEmail,
        appointment.doctorName,
        appointment.department,
        appointment.type,
        appointment.reason,
        appointment.notes,
      ].filter(Boolean).join(" "));
      const matchesSearch = !search || haystack.includes(search);

      return matchesStatus && matchesRange && matchesSearch;
    });

    const stats = {
      total: rows.length,
      scheduled: rows.filter((item) => normalize(item.status) === "scheduled").length,
      checkedIn: rows.filter((item) => normalize(item.status) === "checked-in").length,
      completed: rows.filter((item) => normalize(item.status) === "completed").length,
      cancelled: rows.filter((item) => ["cancelled", "no-show", "no_show"].includes(normalize(item.status))).length,
    };

    return NextResponse.json({ appointments: rows, stats });
  } catch (error) {
    console.error("Failed to fetch tenant appointments:", error);
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
  }
}
