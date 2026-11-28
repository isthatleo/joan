export const PLATFORM_CHAT_HISTORY_LIMIT = 8;
export const PLATFORM_CHAT_MESSAGE_MAX_LENGTH = 1000;
export const PLATFORM_CHAT_REQUEST_MAX_LENGTH = 500;
export const PLATFORM_CHAT_SCOPE_VERSION = 1;

export type PlatformCopilotSourceRef = {
  table: string;
  id: string;
  field?: string;
  label?: string;
};

export type PlatformCopilotFactCategory =
  | "platform_overview"
  | "tenants"
  | "billing"
  | "security"
  | "feedback"
  | "system_health"
  | "clinical_metadata";

export type PlatformCopilotFact = {
  id: string;
  category: PlatformCopilotFactCategory;
  label: string;
  detail: string;
  sourceRef: PlatformCopilotSourceRef;
};

export type PlatformCopilotOverview = {
  activeTenants: number;
  totalUsers: number;
  openInvoices: number;
  clinicalRecords: number;
};

export type PlatformCopilotContext = {
  facts: PlatformCopilotFact[];
  counts: PlatformCopilotOverview;
  generatedAt: string;
};

export type PlatformChatRole = "user" | "assistant";

export type PlatformChatMessage = {
  role: PlatformChatRole;
  content: string;
};

/** Server-issued scope envelope; carries no transcript or prompt text. */
export type PlatformChatSessionScope = {
  version: typeof PLATFORM_CHAT_SCOPE_VERSION;
  actorId: string;
  access: "platform";
  dataLayer: "platform_operations+read_only_clinical_metadata";
};

export type PlatformCopilotActor = {
  userId: string;
  email: string;
  fullName: string | null;
};

export type PlatformCopilotScope = {
  actorId: string;
  access: "platform";
  dataLayer: "platform_operations+read_only_clinical_metadata";
  factsReviewed: number;
};

export type PlatformCopilotAnswer = {
  question: string;
  answer: string;
  keyPoints: string[];
  sourceRefs: PlatformCopilotSourceRef[];
  limitations: string[];
  generatedAt: string;
  scope: PlatformCopilotScope;
  /** Present on chat responses; required to replay browser-session history. */
  historyScope?: PlatformChatSessionScope;
};

export function platformSourceRefKey(ref: PlatformCopilotSourceRef): string {
  return `${ref.table}|${ref.id}|${ref.field || ""}`;
}
