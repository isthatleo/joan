import { NextRequest, NextResponse } from "next/server";
import {
  deleteWaitingRoomAnnouncement,
  getTenantBySlug,
  updateWaitingRoomAnnouncement,
} from "@/lib/receptionist/data";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; announcementId: string }> },
) {
  try {
    const { slug, announcementId } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const patch = await request.json().catch(() => ({}));
    const announcement = await updateWaitingRoomAnnouncement(tenant.id, announcementId, patch || {});
    return NextResponse.json({ success: true, announcement });
  } catch (error) {
    console.error("Failed to update waiting room announcement:", error);
    return NextResponse.json({ error: "Failed to update waiting room announcement" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; announcementId: string }> },
) {
  try {
    const { slug, announcementId } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    await deleteWaitingRoomAnnouncement(tenant.id, announcementId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete waiting room announcement:", error);
    return NextResponse.json({ error: "Failed to delete waiting room announcement" }, { status: 500 });
  }
}
