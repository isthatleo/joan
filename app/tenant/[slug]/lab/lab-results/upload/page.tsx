"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { withTenantPrefix } from "@/lib/tenant-routing";
import { ArrowLeft, Cpu, FileUp, Loader2, Save, UploadCloud } from "lucide-react";

export default function LabResultUploadPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const hostname = typeof window !== "undefined" ? window.location.hostname : null;
  const path = (value: string) => withTenantPrefix(value, slug, hostname);
  const [orders, setOrders] = useState<any[]>([]);
  const [deviceData, setDeviceData] = useState<{ devices: any[]; pendingResults: any[] }>({ devices: [], pendingResults: [] });
  const [saving, setSaving] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [form, setForm] = useState({ orderId: searchParams?.get("orderId") || "", summary: "", notes: "", interpretation: "", findings: [{ key: "", value: "" }] as Array<{ key: string; value: string }>, deviceResultId: "" });

  useEffect(() => {
    (async () => {
      const [inProgressRes, pendingRes, devicesRes] = await Promise.all([
        fetch(`/api/lab/orders?slug=${slug}&status=in-progress&limit=100`, { cache: "no-store" }),
        fetch(`/api/lab/orders?slug=${slug}&status=pending&limit=100`, { cache: "no-store" }),
        fetch(`/api/lab/device-results?slug=${slug}`, { cache: "no-store" }),
      ]);
      const current = inProgressRes.ok ? await inProgressRes.json() : { orders: [] };
      const pending = pendingRes.ok ? await pendingRes.json() : { orders: [] };
      const devices = devicesRes.ok ? await devicesRes.json() : { devices: [], pendingResults: [] };
      setOrders([...(current.orders || []), ...(pending.orders || [])]);
      setDeviceData({ devices: devices.devices || [], pendingResults: devices.pendingResults || [] });
      setLoadingDevices(false);
    })();
  }, [slug]);

  const matchingDeviceResult = useMemo(() => deviceData.pendingResults.find((item) => String(item.labOrderId || "") === String(form.orderId || "")), [deviceData.pendingResults, form.orderId]);

  useEffect(() => {
    if (!matchingDeviceResult || form.summary) return;
    importDeviceResult(matchingDeviceResult);
  }, [matchingDeviceResult]);

  const importDeviceResult = (deviceResult: any) => {
    const values = deviceResult.values && typeof deviceResult.values === "object" ? Object.entries(deviceResult.values) : [];
    setForm((current) => ({
      ...current,
      orderId: String(deviceResult.labOrderId || current.orderId || ""),
      summary: String(deviceResult.summary || current.summary || ""),
      notes: String(deviceResult.notes || current.notes || ""),
      interpretation: String(deviceResult.interpretation || current.interpretation || ""),
      deviceResultId: String(deviceResult.id || ""),
      findings: values.length ? values.map(([key, value]) => ({ key, value: String(value ?? "") })) : current.findings,
    }));
  };

  const submit = async () => {
    setSaving(true);
    const values = form.findings.reduce((acc, item) => {
      if (item.key.trim()) acc[item.key.trim()] = item.value.trim();
      return acc;
    }, {} as Record<string, string>);
    const payload = new FormData();
    payload.set("labOrderId", form.orderId);
    payload.set("deviceResultId", form.deviceResultId || "");
    payload.set("resultData", JSON.stringify({
      summary: form.summary,
      notes: form.notes,
      interpretation: form.interpretation,
      values,
      status: "reviewed",
      importedFromDevice: Boolean(form.deviceResultId),
    }));
    if (selectedFile) payload.set("file", selectedFile);

    const res = await fetch(`/api/lab/results`, { method: "POST", body: payload });
    setSaving(false);
    if (res.ok) {
      const result = await res.json();
      if (form.deviceResultId) {
        await fetch(`/api/lab/device-results/${form.deviceResultId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, status: "imported" }),
        });
      }
      router.push(path(`/lab/lab-results/${result.id}`));
    }
  };

  return (
    <div className="space-y-6">
      <Link href={path("/lab/lab-results")} className="inline-flex items-center gap-2 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" />Back to results</Link>
      <div className="rounded-2xl border border-border bg-card p-6">
        <h1 className="text-3xl font-bold text-foreground">Upload Result</h1>
        <p className="mt-1 text-sm text-muted-foreground">Capture technician findings, attach a local file, or import pending results from connected analyzers.</p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <select value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })} className="h-10 rounded-lg border border-border bg-background px-3 text-sm"><option value="">Select lab order</option>{orders.map((order) => <option key={order.id} value={order.id}>{order.patientName} - {order.testType}</option>)}</select>
              <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-foreground"><UploadCloud className="h-4 w-4 text-primary" />{selectedFile ? selectedFile.name : "Choose local result file"}<input type="file" accept=".pdf,.csv,.txt,.json,.xml" className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} /></label>
              <input value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="Summary" className="h-10 rounded-lg border border-border bg-background px-3 text-sm md:col-span-2" />
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" className="min-h-[110px] rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              <textarea value={form.interpretation} onChange={(e) => setForm({ ...form, interpretation: e.target.value })} placeholder="Interpretation" className="min-h-[110px] rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            </div>

            <div className="rounded-xl border border-border bg-background p-4">
              <div className="mb-3 flex items-center justify-between"><p className="font-medium text-foreground">Measured values</p><button type="button" onClick={() => setForm({ ...form, findings: [...form.findings, { key: "", value: "" }] })} className="text-sm font-medium text-primary">Add row</button></div>
              <div className="space-y-3">{form.findings.map((finding, index) => <div key={index} className="grid gap-3 md:grid-cols-2"><input value={finding.key} onChange={(e) => { const findings = [...form.findings]; findings[index].key = e.target.value; setForm({ ...form, findings }); }} placeholder="Field" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" /><input value={finding.value} onChange={(e) => { const findings = [...form.findings]; findings[index].value = e.target.value; setForm({ ...form, findings }); }} placeholder="Value" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" /></div>)}</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="mb-3 flex items-center gap-2 font-medium text-foreground"><Cpu className="h-4 w-4 text-primary" />Connected Devices</div>
              {loadingDevices ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : deviceData.devices.length === 0 ? <p className="text-sm text-muted-foreground">No configured analyzer integrations were found for this tenant.</p> : <div className="space-y-3">{deviceData.devices.map((device) => <div key={device.id || device.name} className="rounded-lg border border-border p-3"><p className="font-medium text-foreground">{device.name || "Analyzer"}</p><p className="text-xs text-muted-foreground">{device.type || "Lab device"} • {device.status || "connected"}</p></div>)}</div>}
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="mb-3 flex items-center gap-2 font-medium text-foreground"><FileUp className="h-4 w-4 text-primary" />Pending Device Findings</div>
              {loadingDevices ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : deviceData.pendingResults.length === 0 ? <p className="text-sm text-muted-foreground">No pending device findings to import.</p> : <div className="space-y-3">{deviceData.pendingResults.map((item) => <div key={item.id} className="rounded-lg border border-border p-3"><p className="font-medium text-foreground">{item.summary || item.deviceName || "Analyzer result"}</p><p className="text-xs text-muted-foreground">{item.deviceName || "Device"} {item.labOrderId ? `• linked order ${String(item.labOrderId).slice(-8)}` : ""}</p><button type="button" onClick={() => importDeviceResult(item)} className="mt-3 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">Import findings</button></div>)}</div>}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3"><Link href={path("/lab/lab-results")} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</Link><button onClick={submit} disabled={saving || !form.orderId || !form.summary} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save result</button></div>
      </div>
    </div>
  );
}
