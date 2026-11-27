export const DEFAULT_HANDOFF_QUESTION = "Summarize today's high-priority cases for handoff.";
export const DEFAULT_QUERY_PROMPT = DEFAULT_HANDOFF_QUESTION;

export type CopilotPriority = "critical" | "urgent" | "routine" | "info";

export type CopilotSourceRef = {
  table: string;
  id: string;
  field?: string;
  label?: string;
};

export type CopilotFactCategory =
  | "queue"
  | "appointment"
  | "lab"
  | "prescription"
  | "vitals"
  | "visit"
  | "condition"
  | "allergy";

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

export type CopilotScopeSummary = {
  tenantId: string;
  userId: string;
  allowedCategories: CopilotFactCategory[];
  factsReviewed: number;
};

export type CopilotAnswer = {
  question: string;
  answer: string;
  keyPoints: string[];
  sourceRefs: CopilotSourceRef[];
  limitations: string[];
  generatedAt: string;
  scope: CopilotScopeSummary;
};

export function sourceRefKey(ref: CopilotSourceRef): string {
  return `${ref.table}|${ref.id}|${ref.field || ""}`;
}
