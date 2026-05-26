"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Download, Eye, FileText, RefreshCw, Search } from "lucide-react";

type RecordsData = {
  records: Array<{ id: string; type: string; title: string; description: string; provider: string; date: string | null; status: string; category: string; notes?: string | null }>;
  categories: Array<{ id: string; name: string; count: number }>;
};

export default function HealthRecordsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [data, setData] = useState<RecordsData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<RecordsData["records"][number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData(showSpinner = true) {
    if (showSpinner) setRefreshing(true);
    try {
      const response = await fetch(`/api/tenant/${slug}/patient/records`, { cache: "no-store", credentials: "include" });
      if (!response.ok) throw new Error("Failed to load records");
      setData(await response.json());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [slug]);

  const filtered = useMemo(() => {
    const records = data?.records || [];
    return records.filter((record) => {
      const matchesCategory = selectedCategory === "all" || record.category === selectedCategory;
      const term = search.toLowerCase();
      const matchesSearch = !term || [record.title, record.description, record.provider].join(" ").toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [data?.records, search, selectedCategory]);

  function exportRecords() {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `health-records-${slug}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (loading || !data) return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading medical records...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">Health Records</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">Complete medical record timeline</h1>
          <p className="mt-2 text-sm text-muted-foreground">Visits, prescriptions, and lab records are aggregated from the hospital system.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportRecords} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"><Download className="mr-2 inline h-4 w-4" />Export</button>
          <button onClick={() => loadData()} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"><RefreshCw className={`mr-2 inline h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {data.categories.map((category) => (
          <button key={category.id} onClick={() => setSelectedCategory(category.id)} className={`rounded-2xl border p-4 text-left shadow-sm transition ${selectedCategory === category.id ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted"}`}>
            <p className="text-sm text-muted-foreground">{category.name}</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{category.count}</p>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search records" className="w-full rounded-xl border border-border bg-background py-2 pl-10 pr-3 text-sm text-foreground" />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-muted-foreground"><tr><th className="px-4 py-3">Record</th><th className="px-4 py-3">Provider</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr></thead>
            <tbody>
              {filtered.map((record) => (
                <tr key={record.id} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-4">
                    <p className="font-medium text-foreground">{record.title}</p>
                    <p className="text-muted-foreground">{record.description}</p>
                  </td>
                  <td className="px-4 py-4 text-foreground">{record.provider}</td>
                  <td className="px-4 py-4 text-muted-foreground">{record.date ? new Date(record.date).toLocaleString() : "-"}</td>
                  <td className="px-4 py-4"><span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">{record.status}</span></td>
                  <td className="px-4 py-4"><button onClick={() => setSelectedRecord(record)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"><Eye className="h-4 w-4" />View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRecord ? (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary"><FileText className="h-5 w-5" /></div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{selectedRecord.title}</h2>
                <p className="text-sm text-muted-foreground">{selectedRecord.provider}</p>
              </div>
            </div>
            <button onClick={() => setSelectedRecord(null)} className="rounded-xl border border-border px-3 py-2 text-sm text-foreground hover:bg-muted">Close</button>
          </div>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            <p><span className="font-medium text-foreground">Type:</span> {selectedRecord.type}</p>
            <p><span className="font-medium text-foreground">Date:</span> {selectedRecord.date ? new Date(selectedRecord.date).toLocaleString() : "-"}</p>
            <p><span className="font-medium text-foreground">Summary:</span> {selectedRecord.description}</p>
            <p><span className="font-medium text-foreground">Notes:</span> {selectedRecord.notes || "No notes attached"}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
