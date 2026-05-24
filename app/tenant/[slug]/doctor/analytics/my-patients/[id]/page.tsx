"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, FileText, FlaskConical, HeartPulse, Pill, Printer, ShieldAlert, UserRound } from "lucide-react";
import { KPICard } from "@/components/KPICard";
import { exportElementAsPdf, exportElementAsPng } from "@/lib/export/page-export";
import { useTenantPath } from "@/hooks/useTenantPath";

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function typeBadge(type: string) {
  switch (type) {
    case "visit": return "bg-info-soft text-info-soft-foreground";
    case "appointment": return "bg-primary-soft text-primary-soft-foreground";
    case "prescription": return "bg-success-soft text-success-soft-foreground";
    case "lab_order":
    case "lab_result": return "bg-warning-soft text-warning-soft-foreground";
    default: return "bg-muted text-foreground";
  }
}

export default function PatientHistoryDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const tenantPath = useTenantPath();
  const searchParams = useSearchParams();
  const exportRef = useRef<HTMLDivElement | null>(null);
  const id = String(params?.id || "");
  const action = searchParams.get("action");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["doctor-patient-history-detail", id],
    queryFn: async () => {
      const response = await fetch(`/api/doctor/patient-history/${id}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to load patient history");
      return payload;
    },
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (!data || !exportRef.current || !action) return;
    const run = async () => {
      if (action === "print") {
        window.print();
      } else if (action === "pdf") {
        await exportElementAsPdf(exportRef.current!, `${data.patient.fullName || "patient-history"}.pdf`);
      } else if (action === "png") {
        await exportElementAsPng(exportRef.current!, `${data.patient.fullName || "patient-history"}.png`);
      }
      router.replace(tenantPath(`/doctor/analytics/my-patients/${id}`));
    };
    void run();
  }, [action, data, id, router, tenantPath]);

  const latestTimeline = useMemo(() => (data?.timeline ?? []).slice(0, 12), [data]);
  const prescriptions = data?.prescriptions ?? [];
  const labOrders = data?.labOrders ?? [];
  const labResults = data?.labResults ?? [];
  const diagnoses = data?.diagnoses ?? [];
  const vitals = data?.vitals ?? [];
  const unresolvedLabs = labOrders.filter((item: any) => item.status !== "completed").length;
  const flaggedResults = labResults.filter((item: any) => {
    const flag = String(item.flag || item.status || "").toLowerCase();
    return flag.includes("critical") || flag.includes("abnormal") || flag.includes("high") || flag.includes("low");
  }).length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card px-5 py-8 text-sm text-muted-foreground shadow-sm">Loading patient history...</div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-5 py-8 text-sm text-destructive shadow-sm">Failed to load patient history.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-3">
          <Link href={tenantPath("/doctor/analytics/my-patients")} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted/40">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-3xl font-semibold text-foreground">{data.patient.fullName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{data.patient.globalPatientId || data.patient.mrn || data.patient.id} · {data.patient.email || data.patient.phone || "No contact details"}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={tenantPath(`/doctor/patients/${id}`)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/40"><UserRound className="h-4 w-4" />Profile</Link>
          <Link href={tenantPath(`/doctor/appointments/new?patientId=${id}`)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/40"><HeartPulse className="h-4 w-4" />Book Visit</Link>
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/40"><Printer className="h-4 w-4" />Print</button>
          <button onClick={() => exportRef.current && exportElementAsPdf(exportRef.current, `${data.patient.fullName || "patient-history"}.pdf`)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/40"><FileText className="h-4 w-4" />PDF</button>
          <button onClick={() => exportRef.current && exportElementAsPng(exportRef.current, `${data.patient.fullName || "patient-history"}.png`)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/40"><Download className="h-4 w-4" />PNG</button>
        </div>
      </div>

      <div ref={exportRef} className="space-y-6">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">History Overview</p>
            <h2 className="mt-2 text-xl font-semibold text-foreground">Longitudinal clinical summary</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Consolidated patient history for consultation review, follow-up decisions, and export.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-background/70 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Latest Activity</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{formatDateTime(data.summary.latestActivityAt)}</p>
              </div>
              <div className="rounded-xl border border-border bg-background/70 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Pending Labs</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{unresolvedLabs}</p>
              </div>
              <div className="rounded-xl border border-border bg-background/70 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Flagged Results</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{flaggedResults}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">Clinical Guidance</h2>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <p className="rounded-lg border border-border bg-background/70 px-4 py-3">
                Review flagged lab findings before renewing medication or closing the encounter.
              </p>
              <p className="rounded-lg border border-border bg-background/70 px-4 py-3">
                Use exported history when escalating to referral, multidisciplinary review, or billing support.
              </p>
              <p className="rounded-lg border border-border bg-background/70 px-4 py-3">
                This view remains the full doctor-facing record for timeline, prescriptions, labs, and vitals.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <KPICard title="Visits" value={data.summary.totalVisits} icon={UserRound} tone="info" />
          <KPICard title="Appointments" value={data.summary.totalAppointments} icon={HeartPulse} tone="primary" />
          <KPICard title="Prescriptions" value={data.summary.totalPrescriptions} icon={Pill} tone="success" />
          <KPICard title="Lab Orders" value={data.summary.totalLabOrders} icon={FlaskConical} tone="warning" />
          <KPICard title="Conditions" value={data.summary.conditions} icon={FileText} tone="destructive" />
          <KPICard title="Allergies" value={data.summary.allergies} icon={ShieldAlert} tone="info" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">Clinical timeline</h2>
            <div className="mt-4 space-y-4">
              {latestTimeline.map((item: any) => (
                <div key={`${item.type}-${item.id}`} className="rounded-xl border border-border p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{item.title}</p>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${typeBadge(item.type)}`}>{item.type.replaceAll("_", " ")}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                      {item.meta?.diagnoses?.length > 0 && (
                        <p className="mt-2 text-xs text-muted-foreground">Diagnoses: {item.meta.diagnoses.join(", ")}</p>
                      )}
                      {item.meta?.notes && <p className="mt-2 text-xs text-muted-foreground">Notes: {String(item.meta.notes)}</p>}
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{formatDateTime(item.date)}</p>
                      {item.status && <p className="capitalize">{item.status}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-base font-semibold text-foreground">Patient summary</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div><dt className="text-muted-foreground">Medical record number</dt><dd className="text-foreground">{data.patient.mrn || "-"}</dd></div>
                <div><dt className="text-muted-foreground">Date of birth</dt><dd className="text-foreground">{formatDate(data.patient.dob)}</dd></div>
                <div><dt className="text-muted-foreground">Gender</dt><dd className="text-foreground">{data.patient.gender || "Not set"}</dd></div>
                <div><dt className="text-muted-foreground">Status</dt><dd className="text-foreground capitalize">{data.patient.status || "active"}</dd></div>
                <div><dt className="text-muted-foreground">Address</dt><dd className="text-foreground">{data.patient.address || "Not set"}</dd></div>
                <div><dt className="text-muted-foreground">Latest activity</dt><dd className="text-foreground">{formatDateTime(data.summary.latestActivityAt)}</dd></div>
                <div><dt className="text-muted-foreground">Active prescriptions</dt><dd className="text-foreground">{data.summary.activePrescriptions}</dd></div>
                <div><dt className="text-muted-foreground">Pending lab orders</dt><dd className="text-foreground">{data.summary.pendingLabOrders}</dd></div>
              </dl>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-base font-semibold text-foreground">Conditions and allergies</h2>
              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <p className="font-medium text-foreground">Conditions</p>
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    {(data.conditions ?? []).length === 0 ? <li>No recorded conditions.</li> : data.conditions.map((item: any) => <li key={item.id}>- {item.condition}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-foreground">Allergies</p>
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    {(data.allergies ?? []).length === 0 ? <li>No recorded allergies.</li> : data.allergies.map((item: any) => <li key={item.id}>- {item.allergy}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-foreground">Medication history</h2>
              <span className="text-xs text-muted-foreground">{prescriptions.length} prescription(s)</span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Medication</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Dose / Schedule</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Prescribed</th>
                  </tr>
                </thead>
                <tbody>
                  {prescriptions.length === 0 ? (
                    <tr className="border-t border-border">
                      <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">No prescriptions recorded yet.</td>
                    </tr>
                  ) : prescriptions.map((item: any) => (
                    <tr key={item.id} className="border-t border-border">
                      <td className="px-3 py-2 text-foreground">{item.medication || "Medication"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{[item.dosage, item.frequency, item.duration].filter(Boolean).join(" · ") || "-"}</td>
                      <td className="px-3 py-2 text-foreground capitalize">{item.status || "active"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{formatDateTime(item.prescribedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-foreground">Lab history</h2>
              <span className="text-xs text-muted-foreground">{labOrders.length} order(s)</span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Test</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Category</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Ordered</th>
                  </tr>
                </thead>
                <tbody>
                  {labOrders.length === 0 ? (
                    <tr className="border-t border-border">
                      <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">No lab orders recorded yet.</td>
                    </tr>
                  ) : labOrders.map((item: any) => (
                    <tr key={item.id} className="border-t border-border">
                      <td className="px-3 py-2 text-foreground">{item.testName || "Lab order"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{item.category || item.testCode || "-"}</td>
                      <td className="px-3 py-2 text-foreground capitalize">{item.status || "pending"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{formatDateTime(item.orderedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-foreground">Lab results</h2>
              <span className="text-xs text-muted-foreground">{labResults.length} result(s)</span>
            </div>
            <div className="mt-4 space-y-3">
              {labResults.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                  No lab results available for this patient.
                </div>
              ) : labResults.map((item: any) => (
                <div key={item.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-medium text-foreground">{item.testName || "Lab result"}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.summary || item.parsed?.summary || "Result available"}</p>
                      {item.parsed?.notes && <p className="mt-2 text-xs text-muted-foreground">Notes: {item.parsed.notes}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</p>
                      <span className="mt-2 inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-foreground">{item.flag || item.status || "normal"}</span>
                    </div>
                  </div>
                  {item.parsed?.values?.length > 0 && (
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/40">
                          <tr>
                            <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Marker</th>
                            <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Value</th>
                            <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Range</th>
                            <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Flag</th>
                          </tr>
                        </thead>
                        <tbody>
                          {item.parsed.values.slice(0, 5).map((value: any, index: number) => (
                            <tr key={`${item.id}-${index}`} className="border-t border-border">
                              <td className="px-2 py-1.5 text-foreground">{value.label || "-"}</td>
                              <td className="px-2 py-1.5 text-muted-foreground">{value.value || "-"}</td>
                              <td className="px-2 py-1.5 text-muted-foreground">{value.referenceRange || "-"}</td>
                              <td className="px-2 py-1.5 text-foreground capitalize">{value.flag || "normal"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-foreground">Diagnoses</h2>
                <span className="text-xs text-muted-foreground">{diagnoses.length} recorded</span>
              </div>
              <div className="mt-4 space-y-2">
                {diagnoses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No diagnoses recorded for this patient.</p>
                ) : diagnoses.map((item: any) => (
                  <div key={item.id} className="rounded-lg border border-border px-3 py-2">
                    <p className="font-medium text-foreground">{item.description || item.code || "Diagnosis"}</p>
                    <p className="text-xs text-muted-foreground">{[item.code, formatDateTime(item.createdAt)].filter(Boolean).join(" · ")}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-foreground">Recorded vitals</h2>
                <span className="text-xs text-muted-foreground">{vitals.length} entry(s)</span>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Blood Pressure</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Heart Rate</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Temperature</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Captured</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vitals.length === 0 ? (
                      <tr className="border-t border-border">
                        <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">No vitals recorded yet.</td>
                      </tr>
                    ) : vitals.map((item: any) => (
                      <tr key={item.id} className="border-t border-border">
                        <td className="px-3 py-2 text-foreground">{item.bloodPressure || "-"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{item.heartRate || "-"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{item.temperature || "-"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{formatDateTime(item.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-base font-semibold text-foreground">Clinical summary</h2>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                This history aggregates visits, diagnoses, vitals, prescriptions, lab orders, and published results for the current doctor-patient relationship.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
