import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MessagingService } from "@/lib/services/messaging.service";
import { resolveTenantMessagingUser } from "@/lib/tenant-messaging-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const service = new MessagingService();

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const currentUser = await resolveTenantMessagingUser(request, session.user.email, slug);
    if (!currentUser) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { otherUserId, messageIds } = await request.json();
    if (!otherUserId) {
      return NextResponse.json({ error: "otherUserId is required" }, { status: 400 });
    }

    const updated = await service.markConversationRead(currentUser.id, otherUserId, Array.isArray(messageIds) ? messageIds : undefined);
    return NextResponse.json(
      { updatedCount: updated.length },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("[tenant messages read POST]", error);
    return NextResponse.json({ error: "Failed to update read state" }, { status: 500 });
  }
}
