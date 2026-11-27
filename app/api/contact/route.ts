import { and, eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/api/utils";
import { db } from "@/lib/db";
import { activityLogs, feedbacks, notifications, roles, userRoles, users } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/send-email";

const contactSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  workEmail: z.string().trim().email().max(200),
  organization: z.string().trim().min(1).max(160),
  role: z.enum([
    "hospital_admin",
    "clinician",
    "it_admin",
    "lab_pharmacy",
    "finance",
    "patient_guardian",
    "other",
  ]),
  topic: z.enum([
    "sales",
    "support",
    "billing",
    "partnership",
    "security",
    "accessibility",
    "privacy",
    "other",
  ]),
  urgency: z.enum(["low", "normal", "high"]).default("normal"),
  subject: z.string().trim().min(3).max(180),
  message: z.string().trim().min(20).max(4000),
  consent: z.literal(true),
  website: z.string().max(0).optional(),
});

const PRIORITY: Record<z.infer<typeof contactSchema>["urgency"], string> = {
  low: "low",
  normal: "medium",
  high: "high",
};

async function findActiveSuperAdmins() {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      baseRole: users.role,
      linkedRole: roles.name,
    })
    .from(users)
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(eq(users.isActive, true), isNull(users.deletedAt)));

  const admins = new Map<string, { id: string; email: string; fullName: string | null }>();

  for (const row of rows) {
    const roleNames = [row.baseRole, row.linkedRole]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());

    if (roleNames.includes("super_admin")) {
      admins.set(row.id, { id: row.id, email: row.email, fullName: row.fullName });
    }
  }

  return Array.from(admins.values());
}

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  if (!checkRateLimit(`contact:${clientIp}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many messages from this network. Please try again later." },
      { status: 429 }
    );
  }

  let body: z.infer<typeof contactSchema>;
  try {
    body = contactSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Please check the form and try again." }, { status: 400 });
  }

  const fullName = `${body.firstName} ${body.lastName}`.trim();
  const description = [
    `Name: ${fullName}`,
    `Work email: ${body.workEmail}`,
    `Organization: ${body.organization}`,
    `Role: ${body.role.replaceAll("_", " ")}`,
    `Topic: ${body.topic}`,
    `Urgency: ${body.urgency}`,
    `Subject: ${body.subject}`,
    "",
    body.message,
  ].join("\n");

  try {
    const superAdmins = await findActiveSuperAdmins();

    const [submission] = await db
      .insert(feedbacks)
      .values({
        tenantId: null,
        userId: null,
        userName: fullName,
        userEmail: body.workEmail,
        scope: "platform",
        type: "contact_request",
        title: `Contact request · ${body.subject}`,
        description,
        priority: PRIORITY[body.urgency],
        status: "open",
        patientFeedback: false,
      })
      .returning({ id: feedbacks.id });

    if (superAdmins.length > 0) {
      await db.insert(notifications).values(
        superAdmins.map((admin) => ({
          tenantId: null,
          userId: admin.id,
          type: "contact_request",
          title: "New contact message",
          message: `${fullName} sent a ${body.topic.replaceAll("_", " ")} request: ${body.subject}`,
          metadata: {
            feedbackId: submission.id,
            destination: "super_admin",
            workEmail: body.workEmail,
            organization: body.organization,
            topic: body.topic,
            urgency: body.urgency,
          },
          read: false,
        }))
      );
    }

    let emailDelivered = false;
    if (superAdmins.length > 0) {
      try {
        const emailResult = await sendEmail({
          to: superAdmins.map((admin) => admin.email),
          replyTo: body.workEmail,
          subject: `[Joan Contact] ${body.subject}`,
          template: {
            previewLabel: "Website contact message",
            heading: "New contact message for super admin review",
            body: `${fullName} from ${body.organization} sent a ${body.topic.replaceAll("_", " ")} request.`,
            brandName: "Joan Healthcare OS",
            summary: [
              { label: "From", value: `${fullName} · ${body.workEmail}` },
              { label: "Organization", value: body.organization },
              { label: "Role", value: body.role.replaceAll("_", " ") },
              { label: "Topic", value: body.topic },
              { label: "Urgency", value: body.urgency },
              { label: "Reference", value: submission.id },
            ],
            sections: [{ title: body.subject, body: body.message }],
            footerNote: "Review and respond from the super admin feedback console.",
          },
          tags: [{ name: "type", value: "contact_request" }],
        });
        emailDelivered = emailResult.ok;
      } catch (error) {
        console.error("[contact] Failed to send super admin email:", error);
      }
    }

    await db.insert(activityLogs).values({
      tenantId: null,
      userId: null,
      action: "contact_request_submitted",
      resource: "contact",
      resourceId: submission.id,
      description: `Contact message from ${fullName} routed to super admins.`,
      status: "success",
      ipAddress: clientIp,
      userAgent: request.headers.get("user-agent") || null,
      metadata: {
        feedbackId: submission.id,
        organization: body.organization,
        topic: body.topic,
        urgency: body.urgency,
        notifiedAdmins: superAdmins.length,
        emailDelivered,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        reference: submission.id,
        destination: "super_admin",
        notifiedAdmins: superAdmins.length,
        emailDelivered,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[contact] Failed to store contact message:", error);
    return NextResponse.json(
      { error: "We could not save your message. Please try again or email support@joan.health." },
      { status: 500 }
    );
  }
}
