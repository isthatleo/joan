"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Search, ShieldPlus } from "lucide-react";

type SearchResult = {
  id: string;
  fullName: string;
  mrn: string;
  phone: string;
  email: string;
  dob?: string | null;
  gender: string;
};

export default function GuardianAddChildPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [canViewRecords, setCanViewRecords] = useState(true);
  const [canSchedule, setCanSchedule] = useState(true);
  const [emergencyContact, setEmergencyContact] = useState(false);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    fetch(`/api/tenant/${slug}/guardian/children?q=${encodeURIComponent(trimmed)}`, {
      cache: "no-store",
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({ patients: [] }));
        if (!response.ok) throw new Error(payload?.error || "Failed to search patients");
        setResults(payload.patients || []);
        setError(null);
      })
      .catch((searchError) => {
        if ((searchError as Error).name === "AbortError") return;
        setError(searchError instanceof Error ? searchError.message : "Failed to search patients");
      })
      .finally(() => setSearching(false));
    return () => controller.abort();
  }, [query, slug]);

  async function linkChild() {
    if (!selected) {
      setError("Select a child profile to continue");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/tenant/${slug}/guardian/children`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ patientId: selected, canViewRecords, canSchedule, emergencyContact }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to link child");
      router.push(`/tenant/${slug}/guardian/children/${selected}`);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to link child");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <Link href={`/tenant/${slug}/guardian/children`} className="text-sm font-medium text-muted-foreground hover:text-foreground">
          Back to child profiles
        </Link>
        <p className="mt-4 text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">Add Child</p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">Link a child profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Search existing patient records in this tenant and assign guardian permissions for records, booking, and emergency contact use.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by child name, MRN, phone, or email"
              className="w-full rounded-xl border border-border bg-background py-2 pl-10 pr-3 text-sm text-foreground"
            />
          </div>
          <div className="mt-4 space-y-3">
            {searching ? <p className="text-sm text-muted-foreground">Searching child profiles...</p> : null}
            {!searching && query.trim().length >= 2 && !results.length ? (
              <p className="text-sm text-muted-foreground">No unlinked child profiles matched your search.</p>
            ) : null}
            {results.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(item.id)}
                className={`w-full rounded-2xl border p-4 text-left shadow-sm transition ${
                  selected === item.id ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-muted/60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{item.fullName}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.gender}
                      {item.dob ? ` - DOB ${new Date(item.dob).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <span className="rounded-full bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                    {item.mrn || "No MRN"}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                  <p>Phone: {item.phone || "-"}</p>
                  <p>Email: {item.email || "-"}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldPlus className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Guardian permissions</h2>
          </div>
          <div className="mt-4 space-y-4">
            <label className="flex items-start gap-3 rounded-xl border border-border bg-background p-4">
              <input type="checkbox" checked={canViewRecords} onChange={(event) => setCanViewRecords(event.target.checked)} className="mt-1" />
              <div>
                <p className="font-medium text-foreground">View health records</p>
                <p className="text-sm text-muted-foreground">Allow this guardian to access visits, prescriptions, vitals, and lab history.</p>
              </div>
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-border bg-background p-4">
              <input type="checkbox" checked={canSchedule} onChange={(event) => setCanSchedule(event.target.checked)} className="mt-1" />
              <div>
                <p className="font-medium text-foreground">Book and reschedule</p>
                <p className="text-sm text-muted-foreground">Allow appointment scheduling and updates for this child.</p>
              </div>
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-border bg-background p-4">
              <input type="checkbox" checked={emergencyContact} onChange={(event) => setEmergencyContact(event.target.checked)} className="mt-1" />
              <div>
                <p className="font-medium text-foreground">Emergency contact</p>
                <p className="text-sm text-muted-foreground">Mark this guardian as an emergency contact for the child profile.</p>
              </div>
            </label>
          </div>
          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
          <button
            type="button"
            onClick={linkChild}
            disabled={!selected || saving}
            className="mt-6 w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Linking child..." : "Link child profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
