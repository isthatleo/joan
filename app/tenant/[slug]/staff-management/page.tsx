"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Users, Search, Plus, UserCheck, Stethoscope, Shield, Loader2 } from "lucide-react";
import Link from "next/link";

const orange = "#F97316";

type StaffMember = {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
};

export default function StaffManagementPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  useEffect(() => {
    if (slug) {
      fetchStaff();
    }
  }, [slug]);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenant/${slug}/staff`);
      if (!res.ok) throw new Error('Failed to fetch staff');
      const data = await res.json();
      setStaff(data);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
      // Keep empty array on error
    } finally {
      setLoading(false);
    }
  };

  const filteredStaff = staff.filter(s => {
    const matchesSearch = s.fullName.toLowerCase().includes(search.toLowerCase()) ||
                         s.email.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? "bg-green-50 text-green-700 border-green-100"
      : "bg-red-50 text-red-700 border-red-100";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Staff Management</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Staff Directory</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage doctors, nurses, and administrative staff.</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90" style={{ backgroundColor: orange }}>
          <Plus className="size-4" />
          Add Staff Member
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Stethoscope className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Doctors</p>
              <p className="text-2xl font-semibold text-foreground">0</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-green-50 dark:bg-green-500/10 flex items-center justify-center text-green-500">
              <UserCheck className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Nurses</p>
              <p className="text-2xl font-semibold text-foreground">0</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Shield className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Admins</p>
              <p className="text-2xl font-semibold text-foreground">0</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-500">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Staff</p>
              <p className="text-2xl font-semibold text-foreground">{staff.length}</p>
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
              placeholder="Search staff by name, email, or department..."
              className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300"
          >
            <option value="all">All Roles</option>
            <option value="doctor">Doctors</option>
            <option value="nurse">Nurses</option>
            <option value="admin">Admins</option>
            <option value="technician">Technicians</option>
          </select>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                <th className="text-left px-5 py-3">Staff Member</th>
                <th className="text-left px-5 py-3">Role</th>
                <th className="text-left px-5 py-3">Department</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Join Date</th>
                <th className="text-left px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="py-16 text-center"><Loader2 className="size-6 text-orange-500 animate-spin mx-auto" /></td></tr>
              ) : filteredStaff.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center">
                  <Users className="size-10 text-muted mx-auto mb-2" />
                  <p className="text-muted-foreground font-medium">No staff members found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try adjusting your search criteria</p>
                </td></tr>
              ) : (
                filteredStaff.map(s => (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground border border-border shrink-0">
                          <Users className="size-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{s.fullName}</p>
                          <p className="text-xs text-muted-foreground">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-blue-50 text-blue-700 border-blue-100">
                        <Users className="size-3" />
                        Staff
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <p className="text-sm text-foreground">General</p>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(s.isActive)}`}>
                        {s.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <p className="text-sm text-foreground">{new Date(s.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 font-semibold text-xs transition-colors border border-transparent hover:border-blue-100">
                          View Profile
                        </button>
                        <button className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-orange-600 hover:bg-orange-50 font-semibold text-xs transition-colors border border-transparent hover:border-orange-100">
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
