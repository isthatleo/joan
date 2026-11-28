export const DEFAULT_HANDOFF_QUESTION = "Summarize today's high-priority cases for handoff.";
export const DEFAULT_QUERY_PROMPT = DEFAULT_HANDOFF_QUESTION;

/** Chat history is bounded and lives only in the browser session. */
export const COPILOT_CHAT_HISTORY_LIMIT = 8;
export const COPILOT_CHAT_MESSAGE_MAX_LENGTH = 1000;
export const COPILOT_CHAT_REQUEST_MAX_LENGTH = 500;
export const COPILOT_CHAT_SCOPE_VERSION = 1;

export type CopilotChatRole = "user" | "assistant";

export type CopilotChatMessage = {
  role: CopilotChatRole;
  content: string;
};

/**
 * Server-issued, client-held scope envelope for browser-session history.
 * It contains no transcript or prompt text; the server compares it with the
 * current session-derived scope before replaying any prior turns.
 */
export type CopilotChatSessionScope = {
  version: typeof COPILOT_CHAT_SCOPE_VERSION;
  tenantId: string;
  userId: string;
  patientId: string | null;
  queueId: string | null;
  scopeToAssignee: boolean;
  allowedCategories: CopilotFactCategory[];
};

export type CopilotPriority = "critical" | "urgent" | "routine" | "info";

export type CopilotSourceRef = {
  table: string;
  id: string;
  field?: string;
  label?: string;
};

export const COPILOT_FACT_CATEGORIES = [
  "queue",
  "appointment",
  "lab",
  "prescription",
  "vitals",
  "visit",
  "condition",
  "allergy",
] as const;

export type CopilotFactCategory = (typeof COPILOT_FACT_CATEGORIES)[number];

export type CopilotFact = {
  id: string;
  category: CopilotFactCategory;
  patientId: string | null;
  patientName: string | null;
  label: string;
  detail: string;
  priority: CopilotPriority;
  timestamp: string | null;
  sourceRef: CopilotSourceRef;
};

export type CopilotOverview = {
  labResultsToReview: number;
  prescriptionRefillsToReview: number;
  urgentQueueCount: number;
  queueWaitingCount: number;
};

export type CopilotContext = {
  facts: CopilotFact[];
  allowedPatientIds: string[];
  generatedAt: string;
  counts: CopilotOverview;
};

export type CopilotHandoffCase = {
  patientId: string;
  patientName: string;
  reason: string;
  priority: CopilotPriority;
  whyItMatters: string;
  recommendedActions: string[];
  sourceRefs: CopilotSourceRef[];
};

export type CopilotHandoff = {
  title: string;
  summary: string;
  cases: CopilotHandoffCase[];
  watchlist: string[];
  limitations: string[];
  generatedAt: string;
  factsReviewed: number;
};

export type CopilotNoteFocus = "assessment" | "plan" | "notes";

export type CopilotNoteInsight = {
  suggestedText: string;
  rationale: string;
  focus: CopilotNoteFocus;
  sourceRefs: CopilotSourceRef[];
  limitations: string[];
  generatedAt: string;
  factsReviewed: number;
};

export type CopilotActor = {
  userId: string;
  tenantId: string;
  email: string;
  fullName: string | null;
  /** Whether the actor is a doctor and therefore limited to assigned records. */
  isDoctor: boolean;
};

export type CopilotScopeSummary = {
  tenantId: string;
  userId: string;
  allowedCategories: CopilotFactCategory[];
  factsReviewed: number;
  /** True for doctors (assignment scope), false for tenant-only scope. */
  scopeToAssignee: boolean;
};

export type CopilotAnswer = {
  question: string;
  answer: string;
  keyPoints: string[];
  sourceRefs: CopilotSourceRef[];
  limitations: string[];
  generatedAt: string;
  scope: CopilotScopeSummary;
  /** Present on chat responses; required to replay browser-session history. */
  historyScope?: CopilotChatSessionScope;
};

export function sourceRefKey(ref: CopilotSourceRef): string {
  return `${ref.table}|${ref.id}|${ref.field || ""}`;
}
