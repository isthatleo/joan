import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleAuth } from "drizzle-orm/neon-http";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { guardians, patients, roles, tenantSettings, tenants, userRoles, users, userSettings } from "@/lib/db/schema";
import * as authSchema from "@/lib/auth-schema";
import { mergeUserSettings } from "@/lib/user-settings";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const authSql = neon(process.env.DATABASE_URL, { fullResults: false });
const authDb = drizzleAuth(authSql, { schema: authSchema });
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const DEFERRED_ACCESS_KEY = "deferred_patient_portal_access";

type DeferredPatientPortalAccess = {
  patientId: string;
  fullName: string;
  tenantId: string;
  tenantSlug: string;
  email?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  eligibleOn: string;
  createdAt: string;
};

function generateTemporaryPassword() {
  return crypto.randomBytes(6).toString("base64url");
}

function buildAliasEmail(patientId: string, tenantSlug: string) {
  return `patient-${patientId.slice(0, 8)}@${tenantSlug}.patient.local`;
}

function buildTenantRoleLoginUrl(tenantSlug: string, role: "patient" | "guardian") {
  const origin = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000";
  const base = new URL(origin);
  const accessParams = new URLSearchParams({
    audience: `${role}-access`,
    role,
  });

  if (base.hostname === "localhost") {
    return `${base.protocol}//${tenantSlug}.localhost:${base.port || "3000"}/login?${accessParams.toString()}`;
  }

  if (base.hostname === "127.0.0.1") {
    return `${base.protocol}//localhost:${base.port || "3000"}/tenant-login/${tenantSlug}?${accessParams.toString()}`;
  }

  const hostParts = base.hostname.split(".");
  const bareHost = hostParts[0] === "www" ? hostParts.slice(1).join(".") : base.hostname;
  return `${base.protocol}//${tenantSlug}.${bareHost}${base.port ? `:${base.port}` : ""}/login?${accessParams.toString()}`;
}

function buildTenantPatientLoginUrl(tenantSlug: string) {
  return buildTenantRoleLoginUrl(tenantSlug, "patient");
}

function buildTenantGuardianLoginUrl(tenantSlug: string) {
  return buildTenantRoleLoginUrl(tenantSlug, "guardian");
}

function normalizeCountry(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function getAdultAgeForCountry(country?: string | null) {
  const normalized = normalizeCountry(country);
  if (["japan"].includes(normalized)) return 18;
  if (["south korea", "republic of korea"].includes(normalized)) return 19;
  return 18;
}

function getEligibleOn(dateOfBirth: Date, adultAge: number) {
  const eligible = new Date(dateOfBirth);
  eligible.setFullYear(eligible.getFullYear() + adultAge);
  return eligible;
}

export async function getTenantAdultAge(tenantId: string) {
  const [tenant, accessPolicy] = await Promise.all([
    db.query.tenants.findFirst({ where: eq(tenants.id, tenantId), columns: { country: true } }),
    db.query.tenantSettings.findFirst({
      where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, "patient_access_policy")),
      columns: { value: true },
    }),
  ]);
  const policyValue = accessPolicy?.value as Record<string, unknown> | undefined;
  const configured = Number(policyValue?.legalAdultAge);
  if (Number.isFinite(configured) && configured >= 13 && configured <= 25) return configured;
  return getAdultAgeForCountry(tenant?.country);
}

async function getDeferredAccessQueue(tenantId: string) {
  const record = await db.query.tenantSettings.findFirst({
    where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, DEFERRED_ACCESS_KEY)),
    columns: { id: true, value: true },
  });
  return {
    recordId: record?.id || null,
    items: (record?.value as DeferredPatientPortalAccess[] | undefined) || [],
  };
}

async function saveDeferredAccessQueue(tenantId: string, items: DeferredPatientPortalAccess[]) {
  const current = await db.query.tenantSettings.findFirst({
    where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, DEFERRED_ACCESS_KEY)),
    columns: { id: true },
  });
  if (current?.id) {
    await db.update(tenantSettings).set({ value: items, updatedAt: new Date() }).where(eq(tenantSettings.id, current.id));
    return;
  }
  await db.insert(tenantSettings).values({ tenantId, key: DEFERRED_ACCESS_KEY, value: items });
}

type ProvisionPatientAccessInput = {
  tenantId: string;
  tenantSlug: string;
  fullName: string;
  patientId: string;
  email?: string | null;
  phone?: string | null;
};

export async function canProvisionPatientPortalAccess(input: {
  tenantId: string;
  dateOfBirth?: string | Date | null;
  isChildPatient?: boolean;
}) {
  if (!input.dateOfBirth) {
    return { allowed: !input.isChildPatient, adultAge: await getTenantAdultAge(input.tenantId), eligibleOn: null as string | null };
  }
  const dob = input.dateOfBirth instanceof Date ? input.dateOfBirth : new Date(input.dateOfBirth);
  if (Number.isNaN(dob.getTime())) {
    return { allowed: !input.isChildPatient, adultAge: await getTenantAdultAge(input.tenantId), eligibleOn: null as string | null };
  }
  const adultAge = await getTenantAdultAge(input.tenantId);
  const eligibleOn = getEligibleOn(dob, adultAge);
  const isAdult = eligibleOn <= new Date();
  return { allowed: isAdult && !input.isChildPatient ? true : isAdult, adultAge, eligibleOn: eligibleOn.toISOString() };
}

export async function deferPatientPortalAccess(
  input: ProvisionPatientAccessInput & { dateOfBirth?: string | Date | null; adultAge: number; eligibleOn: string },
) {
  const queue = await getDeferredAccessQueue(input.tenantId);
  const item: DeferredPatientPortalAccess = {
    patientId: input.patientId,
    fullName: input.fullName,
    tenantId: input.tenantId,
    tenantSlug: input.tenantSlug,
    email: input.email || null,
    phone: input.phone || null,
    dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth).toISOString() : null,
    eligibleOn: input.eligibleOn,
    createdAt: new Date().toISOString(),
  };
  const next = [item, ...queue.items.filter((entry) => entry.patientId !== input.patientId)].slice(0, 5000);
  await saveDeferredAccessQueue(input.tenantId, next);
  return {
    deferred: true,
    reason: `Patient is below the configured adult age threshold of ${input.adultAge}`,
    eligibleOn: input.eligibleOn,
    adultAge: input.adultAge,
    loginUrl: null,
    delivery: "deferred" as const,
  };
}

export async function syncDeferredPatientPortalAccesses(tenantId: string) {
  const queue = await getDeferredAccessQueue(tenantId);
  if (!queue.items.length) return { provisioned: 0 };
  const now = new Date();
  const ready = queue.items.filter((item) => new Date(item.eligibleOn) <= now);
  if (!ready.length) return { provisioned: 0 };

  const provisionedIds = new Set<string>();
  for (const item of ready) {
    const patient = await db.query.patients.findFirst({
      where: and(eq(patients.tenantId, tenantId), eq(patients.id, item.patientId)),
      columns: { id: true, fullName: true, email: true, phone: true },
    });
    if (!patient?.id) continue;
    await provisionPatientPortalAccess({
      tenantId,
      tenantSlug: item.tenantSlug,
      patientId: patient.id,
      fullName: patient.fullName || item.fullName,
      email: patient.email || item.email || null,
      phone: patient.phone || item.phone || null,
    });
    provisionedIds.add(item.patientId);
  }

  if (provisionedIds.size) {
    await saveDeferredAccessQueue(
      tenantId,
      queue.items.filter((item) => !provisionedIds.has(item.patientId)),
    );
  }

  return { provisioned: provisionedIds.size };
}

export async function provisionPatientPortalAccess(input: ProvisionPatientAccessInput) {
  const loginIdentifier = (input.email || "").trim().toLowerCase() || buildAliasEmail(input.patientId, input.tenantSlug);
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  let delivery: "email" | "sms" | "manual" = "manual";
  const loginUrl = buildTenantPatientLoginUrl(input.tenantSlug);

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

  const existingSettings = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, appUser.id),
  });

  const nextSettings = mergeUserSettings({
    ...(existingSettings?.settings ?? {}),
    security: {
      ...((existingSettings?.settings as Record<string, any> | undefined)?.security ?? {}),
      forcePasswordChange: true,
    },
    workflow: {
      ...((existingSettings?.settings as Record<string, any> | undefined)?.workflow ?? {}),
      linkedPatientId: input.patientId,
    },
  });

  await db
    .insert(userSettings)
    .values({
      userId: appUser.id,
      settings: nextSettings,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: {
        settings: nextSettings,
        updatedAt: new Date(),
      },
    });

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

  const onboardingMessage = [
    `Your patient dashboard access is ready.`,
    `Tenant: ${input.tenantSlug}`,
    `Login ID: ${loginIdentifier}`,
    `Temporary password: ${temporaryPassword}`,
    `Login URL: ${loginUrl}`,
    `You will be required to change this password immediately after first sign in.`,
  ].join("\n");

  if (input.email) {
    if (resend) {
      await resend.emails.send({
        from: process.env.EMAIL_FROM || "Joan <onboarding@resend.dev>",
        to: input.email,
        subject: "Your patient portal access",
        text: onboardingMessage,
      }).catch((error) => {
        console.error("Failed to send patient onboarding email:", error);
      });
      delivery = "email";
    }
  } else if (input.phone) {
    const { NotificationService } = await import("@/lib/services/notification.service");
    const notifications = new NotificationService();
    await notifications.sendSMS(input.phone, onboardingMessage, { tenantSlugOrId: input.tenantSlug });
    delivery = "sms";
  }

  return {
    userId: appUser.id,
    loginIdentifier,
    temporaryPassword,
    delivery,
    loginUrl,
  };
}

export async function provisionGuardianPortalAccess(input: ProvisionPatientAccessInput & { relationship?: string | null }) {
  const loginIdentifier = (input.email || "").trim().toLowerCase() || `guardian-${input.patientId.slice(0, 8)}@${input.tenantSlug}.guardian.local`;
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  let delivery: "email" | "sms" | "manual" = "manual";
  const loginUrl = buildTenantGuardianLoginUrl(input.tenantSlug);

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
        role: "guardian",
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
        role: "guardian",
        isActive: true,
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, appUser.id));
  }

  const guardianRole = await db.query.roles.findFirst({
    where: and(eq(roles.tenantId, input.tenantId), eq(roles.name, "guardian")),
  });

  if (guardianRole) {
    const existingRole = await db.query.userRoles.findFirst({
      where: and(eq(userRoles.userId, appUser.id), eq(userRoles.roleId, guardianRole.id)),
    });

    if (!existingRole) {
      await db.insert(userRoles).values({ userId: appUser.id, roleId: guardianRole.id });
    }
  }

  const existingSettings = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, appUser.id),
  });

  const nextSettings = mergeUserSettings({
    ...(existingSettings?.settings ?? {}),
    security: {
      ...((existingSettings?.settings as Record<string, any> | undefined)?.security ?? {}),
      forcePasswordChange: true,
    },
    workflow: {
      ...((existingSettings?.settings as Record<string, any> | undefined)?.workflow ?? {}),
      primaryLinkedPatientId: input.patientId,
    },
  });

  await db
    .insert(userSettings)
    .values({
      userId: appUser.id,
      settings: nextSettings,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: {
        settings: nextSettings,
        updatedAt: new Date(),
      },
    });

  let guardianRecord = await db.query.guardians.findFirst({
    where: and(eq(guardians.tenantId, input.tenantId), eq(guardians.userId, appUser.id)),
  });

  if (!guardianRecord) {
    const [createdGuardian] = await db
      .insert(guardians)
      .values({
        tenantId: input.tenantId,
        userId: appUser.id,
        relationship: input.relationship || "parent",
      })
      .returning();
    guardianRecord = createdGuardian;
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

  const onboardingMessage = [
    `Your guardian dashboard access is ready.`,
    `Tenant: ${input.tenantSlug}`,
    `Login ID: ${loginIdentifier}`,
    `Temporary password: ${temporaryPassword}`,
    `Login URL: ${loginUrl}`,
    `You will be required to change this password immediately after first sign in.`,
  ].join("\n");

  if (input.email && resend) {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || "Joan <onboarding@resend.dev>",
      to: input.email,
      subject: "Your guardian portal access",
      text: onboardingMessage,
    }).catch((error) => {
      console.error("Failed to send guardian onboarding email:", error);
    });
    delivery = "email";
  } else if (input.phone) {
    const { NotificationService } = await import("@/lib/services/notification.service");
    const notifications = new NotificationService();
    await notifications.sendSMS(input.phone, onboardingMessage, { tenantSlugOrId: input.tenantSlug });
    delivery = "sms";
  }

  return {
    userId: appUser.id,
    guardianId: guardianRecord.id,
    loginIdentifier,
    temporaryPassword,
    delivery,
    loginUrl,
  };
}
