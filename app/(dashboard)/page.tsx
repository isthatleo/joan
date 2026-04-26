"use client";

import { useAuthStore } from "@/stores/auth";
import { PageHeader, StatCard, SectionCard } from "@/components/ui";
import {
  Users, Calendar, Activity, DollarSign, BedDouble, FlaskConical,
  Pill, Receipt, ClipboardList, HeartPulse, Microscope, Stethoscope,
  AlertOctagon, MessageSquare, Baby, ShieldCheck, FileText, Hospital,
  TrendingUp, Building2, History, ServerCog,
} from "lucide-react";
import SuperAdminDashboard from "./super-admin/page";

export default function Dashboard() {
  const { user } = useAuthStore();
  const role = (user?.role as string) || "doctor";

  switch (role) {
    case "super_admin":
      return <SuperAdminDashboard />;

    case "hospital_admin":
      return <HospitalAdminDashboard />;

    case "doctor":
      return <DoctorDashboard />;

    case "nurse":
      return <NurseDashboard />;

    case "lab_technician":
      return <LabTechDashboard />;

    case "pharmacist":
      return <PharmacistDashboard />;

    case "accountant":
      return <AccountantDashboard />;

    case "receptionist":
      return <ReceptionistDashboard />;

    case "patient":
      return <PatientDashboard />;

    case "guardian":
      return <GuardianDashboard />;

    default:
      return <DoctorDashboard />;
  }
}

/* -------------------- HOSPITAL ADMIN -------------------- */
function HospitalAdminDashboard() {
  return (
    <div>
      <PageHeader title="Hospital Control Tower" subtitle="Operational overview of your hospital." />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Patients (Active)" value="1,247" subtitle="In care today" icon={Users} tone="primary" trend={{ value: "+4%", direction: "up" }} />
        <StatCard title="Appointments" value="284" subtitle="Today across staff" icon={Calendar} tone="info" />
        <StatCard title="Bed Occupancy" value="78%" subtitle="47 of 60 beds" icon={BedDouble} tone="warning" />
        <StatCard title="MTD Revenue" value="$487K" subtitle="Operations to date" icon={DollarSign} tone="success" trend={{ value: "+11%", direction: "up" }} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="Staff On Duty" value="142" subtitle="Across all shifts" icon={Stethoscope} tone="info" />
        <StatCard title="Active Lab Orders" value="58" subtitle="In progress" icon={FlaskConical} tone="primary" />
        <StatCard title="Open Insurance Claims" value="34" subtitle="Pending payer" icon={Receipt} tone="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <SectionCard title="Department Activity" description="Today's encounters">
          <div className="space-y-3">
            {[
              { name: "Cardiology", encounters: 38, tone: "primary" as const },
              { name: "Emergency", encounters: 52, tone: "destructive" as const },
              { name: "Surgery", encounters: 14, tone: "info" as const },
              { name: "Pediatrics", encounters: 22, tone: "success" as const },
              { name: "Radiology", encounters: 28, tone: "warning" as const },
            ].map((d, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-${d.tone}-soft text-${d.tone}-soft-foreground`}>
                    <Hospital className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-medium text-foreground">{d.name}</p>
                </div>
                <p className="text-sm font-semibold text-foreground">{d.encounters} encounters</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Operational Alerts" description="Live notifications">
          <div className="space-y-3">
            {[
              { title: "ICU at capacity", time: "10m ago", tone: "destructive" as const },
              { title: "Lab QC failed — Coag", time: "1h ago", tone: "warning" as const },
              { title: "New staff onboarded — Dr. Park", time: "3h ago", tone: "success" as const },
              { title: "Pharmacy stock alert: Insulin Glargine", time: "4h ago", tone: "warning" as const },
              { title: "Insurance claim approved — $42K", time: "5h ago", tone: "success" as const },
            ].map((a, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className={`h-2 w-2 rounded-full bg-${a.tone}`} />
                  <p className="text-sm text-foreground">{a.title}</p>
                </div>
                <span className="text-xs text-muted-foreground">{a.time}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

/* -------------------- DOCTOR -------------------- */
function DoctorDashboard() {
  return (
    <div>
      <PageHeader title="Clinical Command" subtitle="Your patient panel and today's schedule." />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="My Patients" value="247" subtitle="Active panel" icon={Users} tone="primary" />
        <StatCard title="Today's Visits" value="12" subtitle="Scheduled" icon={Calendar} tone="info" />
        <StatCard title="Pending Lab Reviews" value="8" subtitle="Awaiting your sign-off" icon={Microscope} tone="warning" />
        <StatCard title="Open Prescriptions" value="34" subtitle="Active Rx" icon={Pill} tone="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <SectionCard title="Today's Schedule" description="Upcoming appointments">
          <div className="space-y-2">
            {[
              { time: "09:00", patient: "Sarah Johnson", reason: "Hypertension follow-up", tone: "primary" as const },
              { time: "09:30", patient: "Michael Chen", reason: "Annual physical", tone: "info" as const },
              { time: "10:15", patient: "Emma Davis", reason: "Lab review", tone: "info" as const },
              { time: "11:00", patient: "James Wilson", reason: "Post-op care", tone: "success" as const },
              { time: "11:45", patient: "Linda Garcia", reason: "Diabetes mgmt", tone: "warning" as const },
            ].map((v, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-${v.tone}-soft text-${v.tone}-soft-foreground text-xs font-semibold`}>
                    {v.time}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{v.patient}</p>
                    <p className="text-xs text-muted-foreground">{v.reason}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Pending Tasks" description="Action items">
          <div className="space-y-2">
            {[
              { title: "Sign 8 lab results", tone: "warning" as const, icon: Microscope },
              { title: "3 prescription refill requests", tone: "primary" as const, icon: Pill },
              { title: "2 patient messages awaiting reply", tone: "info" as const, icon: MessageSquare },
              { title: "1 referral letter to draft", tone: "info" as const, icon: FileText },
              { title: "Review queue: 5 patients", tone: "primary" as const, icon: ClipboardList },
            ].map((t, i) => {
              const Icon = t.icon;
              return (
                <div key={i} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-${t.tone}-soft text-${t.tone}-soft-foreground`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-medium text-foreground">{t.title}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

/* -------------------- NURSE -------------------- */
function NurseDashboard() {
  return (
    <div>
      <PageHeader title="Care Station" subtitle="Your assigned patients and today's tasks." />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Assigned Patients" value="14" subtitle="On your unit" icon={Users} tone="primary" />
        <StatCard title="Pending Vitals" value="6" subtitle="Due this round" icon={HeartPulse} tone="warning" />
        <StatCard title="Medications Due" value="11" subtitle="Next 2 hours" icon={Pill} tone="info" />
        <StatCard title="Beds Occupied" value="14/15" subtitle="93% capacity" icon={BedDouble} tone="destructive" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <SectionCard title="Care Tasks" description="Next actions">
          <div className="space-y-2">
            {[
              { task: "Bed 12 — Wound care, q4h", due: "14:00", tone: "warning" as const },
              { task: "Bed 7 — IV antibiotics", due: "15:30", tone: "primary" as const },
              { task: "Bed 3 — Vitals check", due: "14:30", tone: "info" as const },
              { task: "Bed 19 — PT session prep", due: "16:00", tone: "primary" as const },
              { task: "Bed 5 — Discharge paperwork", due: "Today", tone: "success" as const },
            ].map((t, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className={`h-2 w-2 rounded-full bg-${t.tone}`} />
                  <p className="text-sm font-medium text-foreground">{t.task}</p>
                </div>
                <span className={`rounded-md bg-${t.tone}-soft px-2 py-0.5 text-xs font-medium text-${t.tone}-soft-foreground`}>{t.due}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Patient Watch List" description="Needs close monitoring">
          <div className="space-y-2">
            {[
              { name: "Bed 3 — J. Doe", note: "BP elevated 158/95", tone: "warning" as const },
              { name: "Bed 9 — M. Chen", note: "Post-op day 1", tone: "info" as const },
              { name: "Bed 14 — S. Johnson", note: "Fall risk — yellow", tone: "warning" as const },
              { name: "Bed 17 — E. Davis", note: "NPO for procedure", tone: "primary" as const },
            ].map((p, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.note}</p>
                </div>
                <span className={`h-2 w-2 rounded-full bg-${p.tone}`} />
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

/* -------------------- LAB TECH -------------------- */
function LabTechDashboard() {
  return (
    <div>
      <PageHeader title="Lab Management" subtitle="Today's orders, results, and instruments." />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Pending Orders" value="42" subtitle="Awaiting processing" icon={FlaskConical} tone="warning" />
        <StatCard title="Completed Today" value="187" subtitle="Tests resulted" icon={Microscope} tone="success" />
        <StatCard title="Avg TAT" value="42m" subtitle="Routine tests" icon={Activity} tone="info" />
        <StatCard title="QC Score" value="98.4%" subtitle="Above threshold" icon={ShieldCheck} tone="primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <SectionCard title="Order Queue" description="Next to process">
          <div className="space-y-2">
            {[
              { order: "LAB-4521 — CBC", urgency: "STAT", tone: "destructive" as const },
              { order: "LAB-4522 — BMP", urgency: "Routine", tone: "info" as const },
              { order: "LAB-4523 — Lipid Panel", urgency: "Routine", tone: "info" as const },
              { order: "LAB-4524 — Coag", urgency: "STAT", tone: "destructive" as const },
              { order: "LAB-4525 — Urinalysis", urgency: "Routine", tone: "primary" as const },
            ].map((o, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <p className="text-sm font-medium text-foreground">{o.order}</p>
                <span className={`rounded-md bg-${o.tone}-soft px-2 py-0.5 text-xs font-medium text-${o.tone}-soft-foreground`}>{o.urgency}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Instrument Status" description="Operational health">
          <div className="space-y-2">
            {[
              { name: "Hematology Analyzer", status: "Operational", tone: "success" as const },
              { name: "Chemistry Panel", status: "Operational", tone: "success" as const },
              { name: "Coag Analyzer", status: "QC Failed", tone: "destructive" as const },
              { name: "Urine Analyzer", status: "Operational", tone: "success" as const },
              { name: "Microbiology", status: "Maintenance", tone: "warning" as const },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <p className="text-sm font-medium text-foreground">{s.name}</p>
                <span className={`rounded-md bg-${s.tone}-soft px-2 py-0.5 text-xs font-medium text-${s.tone}-soft-foreground`}>{s.status}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

/* -------------------- PHARMACIST -------------------- */
function PharmacistDashboard() {
  return (
    <div>
      <PageHeader title="Pharmacy Management" subtitle="Dispensing, inventory, and safety." />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Rx Queue" value="42" subtitle="Awaiting fill" icon={Pill} tone="warning" />
        <StatCard title="Dispensed Today" value="187" subtitle="Completed" icon={ClipboardList} tone="success" />
        <StatCard title="Stock Alerts" value="12" subtitle="Below reorder point" icon={AlertOctagon} tone="destructive" />
        <StatCard title="Interaction Alerts" value="8" subtitle="Need review" icon={ShieldCheck} tone="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <SectionCard title="Dispensing Queue" description="Next to fill">
          <div className="space-y-2">
            {[
              { rx: "Rx #4521 — Amoxicillin 500mg", patient: "J. Doe", tone: "warning" as const },
              { rx: "Rx #4522 — Lisinopril 10mg", patient: "M. Chen", tone: "primary" as const },
              { rx: "Rx #4523 — Metformin 1000mg", patient: "S. Johnson", tone: "primary" as const },
              { rx: "Rx #4524 — Atorvastatin 20mg", patient: "E. Davis", tone: "info" as const },
              { rx: "Rx #4525 — Albuterol Inhaler", patient: "J. Wilson", tone: "warning" as const },
            ].map((r, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{r.rx}</p>
                  <p className="text-xs text-muted-foreground">{r.patient}</p>
                </div>
                <span className={`h-2 w-2 rounded-full bg-${r.tone}`} />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Critical Alerts" description="Stock & interactions">
          <div className="space-y-2">
            {[
              { title: "EpiPen — OUT OF STOCK", tone: "destructive" as const },
              { title: "Insulin Glargine — 3 units left", tone: "destructive" as const },
              { title: "Warfarin + Aspirin interaction (J. Doe)", tone: "destructive" as const },
              { title: "Amoxicillin 500mg — below threshold", tone: "warning" as const },
              { title: "Cephalexin — expires in 14 days", tone: "warning" as const },
            ].map((a, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
                <span className={`h-2 w-2 rounded-full bg-${a.tone}`} />
                <p className="text-sm text-foreground">{a.title}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

/* -------------------- ACCOUNTANT -------------------- */
function AccountantDashboard() {
  return (
    <div>
      <PageHeader title="Financial Management" subtitle="Billing, revenue, and claims." />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Today's Revenue" value="$28,450" subtitle="Processed today" icon={DollarSign} tone="success" />
        <StatCard title="Outstanding" value="$145,230" subtitle="Unpaid invoices" icon={Receipt} tone="warning" />
        <StatCard title="Payments Today" value="$18,900" subtitle="Cash + card + ACH" icon={DollarSign} tone="info" />
        <StatCard title="Open Claims" value="34" subtitle="Pending payer" icon={FileText} tone="primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <SectionCard title="Recent Invoices" description="Last 5 issued">
          <div className="space-y-2">
            {[
              { invoice: "INV-2026-001", patient: "John Doe", amount: "$2,450", status: "paid", tone: "success" as const },
              { invoice: "INV-2026-002", patient: "Jane Smith", amount: "$1,890", status: "pending", tone: "warning" as const },
              { invoice: "INV-2026-003", patient: "Bob Wilson", amount: "$3,200", status: "overdue", tone: "destructive" as const },
              { invoice: "INV-2026-004", patient: "Carol Davis", amount: "$1,560", status: "pending", tone: "warning" as const },
              { invoice: "INV-2026-005", patient: "Dan Brown", amount: "$2,890", status: "paid", tone: "success" as const },
            ].map((inv, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{inv.invoice} — {inv.patient}</p>
                  <p className="text-xs text-muted-foreground">{inv.amount}</p>
                </div>
                <span className={`rounded-md bg-${inv.tone}-soft px-2 py-0.5 text-xs font-medium text-${inv.tone}-soft-foreground`}>{inv.status}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Revenue Tracking" description="Last 3 months">
          <div className="space-y-4">
            {[
              { month: "April 2026", revenue: "$287,450", pct: 96 },
              { month: "March 2026", revenue: "$245,120", pct: 82 },
              { month: "February 2026", revenue: "$312,890", pct: 104 },
            ].map((item, i) => (
              <div key={i}>
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{item.month}</p>
                  <p className="text-sm font-semibold text-foreground">{item.revenue}</p>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, item.pct)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

/* -------------------- RECEPTIONIST -------------------- */
function ReceptionistDashboard() {
  return (
    <div>
      <PageHeader title="Front Desk" subtitle="Today's check-ins, queue, and registrations." />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Today's Appointments" value="142" subtitle="Booked" icon={Calendar} tone="primary" />
        <StatCard title="Checked-in" value="68" subtitle="Currently waiting" icon={ClipboardList} tone="info" />
        <StatCard title="New Registrations" value="18" subtitle="Today" icon={Users} tone="success" />
        <StatCard title="Avg Wait Time" value="18m" subtitle="Across providers" icon={Activity} tone="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <SectionCard title="Currently Waiting" description="In the lobby">
          <div className="space-y-2">
            {[
              { patient: "Sarah Johnson", provider: "Dr. Smith", wait: "22m", tone: "warning" as const },
              { patient: "Michael Chen", provider: "Dr. Lee", wait: "18m", tone: "warning" as const },
              { patient: "Emma Davis", provider: "Dr. Patel", wait: "14m", tone: "info" as const },
              { patient: "James Wilson", provider: "Dr. Kim", wait: "8m", tone: "info" as const },
              { patient: "Linda Garcia", provider: "Dr. Smith", wait: "5m", tone: "success" as const },
            ].map((p, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{p.patient}</p>
                  <p className="text-xs text-muted-foreground">{p.provider}</p>
                </div>
                <span className={`rounded-md bg-${p.tone}-soft px-2 py-0.5 text-xs font-medium text-${p.tone}-soft-foreground`}>{p.wait}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Quick Actions" description="Common front-desk tasks">
          <div className="space-y-2">
            {[
              { title: "Register new patient", tone: "primary" as const, icon: Users },
              { title: "Check in next arrival", tone: "info" as const, icon: ClipboardList },
              { title: "Reschedule appointment", tone: "warning" as const, icon: Calendar },
              { title: "Trigger emergency call", tone: "destructive" as const, icon: AlertOctagon },
              { title: "Print today's schedule", tone: "info" as const, icon: FileText },
            ].map((a, i) => {
              const Icon = a.icon;
              return (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 hover:bg-muted/40 cursor-pointer transition">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-${a.tone}-soft text-${a.tone}-soft-foreground`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-medium text-foreground">{a.title}</p>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

/* -------------------- PATIENT -------------------- */
function PatientDashboard() {
  return (
    <div>
      <PageHeader title="Patient Portal" subtitle="Your health at a glance." />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Next Appointment" value="May 12" subtitle="Annual checkup" icon={Calendar} tone="primary" />
        <StatCard title="Active Prescriptions" value="3" subtitle="Current Rx" icon={Pill} tone="info" />
        <StatCard title="New Lab Results" value="2" subtitle="Awaiting your review" icon={Microscope} tone="warning" />
        <StatCard title="Outstanding Balance" value="$140" subtitle="Due in 14 days" icon={Receipt} tone="destructive" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <SectionCard title="Health Summary" description="Most recent">
          <div className="space-y-2">
            {[
              { label: "Heart Rate", value: "72 bpm", tone: "success" as const },
              { label: "Blood Pressure", value: "118/76", tone: "success" as const },
              { label: "Weight", value: "168 lbs", tone: "info" as const },
              { label: "HbA1c", value: "6.8% (stable)", tone: "warning" as const },
            ].map((v, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <p className="text-sm text-foreground">{v.label}</p>
                <span className={`rounded-md bg-${v.tone}-soft px-2 py-0.5 text-xs font-medium text-${v.tone}-soft-foreground`}>{v.value}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Recent Activity" description="Your records">
          <div className="space-y-2">
            {[
              { title: "Lab results posted — Lipid Panel", time: "2h ago", tone: "warning" as const },
              { title: "Rx refill ready for pickup", time: "Yesterday", tone: "success" as const },
              { title: "Visit summary — Annual physical", time: "2 weeks ago", tone: "info" as const },
              { title: "Message from Dr. Smith", time: "3 weeks ago", tone: "primary" as const },
            ].map((a, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className={`h-2 w-2 rounded-full bg-${a.tone}`} />
                  <p className="text-sm text-foreground">{a.title}</p>
                </div>
                <span className="text-xs text-muted-foreground">{a.time}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

/* -------------------- GUARDIAN -------------------- */
function GuardianDashboard() {
  return (
    <div>
      <PageHeader title="Guardian Portal" subtitle="Manage your dependents' health." />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Children" value="2" subtitle="On your account" icon={Baby} tone="primary" />
        <StatCard title="Upcoming Visits" value="3" subtitle="Next 30 days" icon={Calendar} tone="info" />
        <StatCard title="Vaccinations" value="2/2" subtitle="All up-to-date" icon={ShieldCheck} tone="success" />
        <StatCard title="Active Alerts" value="4" subtitle="Need attention" icon={AlertOctagon} tone="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <SectionCard title="Your Children" description="Profile summary">
          <div className="space-y-2">
            {[
              { name: "Emma Doe — Age 7", note: "Last visit: Mar 14, 2026", tone: "success" as const },
              { name: "Liam Doe — Age 4", note: "Last visit: Apr 02, 2026", tone: "success" as const },
            ].map((c, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
                    <Baby className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.note}</p>
                  </div>
                </div>
                <span className={`h-2 w-2 rounded-full bg-${c.tone}`} />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Upcoming Reminders" description="Next 30 days">
          <div className="space-y-2">
            {[
              { title: "Liam — Pediatric dental visit", date: "May 8, 2026", tone: "info" as const },
              { title: "Emma — Eye exam follow-up", date: "May 14, 2026", tone: "info" as const },
              { title: "Liam — Growth check", date: "May 22, 2026", tone: "primary" as const },
              { title: "Emma — Asthma plan review", date: "May 28, 2026", tone: "warning" as const },
            ].map((r, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <p className="text-sm text-foreground">{r.title}</p>
                <span className={`rounded-md bg-${r.tone}-soft px-2 py-0.5 text-xs font-medium text-${r.tone}-soft-foreground`}>{r.date}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
