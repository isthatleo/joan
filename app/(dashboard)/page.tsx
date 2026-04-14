"use client";
import { useAuthStore } from "@/stores/auth";
import { Card } from "@/components/ui/card";
import { Activity, Users, DollarSign, Clock, AlertTriangle, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuthStore();
  const role = user?.role || 'doctor';

  const getDashboardCards = (role: string) => {
    switch (role) {
      case 'super_admin':
        return [
          { title: "Total Hospitals", value: "12", change: "+2", icon: Users, color: "blue" },
          { title: "Active Patients", value: "4,230", change: "+120", icon: Activity, color: "green" },
          { title: "Daily Transactions", value: "$45,320", change: "+15%", icon: DollarSign, color: "purple" },
          { title: "System Health", value: "99.8%", change: "✓", icon: TrendingUp, color: "emerald" },
        ];
      case 'hospital_admin':
        return [
          { title: "Patients Today", value: "120", change: "+8", icon: Users, color: "blue" },
          { title: "Active Staff", value: "45", change: "+2", icon: Activity, color: "green" },
          { title: "Revenue Today", value: "$8,420", change: "+12%", icon: DollarSign, color: "purple" },
          { title: "Bed Occupancy", value: "85%", change: "-2%", icon: TrendingUp, color: "emerald" },
        ];
      case 'doctor':
        return [
          { title: "Today's Appointments", value: "12", change: "+3", icon: Clock, color: "blue" },
          { title: "Waiting Patients", value: "4", change: "-1", icon: Users, color: "orange" },
          { title: "Critical Alerts", value: "2", change: "0", icon: AlertTriangle, color: "red" },
          { title: "Completed Today", value: "8", change: "+2", icon: Activity, color: "green" },
        ];
      case 'nurse':
        return [
          { title: "Assigned Patients", value: "8", change: "+1", icon: Users, color: "blue" },
          { title: "Vitals Due", value: "3", change: "-2", icon: Activity, color: "orange" },
          { title: "Medications", value: "12", change: "+4", icon: Clock, color: "purple" },
          { title: "Alerts", value: "2", change: "0", icon: AlertTriangle, color: "red" },
        ];
      case 'lab_technician':
        return [
          { title: "Tests Pending", value: "15", change: "+5", icon: Clock, color: "orange" },
          { title: "In Progress", value: "5", change: "+1", icon: Activity, color: "blue" },
          { title: "Completed Today", value: "42", change: "+8", icon: TrendingUp, color: "green" },
          { title: "Avg Turnaround", value: "2h 30m", change: "-15m", icon: Clock, color: "purple" },
        ];
      case 'pharmacist':
        return [
          { title: "Prescriptions Pending", value: "28", change: "+7", icon: Clock, color: "orange" },
          { title: "Inventory Alerts", value: "7", change: "+2", icon: AlertTriangle, color: "red" },
          { title: "Expiring Drugs", value: "3", change: "0", icon: TrendingUp, color: "yellow" },
          { title: "Dispensed Today", value: "156", change: "+23", icon: Activity, color: "green" },
        ];
      case 'accountant':
        return [
          { title: "Revenue Today", value: "$5,240", change: "+8%", icon: DollarSign, color: "green" },
          { title: "Outstanding Payments", value: "$12,850", change: "-5%", icon: Clock, color: "orange" },
          { title: "Insurance Claims", value: "18", change: "+3", icon: Activity, color: "blue" },
          { title: "Payment Methods", value: "4", change: "0", icon: TrendingUp, color: "purple" },
        ];
      case 'receptionist':
        return [
          { title: "Appointments Today", value: "34", change: "+6", icon: Clock, color: "blue" },
          { title: "Walk-ins", value: "8", change: "+2", icon: Users, color: "orange" },
          { title: "Queue Status", value: "Active", change: "✓", icon: Activity, color: "green" },
          { title: "Check-ins Done", value: "22", change: "+5", icon: TrendingUp, color: "emerald" },
        ];
      case 'patient':
        return [
          { title: "Upcoming Appointments", value: "2", change: "0", icon: Clock, color: "blue" },
          { title: "Active Prescriptions", value: "4", change: "+1", icon: Activity, color: "green" },
          { title: "Unread Lab Results", value: "1", change: "0", icon: AlertTriangle, color: "orange" },
          { title: "Health Score", value: "85%", change: "+2%", icon: TrendingUp, color: "emerald" },
        ];
      case 'guardian':
        return [
          { title: "Family Members", value: "3", change: "0", icon: Users, color: "blue" },
          { title: "Upcoming Appointments", value: "2", change: "+1", icon: Clock, color: "green" },
          { title: "Active Medications", value: "5", change: "0", icon: Activity, color: "purple" },
          { title: "Health Alerts", value: "1", change: "0", icon: AlertTriangle, color: "red" },
        ];
      default:
        return [
          { title: "Welcome", value: "Joan OS", change: "Ready", icon: Activity, color: "blue" },
        ];
    }
  };

  const cards = getDashboardCards(role);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {role.replace('_', ' ').toUpperCase()} Dashboard
        </h1>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => (
          <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {card.title}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {card.value}
                </p>
                <p className={`text-sm mt-2 ${
                  card.change.startsWith('+') ? 'text-green-600' :
                  card.change.startsWith('-') ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {card.change}
                </p>
              </div>
              <div className={`p-3 rounded-full bg-${card.color}-100 dark:bg-${card.color}-900`}>
                <card.icon className={`w-6 h-6 text-${card.color}-600 dark:text-${card.color}-400`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Additional Dashboard Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <p className="text-sm">Patient check-in completed</p>
              <span className="text-xs text-gray-500 ml-auto">2 min ago</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <p className="text-sm">Lab results uploaded</p>
              <span className="text-xs text-gray-500 ml-auto">5 min ago</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <p className="text-sm">Appointment rescheduled</p>
              <span className="text-xs text-gray-500 ml-auto">10 min ago</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="p-3 bg-blue-50 dark:bg-blue-900 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
              <p className="text-xs text-center">New Patient</p>
            </button>
            <button className="p-3 bg-green-50 dark:bg-green-900 rounded-lg hover:bg-green-100 dark:hover:bg-green-800 transition-colors">
              <Clock className="w-5 h-5 text-green-600 dark:text-green-400 mx-auto mb-1" />
              <p className="text-xs text-center">Schedule</p>
            </button>
            <button className="p-3 bg-purple-50 dark:bg-purple-900 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-800 transition-colors">
              <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
              <p className="text-xs text-center">Vitals</p>
            </button>
            <button className="p-3 bg-orange-50 dark:bg-orange-900 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-800 transition-colors">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 mx-auto mb-1" />
              <p className="text-xs text-center">Alerts</p>
            </button>
          </div>
        </Card>
      </div>

      {/* Role-specific additional content */}
      {role === 'doctor' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Today's Schedule</h3>
          <div className="space-y-3">
            {[
              { time: "09:00", patient: "John Doe", type: "Consultation" },
              { time: "10:30", patient: "Jane Smith", type: "Follow-up" },
              { time: "11:15", patient: "Bob Johnson", type: "New Patient" },
            ].map((appt, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                <div>
                  <p className="font-medium">{appt.patient}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{appt.type}</p>
                </div>
                <span className="text-sm font-mono">{appt.time}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {role === 'patient' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Health Summary</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">85%</p>
              <p className="text-sm text-gray-600">Health Score</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">4</p>
              <p className="text-sm text-gray-600">Active Meds</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
