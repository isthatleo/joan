"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Shield,
  Users,
  Settings,
} from "lucide-react";

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

const permissionCategories = {
  dashboard: "Dashboard",
  patient: "Patient Management",
  appointment: "Appointments",
  lab: "Laboratory",
  pharmacy: "Pharmacy",
  billing: "Billing",
  admin: "Administration",
  compliance: "Compliance",
  analytics: "Analytics",
};

const allPermissions: Permission[] = [
  // Dashboard
  {
    id: "dashboard.read",
    name: "View Dashboard",
    description: "Access to dashboard and overview",
    category: "dashboard",
  },

  // Patient Management
  {
    id: "patient.read",
    name: "View Patients",
    description: "View patient records",
    category: "patient",
  },
  {
    id: "patient.write",
    name: "Manage Patients",
    description: "Create and edit patient records",
    category: "patient",
  },
  {
    id: "patient.read.own",
    name: "View Own Patients",
    description: "View only assigned patients",
    category: "patient",
  },
  {
    id: "patient.read.own_child",
    name: "View Child Patients",
    description: "View guardian's children",
    category: "patient",
  },

  // Appointments
  {
    id: "appointment.read",
    name: "View Appointments",
    description: "View appointment schedules",
    category: "appointment",
  },
  {
    id: "appointment.write",
    name: "Manage Appointments",
    description: "Create and modify appointments",
    category: "appointment",
  },
  {
    id: "appointment.read.own",
    name: "View Own Appointments",
    description: "View only personal appointments",
    category: "appointment",
  },
  {
    id: "appointment.read.own_child",
    name: "View Child Appointments",
    description: "View guardian's children appointments",
    category: "appointment",
  },

  // Laboratory
  {
    id: "lab.read",
    name: "View Lab Orders",
    description: "View laboratory orders and results",
    category: "lab",
  },
  {
    id: "lab.write",
    name: "Manage Lab Orders",
    description: "Create and process lab orders",
    category: "lab",
  },

  // Pharmacy
  {
    id: "pharmacy.read",
    name: "View Prescriptions",
    description: "View medication prescriptions",
    category: "pharmacy",
  },
  {
    id: "pharmacy.write",
    name: "Manage Prescriptions",
    description: "Create and dispense medications",
    category: "pharmacy",
  },
  {
    id: "pharmacy.read.own",
    name: "View Own Prescriptions",
    description: "View personal prescriptions",
    category: "pharmacy",
  },

  // Billing
  {
    id: "billing.read",
    name: "View Billing",
    description: "View billing and invoices",
    category: "billing",
  },
  {
    id: "billing.write",
    name: "Manage Billing",
    description: "Create and process billing",
    category: "billing",
  },
  {
    id: "billing.read.own",
    name: "View Own Billing",
    description: "View personal billing",
    category: "billing",
  },

  // Administration
  {
    id: "admin.manage",
    name: "Administrative Access",
    description: "Manage users, departments, and settings",
    category: "admin",
  },
  {
    id: "ward.manage",
    name: "Ward Management",
    description: "Manage hospital wards and beds",
    category: "ward",
  },
  {
    id: "inventory.read",
    name: "View Inventory",
    description: "View inventory levels",
    category: "inventory",
  },
  {
    id: "inventory.write",
    name: "Manage Inventory",
    description: "Update inventory and stock",
    category: "inventory",
  },
  {
    id: "queue.read",
    name: "View Queues",
    description: "View patient queues",
    category: "queue",
  },
  {
    id: "queue.write",
    name: "Manage Queues",
    description: "Modify queue priorities",
    category: "queue",
  },

  // Compliance & Security
  {
    id: "compliance.read",
    name: "View Compliance",
    description: "Access compliance reports",
    category: "compliance",
  },
  {
    id: "compliance.write",
    name: "Manage Compliance",
    description: "Update compliance settings",
    category: "compliance",
  },
  {
    id: "emergency.access",
    name: "Emergency Access",
    description: "Access emergency features",
    category: "emergency",
  },
  {
    id: "message.send",
    name: "Send Messages",
    description: "Send internal messages",
    category: "communication",
  },

  // Analytics
  {
    id: "analytics.read",
    name: "View Analytics",
    description: "Access analytics and reports",
    category: "analytics",
  },
];

export default function RoleManagementPage() {
  const [search, setSearch] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
  });

  const queryClient = useQueryClient();

  // Fetch roles
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["roles", search],
    queryFn: async () => {
      // This would typically fetch from an API
      // For now, return mock data
      return [
        {
          id: "1",
          name: "Super Admin",
          description: "Full system access and control",
          permissions: allPermissions.map((p) => p.id),
          userCount: 2,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "2",
          name: "Hospital Admin",
          description: "Hospital-wide administrative access",
          permissions: [
            "dashboard.read",
            "patient.read",
            "patient.write",
            "appointment.read",
            "appointment.write",
            "lab.read",
            "lab.write",
            "pharmacy.read",
            "pharmacy.write",
            "billing.read",
            "billing.write",
            "admin.manage",
            "ward.manage",
            "inventory.read",
            "inventory.write",
            "queue.read",
            "queue.write",
            "compliance.read",
            "analytics.read",
            "message.send",
          ],
          userCount: 15,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "3",
          name: "Doctor",
          description: "Medical professional with patient care access",
          permissions: [
            "dashboard.read",
            "patient.read.own",
            "appointment.read.own",
            "appointment.write",
            "lab.read",
            "lab.write",
            "pharmacy.read",
            "pharmacy.write",
            "message.send",
          ],
          userCount: 45,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "4",
          name: "Nurse",
          description: "Nursing staff with patient care access",
          permissions: [
            "dashboard.read",
            "patient.read.own",
            "patient.write",
            "appointment.read.own",
            "lab.read",
            "pharmacy.read",
            "ward.manage",
            "queue.read",
            "message.send",
          ],
          userCount: 78,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "5",
          name: "Lab Technician",
          description: "Laboratory operations and testing",
          permissions: [
            "dashboard.read",
            "lab.read",
            "lab.write",
            "inventory.read",
            "inventory.write",
          ],
          userCount: 12,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "6",
          name: "Pharmacist",
          description: "Pharmacy management and dispensing",
          permissions: [
            "dashboard.read",
            "pharmacy.read",
            "pharmacy.write",
            "inventory.read",
            "inventory.write",
            "patient.read",
            "analytics.read",
          ],
          userCount: 8,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "7",
          name: "Patient",
          description: "Patient portal access",
          permissions: [
            "dashboard.read",
            "patient.read.own",
            "appointment.read.own",
            "appointment.write",
            "pharmacy.read.own",
            "billing.read.own",
            "message.send",
          ],
          userCount: 1250,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "8",
          name: "Guardian",
          description: "Parent/guardian access for children",
          permissions: [
            "dashboard.read",
            "patient.read.own_child",
            "appointment.read.own_child",
            "appointment.write",
            "message.send",
          ],
          userCount: 234,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ] as Role[];
    },
  });

  // Create role mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // This would typically call an API
      console.log("Creating role:", data);
      return {
        ...data,
        id: Date.now().toString(),
        userCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast.success("Role created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create role");
      console.error(error);
    },
  });

  // Update role mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<typeof formData>;
    }) => {
      // This would typically call an API
      console.log("Updating role:", id, data);
      return { ...data, id, updatedAt: new Date().toISOString() };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setIsEditDialogOpen(false);
      resetForm();
      toast.success("Role updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update role");
      console.error(error);
    },
  });

  // Delete role mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // This would typically call an API
      console.log("Deleting role:", id);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Role deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete role");
      console.error(error);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      permissions: [],
    });
  };

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error("Role name is required");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEdit = (role: Role) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      description: role.description,
      permissions: role.permissions,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedRole) return;
    updateMutation.mutate({ id: selectedRole.id, data: formData });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      permissions: checked
        ? [...prev.permissions, permissionId]
        : prev.permissions.filter((p) => p !== permissionId),
    }));
  };

  const filteredRoles = roles.filter(
    (role) =>
      role.name.toLowerCase().includes(search.toLowerCase()) ||
      role.description.toLowerCase().includes(search.toLowerCase())
  );

  const groupedPermissions = allPermissions.reduce(
    (acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push(permission);
      return acc;
    },
    {} as Record<string, Permission[]>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        subtitle="Manage user roles and their access permissions"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roles.length}</div>
            <p className="text-xs text-muted-foreground">Configured roles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {roles.reduce((sum, role) => sum + role.userCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Across all roles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Permissions</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allPermissions.length}</div>
            <p className="text-xs text-muted-foreground">Available permissions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(permissionCategories).length}
            </div>
            <p className="text-xs text-muted-foreground">Permission categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Role Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search roles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Role
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Role</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Role Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="Enter role name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({ ...formData, description: e.target.value })
                        }
                        placeholder="Enter role description"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-semibold">Permissions</Label>
                    <div className="mt-4 space-y-6">
                      {Object.entries(groupedPermissions).map(
                        ([category, permissions]) => (
                          <div key={category}>
                            <h4 className="font-medium text-sm text-gray-900 mb-3">
                              {
                                permissionCategories[
                                  category as keyof typeof permissionCategories
                                ]
                              }
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {permissions.map((permission) => (
                                <div
                                  key={permission.id}
                                  className="flex items-start space-x-2"
                                >
                                  <Checkbox
                                    id={permission.id}
                                    checked={formData.permissions.includes(permission.id)}
                                    onCheckedChange={(checked) =>
                                      handlePermissionChange(
                                        permission.id,
                                        checked as boolean
                                      )
                                    }
                                  />
                                  <div className="grid gap-1.5 leading-none">
                                    <Label
                                      htmlFor={permission.id}
                                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                      {permission.name}
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                      {permission.description}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreate}
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? "Creating..." : "Create Role"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Roles Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Loading roles...
                    </TableCell>
                  </TableRow>
                ) : filteredRoles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No roles found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRoles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                        {role.description}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {role.permissions.length} permissions
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{role.userCount} users</Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(role)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Role</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete the role "
                                    {role.name}"? This will affect{" "}
                                    {role.userCount} users.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(role.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Role Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label className="text-base font-semibold">Permissions</Label>
              <div className="mt-4 space-y-6">
                {Object.entries(groupedPermissions).map(
                  ([category, permissions]) => (
                    <div key={category}>
                      <h4 className="font-medium text-sm text-gray-900 mb-3">
                        {
                          permissionCategories[
                            category as keyof typeof permissionCategories
                          ]
                        }
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {permissions.map((permission) => (
                          <div
                            key={permission.id}
                            className="flex items-start space-x-2"
                          >
                            <Checkbox
                              id={`edit-${permission.id}`}
                              checked={formData.permissions.includes(permission.id)}
                              onCheckedChange={(checked) =>
                                handlePermissionChange(
                                  permission.id,
                                  checked as boolean
                                )
                              }
                            />
                            <div className="grid gap-1.5 leading-none">
                              <Label
                                htmlFor={`edit-${permission.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {permission.name}
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                {permission.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Updating..." : "Update Role"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
