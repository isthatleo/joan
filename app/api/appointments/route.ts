import { NextRequest, NextResponse } from "next/server";
import { AppointmentService } from "@/lib/services/appointment.service";

const service = new AppointmentService();

export async function GET(request: NextRequest) {
  try {
    const appointments = await service.getPatientAppointments("patient-id");
    return NextResponse.json(appointments);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const appointment = await service.createAppointment(data);
    return NextResponse.json(appointment);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
  }
}
