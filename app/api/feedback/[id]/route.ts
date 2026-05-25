import { NextRequest, NextResponse } from "next/server";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { FeedbackService } from "@/lib/services/feedback.service";

const service = new FeedbackService();

async function resolveCurrentAppUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.email) return null;

  return db.query.users.findFirst({
    where: and(ilike(users.email, session.user.email), isNull(users.deletedAt)),
    columns: {
      id: true,
      tenantId: true,
      email: true,
      fullName: true,
      role: true,
    },
  });
}

function canManageTenantFeedback(currentUser: Awaited<ReturnType<typeof resolveCurrentAppUser>>, feedback: Awaited<ReturnType<FeedbackService["getFeedbackAccess"]>>) {
  if (!currentUser || !feedback) return false;
  if (currentUser.role === "super_admin") return true;
  if (feedback.userId && feedback.userId === currentUser.id) return true;
  if (!feedback.tenantId || feedback.tenantId !== currentUser.tenantId) return false;
  return currentUser.role === "hospital_admin" || currentUser.role === "admin";
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await resolveCurrentAppUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const access = await service.getFeedbackAccess(id);
    if (!access || !canManageTenantFeedback(currentUser, access)) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    const feedback = await service.getFeedbackById(id);
    if (!feedback) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    return NextResponse.json({ feedback }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Error fetching feedback details:", error);
    return NextResponse.json({ error: "Failed to fetch feedback details" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await resolveCurrentAppUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const access = await service.getFeedbackAccess(id);
    if (!access || !canManageTenantFeedback(currentUser, access)) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    const deleted = await service.deleteFeedback(id);
    if (!deleted) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting feedback:", error);
    return NextResponse.json({ error: "Failed to delete feedback" }, { status: 500 });
  }
}
