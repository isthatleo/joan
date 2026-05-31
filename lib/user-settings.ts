export type UserSettingsShape = {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    marketing: boolean;
    desktop: boolean;
    digests: boolean;
    digestFrequency: "daily" | "weekly" | "monthly";
    reportReady: boolean;
    billingAlerts: boolean;
    securityAlerts: boolean;
    scheduleFailures: boolean;
  };
  privacy: {
    profileVisibility: "private" | "team" | "organization";
    dataSharing: boolean;
    analytics: boolean;
    readReceipts: boolean;
    activityStatus: boolean;
  };
  appearance: {
    theme: "light" | "dark" | "system";
    language: string;
    languageSource: "tenant" | "user";
    timezone: string;
    timeFormat: "12h" | "24h";
    density: "compact" | "comfortable" | "spacious";
    calendarStart: "monday" | "sunday";
    reduceMotion: boolean;
    highContrast: boolean;
    fontScale: "small" | "default" | "large";
  };
  security: {
    twoFactorEnabled: boolean;
    sessionTimeout: 15 | 30 | 60 | 120;
    loginAlerts: boolean;
    deviceTrust: boolean;
    passwordlessSignin: boolean;
    biometricPrompt: boolean;
    forcePasswordChange: boolean;
    passwordLastChanged: string;
    failedLoginAttempts: number;
    lockoutUntil: string;
  };
  communication: {
    messageSettings: {
      allowMessagesFrom: "care-team" | "department" | "organization";
      autoReply: string;
      signature: string;
      defaultChannel: "inbox" | "email" | "push";
      workingHours: {
        enabled: boolean;
        start: string;
        end: string;
        timezone: string;
      };
    };
  };
  workflow: {
    defaultLandingPage: string;
    quickActions: boolean;
    confirmDestructive: boolean;
    autoSaveDrafts: boolean;
    preferredExportFormat: "pdf" | "csv" | "html";
    compactTables: boolean;
    receptionEmergencyTutorialSeen: boolean;
    linkedPatientId: string;
  };
};

export const defaultUserSettings: UserSettingsShape = {
  notifications: {
    email: true,
    push: true,
    sms: false,
    marketing: false,
    desktop: true,
    digests: true,
    digestFrequency: "daily",
    reportReady: true,
    billingAlerts: true,
    securityAlerts: true,
    scheduleFailures: true,
  },
  privacy: {
    profileVisibility: "private",
    dataSharing: false,
    analytics: true,
    readReceipts: true,
    activityStatus: true,
  },
  appearance: {
    theme: "system",
    language: "en",
    languageSource: "tenant",
    timezone: "UTC",
    timeFormat: "12h",
    density: "comfortable",
    calendarStart: "monday",
    reduceMotion: false,
    highContrast: false,
    fontScale: "default",
  },
  security: {
    twoFactorEnabled: false,
    sessionTimeout: 30,
    loginAlerts: true,
    deviceTrust: true,
    passwordlessSignin: false,
    biometricPrompt: false,
    forcePasswordChange: false,
    passwordLastChanged: "",
    failedLoginAttempts: 0,
    lockoutUntil: "",
  },
  communication: {
    messageSettings: {
      allowMessagesFrom: "care-team",
      autoReply: "",
      signature: "",
      defaultChannel: "inbox",
      workingHours: {
        enabled: false,
        start: "09:00",
        end: "17:00",
        timezone: "UTC",
      },
    },
  },
  workflow: {
    defaultLandingPage: "dashboard",
    quickActions: true,
    confirmDestructive: true,
    autoSaveDrafts: true,
    preferredExportFormat: "pdf",
    compactTables: false,
    receptionEmergencyTutorialSeen: false,
    linkedPatientId: "",
  },
};

const allowedThemes = new Set(["light", "dark", "system"]);
const allowedLanguages = new Set(["en", "fr", "es", "sw", "ar"]);
const allowedLanguageSources = new Set(["tenant", "user"]);
const allowedTimeFormats = new Set(["12h", "24h"]);
const allowedDensity = new Set(["compact", "comfortable", "spacious"]);
const allowedCalendarStart = new Set(["monday", "sunday"]);
const allowedFontScale = new Set(["small", "default", "large"]);
const allowedProfileVisibility = new Set(["private", "team", "organization"]);
const allowedDigestFrequencies = new Set(["daily", "weekly", "monthly"]);
const allowedMessageOrigins = new Set(["care-team", "department", "organization"]);
const allowedMessageChannels = new Set(["inbox", "email", "push"]);
const allowedExportFormats = new Set(["pdf", "csv", "html"]);
const allowedLandingPages = new Set([
  "dashboard",
  "messages",
  "reports",
  "tasks",
  "calendar",
  "patients",
  "appointments",
  "queue",
  "lab-orders",
  "prescriptions",
  "patient-history",
]);
const allowedSessionTimeouts = new Set([15, 30, 60, 120]);

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function asString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function asAllowedString<T extends string>(value: unknown, allowed: ReadonlySet<string>, fallback: T): T {
  return typeof value === "string" && allowed.has(value) ? (value as T) : fallback;
}

function asAllowedNumber<T extends number>(value: unknown, allowed: ReadonlySet<number>, fallback: T): T {
  return typeof value === "number" && allowed.has(value) ? (value as T) : fallback;
}

export function mergeUserSettings(settings: unknown): UserSettingsShape {
  const source = (settings && typeof settings === "object" ? settings : {}) as Record<string, any>;
  const notifications = source.notifications ?? {};
  const privacy = source.privacy ?? {};
  const appearance = source.appearance ?? {};
  const security = source.security ?? {};
  const communication = source.communication ?? {};
  const messageSettings = communication.messageSettings ?? {};
  const workingHours = messageSettings.workingHours ?? {};
  const workflow = source.workflow ?? {};

  return {
    notifications: {
      email: asBoolean(notifications.email, defaultUserSettings.notifications.email),
      push: asBoolean(notifications.push, defaultUserSettings.notifications.push),
      sms: asBoolean(notifications.sms, defaultUserSettings.notifications.sms),
      marketing: asBoolean(notifications.marketing, defaultUserSettings.notifications.marketing),
      desktop: asBoolean(notifications.desktop, defaultUserSettings.notifications.desktop),
      digests: asBoolean(notifications.digests, defaultUserSettings.notifications.digests),
      digestFrequency: asAllowedString(notifications.digestFrequency, allowedDigestFrequencies, defaultUserSettings.notifications.digestFrequency),
      reportReady: asBoolean(notifications.reportReady, defaultUserSettings.notifications.reportReady),
      billingAlerts: asBoolean(notifications.billingAlerts, defaultUserSettings.notifications.billingAlerts),
      securityAlerts: asBoolean(notifications.securityAlerts, defaultUserSettings.notifications.securityAlerts),
      scheduleFailures: asBoolean(notifications.scheduleFailures, defaultUserSettings.notifications.scheduleFailures),
    },
    privacy: {
      profileVisibility: asAllowedString(privacy.profileVisibility, allowedProfileVisibility, defaultUserSettings.privacy.profileVisibility),
      dataSharing: asBoolean(privacy.dataSharing, defaultUserSettings.privacy.dataSharing),
      analytics: asBoolean(privacy.analytics, defaultUserSettings.privacy.analytics),
      readReceipts: asBoolean(privacy.readReceipts, defaultUserSettings.privacy.readReceipts),
      activityStatus: asBoolean(privacy.activityStatus, defaultUserSettings.privacy.activityStatus),
    },
    appearance: {
      theme: asAllowedString(appearance.theme, allowedThemes, defaultUserSettings.appearance.theme),
      language: asAllowedString(appearance.language, allowedLanguages, defaultUserSettings.appearance.language),
      languageSource: asAllowedString(appearance.languageSource, allowedLanguageSources, defaultUserSettings.appearance.languageSource),
      timezone: asString(appearance.timezone, defaultUserSettings.appearance.timezone),
      timeFormat: asAllowedString(appearance.timeFormat, allowedTimeFormats, defaultUserSettings.appearance.timeFormat),
      density: asAllowedString(appearance.density, allowedDensity, defaultUserSettings.appearance.density),
      calendarStart: asAllowedString(appearance.calendarStart, allowedCalendarStart, defaultUserSettings.appearance.calendarStart),
      reduceMotion: asBoolean(appearance.reduceMotion, defaultUserSettings.appearance.reduceMotion),
      highContrast: asBoolean(appearance.highContrast, defaultUserSettings.appearance.highContrast),
      fontScale: asAllowedString(appearance.fontScale, allowedFontScale, defaultUserSettings.appearance.fontScale),
    },
    security: {
      twoFactorEnabled: asBoolean(security.twoFactorEnabled, defaultUserSettings.security.twoFactorEnabled),
      sessionTimeout: asAllowedNumber(security.sessionTimeout, allowedSessionTimeouts, defaultUserSettings.security.sessionTimeout),
      loginAlerts: asBoolean(security.loginAlerts, defaultUserSettings.security.loginAlerts),
      deviceTrust: asBoolean(security.deviceTrust, defaultUserSettings.security.deviceTrust),
      passwordlessSignin: asBoolean(security.passwordlessSignin, defaultUserSettings.security.passwordlessSignin),
      biometricPrompt: asBoolean(security.biometricPrompt, defaultUserSettings.security.biometricPrompt),
      forcePasswordChange: asBoolean(security.forcePasswordChange, defaultUserSettings.security.forcePasswordChange),
      passwordLastChanged: asString(security.passwordLastChanged, defaultUserSettings.security.passwordLastChanged),
      failedLoginAttempts: typeof security.failedLoginAttempts === "number" ? security.failedLoginAttempts : defaultUserSettings.security.failedLoginAttempts,
      lockoutUntil: asString(security.lockoutUntil, defaultUserSettings.security.lockoutUntil),
    },
    communication: {
      messageSettings: {
        allowMessagesFrom: asAllowedString(messageSettings.allowMessagesFrom, allowedMessageOrigins, defaultUserSettings.communication.messageSettings.allowMessagesFrom),
        autoReply: asString(messageSettings.autoReply, defaultUserSettings.communication.messageSettings.autoReply),
        signature: asString(messageSettings.signature, defaultUserSettings.communication.messageSettings.signature),
        defaultChannel: asAllowedString(messageSettings.defaultChannel, allowedMessageChannels, defaultUserSettings.communication.messageSettings.defaultChannel),
        workingHours: {
          enabled: asBoolean(workingHours.enabled, defaultUserSettings.communication.messageSettings.workingHours.enabled),
          start: asString(workingHours.start, defaultUserSettings.communication.messageSettings.workingHours.start),
          end: asString(workingHours.end, defaultUserSettings.communication.messageSettings.workingHours.end),
          timezone: asString(workingHours.timezone, defaultUserSettings.communication.messageSettings.workingHours.timezone),
        },
      },
    },
    workflow: {
      defaultLandingPage: asAllowedString(workflow.defaultLandingPage, allowedLandingPages, defaultUserSettings.workflow.defaultLandingPage),
      quickActions: asBoolean(workflow.quickActions, defaultUserSettings.workflow.quickActions),
      confirmDestructive: asBoolean(workflow.confirmDestructive, defaultUserSettings.workflow.confirmDestructive),
      autoSaveDrafts: asBoolean(workflow.autoSaveDrafts, defaultUserSettings.workflow.autoSaveDrafts),
      preferredExportFormat: asAllowedString(workflow.preferredExportFormat, allowedExportFormats, defaultUserSettings.workflow.preferredExportFormat),
      compactTables: asBoolean(workflow.compactTables, defaultUserSettings.workflow.compactTables),
      receptionEmergencyTutorialSeen: asBoolean(workflow.receptionEmergencyTutorialSeen, defaultUserSettings.workflow.receptionEmergencyTutorialSeen),
      linkedPatientId: asString(workflow.linkedPatientId, defaultUserSettings.workflow.linkedPatientId),
    },
  };
}
