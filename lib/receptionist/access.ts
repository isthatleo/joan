import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleAuth } from "drizzle-orm/neon-http";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { roles, userRoles, users } from "@/lib/db/schema";
import * as authSchema from "@/lib/auth-schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const authSql = neon(process.env.DATABASE_URL, { fullResults: false });
const authDb = drizzleAuth(authSql, { schema: authSchema });
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function generateTemporaryPassword() {
  return crypto.randomBytes(6).toString("base64url");
}

function buildAliasEmail(patientId: string, tenantSlug: string) {
  return `patient-${patientId.slice(0, 8)}@${tenantSlug}.patient.local`;
}

type ProvisionPatientAccessInput = {
  tenantId: string;
  tenantSlug: string;
  fullName: string;
  patientId: string;
  email?: string | null;
  phone?: string | null;
};

export async function provisionPatientPortalAccess(input: ProvisionPatientAccessInput) {
  const loginIdentifier = (input.email || "").trim().toLowerCase() || buildAliasEmail(input.patientId, input.tenantSlug);
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  let delivery: "email" | "sms" | "manual" = "manual";

  let appUser = await db.query.users.findFirst({
    where: eq(users.email, loginIdentifier),
  });

  if (!appUser) {
    const [created] = await db
      .insert(users)
      .values({
        tenantId: input.tenantId,
        email: loginIdentifier,
        fullName: input.fullName,
        phone: input.phone || null,
        role: "patient",
        isActive: true,
        passwordHash,
      })
      .returning();
    appUser = created;
  } else {
    await db
      .update(users)
      .set({
        tenantId: appUser.tenantId || input.tenantId,
        fullName: appUser.fullName || input.fullName,
        phone: appUser.phone || input.phone || null,
        role: "patient",
        isActive: true,
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, appUser.id));
  }

  const patientRole = await db.query.roles.findFirst({
    where: and(eq(roles.tenantId, input.tenantId), eq(roles.name, "patient")),
  });

  if (patientRole) {
    const existingRole = await db.query.userRoles.findFirst({
      where: and(eq(userRoles.userId, appUser.id), eq(userRoles.roleId, patientRole.id)),
    });

    if (!existingRole) {
      await db.insert(userRoles).values({ userId: appUser.id, roleId: patientRole.id });
    }
  }

  const existingAuthUser = await authDb.query.user.findFirst({
    where: eq(authSchema.user.email, loginIdentifier),
  });

  const authUserId = existingAuthUser?.id || crypto.randomUUID();
  if (!existingAuthUser) {
    await authDb.insert(authSchema.user).values({
      id: authUserId,
      name: input.fullName,
      email: loginIdentifier,
      emailVerified: Boolean(input.email),
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } else {
    await authDb
      .update(authSchema.user)
      .set({
        name: existingAuthUser.name || input.fullName,
        updatedAt: new Date(),
      })
      .where(eq(authSchema.user.id, existingAuthUser.id));
  }

  const existingCredential = await authDb.query.account.findFirst({
    where: and(eq(authSchema.account.userId, authUserId), eq(authSchema.account.providerId, "credential")),
  });

  if (!existingCredential) {
    await authDb.insert(authSchema.account).values({
      id: crypto.randomUUID(),
      accountId: authUserId,
      providerId: "credential",
      userId: authUserId,
      password: passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } else {
    await authDb
      .update(authSchema.account)
      .set({
        password: passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(authSchema.account.id, existingCredential.id));
  }

  const loginPath = `/${input.tenantSlug}/login`;
  const onboardingMessage = [
    `Your patient dashboard access is ready.`,
    `Login ID: ${loginIdentifier}`,
    `Temporary password: ${temporaryPassword}`,
    `Sign in on your tenant login page and change this password after first login.`,
  ].join("\n");

  if (input.email) {
    if (resend) {
      await resend.emails.send({
        from: process.env.EMAIL_FROM || "Joan <onboarding@resend.dev>",
        to: input.email,
        subject: "Your patient portal access",
        text: `${onboardingMessage}\nLogin path: ${loginPath}`,
      }).catch((error) => {
        console.error("Failed to send patient onboarding email:", error);
      });
      delivery = "email";
    }
  } else if (input.phone) {
    const { NotificationService } = await import("@/lib/services/notification.service");
    const notifications = new NotificationService();
    await notifications.sendSMS(
      input.phone,
      `${onboardingMessage}\nLogin path: ${loginPath}`
    );
    delivery = "sms";
  }

  return {
    userId: appUser.id,
    loginIdentifier,
    temporaryPassword,
    delivery,
  };
}
