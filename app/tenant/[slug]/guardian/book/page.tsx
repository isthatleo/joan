"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type Options = { children: Array<{ id: string; name: string; canSchedule: boolean }>; doctors: Array<{ id: string; name: string; specialty: string }>; appointmentTypes: Array<{ id: string; name: string; duration: number; description: string }>; slots?: Array<{ id: string; time: string; available: boolean }> };

export default function GuardianBookPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;
  const [options, setOptions] = useState<Options | null>(null);
  const [slots, setSlots] = useState<Array<{ id: string; time: string; available: boolean }>>([]);
  const [form, setForm] = useState({ childId: searchParams.get("child") || "", doctorId: "", appointmentTypeId: "consultation", date: "", timeSlot: "", reason: "", notes: "" });

  useEffect(() => { fetch(`/api/tenant/${slug}/guardian/appointments/options`, { cache: "no-store", credentials: "include" }).then((res) => res.json()).then(setOptions); }, [slug]);
  useEffect(() => { if (form.doctorId && form.date) fetch(`/api/tenant/${slug}/guardian/appointments/options?doctorId=${form.doctorId}&date=${form.date}`, { cache: "no-store", credentials: "include" }).then((res) => res.json()).then((data) => setSlots(data.slots || [])); }, [form.date, form.doctorId, slug]);

  async function submit() {
    const response = await fetch(`/api/tenant/${slug}/guardian/appointments`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(form) });
    if (response.ok) window.location.href = `/tenant/${slug}/guardian/appointments`;
  }

  if (!options) return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading booking options...</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm"><p className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">Book Appointment</p><h1 className="mt-1 text-3xl font-semibold text-foreground">Schedule a child visit</h1></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <select value={form.childId} onChange={(e) => setForm({ ...form, childId: e.target.value })} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"><option value="">Select child</option>{options.children.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select value={form.appointmentTypeId} onChange={(e) => setForm({ ...form, appointmentTypeId: e.target.value })} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground">{options.appointmentTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value })} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"><option value="">Select doctor</option>{options.doctors.map((item) => <option key={item.id} value={item.id}>{item.name} - {item.specialty}</option>)}</select>
          <input type="date" value={form.date} min={new Date().toISOString().split("T")[0]} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground" />
          <select value={form.timeSlot} onChange={(e) => setForm({ ...form, timeSlot: e.target.value })} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"><option value="">Select time slot</option>{slots.filter((item) => item.available).map((item) => <option key={item.id} value={item.time}>{item.time}</option>)}</select>
          <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Reason for visit" className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground" />
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes" className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground" />
          <button onClick={submit} disabled={!form.childId || !form.doctorId || !form.date || !form.timeSlot || !form.reason} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">Confirm booking</button>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm"><h2 className="text-lg font-semibold text-foreground">Available providers</h2><div className="mt-4 space-y-3">{options.doctors.map((item) => <div key={item.id} className="rounded-xl border border-border bg-background p-4"><p className="font-medium text-foreground">{item.name}</p><p className="text-sm text-muted-foreground">{item.specialty}</p></div>)}</div></div>
      </div>
    </div>
  );
}
