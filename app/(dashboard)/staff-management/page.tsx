"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Filter, Upload, UserPlus, ArrowUpDown, MoreHorizontal, Users as UsersIcon, UserCheck, UserX, UserPlus2, PieChart, Check, Loader2, X } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

interface StaffUser {
  id: string;
  email: string;
  fullName?: string | null;
  isActive: boolean;
  role?: string | null;
  createdAt?: string;
  phone?: string | null;
  gender?: string | null;
  avatar?: string | null;
}

const orange = "#F97316";

function Stat({ icon: Icon, label, value, sub }: any) {
  return (
    <div className="flex-1 min-w-[180px] bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3">
      <div className="size-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
        <Icon className="size-5" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-semibold text-slate-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function initials(name?: string | null, email?: string) {
  const src = (name || email || "?").trim();
  const parts = src.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "U";
}

const palette = ["#F97316", "#FB923C", "#FDBA74", "#F59E0B", "#FACC15"];

export default function StaffManagementPage() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [sortKey, setSortKey] = useState<keyof StaffUser>("fullName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [roleFilter, setRoleFilter] = useState("all");

  // Bulk Actions
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkInviteOpen, setBulkInviteOpen] = useState(false);
  const [bulkList, setBulkList] = useState("");
  const [bulkRole, setBulkRole] = useState("doctor");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("limit", "200");
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (statusFilter !== "all") params.set("isActive", statusFilter === "active" ? "true" : "false");
        if (roleFilter !== "all") params.set("role", roleFilter);

        const res = await fetch(`/api/super-admin/users?${params.toString()}`);
        const data = await res.json();
        setUsers(data.users || []);
      } catch (error) {
        console.error("Failed to fetch staff:", error);
      }
      setLoading(false);
    })();
  }, [debouncedSearch, statusFilter, roleFilter]);

  const roles = useMemo(() => Array.from(new Set(users.map(u => u.role).filter(Boolean) as string[])), [users]);

  const stats = useMemo(() => {
    const active = users.filter(u => u.isActive).length;
    return {
      total: users.length,
      active,
      inactive: users.length - active,
      newThis: users.filter(u => {
        if (!u.createdAt) return false;
        const d = new Date(u.createdAt);
        const days = (Date.now() - d.getTime()) / 86400000;
        return days < 30;
      }).length,
      male: users.filter(u => u.gender === "Male").length,
      female: users.filter(u => u.gender === "Female").length,
    };
  }, [users]);

  const filtered = useMemo(() => {
    // Backend handles filtering
    return [...users].sort((a, b) => {
      const av = (a[sortKey] ?? "") as any;
      const bv = (b[sortKey] ?? "") as any;
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [users, sortKey, sortDir]);

  const toggleSelectAll = () => {
    if (selectedUsers.size === filtered.length) setSelectedUsers(new Set());
    else setSelectedUsers(new Set(filtered.map(u => u.id)));
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedUsers);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedUsers(next);
  };

  const startBulkInvite = async () => {
    setInviting(true);
    // Simulation of bulk invite
    await new Promise(r => setTimeout(r, 1500));
    setInviting(false);
    setBulkInviteOpen(false);
    setBulkList("");
  };

  const toggleSort = (k: keyof StaffUser) => {
    if (k === sortKey) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };

  return (
    <div className="min-h-screen bg-slate-50 -m-6 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Staff Directory</h1>
            <p className="text-slate-500 text-sm mt-1">Comprehensive staff records and real-time status.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setBulkInviteOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50"
            >
              <UserPlus2 className="size-4" /> Bulk Invite
            </button>
            <button
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-medium shadow-sm hover:opacity-90"
              style={{ backgroundColor: orange }}
            >
              <UserPlus className="size-4" /> New Staff
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <Stat icon={UsersIcon} label="Total Staff" value={stats.total} />
          <Stat icon={UserCheck} label="Active" value={stats.active} />
          <Stat icon={UserX} label="Inactive" value={stats.inactive} />
          <Stat icon={UserPlus2} label="New This Month" value={stats.newThis} />
          <Stat icon={PieChart} label="Gender Ratio" value={`${stats.male}M / ${stats.female}F`} />
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex-1 min-w-[260px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email or role..."
              className="w-full h-10 pl-10 pr-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 inline-flex items-center gap-2"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm text-slate-700"
          >
            <option value="all">All Roles</option>
            {roles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <button className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 inline-flex items-center gap-2 hover:bg-slate-50">
            <Filter className="size-4" /> Filters
          </button>
          <button className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 inline-flex items-center gap-2 hover:bg-slate-50">
            <Upload className="size-4" /> Import
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-slate-500 text-xs uppercase tracking-wide">
                <th className="text-left p-4 w-12"><input type="checkbox" checked={selectedUsers.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} className="rounded border-slate-300" /></th>
                <th className="text-left p-4">Photo</th>
                <th className="text-left p-4 cursor-pointer" onClick={() => toggleSort("id")}><span className="inline-flex items-center gap-1">Staff ID <ArrowUpDown className="size-3" /></span></th>
                <th className="text-left p-4 cursor-pointer" onClick={() => toggleSort("fullName")}><span className="inline-flex items-center gap-1">Full Name <ArrowUpDown className="size-3" /></span></th>
                <th className="text-left p-4">Role</th>
                <th className="text-left p-4 cursor-pointer" onClick={() => toggleSort("email")}><span className="inline-flex items-center gap-1">Email <ArrowUpDown className="size-3" /></span></th>
                <th className="text-left p-4">Phone</th>
                <th className="text-left p-4 cursor-pointer" onClick={() => toggleSort("createdAt")}><span className="inline-flex items-center gap-1">Joined <ArrowUpDown className="size-3" /></span></th>
                <th className="text-left p-4">Status</th>
                <th className="p-4 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={10} className="p-12 text-center text-slate-400">Loading staff...</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={10} className="p-12 text-center text-slate-400">No staff found.</td></tr>
              )}
              {filtered.map((u, i) => {
                const color = palette[i % palette.length];
                const rowKey = u.id || `staff-${i}`;
                return (
                  <tr key={rowKey} className={`border-b border-slate-100 hover:bg-slate-50/60 transition-colors ${selectedUsers.has(u.id) ? "bg-orange-50/30" : ""}`}>
                    <td className="p-4"><input type="checkbox" checked={selectedUsers.has(u.id)} onChange={() => toggleSelect(u.id)} className="rounded border-slate-300" /></td>
                    <td className="p-4">
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.fullName || ""} className="size-9 rounded-full object-cover" />
                      ) : (
                        <div className="size-9 rounded-full text-white font-medium text-xs flex items-center justify-center" style={{ backgroundColor: color }}>
                          {initials(u.fullName, u.email)}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-slate-500 font-mono text-xs">S-{u.id.slice(0, 4).toUpperCase()}</td>
                    <td className="p-4 font-medium text-slate-900">{u.fullName || "—"}</td>
                    <td className="p-4 text-slate-600">{u.role || "Staff"}</td>
                    <td className="p-4 text-slate-600">{u.email}</td>
                    <td className="p-4 text-slate-600">{u.phone || "—"}</td>
                    <td className="p-4 text-slate-600">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${u.isActive ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500"}`}>
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400"><MoreHorizontal className="size-4" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Invite Modal */}
      {bulkInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Bulk Invite Staff</h2>
              <button onClick={() => setBulkInviteOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="size-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Email Addresses (one per line)</label>
                <textarea
                  value={bulkList}
                  onChange={e => setBulkList(e.target.value)}
                  placeholder="doctor.smith@hospital.com&#10;nurse.jane@hospital.com"
                  className="w-full h-32 p-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Assign Role</label>
                <select
                  value={bulkRole}
                  onChange={e => setBulkRole(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm"
                >
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="accountant">Accountant</option>
                  <option value="pharmacist">Pharmacist</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
              <button onClick={() => setBulkInviteOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">Cancel</button>
              <button
                onClick={startBulkInvite}
                disabled={!bulkList.trim() || inviting}
                className="px-4 py-2 rounded-lg text-white text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: orange }}
              >
                {inviting ? <><Loader2 className="size-4 animate-spin" /> Sending...</> : <><Check className="size-4" /> Send Invites</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
