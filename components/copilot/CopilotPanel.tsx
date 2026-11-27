"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Check, ChevronRight, FlaskConical, Loader2, Send, Sparkles } from "lucide-react";
import { useTenantPath } from "@/hooks/useTenantPath";
import {
  DEFAULT_HANDOFF_QUESTION,
  DEFAULT_QUERY_PROMPT,
  sourceRefKey,
  type CopilotAnswer,
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
};

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

export function CopilotPanel({ patientId, queueId, onAddToNote, variant = "full" }: CopilotPanelProps) {
  const tenantPath = useTenantPath();
  const [question, setQuestion] = useState(DEFAULT_HANDOFF_QUESTION);
  const [query, setQuery] = useState(DEFAULT_QUERY_PROMPT);
  const [focus, setFocus] = useState<CopilotNoteFocus>("assessment");
  const [error, setError] = useState<string | null>(null);
  const [insightAdded, setInsightAdded] = useState(false);

  const queryMutation = useMutation<CopilotAnswer, Error, string>({
    mutationFn: (value) =>
      postJson<CopilotAnswer>("/api/copilot/query", {
        question: value,
        patientId,
        queueId,
      }),
    onSuccess: () => setError(null),
    onError: (mutationError) => setError(mutationError.message),
  });

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
  const answer = queryMutation.data;
  const handoff = handoffMutation.data;
  const insight = insightMutation.data;

  return (
    <div className="space-y-4 rounded-2xl border border-orange-200/70 bg-orange-50/40 p-4 dark:border-orange-500/20 dark:bg-orange-500/5">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 text-orange-600 dark:text-orange-300">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-foreground">AI Copilot</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {showHandoff
              ? "Ask anything about patients in your scope. Answers use only records your role is allowed to access."
              : "Ask about this patient or generate draft note text. Review everything before adding it to the note."}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setQuery(DEFAULT_QUERY_PROMPT)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200/80 bg-white/70 px-2.5 py-1.5 text-left text-[11px] font-medium text-orange-800 transition hover:bg-white dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200"
          >
            <ChevronRight className="h-3 w-3" />
            {DEFAULT_QUERY_PROMPT}
          </button>
          <button
            type="button"
            onClick={() => setQuery("Which abnormal lab results need review?")}
            className="rounded-lg border border-orange-200/80 bg-white/70 px-2.5 py-1.5 text-left text-[11px] font-medium text-orange-800 transition hover:bg-white dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200"
          >
            Abnormal labs
          </button>
          <button
            type="button"
            onClick={() => setQuery("Which prescriptions need attention?")}
            className="rounded-lg border border-orange-200/80 bg-white/70 px-2.5 py-1.5 text-left text-[11px] font-medium text-orange-800 transition hover:bg-white dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200"
          >
            Prescriptions to review
          </button>
        </div>
        <textarea
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Ask a question about your scoped patient data..."
          className="w-full resize-none rounded-lg border border-orange-200/80 bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-orange-400 dark:border-orange-500/20"
        />
        <button
          type="button"
          onClick={() => queryMutation.mutate(query)}
          disabled={!query.trim() || queryMutation.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {queryMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          {queryMutation.isPending ? "Checking your records..." : "Ask Copilot"}
        </button>
        <p className="text-[10px] leading-4 text-muted-foreground">
          Answers are decision support only. Open the linked source records and confirm every detail before acting.
        </p>
      </div>

      {answer && (
        <div className="space-y-3 rounded-xl border border-orange-200 bg-white/80 p-3 dark:border-orange-500/20 dark:bg-background/70">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-300">
              Copilot answer
            </p>
            <p className="text-[10px] text-muted-foreground">
              {answer.scope.factsReviewed} authorized facts · {formatTime(answer.generatedAt)}
            </p>
          </div>
          <p className="text-sm leading-6 text-foreground">{answer.answer}</p>
          {answer.keyPoints.length > 0 && (
            <ul className="space-y-1.5">
              {answer.keyPoints.map((point, index) => (
                <li key={`answer-point-${index}`} className="flex gap-1.5 text-xs text-foreground/85">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-orange-600" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          )}
          <SourceChips refs={answer.sourceRefs} />
          <p className="text-[10px] leading-4 text-muted-foreground">
            Scope: {answer.scope.allowedCategories.join(", ") || "no clinical categories"}
          </p>
          <p className="text-[10px] leading-4 text-muted-foreground">{answer.limitations.join(" ")}</p>
        </div>
      )}

      {showHandoff && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setQuestion(DEFAULT_HANDOFF_QUESTION)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200/80 bg-white/70 px-2.5 py-1.5 text-left text-[11px] font-medium text-orange-800 transition hover:bg-white dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200"
          >
            <ChevronRight className="h-3 w-3" />
            {DEFAULT_HANDOFF_QUESTION}
          </button>
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
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {showHandoff && handoff && (
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
