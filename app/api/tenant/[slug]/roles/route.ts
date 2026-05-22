import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const slug = resolvedParams.slug;

    if (!slug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    // Mock roles data
    const mockRoles = [
      {
        id: "role1",
        name: "Administrator",
        description: "Full system access and management",
        userCount: 3,
        permissions: [
          { id: "p1", key: "user.create", resource: "users", action: "create" },
          { id: "p2", key: "user.read", resource: "users", action: "read" },
          { id: "p3", key: "user.update", resource: "users", action: "update" },
          { id: "p4", key: "user.delete", resource: "users", action: "delete" }
        ],
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        isSystem: true
      },
      {
        id: "role2",
        name: "Manager",
        description: "Department management and staff supervision",
        userCount: 8,
        permissions: [
          { id: "p5", key: "patient.read", resource: "patients", action: "read" },
          { id: "p6", key: "patient.update", resource: "patients", action: "update" },
          { id: "p7", key: "staff.read", resource: "staff", action: "read" }
        ],
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        isSystem: true
      }
    ];

    // Mock users data
    const mockUsers = [
      {
        id: "user1",
        fullName: "Dr. John Smith",
        email: "john@hospital.com",
        role: "administrator",
        lastActive: new Date(Date.now() - 300000).toISOString()
      },
      {
        id: "user2",
        fullName: "Jane Doe",
        email: "jane@hospital.com",
        role: "manager",
        lastActive: new Date(Date.now() - 3600000).toISOString()
      }
    ];

    return NextResponse.json(mockRoles);
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json({ error: "Failed to fetch roles" }, { status: 500 });
  }
}
