"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Loader2,
  RotateCcw,
  Send,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useSessionChatState } from "@/hooks/use-session-chat";
import {
  PLATFORM_CHAT_HISTORY_LIMIT,
  platformSourceRefKey,
  type PlatformChatMessage,
  type PlatformCopilotAnswer,
  type PlatformCopilotSourceRef,
} from "@/lib/platform-copilot/types";

export type PlatformCopilotPanelProps = {
  sessionKey?: string;
};

type ChatMessage =
  | { id: string; role: "user"; content: string; createdAt: string }
  | { id: string; role: "assistant"; answer: PlatformCopilotAnswer; createdAt: string }
  | { id: string; role: "error"; content: string; createdAt: string };

type RetryState = { message: string; history: PlatformChatMessage[] };

const MAX_STORED_MESSAGES = 20;
const SUGGESTED_PROMPTS = [
  "What is the current tenant and user footprint?",
  "Summarize open billing items without patient details.",
  "Which platform areas need operational attention?",
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

function isPlatformAnswer(value: unknown): value is PlatformCopilotAnswer {
  if (!value || typeof value !== "object") return false;
  const answer = value as Partial<PlatformCopilotAnswer>;
  return (
    typeof answer.answer === "string" &&
    typeof answer.generatedAt === "string" &&
    Array.isArray(answer.keyPoints) &&
    Array.isArray(answer.sourceRefs) &&
    Array.isArray(answer.limitations) &&
    Boolean(answer.scope)
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
      messages.push({
        id: typeof candidate.id === "string" ? candidate.id : createId(),
        role: "user",
        content: candidate.content.slice(0, 1000),
        createdAt,
      });
      continue;
    }
    if (candidate.role === "assistant" && isPlatformAnswer(candidate.answer)) {
      messages.push({
        id: typeof candidate.id === "string" ? candidate.id : createId(),
        role: "assistant",
        answer: candidate.answer,
        createdAt,
      });
    }
  }

  return messages;
}

function toApiHistory(messages: ChatMessage[]): PlatformChatMessage[] {
  return messages
    .filter((message): message is Extract<ChatMessage, { role: "user" | "assistant" }> =>
      message.role !== "error"
    )
    .slice(-PLATFORM_CHAT_HISTORY_LIMIT)
    .map((message) =>
      message.role === "user"
        ? { role: "user" as const, content: message.content }
        : { role: "assistant" as const, content: message.answer.answer }
    );
}

function formatTime(value: string): string {
  try {
    return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function SourceChips({ refs }: { refs: PlatformCopilotSourceRef[] }) {
  if (refs.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {refs.map((ref) => (
        <span
          key={platformSourceRefKey(ref)}
          className="rounded-md border border-slate-300/70 bg-white/70 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-200"
        >
          {ref.label || ref.table}
        </span>
      ))}
    </div>
  );
}

export function PlatformCopilotPanel({ sessionKey }: PlatformCopilotPanelProps) {
  const [messages, setMessages] = useSessionChatState<ChatMessage[]>(
    sessionKey || "platform-copilot-chat",
    [],
    sanitizeMessages
  );
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState<RetryState | null>(null);
  const [isSending, setIsSending] = useState(false);

  const sendMessage = async (rawValue: string, replay?: RetryState) => {
    const message = rawValue.replace(/\s+/g, " ").trim().slice(0, 500);
    if (!message || isSending) return;

    const history = replay?.history ?? toApiHistory(messages);
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
      const answer = await postJson<PlatformCopilotAnswer>("/api/super-admin/copilot/chat", {
        message,
        history,
      });
      setMessages((current) => [
        ...current,
        { id: createId(), role: "assistant", answer, createdAt: new Date().toISOString() },
      ]);
      setRetry(null);
    } catch (sendError) {
      const messageText = sendError instanceof Error ? sendError.message : "Platform Copilot could not answer that request.";
      setError(messageText);
      setRetry({ message, history });
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
    <div className="space-y-4 rounded-2xl border border-slate-300/70 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/30">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-700/10 text-slate-700 dark:bg-slate-400/10 dark:text-slate-200">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">Platform Copilot chat</h3>
            <span className="rounded-full bg-slate-700/10 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-400/10 dark:text-slate-200">
              Read-only
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Platform operations metadata only. No patient details, note text, or write actions.
          </p>
        </div>
        <button
          type="button"
          onClick={clearChat}
          disabled={messages.length === 0 || isSending}
          title="Clear chat"
          aria-label="Clear chat"
          className="rounded-lg border border-slate-300/70 p-1.5 text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-200"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div
        role="log"
        aria-live="polite"
        aria-label="Platform Copilot conversation"
        className="max-h-[360px] space-y-3 overflow-y-auto rounded-xl border border-slate-300/70 bg-white/70 p-3 dark:border-slate-700 dark:bg-background/60"
      >
        {messages.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">
            Ask about platform operations. History stays in this browser tab only.
          </p>
        ) : (
          messages.map((message) => {
            if (message.role === "user") {
              return (
                <div key={message.id} className="ml-auto max-w-[88%] rounded-xl bg-slate-800 px-3 py-2 text-sm text-white">
                  <p className="whitespace-pre-wrap leading-6">{message.content}</p>
                  <p className="mt-1 text-right text-[9px] text-slate-300">{formatTime(message.createdAt)}</p>
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
              <div key={message.id} className="max-w-[94%] rounded-xl border border-slate-300/70 bg-white/90 p-3 dark:border-slate-700 dark:bg-background/80">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                    Platform Copilot
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {answer.scope.factsReviewed} metadata facts · {formatTime(message.createdAt)}
                  </p>
                </div>
                <p className="mt-2 text-sm leading-6 text-foreground">{answer.answer}</p>
                {answer.keyPoints.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {answer.keyPoints.map((point, index) => (
                      <li key={`platform-point-${message.id}-${index}`} className="flex gap-1.5 text-xs text-foreground/85">
                        <Check className="mt-0.5 h-3 w-3 shrink-0 text-slate-600 dark:text-slate-300" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-2">
                  <SourceChips refs={answer.sourceRefs} />
                </div>
                <p className="mt-2 text-[10px] leading-4 text-muted-foreground">{answer.limitations.join(" ")}</p>
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300/70 bg-white/70 px-2.5 py-1.5 text-left text-[11px] font-medium text-slate-700 transition hover:bg-white dark:border-slate-600 dark:bg-slate-500/10 dark:text-slate-200"
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
          placeholder="Ask about platform operations… Enter to send, Shift+Enter for a new line."
          className="w-full resize-none rounded-lg border border-slate-300/70 bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-slate-500 dark:border-slate-600"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void sendMessage(draft)}
            disabled={!draft.trim() || isSending}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {isSending ? "Checking platform metadata..." : "Send message"}
          </button>
          {retry && (
            <button
              type="button"
              onClick={retryMessage}
              disabled={isSending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300/70 bg-white/70 px-2.5 py-2 text-xs font-medium text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-500/10 dark:text-slate-200"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Retry last message
            </button>
          )}
          <p className="text-[10px] leading-4 text-muted-foreground">
            Read-only. Verify operational details in the relevant admin page.
          </p>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
