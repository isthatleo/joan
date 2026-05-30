import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MessagingService } from "@/lib/services/messaging.service";
import { resolveTenantMessagingUser } from "@/lib/tenant-messaging-auth";

const service = new MessagingService();

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug, id } = await params;
    const currentUser = await resolveTenantMessagingUser(request, session.user.email, slug);
    if (!currentUser) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const deleted = await service.deleteMessage(currentUser.id, id);
    return NextResponse.json({ deleted });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete message" },
      { status: 500 }
    );
  }
}
