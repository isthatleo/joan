"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ShieldCheck, Users, Settings, Plus, Edit, Trash2,
  Eye, Check, X, Loader2, Search, Filter,
  UserPlus, Shield, Key, AlertTriangle
} from "lucide-react";

const orange = "#F97316";

interface Role {
  id: string;
  name: string;
  description: string;
  userCount: number;
  permissions: Permission[];
  createdAt: string;
  isSystem: boolean;
}

interface Permission {
  id: string;
  key: string;
  resource: string;
  action: string;
  description: string;
}

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  avatar?: string;
  lastActive: string;
}

export default function RolesPermissionsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"roles" | "permissions" | "users">("roles");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchRolesData();
  }, []);

  const fetchRolesData = async () => {
    setLoading(true);
    try {
      const [rolesRes, usersRes] = await Promise.all([
        fetch(`/api/tenant/${slug}/roles`),
        fetch(`/api/tenant/${slug}/users`)
      ]);

      if (rolesRes.ok) setRoles(await rolesRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
    } catch (error) {
      console.error('Failed to fetch roles data:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "roles", label: "Roles", icon: ShieldCheck },
    { id: "permissions", label: "Permissions", icon: Key },
    { id: "users", label: "User Management", icon: Users }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Access Control</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Roles & Permissions</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage user roles, permissions, and access control.</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90" style={{ backgroundColor: orange }}>
            <Plus className="size-4" />
            Add Role
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="size-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-orange-300"
          />
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all">
          <Filter className="size-4" />
          Filter
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 text-orange-500 animate-spin mx-auto" />
        </div>
      ) : (
        <>
          {activeTab === "roles" && (
            <div className="space-y-6">
              {/* Roles Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.map((role) => (
                  <div key={role.id} className="bg-card border border-border rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                          <ShieldCheck className="size-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{role.name}</h3>
                          <p className="text-xs text-muted-foreground">{role.userCount} users</p>
                        </div>
                      </div>
                      {!role.isSystem && (
                        <div className="flex gap-1">
                          <button className="size-8 rounded-lg hover:bg-muted flex items-center justify-center">
                            <Edit className="size-4" />
                          </button>
                          <button className="size-8 rounded-lg hover:bg-red-50 hover:text-red-600 flex items-center justify-center">
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">{role.description}</p>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-foreground">Key Permissions:</p>
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.slice(0, 3).map((perm) => (
                          <span key={perm.id} className="px-2 py-1 bg-muted rounded-md text-xs font-medium">
                            {perm.action}:{perm.resource}
                          </span>
                        ))}
                        {role.permissions.length > 3 && (
                          <span className="px-2 py-1 bg-muted rounded-md text-xs font-medium">
                            +{role.permissions.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* System Roles Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="size-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900">System Roles</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Roles marked as system roles cannot be modified or deleted. They are essential for platform functionality.
                      Custom roles can be created to extend permissions as needed.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "permissions" && (
            <div className="space-y-6">
              {/* Permissions Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Key className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Permissions</p>
                      <p className="text-2xl font-bold text-foreground">24</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Across all resources</p>
                </div>

                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                      <Key className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">System Permissions</p>
                      <p className="text-2xl font-bold text-foreground">8</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">System-wide permissions</p>
                </div>

                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                      <Key className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Resource Permissions</p>
                      <p className="text-2xl font-bold text-foreground">16</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">CRUD operations</p>
                </div>

                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                      <Key className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Custom Scopes</p>
                      <p className="text-2xl font-bold text-foreground">12</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Role-specific scopes</p>
                </div>
              </div>

              {/* Permissions by Resource - Detailed Table */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-6 border-b border-border">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Key className="size-5 text-orange-500" />
                    Permission Matrix
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">Manage permissions across all resources and operations</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                        <th className="text-left px-6 py-3">Resource</th>
                        <th className="text-center px-6 py-3">Create</th>
                        <th className="text-center px-6 py-3">Read</th>
                        <th className="text-center px-6 py-3">Update</th>
                        <th className="text-center px-6 py-3">Delete</th>
                        <th className="text-left px-6 py-3">Assigned Roles</th>
                        <th className="text-center px-6 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {["users", "patients", "appointments", "billing", "reports", "staff", "lab", "pharmacy"].map((resource) => (
                        <tr key={resource} className="hover:bg-muted/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-foreground capitalize">{resource}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center justify-center size-8 rounded-lg bg-green-50 text-green-600">
                              <Check className="size-4" />
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center justify-center size-8 rounded-lg bg-green-50 text-green-600">
                              <Check className="size-4" />
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center justify-center size-8 rounded-lg bg-green-50 text-green-600">
                              <Check className="size-4" />
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center justify-center size-8 rounded-lg bg-yellow-50 text-yellow-600">
                              <AlertTriangle className="size-4" />
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {["admin", "manager"].map((role) => (
                                <span key={role} className="px-2 py-1 rounded-md bg-blue-50 text-blue-600 text-xs font-medium">
                                  {role}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button className="size-8 rounded-lg hover:bg-muted flex items-center justify-center">
                              <Eye className="size-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Permission Categories */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card border border-border rounded-xl p-6">
                  <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Shield className="size-5 text-blue-600" />
                    CRUD Permissions
                  </h4>
                  <div className="space-y-3">
                    {[
                      { action: "create", desc: "Create new records", roles: 3 },
                      { action: "read", desc: "View existing records", roles: 5 },
                      { action: "update", desc: "Modify existing records", roles: 4 },
                      { action: "delete", desc: "Remove records permanently", roles: 2 }
                    ].map((perm) => (
                      <div key={perm.action} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="text-sm font-medium text-foreground capitalize">{perm.action}</p>
                          <p className="text-xs text-muted-foreground">{perm.desc}</p>
                        </div>
                        <span className="px-2 py-1 bg-orange-50 text-orange-600 rounded-md text-xs font-semibold">
                          {perm.roles} roles
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-6">
                  <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Shield className="size-5 text-purple-600" />
                    System Permissions
                  </h4>
                  <div className="space-y-3">
                    {[
                      { action: "audit.view", desc: "View audit logs", roles: 2 },
                      { action: "roles.manage", desc: "Manage roles", roles: 1 },
                      { action: "permissions.edit", desc: "Edit permissions", roles: 1 },
                      { action: "settings.admin", desc: "Access admin settings", roles: 2 }
                    ].map((perm) => (
                      <div key={perm.action} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="text-sm font-medium text-foreground">{perm.action}</p>
                          <p className="text-xs text-muted-foreground">{perm.desc}</p>
                        </div>
                        <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded-md text-xs font-semibold">
                          {perm.roles} role{perm.roles > 1 ? 's' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div className="space-y-6">
              {/* Users List */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-6 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">User Management</h3>
                    <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90" style={{ backgroundColor: orange }}>
                      <UserPlus className="size-4" />
                      Add User
                    </button>
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {users.map((user) => (
                    <div key={user.id} className="p-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="size-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold text-sm">
                          {user.fullName.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{user.fullName}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="px-3 py-1 bg-muted rounded-md text-sm font-medium">
                          {user.role}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Last active: {new Date(user.lastActive).toLocaleDateString()}
                        </span>
                        <div className="flex gap-1">
                          <button className="size-8 rounded-lg hover:bg-muted flex items-center justify-center">
                            <Edit className="size-4" />
                          </button>
                          <button className="size-8 rounded-lg hover:bg-red-50 hover:text-red-600 flex items-center justify-center">
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
