"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Download, Microscope, RefreshCw, Search } from "lucide-react";

type LabResultsData = {
  results: Array<{
    id: string;
    orderId: string;
    testName: string;
    category: string;
    status: string;
    orderedAt?: string | null;
    completedAt?: string | null;
    provider: string;
    notes?: string | null;
    resultData: any;
    patientPortalEligible: boolean;
  }>;
  categories: Array<{ id: string; name: string; count: number }>;
  summary: { total: number; payable: number; ready: number };
};

export default function PatientLabResultsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [data, setData] = useState<LabResultsData | null>(null);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData(showSpinner = true) {
    if (showSpinner) setRefreshing(true);
    try {
      const response = await fetch(`/api/tenant/${slug}/patient/lab-results`, { cache: "no-store", credentials: "include" });
      if (!response.ok) throw new Error("Failed to load lab results");
      setData(await response.json());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [slug]);

  const results = useMemo(() => {
    const all = data?.results || [];
    return all.filter((item) => {
      const matchesCategory = category === "all" || item.category === category;
      const matchesSearch = !search || [item.testName, item.provider, item.category].join(" ").toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [category, data?.results, search]);

  async function downloadResult(id: string) {
    window.open(`/api/tenant/${slug}/patient/lab-results/${id}/download`, "_blank", "noopener,noreferrer");
  }

  const selected = results.find((item) => item.id === selectedId) || null;

  if (loading || !data) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading lab results...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">Lab Results</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">Paid-result access and downloads</h1>
          <p className="mt-2 text-sm text-muted-foreground">Each lab result remains separate and becomes downloadable after payment clearance.</p>
        </div>
        <button onClick={() => loadData()} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
          <RefreshCw className={`mr-2 inline h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">All results</p><p className="mt-2 text-3xl font-semibold text-foreground">{data.summary.total}</p></div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Ready to download</p><p className="mt-2 text-3xl font-semibold text-foreground">{data.summary.ready}</p></div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Awaiting payment</p><p className="mt-2 text-3xl font-semibold text-foreground">{data.summary.payable}</p></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_2fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tests" className="w-full rounded-xl border border-border bg-background py-2 pl-10 pr-3 text-sm text-foreground" />
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-sm font-medium text-foreground">Categories</p>
            <div className="mt-3 space-y-2">
              {data.categories.map((item) => (
                <button key={item.id} onClick={() => setCategory(item.id)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm ${category === item.id ? "bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-muted"}`}>
                  <span>{item.name}</span>
                  <span>{item.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {results.map((result) => (
            <div key={result.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                      <Microscope className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">{result.testName}</h2>
                      <p className="text-sm text-muted-foreground">{result.provider} | {result.category}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                    <p><span className="font-medium text-foreground">Ordered:</span> {result.orderedAt ? new Date(result.orderedAt).toLocaleString() : "-"}</p>
                    <p><span className="font-medium text-foreground">Completed:</span> {result.completedAt ? new Date(result.completedAt).toLocaleString() : "Pending"}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium capitalize text-primary">{result.status}</span>
                  <Link href={`/tenant/${slug}/patient-portal/results/${result.id}`} className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted">
                    Details
                  </Link>
                  <button onClick={() => setSelectedId(result.id)} className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted">Preview</button>
                  <button onClick={() => downloadResult(result.id)} disabled={!result.patientPortalEligible} className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50">
                    <Download className="mr-2 inline h-4 w-4" />
                    Download e-stamp
                  </button>
                </div>
              </div>
              {!result.patientPortalEligible ? <p className="mt-3 text-sm text-amber-600 dark:text-amber-300">Payment clearance is required before full result download.</p> : null}
            </div>
          ))}
          {results.length === 0 ? <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">No lab results match this view.</div> : null}
        </div>
      </div>

      {selected ? (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">{selected.testName}</h2>
          <div className="mt-4 rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground">
            <pre className="whitespace-pre-wrap break-words">{JSON.stringify(selected.resultData || { message: "No structured findings uploaded yet." }, null, 2)}</pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
