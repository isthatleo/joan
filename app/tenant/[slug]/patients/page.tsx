"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Users, Search, Plus, UserPlus, Eye, Edit, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";

const orange = "#F97316";

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dob: string;
  gender: string;
  address: string;
  medicalRecordNumber?: string;
  createdAt: string;
};

export default function PatientsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (slug) {
      fetchPatients();
    }
  }, [slug]);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenant/${slug}/patients`);
      if (!res.ok) throw new Error('Failed to fetch patients');
      const data = await res.json();
      setPatients(data);
    } catch (error) {
      console.error('Failed to fetch patients:', error);
      // Keep empty array on error
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(p =>
    p.firstName.toLowerCase().includes(search.toLowerCase()) ||
    p.lastName.toLowerCase().includes(search.toLowerCase()) ||
    (p.medicalRecordNumber && p.medicalRecordNumber.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Patient Management</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Patients</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage patient records and information.</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90" style={{ backgroundColor: orange }}>
          <UserPlus className="size-4" />
          Add Patient
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Patients</p>
              <p className="text-2xl font-semibold text-foreground">{patients.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-green-50 dark:bg-green-500/10 flex items-center justify-center text-green-500">
              <UserPlus className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">New This Month</p>
              <p className="text-2xl font-semibold text-foreground">2</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-500">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Active Patients</p>
              <p className="text-2xl font-semibold text-foreground">{patients.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search patients by name, email, or MRN..."
              className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            />
          </div>
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                <th className="text-left px-5 py-3">Patient</th>
                <th className="text-left px-5 py-3">Contact</th>
                <th className="text-left px-5 py-3">MRN</th>
                <th className="text-left px-5 py-3">Date of Birth</th>
                <th className="text-left px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={5} className="py-16 text-center"><Loader2 className="size-6 text-orange-500 animate-spin mx-auto" /></td></tr>
              ) : filteredPatients.length === 0 ? (
                <tr><td colSpan={5} className="py-16 text-center">
                  <Users className="size-10 text-muted mx-auto mb-2" />
                  <p className="text-muted-foreground font-medium">No patients found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try adjusting your search criteria</p>
                </td></tr>
              ) : (
                filteredPatients.map(p => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground border border-border shrink-0">
                          <Users className="size-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{p.firstName} {p.lastName}</p>
                          <p className="text-xs text-muted-foreground">{p.gender}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div>
                        <p className="text-sm text-foreground">{p.email}</p>
                        <p className="text-xs text-muted-foreground">{p.phone}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 rounded bg-muted border border-border text-foreground font-mono text-[10px]">{p.medicalRecordNumber}</span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <p className="text-sm text-foreground">{new Date(p.dob).toLocaleDateString()}</p>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 font-semibold text-xs transition-colors border border-transparent hover:border-blue-100">
                          <Eye className="size-3" />
                          View
                        </button>
                        <button className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-orange-600 hover:bg-orange-50 font-semibold text-xs transition-colors border border-transparent hover:border-orange-100">
                          <Edit className="size-3" />
                          Edit
                        </button>
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
