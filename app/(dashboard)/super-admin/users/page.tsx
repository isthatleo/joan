"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Download, RotateCcw, ArrowUpDown, MoreHorizontal, Users as UsersIcon, UserCheck, UserX, UserPlus2, Shield } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

interface SAUser {
  id: string;
  email: string;
  fullName?: string | null;
  isActive: boolean;
  avatar?: string | null;
  role?: string | null;
  createdAt?: string;
}

const orange = "#F97316";
const palette = ["#F97316", "#FB923C", "#FDBA74", "#F59E0B", "#FACC15"];

function initials(name?: string | null, email?: string) {
  const src = (name || email || "?").trim();
  const parts = src.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "U";
}

function Stat({ icon: Icon, label, value }: any) {
  return (
    <div className="flex-1 min-w-[180px] bg-card border border-border rounded-xl p-4 flex items-start gap-3">
      <div className="size-10 rounded-full bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0">
        <Icon className="size-5" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-semibold text-foreground mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState<SAUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [sortKey, setSortKey] = useState<keyof SAUser>("fullName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("limit", "500");
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (roleFilter !== "all") params.set("role", roleFilter);
        if (statusFilter !== "all") params.set("isActive", statusFilter);

        const res = await fetch(`/api/super-admin/users?${params.toString()}`);
        const data = await res.json();
        setUsers(data.users || []);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
      setLoading(false);
    })();
  }, [debouncedSearch, roleFilter, statusFilter]);

  const roles = useMemo(() => {
    // We might need to fetch all available roles separately for the filter if the current users list is filtered
    // For now, let's keep it based on the loaded users or a hardcoded list if needed
    return Array.from(new Set(users.map(u => u.role).filter(Boolean) as string[]));
  }, [users]);

  const stats = useMemo(() => {
    const active = users.filter(u => u.isActive).length;
    return {
      total: users.length,
      active,
      inactive: users.length - active,
      newThis: users.filter(u => u.createdAt && (Date.now() - new Date(u.createdAt).getTime()) / 86400000 < 30).length,
      roles: roles.length,
    };
  }, [users, roles]);

  const filtered = useMemo(() => {
    // Backend already filters by search, role and status. 
    // We only need to sort here if we want client-side sorting on the fetched 500 records.
    return [...users].sort((a, b) => {
      const av = String(a[sortKey] ?? "");
      const bv = String(b[sortKey] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [users, sortKey, sortDir]);

  const toggleSort = (k: keyof SAUser) => {
    if (k === sortKey) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };

  const resetFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
  };

  const exportCsv = () => {
    const rows = [
      ["Full Name", "Email", "Role", "Status", "Joined"],
      ...filtered.map((u) => [
        u.fullName || "",
        u.email,
        u.role || "",
        u.isActive ? "Active" : "Inactive",
        u.createdAt ? new Date(u.createdAt).toISOString() : "",
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `super-admin-users-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="min-h-screen bg-subtle -m-6 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">User Directory</h1>
            <p className="text-muted-foreground text-sm mt-1">All platform users across every tenant.</p>
          </div>
          <button onClick={exportCsv} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-medium shadow-sm hover:opacity-90" style={{ backgroundColor: orange }}>
            <Download className="size-4" /> Export Users
          </button>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <Stat icon={UsersIcon} label="Total Users" value={stats.total} />
          <Stat icon={UserCheck} label="Active" value={stats.active} />
          <Stat icon={UserX} label="Inactive" value={stats.inactive} />
          <Stat icon={UserPlus2} label="New This Month" value={stats.newThis} />
          <Stat icon={Shield} label="Roles" value={stats.roles} />
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex-1 min-w-[260px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email or role..."
              className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/20"
            />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="h-10 px-4 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300">
            <option value="all">All Roles</option>
            {roles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-10 px-4 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300">
            <option value="all">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <button onClick={resetFilters} className="h-10 px-4 rounded-lg border border-border bg-background text-sm text-muted-foreground inline-flex items-center gap-2 hover:bg-muted transition-colors">
            <RotateCcw className="size-4" /> Reset
          </button>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr className="text-muted-foreground text-xs uppercase tracking-wide">
                <th className="text-left p-4 w-12"><input type="checkbox" className="rounded border-border bg-background" /></th>
                <th className="text-left p-4">Photo</th>
                <th className="text-left p-4 cursor-pointer" onClick={() => toggleSort("fullName")}><span className="inline-flex items-center gap-1">Full Name <ArrowUpDown className="size-3" /></span></th>
                <th className="text-left p-4 cursor-pointer" onClick={() => toggleSort("email")}><span className="inline-flex items-center gap-1">Email <ArrowUpDown className="size-3" /></span></th>
                <th className="text-left p-4">Role</th>
                <th className="text-left p-4 cursor-pointer" onClick={() => toggleSort("createdAt")}><span className="inline-flex items-center gap-1">Joined <ArrowUpDown className="size-3" /></span></th>
                <th className="text-left p-4">Status</th>
                <th className="p-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && <tr><td colSpan={8} className="p-12 text-center text-muted-foreground">Loading users...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={8} className="p-12 text-center text-muted-foreground">No users found.</td></tr>}
              {filtered.map((u, i) => {
                const color = palette[i % palette.length];
                // Use a composite key in case there are still unexpected duplicates from other sources, 
                // or if u.id is missing (though it shouldn't be).
                const rowKey = u.id || `user-${i}`;
                return (
                  <tr key={rowKey} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4"><input type="checkbox" className="rounded border-border bg-background" /></td>
                    <td className="p-4">
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.fullName || ""} className="size-9 rounded-full object-cover" />
                      ) : (
                        <div className="size-9 rounded-full text-white font-medium text-xs flex items-center justify-center" style={{ backgroundColor: color }}>
                          {initials(u.fullName, u.email)}
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-medium text-foreground">{u.fullName || "—"}</td>
                    <td className="p-4 text-muted-foreground">{u.email}</td>
                    <td className="p-4 text-muted-foreground">{u.role || "—"}</td>
                    <td className="p-4 text-muted-foreground">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${u.isActive ? "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400" : "bg-muted text-muted-foreground"}`}>
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground"><MoreHorizontal className="size-4" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
