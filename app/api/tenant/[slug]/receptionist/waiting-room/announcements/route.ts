import { NextRequest, NextResponse } from "next/server";
import { addWaitingRoomAnnouncement, getTenantBySlug, getWaitingRoomAnnouncements } from "@/lib/receptionist/data";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    const announcements = await getWaitingRoomAnnouncements(tenant.id);
    return NextResponse.json(announcements);
  } catch (error) {
    console.error("Failed to fetch waiting room announcements:", error);
    return NextResponse.json({ error: "Failed to fetch waiting room announcements" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    const { message, type } = await request.json();
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }
    const announcement = await addWaitingRoomAnnouncement(tenant.id, message, type || "info");
    return NextResponse.json(announcement);
  } catch (error) {
    console.error("Failed to create announcement:", error);
    return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 });
  }
}
