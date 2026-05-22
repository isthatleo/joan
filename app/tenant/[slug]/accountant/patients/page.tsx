"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Users, Search, Phone, Mail, MoreHorizontal, Eye, DollarSign,
  TrendingUp, AlertCircle, CheckCircle, Loader2, Filter, Download,
  ArrowUpDown, Calendar, FileText
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useTenantPath } from "@/hooks/useTenantPath";

const orange = "#F97316";

interface PatientFinancial {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  mrn?: string;
  totalInvoices: number;
  totalOutstanding: number;
  totalPaid: number;
  lastPaymentDate?: string;
  lastInvoiceDate?: string;
  status: "active" | "inactive";
}

export default function ViewPatientsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const tenantPath = useTenantPath();

  const [patients, setPatients] = useState<PatientFinancial[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("full_name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);

  useEffect(() => {
    fetchPatients();
  }, [slug]);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenant/${slug}/accountant/patients`);
      if (res.ok) {
        const data = await res.json();
        setPatients(data || []);
      } else {
        toast.error("Failed to load patients");
      }
    } catch (error) {
      console.error("Failed to fetch patients:", error);
      toast.error("Failed to load patients");
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients
    .filter((patient) => {
      const matchesSearch =
        patient.full_name.toLowerCase().includes(search.toLowerCase()) ||
        patient.email.toLowerCase().includes(search.toLowerCase()) ||
        patient.mrn?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || patient.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "totalOutstanding":
          aValue = a.totalOutstanding;
          bValue = b.totalOutstanding;
          break;
        case "totalPaid":
          aValue = a.totalPaid;
          bValue = b.totalPaid;
          break;
        case "totalInvoices":
          aValue = a.totalInvoices;
          bValue = b.totalInvoices;
          break;
        case "lastPaymentDate":
          aValue = a.lastPaymentDate ? new Date(a.lastPaymentDate).getTime() : 0;
          bValue = b.lastPaymentDate ? new Date(b.lastPaymentDate).getTime() : 0;
          break;
        default:
          aValue = a.full_name;
          bValue = b.full_name;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const totalStats = {
    totalPatients: patients.length,
    activePatients: patients.filter((p) => p.status === "active").length,
    totalOutstanding: patients.reduce((sum, p) => sum + p.totalOutstanding, 0),
    totalRevenue: patients.reduce((sum, p) => sum + p.totalPaid, 0),
  };

  const exportPatients = async (format: "csv" | "pdf") => {
    try {
      const res = await fetch(
        `/api/tenant/${slug}/accountant/patients/export?format=${format}&ids=${selectedPatients.join(",")}`
      );
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `patients.${format}`;
        a.click();
        toast.success(`Exported ${selectedPatients.length || "all"} patients`);
      }
    } catch (error) {
      toast.error("Failed to export patients");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Accountant Dashboard
          </p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Patient Billing</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View patient accounts and financial history.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportPatients("csv")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all"
          >
            <Download className="size-4" />
            Export
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Patients</p>
              <p className="text-2xl font-bold text-foreground">
                {totalStats.totalPatients}
              </p>
            </div>
            <div className="size-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Users className="size-6" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Active Patients</p>
              <p className="text-2xl font-bold text-foreground">
                {totalStats.activePatients}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {totalStats.totalPatients > 0
                  ? Math.round(
                      (totalStats.activePatients / totalStats.totalPatients) * 100
                    )
                  : 0}
                % of total
              </p>
            </div>
            <div className="size-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
              <CheckCircle className="size-6" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Outstanding Balance</p>
              <p className="text-2xl font-bold text-foreground">
                ${totalStats.totalOutstanding.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <p className="text-xs text-red-600 mt-1">To be collected</p>
            </div>
            <div className="size-12 rounded-full bg-red-50 flex items-center justify-center text-red-600">
              <AlertCircle className="size-6" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Revenue</p>
              <p className="text-2xl font-bold text-foreground">
                ${totalStats.totalRevenue.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <p className="text-xs text-green-600 mt-1">Collected</p>
            </div>
            <div className="size-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
              <TrendingUp className="size-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or MRN..."
              className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300"
            >
              <option value="full_name">Sort by Name</option>
              <option value="totalOutstanding">Outstanding Balance</option>
              <option value="totalPaid">Amount Paid</option>
              <option value="totalInvoices">Number of Invoices</option>
              <option value="lastPaymentDate">Last Payment</option>
            </select>

            <button
              onClick={() =>
                setSortOrder(sortOrder === "asc" ? "desc" : "asc")
              }
              className="h-10 px-3 rounded-lg border border-border bg-background hover:bg-muted"
            >
              <ArrowUpDown className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={
                      selectedPatients.length === filteredPatients.length &&
                      filteredPatients.length > 0
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPatients(filteredPatients.map((p) => p.id));
                      } else {
                        setSelectedPatients([]);
                      }
                    }}
                    className="rounded border-border"
                  />
                </th>
                <th className="text-left px-4 py-3">Patient</th>
                <th className="text-left px-4 py-3">Contact</th>
                <th className="text-left px-4 py-3">Invoices</th>
                <th className="text-left px-4 py-3">Paid</th>
                <th className="text-left px-4 py-3">Outstanding</th>
                <th className="text-left px-4 py-3">Last Activity</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <Loader2 className="size-6 text-orange-500 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <Users className="size-10 text-muted mx-auto mb-2" />
                    <p className="text-muted-foreground font-medium">No patients found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Try adjusting your filters
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => (
                  <tr
                    key={patient.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedPatients.includes(patient.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPatients([
                              ...selectedPatients,
                              patient.id,
                            ]);
                          } else {
                            setSelectedPatients(
                              selectedPatients.filter(
                                (id) => id !== patient.id
                              )
                            );
                          }
                        }}
                        className="rounded border-border"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-foreground">
                          {patient.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {patient.mrn ? `MRN: ${patient.mrn}` : "No MRN"}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {patient.email && (
                          <div className="flex items-center gap-1 text-xs text-foreground">
                            <Mail className="size-3 text-muted-foreground" />
                            {patient.email}
                          </div>
                        )}
                        {patient.phone && (
                          <div className="flex items-center gap-1 text-xs text-foreground">
                            <Phone className="size-3 text-muted-foreground" />
                            {patient.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <FileText className="size-3" />
                        {patient.totalInvoices}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-foreground">
                          ${patient.totalPaid.toFixed(2)}
                        </p>
                        {patient.lastPaymentDate && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(
                              patient.lastPaymentDate
                            ).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            patient.totalOutstanding > 0
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-green-50 text-green-700 border-green-200"
                          }`}
                        >
                          {patient.totalOutstanding > 0 ? (
                            <AlertCircle className="size-3" />
                          ) : (
                            <CheckCircle className="size-3" />
                          )}
                          ${patient.totalOutstanding.toFixed(2)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-foreground">
                        {patient.lastInvoiceDate
                          ? new Date(
                              patient.lastInvoiceDate
                            ).toLocaleDateString()
                          : "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          href={tenantPath(`/accountant/patients/${patient.id}`)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 font-medium text-xs transition-colors"
                        >
                          <Eye className="size-3" />
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

