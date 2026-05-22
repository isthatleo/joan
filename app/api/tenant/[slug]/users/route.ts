import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const slug = resolvedParams.slug;

    if (!slug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    // Mock users data
    const mockUsers = [
      {
        id: "user1",
        fullName: "Dr. John Smith",
        email: "john@hospital.com",
        role: "administrator",
        avatar: null,
        lastActive: new Date(Date.now() - 300000).toISOString()
      },
      {
        id: "user2",
        fullName: "Jane Doe",
        email: "jane@hospital.com",
        role: "manager",
        avatar: null,
        lastActive: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: "user3",
        fullName: "Bob Johnson",
        email: "bob@hospital.com",
        role: "staff",
        avatar: null,
        lastActive: new Date(Date.now() - 7200000).toISOString()
      }
    ];

    return NextResponse.json(mockUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
