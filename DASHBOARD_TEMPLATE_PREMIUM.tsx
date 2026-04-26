"use client";

import React from "react";
import { ModernSidebar, ModernHeader } from "@/components/ModernLayout";
import { PremiumMetricCard, PremiumCard, DataRow } from "@/components/PremiumCards";
import { SimpleChart, Timeline, StatGrid } from "@/components/ChartComponents";
import {
  Users,
  Calendar,
  Activity,
  Heart,
  Plus,
  Settings,
  MessageSquare,
  Bell,
  CheckCircle,
  Clock,
} from "lucide-react";

// CUSTOMIZE THIS SECTION FOR EACH ROLE
const sidebarSections = [
  {
    title: "Patient Management",
    items: [
      { icon: <Activity className="w-5 h-5" />, label: "Dashboard", href: "/doctor", badge: 0 },
      { icon: <Users className="w-5 h-5" />, label: "My Patients", href: "/doctor/patients", badge: 24 },
      { icon: <Calendar className="w-5 h-5" />, label: "Appointments", href: "/doctor/appointments", badge: 3 },
    ],
  },
  {
    title: "Clinical",
    items: [
      { icon: <Heart className="w-5 h-5" />, label: "Medical Records", href: "/doctor/records" },
      { icon: <MessageSquare className="w-5 h-5" />, label: "Messages", href: "/doctor/messages", badge: 2 },
      { icon: <Bell className="w-5 h-5" />, label: "Notifications", href: "/doctor/notifications", badge: 5 },
    ],
  },
];

// CUSTOMIZE THIS SECTION FOR EACH ROLE
const rolePageTitle = "My Dashboard";
const rolePageSubtitle = "Manage your patients and schedule";
const roleBadgeStats = "doctor";

export default function RoleDashboard() {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <ModernSidebar sections={sidebarSections} userRole="Doctor" />

      {/* Main Content */}
      <div className="flex-1 ml-72 max-md:ml-0 flex flex-col overflow-hidden">
        {/* Header */}
        <ModernHeader
          title={rolePageTitle}
          subtitle={rolePageSubtitle}
          actions={
            <button className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2">
              <Plus className="w-5 h-5" />
              New Action
            </button>
          }
        />

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8 space-y-8">
            {/* Metrics Grid - Customize these */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <PremiumMetricCard
                icon={Users}
                label="Active Patients"
                value="24"
                change={{ value: 5, isPositive: true }}
                gradient="orange"
              />
              <PremiumMetricCard
                icon={Calendar}
                label="Today's Appointments"
                value="6"
                change={{ value: 2, isPositive: false }}
                gradient="blue"
              />
              <PremiumMetricCard
                icon={Heart}
                label="Pending Results"
                value="12"
                change={{ value: 3, isPositive: true }}
                gradient="red"
              />
              <PremiumMetricCard
                icon={Activity}
                label="Patient Health Score"
                value="92%"
                change={{ value: 4, isPositive: true }}
                gradient="green"
              />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Primary Content - 2/3 width */}
              <div className="lg:col-span-2">
                <PremiumCard
                  title="Today's Schedule"
                  subtitle="Upcoming consultations"
                  action={
                    <button className="text-sm text-orange-600 hover:text-orange-700 font-medium">
                      View All →
                    </button>
                  }
                >
                  <div className="space-y-2">
                    {[
                      { name: "John Doe", time: "10:00 AM", status: "success" },
                      { name: "Jane Smith", time: "11:30 AM", status: "success" },
                      { name: "Bob Johnson", time: "02:00 PM", status: "pending" },
                    ].map((appointment, idx) => (
                      <DataRow
                        key={idx}
                        icon={<Calendar className="w-5 h-5" />}
                        label={appointment.name}
                        value={appointment.time}
                        status={appointment.status as any}
                      />
                    ))}
                  </div>
                </PremiumCard>
              </div>

              {/* Sidebar Content - 1/3 width */}
              <div>
                <PremiumCard title="Quick Stats">
                  <StatGrid
                    items={[
                      { label: "Patients", value: "24" },
                      { label: "Appointments", value: "6" },
                      { label: "Follow-ups", value: "12" },
                      { label: "Completed", value: "89%" },
                    ]}
                  />
                </PremiumCard>
              </div>
            </div>

            {/* Bottom Section - Charts and Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart Section */}
              <PremiumCard title="Patient Distribution" subtitle="By status">
                <SimpleChart
                  title="Patient Status Breakdown"
                  data={[
                    { label: "Active", value: 18, maxValue: 24 },
                    { label: "Follow-up", value: 4, maxValue: 24 },
                    { label: "Recovery", value: 2, maxValue: 24 },
                  ]}
                />
              </PremiumCard>

              {/* Timeline Section */}
              <PremiumCard title="Recent Updates" subtitle="Latest activities">
                <Timeline
                  items={[
                    {
                      id: "1",
                      title: "Patient Checkup",
                      description: "John Doe completed routine checkup",
                      time: "2 hours ago",
                      icon: <CheckCircle className="w-5 h-5" />,
                      status: "completed",
                    },
                    {
                      id: "2",
                      title: "Lab Results",
                      description: "Results uploaded for Jane Smith",
                      time: "4 hours ago",
                      icon: <CheckCircle className="w-5 h-5" />,
                      status: "completed",
                    },
                    {
                      id: "3",
                      title: "Pending Review",
                      description: "Prescription review needed",
                      time: "6 hours ago",
                      icon: <Clock className="w-5 h-5" />,
                      status: "pending",
                    },
                  ]}
                />
              </PremiumCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
