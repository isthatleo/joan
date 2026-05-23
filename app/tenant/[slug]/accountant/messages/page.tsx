"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type EmailLogRow = {
  id: string;
  createdAt: string;
  toAddress: string;
  fromAddress: string | null;
  subject: string | null;
  template: string | null;
  status: string;
  provider: string | null;
  providerMessageId: string | null;
  error: string | null;
  metadata: {
    tags?: Array<{ name: string; value: string }>;
    sourceLogId?: string | null;
  } | null;
};

type FiltersPayload = {
  templates: string[];
  statuses: string[];
  tags?: string[];
};

export default function AccountantEmailActivityPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [items, setItems] = useState<EmailLogRow[]>([]);
  const [filters, setFilters] = useState<FiltersPayload>({ templates: [], statuses: [] });
  const [status, setStatus] = useState("");
  const [template, setTemplate] = useState("");
  const [tag, setTag] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 50, total: 0, totalPages: 1 });

  const queryString = useMemo(() => {
    const search = new URLSearchParams();
    if (status) search.set("status", status);
    if (template) search.set("template", template);
    if (tag.trim()) search.set("tag", tag.trim());
    search.set("page", String(page));
    search.set("pageSize", "50");
    return search.toString();
  }, [status, template, tag, page]);

  async function load() {
    if (!slug) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tenant/${slug}/accountant/email-activity${queryString ? `?${queryString}` : ""}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load email activity");
      }

      setItems(payload.items || []);
      setFilters(payload.filters || { templates: [], statuses: [] });
      setPagination(payload.pagination || { page: 1, pageSize: 50, total: 0, totalPages: 1 });
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load email activity";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [slug, queryString]);

  useEffect(() => {
    setPage(1);
  }, [status, template, tag]);

  async function resendEmail(id: string) {
    setResendingId(id);
    setError(null);

    try {
      const response = await fetch(`/api/tenant/${slug}/accountant/email-activity/${id}/retry`, {
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to resend email");
      }

      toast.success(payload.message || "Email re-queued");
      await load();
    } catch (resendError) {
      const message = resendError instanceof Error ? resendError.message : "Failed to resend email";
      setError(message);
      toast.error(message);
    } finally {
      setResendingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-600">
            <Mail className="h-3.5 w-3.5" />
            Tenant Email Activity
          </div>
          <h1 className="text-2xl font-semibold">Outgoing Email Log</h1>
          <p className="text-sm text-muted-foreground">
            Track delivery status, inspect templates and tags, and retry failed sends.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Showing {items.length} of {pagination.total} matching email events.
          </p>
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </header>

      <section className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-4">
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {filters.statuses.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={template}
          onChange={(event) => setTemplate(event.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">All templates</option>
          {filters.templates.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={tag}
          onChange={(event) => setTag(event.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">All tags</option>
          {(filters.tags || []).map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <button
          onClick={() => {
            setStatus("");
            setTemplate("");
            setTag("");
          }}
          className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          Clear filters
        </button>
      </section>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border bg-card">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading email activity...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["Sent", "To", "Subject", "Template", "Tags", "Status", "Actions"].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left font-medium">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      <p className="font-medium text-foreground">No email activity matched the current filters.</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Clear the filters or refresh after the next outbound email is sent.
                      </p>
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="border-t align-top">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{item.toAddress}</div>
                        <div className="text-xs text-muted-foreground">{item.fromAddress || "No sender"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{item.subject || "No subject"}</div>
                        {item.error && (
                          <div className="mt-1 text-xs text-red-600">{item.error}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">{item.template || "Unspecified"}</td>
                      <td className="px-4 py-3">
                        <div className="flex max-w-xs flex-wrap gap-2">
                          {(item.metadata?.tags || []).length === 0 ? (
                            <span className="text-muted-foreground">None</span>
                          ) : (
                            (item.metadata?.tags || []).map((entry) => (
                              <span
                                key={`${entry.name}-${entry.value}`}
                                className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700"
                              >
                                {entry.name}:{entry.value}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => resendEmail(item.id)}
                          disabled={resendingId === item.id}
                          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
                        >
                          {resendingId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          {item.status === "failed" ? "Retry" : "Resend"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {pagination.page} of {pagination.totalPages}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={pagination.page <= 1 || loading}
            className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
            disabled={pagination.page >= pagination.totalPages || loading}
            className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
