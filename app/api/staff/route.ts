import { NextRequest, NextResponse } from "next/server";
import { AdminService } from "@/lib/services/admin.service";

const service = new AdminService();

export async function GET(request: NextRequest) {
  try {
    const staff = await service.getStaffList("tenant-id");
    return NextResponse.json(staff);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const staff = await service.createStaff(data);
    return NextResponse.json(staff);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create staff" }, { status: 500 });
  }
}
