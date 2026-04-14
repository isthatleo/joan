import { NextRequest, NextResponse } from "next/server";
import { LabService } from "@/lib/services/lab.service";

const service = new LabService();

export async function GET(request: NextRequest) {
  try {
    const orders = await service.getLabOrder("id");
    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch lab orders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const order = await service.createLabOrder(data);
    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create lab order" }, { status: 500 });
  }
}
