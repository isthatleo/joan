import { NextRequest, NextResponse } from "next/server";
import { FeedbackService } from "@/lib/services/feedback.service";
import { resolveDoctorContext } from "@/lib/doctor/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications, roles, userRoles, users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const service = new FeedbackService();

export async function GET(request: NextRequest) {
  try {
    const context = await resolveDoctorContext(request.headers);
    if (!context.ok) {
      return NextResponse.json({ error: context.error }, { status: context.status });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    const feedback = await service.getFeedback({
      userId: context.doctor.id,
      tenantId: context.doctor.tenantId ?? undefined,
      status: status || undefined,
      type: type || undefined,
    });

    return NextResponse.json(
      {
        feedback,
        currentUser: {
          id: context.doctor.id,
          tenantId: context.doctor.tenantId,
          fullName: context.doctor.fullName,
          email: context.doctor.email,
        },
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("[doctor feedback GET]", error);
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await resolveDoctorContext(request.headers);
    if (!context.ok) {
      return NextResponse.json({ error: context.error }, { status: context.status });
    }

    const data = await request.json();
    if (!data?.type || !data?.title) {
      return NextResponse.json({ error: "Type and title are required" }, { status: 400 });
    }

    const feedback = await service.createFeedback({
      userId: context.doctor.id,
      tenantId: context.doctor.tenantId ?? undefined,
      userName: context.doctor.fullName ?? undefined,
      userEmail: context.doctor.email,
      type: data.type,
      title: data.title,
      description: data.description,
      priority: data.priority,
      scope: data.scope,
    });

    const feedbackScope = service.resolveScope(data.type, data.scope);

    const recipientRows = await db
      .select({
        id: users.id,
        tenantId: users.tenantId,
        baseRole: users.role,
        linkedRole: roles.name,
      })
      .from(users)
      .leftJoin(userRoles, eq(userRoles.userId, users.id))
      .leftJoin(roles, eq(roles.id, userRoles.roleId))
      .where(and(eq(users.isActive, true), isNull(users.deletedAt)));

    const recipientIds = Array.from(
      new Set(
        recipientRows
          .filter((row) => {
            const roleNames = [row.baseRole, row.linkedRole]
              .filter(Boolean)
              .map((value) => String(value).toLowerCase());

            if (feedbackScope === "platform") {
              return roleNames.includes("super_admin");
            }

            return (
              row.tenantId === context.doctor.tenantId &&
              (roleNames.includes("hospital_admin") || roleNames.includes("admin"))
            );
          })
          .map((row) => row.id)
      )
    );

    if (recipientIds.length > 0) {
      await db.insert(notifications).values(
        recipientIds.map((userId) => ({
          tenantId: feedbackScope === "tenant" ? context.doctor.tenantId : null,
          userId,
          type: feedbackScope === "platform" ? "platform_feedback" : "doctor_feedback",
          title:
            feedbackScope === "platform"
              ? "Doctor submitted platform feedback"
              : data.type === "bug"
                ? "Doctor reported a service issue"
                : "Doctor submitted tenant feedback",
          message: `${context.doctor.fullName || context.doctor.email} submitted "${data.title}".`,
          metadata: {
            feedbackId: feedback.id,
            feedbackType: data.type,
            feedbackScope,
            priority: data.priority || "medium",
            submittedBy: context.doctor.id,
          },
          read: false,
        }))
      );
    }

    return NextResponse.json({ feedback }, { status: 201 });
  } catch (error) {
    console.error("[doctor feedback POST]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create feedback" }, { status: 500 });
  }
}
