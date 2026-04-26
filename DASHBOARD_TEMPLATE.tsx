"use client";

import React from "react";
import { StandardDashboardLayout } from "@/components/StandardDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card-new";
import { Button } from "@/components/ui/button-new";
import { Badge } from "@/components/ui/badge-new";
import { StatCard } from "@/components/StatCard";
import { Activity, Users, Plus, Settings } from "lucide-react";

// Configure the sidebar for this role
const sidebarConfig = {
  logo: "J",
  productName: "Joan",
  userRole: "Doctor", // Change this based on role
  sections: [
    {
      title: "Patient Management",
      items: [
        { label: "Dashboard", href: "/doctor", icon: Activity },
        { label: "My Patients", href: "/doctor/patients", icon: Users },
      ],
    },
    {
      title: "Clinical",
      items: [
        { label: "Appointments", href: "/doctor/appointments", icon: Activity },
        { label: "Medical Records", href: "/doctor/records", icon: Activity },
      ],
    },
  ],
};

// Configure the header
const headerConfig = {
  title: "Dashboard Title",
  breadcrumbs: [{ label: "Role" }, { label: "Page Name" }],
  status: "active" as const,
  actions: [
    {
      label: "New Action",
      onClick: () => console.log("Action"),
      variant: "primary" as const,
      icon: <Plus className="w-4 h-4" />,
    },
  ],
};

export default function RoleDashboard() {
  return (
    <StandardDashboardLayout sidebarConfig={sidebarConfig} headerConfig={headerConfig}>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Stat Label"
          value="100"
          iconComponent={Activity}
          iconColor="orange"
          change={{ value: 12, isPositive: true }}
        />
        {/* More stat cards... */}
      </div>

      {/* Main Content Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Section Title</CardTitle>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Content here */}
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Left Card</CardTitle>
          </CardHeader>
          <CardContent>{/* Content */}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Right Card</CardTitle>
          </CardHeader>
          <CardContent>{/* Content */}</CardContent>
        </Card>
      </div>
    </StandardDashboardLayout>
  );
}
