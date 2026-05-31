"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, Check, Edit, Eye, Filter, Key, Loader2, Plus, RefreshCw, Search, Shield, ShieldCheck, Trash2, UserPlus, Users, X } from "lucide-react";
import { useTenantPath } from "@/hooks/useTenantPath";

const orange = "#F97316";

type Permission = { id: string; key: string; resource: string; action: string; description?: string };
type Role = { id: string; name: string; label: string; description: string; userCount: number; permissions: Permission[]; permissionIds: string[]; createdAt: string; isSystem: boolean };
type AccessUser = { id: string; fullName: string; email: string; phone?: string; avatar?: string | null; role: string; roleLabel: string; roles: string[]; department?: string; isActive: boolean; forcePasswordChange: boolean; lastActive: string };
type MatrixRow = { resource: string; permissions: Permission[]; actions: Record<string, boolean>; assignedRoles: string[] };
type Stats = { totalRoles: number; systemRoles: number; customRoles: number; totalPermissions: number; resources: number; users: number; activeUsers: number };

const EMPTY_STATS: Stats = { totalRoles: 0, systemRoles: 0, customRoles: 0, totalPermissions: 0, resources: 0, users: 0, activeUsers: 0 };

export default function RolesPermissionsPage() {
  const params = useParams();
  const slug = String(params?.slug || "");
  const tenantPath = useTenantPath();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [permissionMatrix, setPermissionMatrix] = useState<MatrixRow[]>([]);
  const [users, setUsers] = useState<AccessUser[]>([]);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<"roles" | "permissions" | "users">("roles");
  const [search, setSearch] = useState("");
  const [resourceFilter, setResourceFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const loadAccessControl = async (initial = false) => {
    if (!slug) return;
    if (initial) setLoading(true);
    setRefreshing(true);
    setError(null);
    try {
      const response = await fetch(`/api/tenant/${slug}/roles`, { credentials: "include", cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Failed to load roles and permissions");
      setRoles(Array.isArray(data?.roles) ? data.roles : []);
      setPermissions(Array.isArray(data?.permissions) ? data.permissions : []);
      setPermissionMatrix(Array.isArray(data?.permissionMatrix) ? data.permissionMatrix : []);
      setUsers(Array.isArray(data?.users) ? data.users : []);
      setStats(data?.stats || EMPTY_STATS);
    } catch (loadError: any) {
      setError(loadError?.message || "Failed to load roles and permissions");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadAccessControl(true);
  }, [slug]);

  const resources = useMemo(() => Array.from(new Set(permissions.map((permission) => permission.resource))).sort(), [permissions]);
  const query = search.trim().toLowerCase();
  const filteredRoles = roles.filter((role) => !query || [role.label, role.name, role.description].some((value) => value.toLowerCase().includes(query)));
  const filteredMatrix = permissionMatrix.filter((row) => {
    const matchesSearch = !query || [row.resource, ...row.permissions.map((permission) => permission.key)].some((value) => value.toLowerCase().includes(query));
    return matchesSearch && (resourceFilter === "all" || row.resource === resourceFilter);
  });
  const filteredUsers = users.filter((user) => !query || [user.fullName, user.email, user.roleLabel, user.department || ""].some((value) => value.toLowerCase().includes(query)));

  const togglePermission = (permissionId: string) => {
    setSelectedPermissionIds((current) => current.includes(permissionId) ? current.filter((id) => id !== permissionId) : [...current, permissionId]);
  };

  const openCreateRole = () => {
    setEditingRole(null);
    setRoleName("");
    setRoleDescription("");
    setSelectedPermissionIds([]);
    setShowCreateRole(true);
  };

  const openEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleName(role.label);
    setRoleDescription(role.description);
    setSelectedPermissionIds(role.permissionIds || role.permissions.map((permission) => permission.id));
    setShowCreateRole(true);
  };

  const saveRole = async () => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(editingRole ? `/api/tenant/${slug}/roles/${editingRole.id}` : `/api/tenant/${slug}/roles`, {
        method: editingRole ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: roleName, description: roleDescription, permissionIds: selectedPermissionIds }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Failed to save role");
      setSuccess(editingRole ? "Role permissions updated." : "Role created.");
      setShowCreateRole(false);
      await loadAccessControl();
    } catch (saveError: any) {
      setError(saveError?.message || "Failed to save role");
    } finally {
      setBusy(false);
    }
  };

  const deleteRole = async (role: Role) => {
    if (!window.confirm(`Delete ${role.label}? This only works when no users are assigned to the role.`)) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/tenant/${slug}/roles/${role.id}`, { method: "DELETE", credentials: "include" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Failed to delete role");
      setSuccess("Role deleted.");
      await loadAccessControl();
    } catch (deleteError: any) {
      setError(deleteError?.message || "Failed to delete role");
    } finally {
      setBusy(false);
    }
  };

  const updateUserRole = async (userId: string, roleId: string) => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/tenant/${slug}/roles/users/${userId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Failed to update user role");
      setSuccess("User role updated.");
      await loadAccessControl();
    } catch (updateError: any) {
      setError(updateError?.message || "Failed to update user role");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Access Control</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">Roles & Permissions</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage tenant roles, permission scopes, and user access for the hospital dashboard.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => loadAccessControl()} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-60"><RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh</button>
          <button onClick={openCreateRole} className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90" style={{ backgroundColor: orange }}><Plus className="size-4" /> Add Role</button>
        </div>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{error}</div> : null}
      {success ? <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-200">{success}</div> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat title="Roles" value={stats.totalRoles} subtitle={`${stats.customRoles} custom roles`} icon={<ShieldCheck className="size-5" />} />
        <Stat title="Permissions" value={stats.totalPermissions} subtitle={`${stats.resources} resources protected`} icon={<Key className="size-5" />} />
        <Stat title="Users" value={stats.users} subtitle={`${stats.activeUsers} active users`} icon={<Users className="size-5" />} />
        <Stat title="System Roles" value={stats.systemRoles} subtitle="Protected default access profiles" icon={<Shield className="size-5" />} />
      </div>

      <div className="border-b border-border">
        <nav className="flex gap-8 overflow-x-auto">
          {[
            { id: "roles", label: "Roles", icon: ShieldCheck },
            { id: "permissions", label: "Permissions", icon: Key },
            { id: "users", label: "User Management", icon: Users },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)} className={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors ${activeTab === tab.id ? "border-orange-500 text-orange-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <tab.icon className="size-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input placeholder="Search roles, permissions, users..." value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-4 text-sm focus:border-orange-300 focus:outline-none" />
        </div>
        <select value={resourceFilter} onChange={(event) => setResourceFilter(event.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm focus:border-orange-300 focus:outline-none">
          <option value="all">All resources</option>
          {resources.map((resource) => <option key={resource} value={resource}>{resource}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="size-6 animate-spin text-orange-500" /></div>
      ) : (
        <>
          {activeTab === "roles" ? <RolesTab roles={filteredRoles} onEdit={openEditRole} onDelete={deleteRole} busy={busy} /> : null}
          {activeTab === "permissions" ? <PermissionsTab matrix={filteredMatrix} roles={roles} onEditRole={openEditRole} /> : null}
          {activeTab === "users" ? <UsersTab users={filteredUsers} roles={roles} tenantPath={tenantPath} onRoleChange={updateUserRole} busy={busy} /> : null}
        </>
      )}

      {showCreateRole ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">{editingRole ? `Edit ${editingRole.label}` : "Add Role"}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{editingRole ? "Update the permission scope for this role." : "Create a custom tenant role and assign permission scopes."}</p>
              </div>
              <button onClick={() => setShowCreateRole(false)} className="rounded-lg border border-border p-2 hover:bg-muted"><X className="size-4" /></button>
            </div>
            {!editingRole ? (
              <div className="mb-5 grid gap-4 md:grid-cols-2">
                <label className="space-y-1"><span className="text-sm font-medium">Role name</span><input value={roleName} onChange={(event) => setRoleName(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
                <label className="space-y-1"><span className="text-sm font-medium">Description</span><input value={roleDescription} onChange={(event) => setRoleDescription(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
              </div>
            ) : null}
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {permissions.map((permission) => (
                <button key={permission.id} type="button" onClick={() => togglePermission(permission.id)} className={`rounded-xl border p-3 text-left transition-colors ${selectedPermissionIds.includes(permission.id) ? "border-orange-300 bg-orange-50 text-orange-900" : "border-border hover:bg-muted/50"}`}>
                  <p className="text-sm font-semibold">{permission.key}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{permission.description || `${permission.action} ${permission.resource}`}</p>
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-2 border-t border-border pt-5">
              <button onClick={() => setShowCreateRole(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">Cancel</button>
              <button onClick={saveRole} disabled={busy || (!editingRole && !roleName.trim())} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy ? <Loader2 className="size-4 animate-spin" /> : null} Save Role</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ title, value, subtitle, icon }: { title: string; value: string | number; subtitle: string; icon: React.ReactNode }) {
  return <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-full bg-orange-50 text-orange-600">{icon}</div><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p><p className="text-2xl font-semibold text-foreground">{value}</p><p className="text-xs text-muted-foreground">{subtitle}</p></div></div></div>;
}

function RolesTab({ roles, onEdit, onDelete, busy }: { roles: Role[]; onEdit: (role: Role) => void; onDelete: (role: Role) => void; busy: boolean }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((role) => (
          <div key={role.id} className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><ShieldCheck className="size-5" /></div><div><h3 className="font-semibold text-foreground">{role.label}</h3><p className="text-xs text-muted-foreground">{role.userCount} users, {role.permissions.length} permissions</p></div></div>
              <div className="flex gap-1">
                <button onClick={() => onEdit(role)} disabled={busy} className="flex size-8 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-50"><Edit className="size-4" /></button>
                {!role.isSystem ? <button onClick={() => onDelete(role)} disabled={busy} className="flex size-8 items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-600 disabled:opacity-50"><Trash2 className="size-4" /></button> : null}
              </div>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">{role.description}</p>
            <div className="flex flex-wrap gap-1">{role.permissions.slice(0, 6).map((permission, index) => <span key={`${role.id}-${permission.id}-${index}`} className="rounded-md bg-muted px-2 py-1 text-xs font-medium">{permission.key}</span>)}{role.permissions.length > 6 ? <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">+{role.permissions.length - 6} more</span> : null}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200"><div className="flex gap-3"><AlertTriangle className="mt-0.5 size-5" /><p className="text-sm">System roles are protected from deletion. Permission scopes can still be reviewed and updated by hospital admins with role-management access.</p></div></div>
    </div>
  );
}

function PermissionsTab({ matrix, roles, onEditRole }: { matrix: MatrixRow[]; roles: Role[]; onEditRole: (role: Role) => void }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border p-6"><h3 className="flex items-center gap-2 font-semibold text-foreground"><Key className="size-5 text-orange-500" /> Permission Matrix</h3><p className="mt-1 text-xs text-muted-foreground">Resource actions and the roles currently carrying each permission scope.</p></div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-6 py-3 text-left">Resource</th><th className="px-6 py-3 text-center">Create</th><th className="px-6 py-3 text-center">Read</th><th className="px-6 py-3 text-center">Update</th><th className="px-6 py-3 text-center">Delete</th><th className="px-6 py-3 text-left">Assigned Roles</th><th className="px-6 py-3 text-center">Actions</th></tr></thead>
          <tbody className="divide-y divide-border">
            {matrix.map((row) => (
              <tr key={row.resource} className="hover:bg-muted/40"><td className="px-6 py-4 font-medium capitalize">{row.resource}</td>{["create", "read", "update", "delete"].map((action) => <td key={action} className="px-6 py-4 text-center">{row.actions[action] ? <span className="inline-flex size-8 items-center justify-center rounded-lg bg-green-50 text-green-600"><Check className="size-4" /></span> : <span className="inline-flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground"><X className="size-4" /></span>}</td>)}<td className="px-6 py-4"><div className="flex flex-wrap gap-1">{row.assignedRoles.slice(0, 4).map((role) => <span key={role} className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600">{role}</span>)}{row.assignedRoles.length > 4 ? <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">+{row.assignedRoles.length - 4}</span> : null}</div></td><td className="px-6 py-4 text-center"><button onClick={() => roles[0] && onEditRole(roles[0])} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"><Edit className="size-3" /> Manage</button></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsersTab({ users, roles, tenantPath, onRoleChange, busy }: { users: AccessUser[]; roles: Role[]; tenantPath: (path: string) => string; onRoleChange: (userId: string, roleId: string) => void; busy: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-6"><div><h3 className="font-semibold text-foreground">User Management</h3><p className="text-xs text-muted-foreground">Review users, open access details, and change tenant role assignment.</p></div><Link href={tenantPath("/staff-management/new")} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: orange }}><UserPlus className="size-4" /> Add Staff User</Link></div>
      <div className="divide-y divide-border">
        {users.map((user) => {
          const selectedRole = roles.find((role) => user.roles.includes(role.name) || user.role === role.name)?.id || "";
          return (
            <div key={user.id} className="grid gap-4 p-6 lg:grid-cols-[1fr_220px_180px_120px] lg:items-center">
              <div className="flex items-center gap-4">
                <UserAvatar user={user} />
                <div><p className="font-semibold text-foreground">{user.fullName}</p><p className="text-sm text-muted-foreground">{user.email}</p><p className="mt-1 text-xs text-muted-foreground">{user.department || "No department"} {user.forcePasswordChange ? " / password change required" : ""}</p></div>
              </div>
              <select value={selectedRole} onChange={(event) => onRoleChange(user.id, event.target.value)} disabled={busy} className="h-10 rounded-lg border border-border bg-background px-3 text-sm disabled:opacity-60"><option value="">Unassigned</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}</select>
              <div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${user.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{user.isActive ? "Active" : "Inactive"}</span><p className="mt-1 text-xs text-muted-foreground">Last updated {formatDate(user.lastActive)}</p></div>
              <Link href={tenantPath(`/roles/users/${user.id}`)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"><Eye className="size-4" /> View</Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U";
}

function UserAvatar({ user }: { user: AccessUser }) {
  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt={`${user.fullName} profile`}
        className="size-10 rounded-full border border-border object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-sm font-semibold text-white">
      {initials(user.fullName)}
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return "not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "not recorded" : date.toLocaleDateString();
}
