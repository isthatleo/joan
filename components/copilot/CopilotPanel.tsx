"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronRight,
  FlaskConical,
  Loader2,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useSessionChatState } from "@/hooks/use-session-chat";
import { useTenantPath } from "@/hooks/useTenantPath";
import { useAuthStore } from "@/stores/auth";
import {
  COPILOT_CHAT_HISTORY_LIMIT,
  COPILOT_CHAT_SCOPE_VERSION,
  DEFAULT_HANDOFF_QUESTION,
  DEFAULT_QUERY_PROMPT,
  sourceRefKey,
  type CopilotAnswer,
  type CopilotChatMessage,
  type CopilotChatSessionScope,
  type CopilotHandoff,
  type CopilotNoteFocus,
  type CopilotNoteInsight,
  type CopilotPriority,
  type CopilotSourceRef,
} from "@/lib/copilot/types";

export type CopilotPanelProps = {
  patientId?: string;
  queueId?: string;
  onAddToNote?: (text: string, focus: CopilotNoteFocus) => void;
  variant?: "full" | "note";
  sessionKey?: string;
};

type ChatMessage =
  | { id: string; role: "user"; content: string; createdAt: string }
  | { id: string; role: "assistant"; answer: CopilotAnswer; createdAt: string }
  | {
      id: string;
      role: "error";
      content: string;
      createdAt: string;
    };

type RetryState = {
  message: string;
  history: CopilotChatMessage[];
  scope?: CopilotChatSessionScope;
};

const MAX_STORED_MESSAGES = 20;

const SUGGESTED_PROMPTS = [
  DEFAULT_QUERY_PROMPT,
  "Which abnormal lab results need review?",
  "Which prescriptions need attention?",
];

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data as T;
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isHistoryScope(value: unknown): value is CopilotChatSessionScope {
  if (!value || typeof value !== "object") return false;
  const scope = value as Partial<CopilotChatSessionScope>;
  return (
    scope.version === COPILOT_CHAT_SCOPE_VERSION &&
    typeof scope.tenantId === "string" &&
    typeof scope.userId === "string" &&
    (scope.patientId === null || typeof scope.patientId === "string") &&
    (scope.queueId === null || typeof scope.queueId === "string") &&
    typeof scope.scopeToAssignee === "boolean" &&
    Array.isArray(scope.allowedCategories)
  );
}

function isCopilotAnswer(value: unknown): value is CopilotAnswer {
  if (!value || typeof value !== "object") return false;
  const answer = value as Partial<CopilotAnswer>;
  return (
    typeof answer.answer === "string" &&
    typeof answer.generatedAt === "string" &&
    Array.isArray(answer.keyPoints) &&
    Array.isArray(answer.sourceRefs) &&
    Array.isArray(answer.limitations) &&
    Boolean(answer.scope) &&
    (answer.historyScope === undefined || isHistoryScope(answer.historyScope))
  );
}

function sanitizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  const messages: ChatMessage[] = [];

  for (const item of value.slice(-MAX_STORED_MESSAGES)) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as Record<string, unknown>;
    const createdAt = typeof candidate.createdAt === "string" ? candidate.createdAt : new Date().toISOString();

    if (candidate.role === "user" && typeof candidate.content === "string") {
      messages.push({ id: typeof candidate.id === "string" ? candidate.id : createId(), role: "user", content: candidate.content.slice(0, 1000), createdAt });
      continue;
    }
    if (candidate.role === "assistant" && isCopilotAnswer(candidate.answer)) {
      messages.push({ id: typeof candidate.id === "string" ? candidate.id : createId(), role: "assistant", answer: candidate.answer, createdAt });
    }
  }

  return messages;
}

function toApiHistory(messages: ChatMessage[]): CopilotChatMessage[] {
  return messages
    .filter((message): message is Extract<ChatMessage, { role: "user" | "assistant" }> =>
      message.role !== "error"
    )
    .slice(-COPILOT_CHAT_HISTORY_LIMIT)
    .map((message) =>
      message.role === "user"
        ? { role: "user" as const, content: message.content }
        : { role: "assistant" as const, content: message.answer.answer }
    );
}

function latestHistoryScope(messages: ChatMessage[]): CopilotChatSessionScope | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role === "assistant" && message.answer.historyScope) {
      return message.answer.historyScope;
    }
  }
  return undefined;
}

function priorityTone(priority: CopilotPriority): string {
  if (priority === "critical") return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
  if (priority === "urgent") return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
  if (priority === "info") return "bg-sky-500/10 text-sky-700 dark:text-sky-300";
  return "bg-muted text-muted-foreground";
}

function formatTime(value: string): string {
  try {
    return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function SourceChips({ refs }: { refs: CopilotSourceRef[] }) {
  if (refs.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {refs.map((ref) => (
        <span
          key={sourceRefKey(ref)}
          className="rounded-md border border-orange-200/70 bg-white/70 px-2 py-0.5 text-[10px] font-medium text-orange-800 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200"
        >
          {ref.label || ref.table}
        </span>
      ))}
    </div>
  );
}

export function CopilotPanel({ patientId, queueId, onAddToNote, variant = "full", sessionKey }: CopilotPanelProps) {
  const tenantPath = useTenantPath();
  const { user } = useAuthStore();
  const identity = user?.id || user?.email || "anonymous";
  const tenant = user?.tenantId || user?.hospitalId || "global";
  const storageKey =
    sessionKey || `copilot-chat:${identity}:${tenant}:${patientId || "all"}:${queueId || "all"}`;
  const [messages, setMessages] = useSessionChatState<ChatMessage[]>(storageKey, [], sanitizeMessages);
  const [draft, setDraft] = useState("");
  const [question, setQuestion] = useState(DEFAULT_HANDOFF_QUESTION);
  const [focus, setFocus] = useState<CopilotNoteFocus>("assessment");
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState<RetryState | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [insightAdded, setInsightAdded] = useState(false);

  const handoffMutation = useMutation<CopilotHandoff, Error, string>({
    mutationFn: (value) => postJson<CopilotHandoff>("/api/copilot/handoff", { question: value }),
    onSuccess: () => setError(null),
    onError: (mutationError) => setError(mutationError.message),
  });

  const insightMutation = useMutation<CopilotNoteInsight, Error, CopilotNoteFocus>({
    mutationFn: (value) =>
      postJson<CopilotNoteInsight>("/api/copilot/insight", {
        patientId,
        queueId,
        focus: value,
      }),
    onSuccess: () => {
      setError(null);
      setInsightAdded(false);
    },
    onError: (mutationError) => setError(mutationError.message),
  });

  const showHandoff = variant === "full";
  const canGenerateInsight = Boolean(patientId && queueId);
  const handoff = handoffMutation.data;
  const insight = insightMutation.data;

  const sendMessage = async (rawValue: string, replay?: RetryState) => {
    const message = rawValue.replace(/\s+/g, " ").trim().slice(0, 500);
    if (!message || isSending) return;

    const history = replay?.history ?? toApiHistory(messages);
    const scope = replay?.scope ?? latestHistoryScope(messages);
    if (!replay) {
      setMessages((current) => [
        ...current,
        { id: createId(), role: "user", content: message, createdAt: new Date().toISOString() },
      ]);
    }

    setDraft("");
    setError(null);
    setIsSending(true);

    try {
      const answer = await postJson<CopilotAnswer>("/api/copilot/chat", {
        message,
        history,
        historyScope: scope,
        patientId,
        queueId,
      });
      setMessages((current) => [
        ...current,
        { id: createId(), role: "assistant", answer, createdAt: new Date().toISOString() },
      ]);
      setRetry(null);
    } catch (sendError) {
      const messageText = sendError instanceof Error ? sendError.message : "Copilot could not answer that request.";
      setError(messageText);
      setRetry({ message, history, scope });
      setMessages((current) => [
        ...current,
        { id: createId(), role: "error", content: messageText, createdAt: new Date().toISOString() },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const retryMessage = () => {
    if (!retry || isSending) return;
    setMessages((current) => current.filter((item) => item.role !== "error"));
    void sendMessage(retry.message, retry);
  };

  const clearChat = () => {
    setMessages([]);
    setRetry(null);
    setError(null);
    setDraft("");
  };

  return (
    <div className="space-y-4 rounded-2xl border border-orange-200/70 bg-orange-50/40 p-4 dark:border-orange-500/20 dark:bg-orange-500/5">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 text-orange-600 dark:text-orange-300">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">AI Copilot chat</h3>
            <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-700 dark:text-orange-300">
              Tenant scope
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {showHandoff
              ? "Ask follow-ups about patients in your scope. Every turn is rebuilt from authorized records; general medical questions are declined."
              : "Ask about this patient or generate draft note text. Only authorized records are used; review before adding it to the note."}
          </p>
        </div>
        <button
          type="button"
          onClick={clearChat}
          disabled={messages.length === 0 || isSending}
          title="Clear chat"
          aria-label="Clear chat"
          className="rounded-lg border border-orange-200/80 p-1.5 text-orange-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 dark:border-orange-500/20 dark:text-orange-200"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div
        role="log"
        aria-live="polite"
        aria-label="Copilot conversation"
        className="max-h-[360px] space-y-3 overflow-y-auto rounded-xl border border-orange-200/70 bg-white/60 p-3 dark:border-orange-500/20 dark:bg-background/60"
      >
        {messages.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">
            Start a conversation. History stays in this browser tab and is cleared when the session ends.
          </p>
        ) : (
          messages.map((message) => {
            if (message.role === "user") {
              return (
                <div key={message.id} className="ml-auto max-w-[88%] rounded-xl bg-orange-600 px-3 py-2 text-sm text-white">
                  <p className="whitespace-pre-wrap leading-6">{message.content}</p>
                  <p className="mt-1 text-right text-[9px] text-orange-100">{formatTime(message.createdAt)}</p>
                </div>
              );
            }

            if (message.role === "error") {
              return (
                <div key={message.id} className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-xs text-destructive">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{message.content}</span>
                  </div>
                </div>
              );
            }

            const answer = message.answer;
            return (
              <div key={message.id} className="max-w-[94%] rounded-xl border border-orange-200 bg-white/90 p-3 dark:border-orange-500/20 dark:bg-background/80">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-300">
                    Copilot
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {answer.scope.factsReviewed} authorized facts · {formatTime(message.createdAt)}
                  </p>
                </div>
                <p className="mt-2 text-sm leading-6 text-foreground">{answer.answer}</p>
                {answer.keyPoints.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {answer.keyPoints.map((point, index) => (
                      <li key={`answer-point-${message.id}-${index}`} className="flex gap-1.5 text-xs text-foreground/85">
                        <Check className="mt-0.5 h-3 w-3 shrink-0 text-orange-600" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-2">
                  <SourceChips refs={answer.sourceRefs} />
                </div>
                <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
                  Scope: {answer.scope.allowedCategories.join(", ") || "no clinical categories"}
                </p>
                <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{answer.limitations.join(" ")}</p>
              </div>
            );
          })
        )}
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setDraft(prompt)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200/80 bg-white/70 px-2.5 py-1.5 text-left text-[11px] font-medium text-orange-800 transition hover:bg-white dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200"
            >
              <ChevronRight className="h-3 w-3" />
              {prompt}
            </button>
          ))}
        </div>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void sendMessage(draft);
            }
          }}
          rows={2}
          maxLength={500}
          placeholder="Ask a follow-up… Enter to send, Shift+Enter for a new line."
          className="w-full resize-none rounded-lg border border-orange-200/80 bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-orange-400 dark:border-orange-500/20"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void sendMessage(draft)}
            disabled={!draft.trim() || isSending}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {isSending ? "Checking your records..." : "Send message"}
          </button>
          {retry && (
            <button
              type="button"
              onClick={retryMessage}
              disabled={isSending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200/80 bg-white/70 px-2.5 py-2 text-xs font-medium text-orange-800 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Retry last message
            </button>
          )}
          <p className="text-[10px] leading-4 text-muted-foreground">
            Answers are decision support only. Open the linked source records and confirm every detail before acting.
          </p>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {showHandoff && (
        <div className="space-y-2 border-t border-orange-200/70 pt-4 dark:border-orange-500/20">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-300">
            Shift handoff
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setQuestion(DEFAULT_HANDOFF_QUESTION)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200/80 bg-white/70 px-2.5 py-1.5 text-left text-[11px] font-medium text-orange-800 transition hover:bg-white dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200"
            >
              <ChevronRight className="h-3 w-3" />
              {DEFAULT_HANDOFF_QUESTION}
            </button>
          </div>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Ask for a handoff summary..."
            className="w-full resize-none rounded-lg border border-orange-200/80 bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-orange-400 dark:border-orange-500/20"
          />
          <button
            type="button"
            onClick={() => handoffMutation.mutate(question)}
            disabled={!question.trim() || handoffMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {handoffMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {handoffMutation.isPending ? "Preparing handoff..." : "Generate handoff summary"}
          </button>

          {handoff && (
            <div className="space-y-3 rounded-xl border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{handoff.title}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {handoff.factsReviewed} source facts · generated {formatTime(handoff.generatedAt)}
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Grounded</span>
              </div>

              <p className="text-sm leading-6 text-foreground/85">{handoff.summary}</p>

              {handoff.cases.length > 0 ? (
                <div className="space-y-2">
                  {handoff.cases.map((item, index) => (
                    <div key={`${item.patientId}-${index}`} className="rounded-xl border border-border bg-background/70 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{item.patientName}</p>
                          <p className="text-xs text-muted-foreground">{item.reason}</p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${priorityTone(item.priority)}`}>
                          {item.priority}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.whyItMatters}</p>
                      {item.recommendedActions.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {item.recommendedActions.map((action, actionIndex) => (
                            <li key={`${item.patientId}-action-${actionIndex}`} className="flex gap-1.5 text-xs text-foreground/85">
                              <Check className="mt-0.5 h-3 w-3 shrink-0 text-orange-600" />
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <Link
                          href={tenantPath(`/doctor/patients/${item.patientId}`)}
                          className="rounded-md border border-border px-2 py-0.5 text-[10px] font-medium text-foreground hover:bg-muted"
                        >
                          Patient
                        </Link>
                        <Link
                          href={tenantPath(`/doctor/analytics/my-patients/${item.patientId}`)}
                          className="rounded-md border border-border px-2 py-0.5 text-[10px] font-medium text-foreground hover:bg-muted"
                        >
                          History
                        </Link>
                        <SourceChips refs={item.sourceRefs} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-border bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                  No high-priority cases were found in your current scope.
                </p>
              )}

              {handoff.watchlist.length > 0 && (
                <div className="rounded-lg border border-border bg-background/60 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Watchlist</p>
                  <ul className="mt-1.5 space-y-1">
                    {handoff.watchlist.map((item, index) => (
                      <li key={`watch-${index}`} className="text-xs text-foreground/80">• {item}</li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-[10px] leading-4 text-muted-foreground">{handoff.limitations.join(" ")}</p>
            </div>
          )}
        </div>
      )}

      {canGenerateInsight && (
        <div className="space-y-3 border-t border-orange-200/70 pt-4 dark:border-orange-500/20">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">Copilot insight</p>
              <p className="text-xs text-muted-foreground">Draft text for the selected consultation field.</p>
            </div>
            <select
              value={focus}
              onChange={(event) => setFocus(event.target.value as CopilotNoteFocus)}
              className="h-8 rounded-lg border border-orange-200/80 bg-card px-2 text-xs text-foreground outline-none dark:border-orange-500/20"
            >
              <option value="assessment">Assessment</option>
              <option value="plan">Plan</option>
              <option value="notes">Notes</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => insightMutation.mutate(focus)}
            disabled={insightMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-orange-300 bg-white/80 px-3 py-1.5 text-xs font-semibold text-orange-800 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200"
          >
            {insightMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5" />}
            {insightMutation.isPending ? "Reviewing patient record..." : "Generate note insight"}
          </button>

          {insight && (
            <div className="rounded-xl border border-orange-200 bg-white/80 p-3 dark:border-orange-500/20 dark:bg-background/70">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-300">
                Suggested {insight.focus}
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground">{insight.suggestedText}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{insight.rationale}</p>
              <div className="mt-2">
                <SourceChips refs={insight.sourceRefs} />
              </div>
              <button
                type="button"
                disabled={!onAddToNote || insightAdded}
                onClick={() => {
                  onAddToNote?.(insight.suggestedText, insight.focus);
                  setInsightAdded(true);
                }}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {insightAdded ? <Check className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
                {insightAdded ? "Added to note" : "Add to note"}
              </button>
              <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
                {onAddToNote
                  ? `Adds to the ${insight.focus} field. You can edit it before completing the encounter.`
                  : "Open this copilot from a consultation to add the insight to a note."}
              </p>
              <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{insight.limitations.join(" ")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
