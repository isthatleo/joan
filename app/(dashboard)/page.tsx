"use client";

import { useAuthStore } from "@/stores/auth";
import { KPICard } from "@/components/KPICard";
import { DataCard, DataCardItem } from "@/components/DataCard";
import {
  Users,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Clock,
  Activity,
  Pill,
  TestTube,
  Heart,
  Zap,
  BarChart3,
  Building2,
  PhoneOff,
  UserCheck,
  Package,
  Calendar,
  CheckCircle,
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuthStore();
  const role = user?.role as string || "doctor";

  // Mock data for data cards
  const mockAppointments: DataCardItem[] = [
    {
      id: "1",
      title: "John Doe",
      subtitle: "General Checkup",
      status: "pending",
      value: "10:30 AM",
    },
    {
      id: "2",
      title: "Jane Smith",
      subtitle: "Follow-up",
      status: "in-progress",
      value: "11:00 AM",
    },
    {
      id: "3",
      title: "Bob Johnson",
      subtitle: "Lab Results",
      status: "completed",
      value: "2:00 PM",
    },
  ];

  const mockPatients: DataCardItem[] = [
    {
      id: "1",
      title: "Alice Wilson",
      subtitle: "ID: 12345",
      status: "normal",
      badge: "Active",
    },
    {
      id: "2",
      title: "Charlie Brown",
      subtitle: "ID: 12346",
      status: "normal",
      badge: "Monitored",
    },
    {
      id: "3",
      title: "Diana Prince",
      subtitle: "ID: 12347",
      status: "urgent",
      badge: "Critical",
    },
  ];

  const mockQueue: DataCardItem[] = [
    {
      id: "1",
      title: "Q-001",
      subtitle: "John Doe",
      status: "in-progress",
      value: "Dr. Smith",
    },
    {
      id: "2",
      title: "Q-002",
      subtitle: "Jane Wilson",
      status: "pending",
      value: "Waiting",
    },
    {
      id: "3",
      title: "Q-003",
      subtitle: "Bob Harris",
      status: "pending",
      value: "Waiting",
    },
  ];

  const mockPrescriptions: DataCardItem[] = [
    {
      id: "1",
      title: "Amoxicillin 500mg",
      subtitle: "John Doe",
      status: "pending",
      value: "Dispense",
    },
    {
      id: "2",
      title: "Metformin 1000mg",
      subtitle: "Jane Smith",
      status: "completed",
      value: "Dispensed",
    },
    {
      id: "3",
      title: "Aspirin 100mg",
      subtitle: "Bob Johnson",
      status: "in-progress",
      value: "Processing",
    },
  ];

  const mockLabResults: DataCardItem[] = [
    {
      id: "1",
      title: "CBC Test",
      subtitle: "Patient: John Doe",
      status: "completed",
      value: "Ready",
    },
    {
      id: "2",
      title: "Blood Glucose",
      subtitle: "Patient: Jane Smith",
      status: "in-progress",
      value: "Processing",
    },
    {
      id: "3",
      title: "Lipid Panel",
      subtitle: "Patient: Bob Johnson",
      status: "pending",
      value: "Pending",
    },
  ];

  const mockBilling: DataCardItem[] = [
    {
      id: "1",
      title: "INV-001",
      subtitle: "John Doe - Consultation",
      status: "completed",
      value: "$150",
    },
    {
      id: "2",
      title: "INV-002",
      subtitle: "Jane Smith - Lab",
      status: "pending",
      value: "$200",
    },
    {
      id: "3",
      title: "INV-003",
      subtitle: "Bob Johnson - Procedure",
      status: "pending",
      value: "$450",
    },
  ];

  const renderDashboard = () => {
    switch (role) {
      case "super_admin":
        return (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                Global Command Center
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Platform-wide healthcare intelligence
              </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard
                title="Total Hospitals"
                value="47"
                subtitle="Active tenants"
                color="blue"
                icon={Building2}
                trend={{ value: 12, label: "vs last month", isPositive: true }}
              />
              <KPICard
                title="Total Patients"
                value="124,850"
                subtitle="Across all hospitals"
                color="green"
                icon={Users}
                trend={{
                  value: 8,
                  label: "weekly growth",
                  isPositive: true,
                }}
              />
              <KPICard
                title="Daily Revenue"
                value="$287,450"
                subtitle="Platform-wide"
                color="indigo"
                icon={DollarSign}
                trend={{
                  value: 15,
                  label: "vs last week",
                  isPositive: true,
                }}
              />
              <KPICard
                title="System Health"
                value="99.98%"
                subtitle="All services operational"
                color="green"
                icon={Zap}
                trend={{ value: 0, label: "no incidents", isPositive: true }}
              />
            </div>

            {/* Secondary KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <KPICard
                title="Active API Calls"
                value="1.2M"
                subtitle="24h average"
                color="purple"
                icon={Activity}
              />
              <KPICard
                title="Database Load"
                value="62%"
                subtitle="Healthy range"
                color="blue"
                icon={BarChart3}
              />
              <KPICard
                title="HIPAA Compliance"
                value="100%"
                subtitle="All standards met"
                color="green"
                icon={CheckCircle}
              />
            </div>

            {/* Data Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DataCard
                title="Top Hospitals by Revenue"
                items={[
                  {
                    id: "1",
                    title: "City Medical Center",
                    subtitle: "$45,230 today",
                    value: "24 patients",
                    status: "normal",
                  },
                  {
                    id: "2",
                    title: "County Hospital",
                    subtitle: "$38,950 today",
                    value: "18 patients",
                    status: "normal",
                  },
                  {
                    id: "3",
                    title: "Private Clinic",
                    subtitle: "$12,340 today",
                    value: "8 patients",
                    status: "normal",
                  },
                ]}
              />
              <DataCard
                title="System Alerts"
                items={[
                  {
                    id: "1",
                    title: "High Database Load",
                    subtitle: "Hospital A - detected 2m ago",
                    status: "urgent",
                    value: "Investigate",
                  },
                  {
                    id: "2",
                    title: "Backup Successful",
                    subtitle: "All tenant data backed up",
                    status: "completed",
                    value: "2 hours ago",
                  },
                  {
                    id: "3",
                    title: "Security Scan Complete",
                    subtitle: "No vulnerabilities found",
                    status: "completed",
                    value: "1 hour ago",
                  },
                ]}
              />
            </div>
          </div>
        );

      case "hospital_admin":
        return (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                Hospital Control Tower
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Real-time operational overview
              </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard
                title="Patients Today"
                value="342"
                subtitle="Active in hospital"
                color="blue"
                icon={Users}
                trend={{
                  value: 12,
                  label: "vs yesterday",
                  isPositive: true,
                }}
              />
              <KPICard
                title="Revenue Today"
                value="$28,450"
                subtitle="All departments"
                color="green"
                icon={DollarSign}
                trend={{
                  value: 8,
                  label: "vs target",
                  isPositive: true,
                }}
              />
              <KPICard
                title="Bed Occupancy"
                value="87%"
                subtitle="120/140 beds"
                color="yellow"
                icon={Activity}
                trend={{
                  value: 3,
                  label: "vs yesterday",
                  isPositive: false,
                }}
              />
              <KPICard
                title="Staff On Duty"
                value="58"
                subtitle="All departments"
                color="purple"
                icon={UserCheck}
                trend={{ value: 2, label: "vs expected", isPositive: true }}
              />
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <KPICard
                title="Appointments Today"
                value="156"
                color="indigo"
                icon={Calendar}
              />
              <KPICard
                title="Lab Tests Pending"
                value="34"
                color="yellow"
                icon={TestTube}
              />
              <KPICard
                title="Open Invoices"
                value="$45,200"
                color="red"
                icon={AlertTriangle}
              />
            </div>

            {/* Data Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DataCard
                title="Department Performance"
                items={[
                  {
                    id: "1",
                    title: "Emergency",
                    subtitle: "45 patients today",
                    value: "98% on-time",
                    status: "normal",
                  },
                  {
                    id: "2",
                    title: "Surgery",
                    subtitle: "12 procedures",
                    value: "100% completed",
                    status: "completed",
                  },
                  {
                    id: "3",
                    title: "Lab",
                    subtitle: "234 tests",
                    value: "92% on-time",
                    status: "normal",
                  },
                ]}
              />
              <DataCard
                title="Critical Alerts"
                items={[
                  {
                    id: "1",
                    title: "High Bed Occupancy",
                    subtitle: "ICU at 95%",
                    status: "urgent",
                    value: "Action needed",
                  },
                  {
                    id: "2",
                    title: "Medication Stock Low",
                    subtitle: "Amoxicillin running low",
                    status: "urgent",
                    value: "Order pending",
                  },
                  {
                    id: "3",
                    title: "Payment Overdue",
                    subtitle: "Insurance claim INV-0456",
                    status: "pending",
                    value: "Follow up",
                  },
                ]}
              />
            </div>

            {/* Recent Activity and Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Recent Activity
                </h3>
                <div className="space-y-3">
                  {[
                    { action: "New patient registered", time: "2 min ago" },
                    { action: "Lab results uploaded", time: "5 min ago" },
                    { action: "Appointment scheduled", time: "10 min ago" },
                    { action: "Payment processed", time: "15 min ago" },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg"
                    >
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {item.action}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {item.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-lg hover:shadow-md transition-all">
                    <Users className="w-6 h-6 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-200">
                      New Patient
                    </p>
                  </button>
                  <button className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-lg hover:shadow-md transition-all">
                    <Calendar className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-green-700 dark:text-green-200">
                      Schedule
                    </p>
                  </button>
                  <button className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 rounded-lg hover:shadow-md transition-all">
                    <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-200">
                      Invoice
                    </p>
                  </button>
                  <button className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 rounded-lg hover:shadow-md transition-all">
                    <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-orange-700 dark:text-orange-200">
                      Alerts
                    </p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case "doctor":
        return (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                Clinical Command
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Your day at a glance
              </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard
                title="Today's Appointments"
                value="12"
                subtitle="7 remaining"
                color="blue"
                icon={Calendar}
                trend={{
                  value: 3,
                  label: "completed",
                  isPositive: true,
                }}
              />
              <KPICard
                title="Waiting Patients"
                value="3"
                subtitle="In queue"
                color="yellow"
                icon={Users}
                trend={{
                  value: 1,
                  label: "urgent",
                  isPositive: false,
                }}
              />
              <KPICard
                title="Critical Alerts"
                value="1"
                subtitle="Requires attention"
                color="red"
                icon={AlertTriangle}
              />
              <KPICard
                title="Pending Lab Results"
                value="4"
                subtitle="Awaiting review"
                color="purple"
                icon={TestTube}
              />
            </div>

            {/* Queue and Appointments */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DataCard
                title="Patient Queue"
                items={mockQueue}
                onItemClick={(item) => console.log("View queue", item)}
              />
              <DataCard
                title="Today's Appointments"
                items={mockAppointments}
                onItemClick={(item) => console.log("View appointment", item)}
              />
            </div>

            {/* Clinical Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <KPICard
                title="Average Consultation"
                value="18 min"
                color="indigo"
                icon={Clock}
              />
              <KPICard
                title="Patient Satisfaction"
                value="4.8/5"
                color="green"
                icon={Heart}
              />
              <KPICard
                title="Prescriptions Issued"
                value="6"
                subtitle="Today"
                color="blue"
                icon={Pill}
              />
            </div>

            {/* Lab Orders and Prescriptions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DataCard
                title="Lab Orders"
                items={mockLabResults}
                onItemClick={(item) => console.log("View lab", item)}
              />
              <DataCard
                title="Recent Prescriptions"
                items={mockPrescriptions}
                onItemClick={(item) => console.log("View prescription", item)}
              />
            </div>
          </div>
        );

      case "nurse":
        return (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                Care Station
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Patient care overview
              </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard
                title="Assigned Patients"
                value="8"
                subtitle="Active care"
                color="blue"
                icon={Users}
              />
              <KPICard
                title="Vitals Due"
                value="3"
                subtitle="In next 30 min"
                color="yellow"
                icon={Heart}
                trend={{ value: 1, label: "overdue", isPositive: false }}
              />
              <KPICard
                title="Medications Due"
                value="12"
                subtitle="Next 2 hours"
                color="purple"
                icon={Pill}
              />
              <KPICard
                title="Alerts"
                value="2"
                subtitle="Requires attention"
                color="red"
                icon={AlertTriangle}
              />
            </div>

            {/* Patient and Vitals */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DataCard
                title="Assigned Patients"
                items={mockPatients}
                onItemClick={(item) => console.log("View patient", item)}
              />
              <DataCard
                title="Vitals Schedule"
                items={[
                  {
                    id: "1",
                    title: "Room 101 - John Doe",
                    subtitle: "Vitals due",
                    status: "pending",
                    value: "Due now",
                  },
                  {
                    id: "2",
                    title: "Room 102 - Jane Smith",
                    subtitle: "Vitals recorded",
                    status: "completed",
                    value: "10 min ago",
                  },
                  {
                    id: "3",
                    title: "Room 103 - Bob Wilson",
                    subtitle: "Vitals due",
                    status: "pending",
                    value: "In 15 min",
                  },
                ]}
              />
            </div>

            {/* Ward Management */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Ward Status
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Occupied Beds
                  </p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                    8/10
                  </p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Available Beds
                  </p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                    2
                  </p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Pending Discharges
                  </p>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                    1
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case "lab_technician":
        return (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                Lab Pipeline
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Test queue and results
              </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard
                title="Tests Pending"
                value="18"
                subtitle="Awaiting processing"
                color="yellow"
                icon={TestTube}
                trend={{ value: 5, label: "new today", isPositive: false }}
              />
              <KPICard
                title="In Progress"
                value="5"
                subtitle="Being analyzed"
                color="blue"
                icon={Activity}
              />
              <KPICard
                title="Completed Today"
                value="42"
                subtitle="Ready for review"
                color="green"
                icon={CheckCircle}
                trend={{ value: 8, label: "vs average", isPositive: true }}
              />
              <KPICard
                title="Avg Turnaround"
                value="2h 15m"
                subtitle="Today's average"
                color="purple"
                icon={Clock}
              />
            </div>

            {/* Lab Orders and Results */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DataCard
                title="Lab Orders Queue"
                items={[
                  {
                    id: "1",
                    title: "CBC + Differential",
                    subtitle: "Patient: Alice Wilson",
                    status: "pending",
                    value: "High priority",
                  },
                  {
                    id: "2",
                    title: "Blood Glucose",
                    subtitle: "Patient: Bob Harris",
                    status: "in-progress",
                    value: "Processing",
                  },
                  {
                    id: "3",
                    title: "Lipid Panel",
                    subtitle: "Patient: Carol Davis",
                    status: "completed",
                    value: "Ready",
                  },
                ]}
              />
              <DataCard
                title="Test Results"
                items={mockLabResults}
                onItemClick={(item) => console.log("View result", item)}
              />
            </div>

            {/* Lab Inventory */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Lab Inventory Status
              </h3>
              <div className="space-y-3">
                {[
                  { name: "Blood Collection Tubes", stock: "85%", status: "normal" },
                  {
                    name: "Reagents - Type A",
                    stock: "35%",
                    status: "urgent",
                  },
                  { name: "Culture Media", stock: "60%", status: "normal" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg"
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.name}
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        item.status === "urgent"
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {item.stock}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "pharmacist":
        return (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                Dispense Hub
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Pharmacy operations center
              </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard
                title="Prescriptions Pending"
                value="28"
                subtitle="Awaiting dispensing"
                color="yellow"
                icon={Pill}
                trend={{ value: 7, label: "new", isPositive: false }}
              />
              <KPICard
                title="Inventory Alerts"
                value="7"
                subtitle="Require action"
                color="red"
                icon={AlertTriangle}
              />
              <KPICard
                title="Expiring Drugs"
                value="3"
                subtitle="In next 30 days"
                color="yellow"
                icon={Clock}
              />
              <KPICard
                title="Dispensed Today"
                value="156"
                subtitle="Medications"
                color="green"
                icon={CheckCircle}
              />
            </div>

            {/* Prescriptions and Inventory */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DataCard
                title="Prescription Queue"
                items={mockPrescriptions}
                onItemClick={(item) => console.log("Dispense", item)}
              />
              <DataCard
                title="Low Stock Items"
                items={[
                  {
                    id: "1",
                    title: "Amoxicillin 500mg",
                    subtitle: "Only 12 units left",
                    status: "urgent",
                    value: "Order",
                  },
                  {
                    id: "2",
                    title: "Metformin 1000mg",
                    subtitle: "35 units available",
                    status: "pending",
                    value: "Monitor",
                  },
                  {
                    id: "3",
                    title: "Aspirin 100mg",
                    subtitle: "150 units in stock",
                    status: "normal",
                    value: "Good",
                  },
                ]}
              />
            </div>

            {/* Drug Interaction Checker */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Recent Drug Interactions Detected
              </h3>
              <div className="space-y-3">
                {[
                  {
                    drugs: "Warfarin + Aspirin",
                    risk: "High",
                    status: "urgent",
                  },
                  {
                    drugs: "Metformin + Contrast",
                    risk: "Medium",
                    status: "pending",
                  },
                ].map((interaction, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      interaction.status === "urgent"
                        ? "bg-red-50 dark:bg-red-900"
                        : "bg-yellow-50 dark:bg-yellow-900"
                    }`}
                  >
                    <span className="font-medium text-gray-900 dark:text-white">
                      {interaction.drugs}
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        interaction.status === "urgent"
                          ? "text-red-600"
                          : "text-yellow-600"
                      }`}
                    >
                      {interaction.risk} Risk
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "accountant":
        return (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                Finance Grid
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Financial overview and insights
              </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard
                title="Revenue Today"
                value="$5,240"
                subtitle="All services"
                color="green"
                icon={DollarSign}
                trend={{ value: 8, label: "vs target", isPositive: true }}
              />
              <KPICard
                title="Outstanding Payments"
                value="$12,850"
                subtitle="Awaiting settlement"
                color="yellow"
                icon={AlertTriangle}
                trend={{ value: 5, label: "vs yesterday", isPositive: false }}
              />
              <KPICard
                title="Insurance Claims"
                value="18"
                subtitle="Pending review"
                color="blue"
                icon={Package}
              />
              <KPICard
                title="Collection Rate"
                value="92%"
                subtitle="This month"
                color="green"
                icon={TrendingUp}
              />
            </div>

            {/* Billing and Payments */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DataCard
                title="Recent Invoices"
                items={mockBilling}
                onItemClick={(item) => console.log("View invoice", item)}
              />
              <DataCard
                title="Payment Tracking"
                items={[
                  {
                    id: "1",
                    title: "PAY-001",
                    subtitle: "John Doe - $150",
                    status: "completed",
                    value: "Received",
                  },
                  {
                    id: "2",
                    title: "PAY-002",
                    subtitle: "Insurance - $2,400",
                    status: "in-progress",
                    value: "Processing",
                  },
                  {
                    id: "3",
                    title: "PAY-003",
                    subtitle: "Jane Smith - $200",
                    status: "pending",
                    value: "Waiting",
                  },
                ]}
              />
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <KPICard
                title="Monthly Revenue"
                value="$145,230"
                color="green"
                icon={DollarSign}
              />
              <KPICard
                title="Operating Costs"
                value="$52,100"
                color="red"
                icon={AlertTriangle}
              />
              <KPICard
                title="Net Profit"
                value="$93,130"
                color="blue"
                icon={TrendingUp}
              />
            </div>
          </div>
        );

      case "receptionist":
        return (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                Front Desk Flow
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Appointment and queue management
              </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard
                title="Appointments Today"
                value="34"
                subtitle="Scheduled"
                color="blue"
                icon={Calendar}
                trend={{
                  value: 6,
                  label: "vs average",
                  isPositive: true,
                }}
              />
              <KPICard
                title="Walk-ins"
                value="8"
                subtitle="So far today"
                color="yellow"
                icon={Users}
              />
              <KPICard
                title="Queue Status"
                value="Active"
                subtitle="22 checked in"
                color="green"
                icon={Activity}
              />
              <KPICard
                title="Avg Wait Time"
                value="12 min"
                subtitle="Current average"
                color="purple"
                icon={Clock}
              />
            </div>

            {/* Queue and Appointments */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DataCard
                title="Today's Queue"
                items={mockQueue}
                onItemClick={(item) => console.log("View queue item", item)}
              />
              <DataCard
                title="Scheduled Appointments"
                items={mockAppointments}
                onItemClick={(item) => console.log("View appointment", item)}
              />
            </div>

            {/* Check-in Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Checked In
                </p>
                <p className="text-4xl font-bold text-green-600 mt-2">22</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Pending Check-in
                </p>
                <p className="text-4xl font-bold text-orange-600 mt-2">12</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No-shows
                </p>
                <p className="text-4xl font-bold text-red-600 mt-2">2</p>
              </div>
            </div>

            {/* Emergency Access */}
            <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900 dark:to-red-800 rounded-2xl p-6 border border-red-200 dark:border-red-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
                    Emergency Access
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-200 mt-1">
                    For critical cases requiring immediate admission
                  </p>
                </div>
                <button className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors">
                  Open Emergency
                </button>
              </div>
            </div>
          </div>
        );

      case "patient":
        return (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                My Health
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Your personal health dashboard
              </p>
            </div>

            {/* Health KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard
                title="Health Score"
                value="85%"
                subtitle="Excellent"
                color="green"
                icon={Heart}
                trend={{
                  value: 2,
                  label: "improvement",
                  isPositive: true,
                }}
              />
              <KPICard
                title="Upcoming Appointments"
                value="2"
                subtitle="Next 30 days"
                color="blue"
                icon={Calendar}
              />
              <KPICard
                title="Active Prescriptions"
                value="4"
                subtitle="Current medications"
                color="purple"
                icon={Pill}
              />
              <KPICard
                title="Lab Results"
                value="1"
                subtitle="Awaiting review"
                color="yellow"
                icon={TestTube}
              />
            </div>

            {/* Appointments and Health Data */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DataCard
                title="My Appointments"
                items={mockAppointments}
                onItemClick={(item) => console.log("View appointment", item)}
              />
              <DataCard
                title="My Prescriptions"
                items={mockPrescriptions}
                onItemClick={(item) => console.log("View prescription", item)}
              />
            </div>

            {/* Health Summary */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Health Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Blood Pressure
                  </p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                    120/80
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Normal range
                  </p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Heart Rate
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
                    72 bpm
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Healthy
                  </p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Blood Glucose
                  </p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                    95 mg/dL
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Normal range
                  </p>
                </div>
                <div className="p-4 bg-orange-50 dark:bg-orange-900 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    BMI
                  </p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-2">
                    23.5
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Healthy weight
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Lab Results */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Recent Lab Results
              </h3>
              <div className="space-y-3">
                {[
                  {
                    test: "Complete Blood Count",
                    date: "2 days ago",
                    status: "Normal",
                  },
                  {
                    test: "Thyroid Panel",
                    date: "1 week ago",
                    status: "Normal",
                  },
                  {
                    test: "Lipid Panel",
                    date: "2 weeks ago",
                    status: "Normal",
                  },
                ].map((result, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {result.test}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {result.date}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 rounded-full text-sm font-medium">
                      {result.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "guardian":
        return (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                Family Hub
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage your family's health
              </p>
            </div>

            {/* Family Overview */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Family Members
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { name: "Sarah (8)", status: "Healthy" },
                  { name: "Michael (12)", status: "Monitored" },
                  { name: "Emma (5)", status: "Healthy" },
                ].map((member, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-lg"
                  >
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {member.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {member.status}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard
                title="Family Members"
                value="3"
                subtitle="All active"
                color="blue"
                icon={Users}
              />
              <KPICard
                title="Upcoming Appointments"
                value="2"
                subtitle="Next 7 days"
                color="green"
                icon={Calendar}
              />
              <KPICard
                title="Active Medications"
                value="5"
                subtitle="Total across family"
                color="purple"
                icon={Pill}
              />
              <KPICard
                title="Health Alerts"
                value="1"
                subtitle="Requires attention"
                color="yellow"
                icon={AlertTriangle}
              />
            </div>

            {/* Family Appointments */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DataCard
                title="Family Appointments"
                items={[
                  {
                    id: "1",
                    title: "Sarah - Pediatrician",
                    subtitle: "Annual Checkup",
                    status: "pending",
                    value: "Tomorrow",
                  },
                  {
                    id: "2",
                    title: "Michael - Dentist",
                    subtitle: "Cleaning & Check",
                    status: "pending",
                    value: "Next week",
                  },
                  {
                    id: "3",
                    title: "Emma - Vaccination",
                    subtitle: "Due vaccines",
                    status: "pending",
                    value: "This month",
                  },
                ]}
              />
              <DataCard
                title="Family Medications"
                items={[
                  {
                    id: "1",
                    title: "Sarah - Allergy Med",
                    subtitle: "Antihistamine",
                    status: "normal",
                    value: "Daily",
                  },
                  {
                    id: "2",
                    title: "Michael - Asthma Inhaler",
                    subtitle: "As needed",
                    status: "normal",
                    value: "On hand",
                  },
                  {
                    id: "3",
                    title: "Emma - Multivitamins",
                    subtitle: "Daily supplement",
                    status: "normal",
                    value: "Daily",
                  },
                ]}
              />
            </div>

            {/* Family Health Overview */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quick Health Check
              </h3>
              <div className="space-y-3">
                {[
                  {
                    member: "Sarah",
                    status: "All vitals normal",
                    icon: "✓",
                  },
                  {
                    member: "Michael",
                    status: "Monitor asthma triggers",
                    icon: "⚠",
                  },
                  {
                    member: "Emma",
                    status: "Ready for next vaccine",
                    icon: "→",
                  },
                ].map((check, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {check.member}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {check.status}
                      </p>
                    </div>
                    <span className="text-xl">{check.icon}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold">Welcome to Joan Healthcare OS</h1>
            <div className="bg-blue-50 dark:bg-blue-900 p-6 rounded-lg">
              <p className="text-gray-700 dark:text-gray-200">
                Healthcare management system designed for all healthcare providers.
              </p>
            </div>
          </div>
        );
    }
  };

  return <>{renderDashboard()}</>;
}
