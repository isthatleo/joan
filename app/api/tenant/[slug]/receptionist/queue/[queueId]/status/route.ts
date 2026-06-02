import { NextRequest, NextResponse } from "next/server";
import { getTenantBySlug, updateReceptionQueueStatus } from "@/lib/receptionist/data";
import { revalidatePath } from "next/cache"; // Import revalidatePath

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; queueId: string }> },
) {
  try {
    const { slug, queueId } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { status } = await request.json();
    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    const queue = await updateReceptionQueueStatus(tenant.id, queueId, status);

    // Revalidate paths after status change
    if (status === "with-doctor") {
      revalidatePath(`/[slug]/doctor/queue`, 'page');
    }
    revalidatePath(`/[slug]/reception/queue`, 'page');
    revalidatePath(`/[slug]/reception/waiting`, 'page');
    revalidatePath(`/[slug]/reception`, 'page'); // Revalidate main receptionist dashboard as well

    return NextResponse.json({ success: true, queue });
  } catch (error) {
    console.error("Failed to update queue status:", error);
    return NextResponse.json({ error: "Failed to update queue status" }, { status: 500 });
  }
}