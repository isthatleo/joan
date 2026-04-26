"use client";

import { useEffect, useState, useMemo } from "react";
import {
  PageHeader,
  StatCard,
  SectionCard,
  StatusPill,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Search,
  CheckCircle2,
  Lock,
} from "lucide-react";

interface Permission {
  id: string;
  key: string;
  resource: string;
  action: string;
  description?: string;
}

interface RoleWithPermissions {
  id: string;
  name: string;
  rolePermissions?: Array<{ permission: Permission }>;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openPermDialog, setOpenPermDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleWithPermissions | null>(null);
  const [formData, setFormData] = useState({ name: "" });
  const [submitting, setSubmitting] = useState(false);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [rolesRes, permsRes] = await Promise.all([
          fetch("/api/roles?limit=100"),
          fetch("/api/permissions"),
        ]);

        if (rolesRes.ok) {
          setRoles(await rolesRes.json());
        }
        if (permsRes.ok) {
          setPermissions(await permsRes.json());
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filtered = useMemo(() => {
    return roles.filter((r) =>
      !search || r.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [roles, search]);

  const handleCreateRole = async () => {
    if (!formData.name) return;

    try {
      setSubmitting(true);
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const newRole = await res.json();
        setRoles([newRole, ...roles]);
        setOpenCreateDialog(false);
        setFormData({ name: "" });
      }
    } catch (error) {
      console.error("Failed to create role:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (!confirm("Are you sure you want to delete this role?")) return;

    try {
      const res = await fetch(`/api/roles?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setRoles(roles.filter(r => r.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete role:", error);
    }
  };

  const openEditRoleDialog = (role: RoleWithPermissions) => {
    setSelectedRole(role);
    setFormData({ name: role.name });
    setOpenEditDialog(true);
  };

  const openPermissionsDialog = async (role: RoleWithPermissions) => {
    setSelectedRole(role);
    try {
      const res = await fetch(`/api/roles?id=${role.id}`);
      if (res.ok) {
        const updatedRole = await res.json();
        setSelectedRole(updatedRole);
      }
    } catch (error) {
      console.error("Failed to fetch role details:", error);
    }
    setOpenPermDialog(true);
  };

  const handleTogglePermission = async (permissionId: string, assign: boolean) => {
    if (!selectedRole) return;

    try {
      const method = assign ? "POST" : "DELETE";
      const res = await fetch("/api/roles/permissions", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId: selectedRole.id,
          permissionId,
        }),
      });

      if (res.ok) {
        // Refresh role permissions
        const roleRes = await fetch(`/api/roles?id=${selectedRole.id}`);
        if (roleRes.ok) {
          const updated = await roleRes.json();
          setRoles(roles.map(r => r.id === updated.id ? updated : r));
          setSelectedRole(updated);
        }
      }
    } catch (error) {
      console.error("Failed to update permissions:", error);
    }
  };

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        subtitle="Manage system roles and assign permissions"
        actions={
          <Button
            onClick={() => setOpenCreateDialog(true)}
            className="inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Role
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Total Roles"
          value={roles.length}
          subtitle="System roles"
          icon={Shield}
          tone="primary"
        />
        <StatCard
          title="Permissions"
          value={permissions.length}
          subtitle="Available permissions"
          icon={Lock}
          tone="info"
        />
        <StatCard
          title="Avg Permissions/Role"
          value={(roles.reduce((sum, r) => sum + (r.rolePermissions?.length || 0), 0) / (roles.length || 1)).toFixed(1)}
          subtitle="Per role"
          icon={CheckCircle2}
          tone="success"
        />
      </div>

      {/* Search */}
      <SectionCard className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search roles..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </SectionCard>

      {/* Roles */}
      <SectionCard title="Roles" description={`${filtered.length} role(s)`} flush>
        {loading ? (
          <div className="space-y-2 p-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((role) => (
              <div key={role.id} className="flex items-center justify-between p-6 hover:bg-muted/30 transition">
                <div className="flex-1">
                  <p className="font-medium text-foreground">{role.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {role.rolePermissions?.length || 0} permission(s)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openPermissionsDialog(role)}
                    className="px-3 py-2 text-sm rounded-lg bg-info-soft text-info-soft-foreground hover:bg-info-soft/80 transition"
                  >
                    Manage Permissions
                  </button>
                  <button
                    onClick={() => openEditRoleDialog(role)}
                    className="p-2 hover:bg-muted rounded-lg transition"
                  >
                    <Edit className="h-4 w-4 text-primary" />
                  </button>
                  <button
                    onClick={() => handleDeleteRole(role.id)}
                    className="p-2 hover:bg-muted rounded-lg transition"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Create Role Dialog */}
      <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Role Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ name: e.target.value })}
                placeholder="e.g., Hospital Admin"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateRole} disabled={submitting}>
              {submitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Role Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ name: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEditDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateRole} disabled={submitting}>
              {submitting ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={openPermDialog} onOpenChange={setOpenPermDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Permissions: {selectedRole?.name}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {permissions.map((perm) => {
              const hasPermission = selectedRole?.rolePermissions?.some(
                (rp) => rp.permission.id === perm.id
              );
              return (
                <div
                  key={perm.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition"
                >
                  <input
                    type="checkbox"
                    checked={hasPermission || false}
                    onChange={(e) => handleTogglePermission(perm.id, e.target.checked)}
                    className="rounded border-border"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{perm.key}</p>
                    <p className="text-xs text-muted-foreground">{perm.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button onClick={() => setOpenPermDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

