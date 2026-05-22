import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { appointments, labOrders, prescriptions, labResults, patients, users } from "@/lib/db/schema";
import { format, subDays, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const patientId = searchParams.get("patientId");
    const type = searchParams.get("type") || "all";
    const date = searchParams.get("date") || "all";

    if (!slug || !patientId) {
      return NextResponse.json({ error: "Tenant slug and patient ID required" }, { status: 400 });
    }

    // Get doctor's user record to verify role
    const doctorUser = await db
      .select()
      .from(users)
      .where(and(eq(users.id, session.user.id), eq(users.role, "doctor")))
      .limit(1);

    if (!doctorUser.length) {
      return NextResponse.json({ error: "Doctor access required" }, { status: 403 });
    }

    // Build date filter
    let dateFilter = {};
    const now = new Date();

    switch (date) {
      case "week":
        dateFilter = {
          gte: subDays(now, 7),
        };
        break;
      case "month":
        dateFilter = {
          gte: startOfMonth(now),
          lte: endOfMonth(now),
        };
        break;
      case "quarter":
        dateFilter = {
          gte: startOfQuarter(now),
          lte: endOfQuarter(now),
        };
        break;
      case "year":
        dateFilter = {
          gte: startOfYear(now),
          lte: endOfYear(now),
        };
        break;
      default:
        // No date filter for "all"
        break;
    }

    // Fetch different types of history based on filter
    const historyItems: any[] = [];

    // Appointments
    if (type === "all" || type === "appointment") {
      let appointmentQuery = db
        .select({
          id: appointments.id,
          type: sql<string>`'appointment'`,
          title: sql<string>`concat('Appointment: ', ${appointments.type})`,
          description: sql<string>`concat('Status: ', ${appointments.status}, ' - Duration: ', ${appointments.duration}, ' min')`,
          date: appointments.scheduledDate,
          provider: sql<string>`${doctorUser[0].fullName || doctorUser[0].email}`,
          category: appointments.type,
          status: appointments.status,
          details: sql<string>`json_build_object('time', ${appointments.scheduledTime}, 'room', ${appointments.room}, 'notes', ${appointments.notes})`,
        })
        .from(appointments)
        .where(
          and(
            eq(appointments.patientId, patientId),
            eq(appointments.doctorId, session.user.id)
          )
        );

      if (date !== "all") {
        appointmentQuery = appointmentQuery.where(sql`${appointments.scheduledDate} >= ${dateFilter.gte}`);
        if (dateFilter.lte) {
          appointmentQuery = appointmentQuery.where(sql`${appointments.scheduledDate} <= ${dateFilter.lte}`);
        }
      }

      const appointmentsData = await appointmentQuery.orderBy(desc(appointments.scheduledDate));
      historyItems.push(...appointmentsData);
    }

    // Lab Orders
    if (type === "all" || type === "lab") {
      let labQuery = db
        .select({
          id: labOrders.id,
          type: sql<string>`'lab'`,
          title: sql<string>`concat('Lab Order: ', ${labOrders.testName})`,
          description: sql<string>`concat('Status: ', ${labOrders.status}, ' - Priority: ', ${labOrders.priority})`,
          date: labOrders.orderedAt,
          provider: labOrders.orderedBy,
          category: labOrders.category,
          status: labOrders.status,
          details: sql<string>`json_build_object('testCode', ${labOrders.testCode}, 'priority', ${labOrders.priority}, 'labLocation', ${labOrders.labLocation})`,
        })
        .from(labOrders)
        .where(
          and(
            eq(labOrders.patientId, patientId),
            eq(labOrders.doctorId, session.user.id)
          )
        );

      if (date !== "all") {
        labQuery = labQuery.where(sql`${labOrders.orderedAt} >= ${dateFilter.gte}`);
        if (dateFilter.lte) {
          labQuery = labQuery.where(sql`${labOrders.orderedAt} <= ${dateFilter.lte}`);
        }
      }

      const labData = await labQuery.orderBy(desc(labOrders.orderedAt));
      historyItems.push(...labData);
    }

    // Prescriptions
    if (type === "all" || type === "prescription") {
      let prescriptionQuery = db
        .select({
          id: prescriptions.id,
          type: sql<string>`'prescription'`,
          title: sql<string>`concat('Prescription: ', ${prescriptions.medication})`,
          description: sql<string>`concat(${prescriptions.dosage}, ' - ', ${prescriptions.frequency}, ' - Status: ', ${prescriptions.status})`,
          date: prescriptions.prescribedAt,
          provider: prescriptions.prescribedBy,
          category: sql<string>`'medication'`,
          status: prescriptions.status,
          details: sql<string>`json_build_object('strength', ${prescriptions.strength}, 'quantity', ${prescriptions.quantity}, 'refills', ${prescriptions.refills})`,
        })
        .from(prescriptions)
        .where(
          and(
            eq(prescriptions.patientId, patientId),
            eq(prescriptions.doctorId, session.user.id)
          )
        );

      if (date !== "all") {
        prescriptionQuery = prescriptionQuery.where(sql`${prescriptions.prescribedAt} >= ${dateFilter.gte}`);
        if (dateFilter.lte) {
          prescriptionQuery = prescriptionQuery.where(sql`${prescriptions.prescribedAt} <= ${dateFilter.lte}`);
        }
      }

      const prescriptionData = await prescriptionQuery.orderBy(desc(prescriptions.prescribedAt));
      historyItems.push(...prescriptionData);
    }

    // Lab Results
    if (type === "all" || type === "vital") {
      let resultQuery = db
        .select({
          id: labResults.id,
          type: sql<string>`'vital'`,
          title: sql<string>`concat('Lab Result: ', ${labResults.testName})`,
          description: sql<string>`concat('Result: ', ${labResults.result}, ' ', ${labResults.unit}, ' - Flag: ', ${labResults.flag})`,
          date: labResults.performedAt,
          provider: labResults.performedBy,
          category: labResults.category,
          status: labResults.status,
          details: sql<string>`json_build_object('referenceRange', ${labResults.referenceRange}, 'flag', ${labResults.flag}, 'verifiedBy', ${labResults.verifiedBy})`,
        })
        .from(labResults)
        .where(eq(labResults.patientId, patientId));

      if (date !== "all") {
        resultQuery = resultQuery.where(sql`${labResults.performedAt} >= ${dateFilter.gte}`);
        if (dateFilter.lte) {
          resultQuery = resultQuery.where(sql`${labResults.performedAt} <= ${dateFilter.lte}`);
        }
      }

      const resultData = await resultQuery.orderBy(desc(labResults.performedAt));
      historyItems.push(...resultData);
    }

    // Sort all history items by date
    historyItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json(historyItems);

  } catch (error) {
    console.error("Doctor patient history API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

