"use client";
import { Card } from "@/components/ui/card";
import { TrendingUp, Users, DollarSign, Activity, Clock, Calendar } from "lucide-react";

export default function AnalyticsPage() {
  const hospitalStats = {
    patientsToday: 120,
    avgWaitTime: 18,
    bedOccupancy: 85,
    revenueToday: 8420,
    staffOnDuty: 45,
    appointmentsCompleted: 89
  };

  const departmentPerformance = [
    { name: "Emergency", patients: 45, avgWait: 12, satisfaction: 4.2 },
    { name: "Cardiology", patients: 32, avgWait: 25, satisfaction: 4.6 },
    { name: "ICU", patients: 18, avgWait: 5, satisfaction: 4.8 },
    { name: "Pediatrics", patients: 25, avgWait: 15, satisfaction: 4.7 }
  ];

  const hourlyTraffic = [
    { hour: "08:00", patients: 12 },
    { hour: "10:00", patients: 28 },
    { hour: "12:00", patients: 35 },
    { hour: "14:00", patients: 42 },
    { hour: "16:00", patients: 38 },
    { hour: "18:00", patients: 22 }
  ];

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Hospital Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Performance insights and operational metrics
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <select className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
              <option>Last 24 hours</option>
              <option>Last 7 days</option>
              <option>Last 30 days</option>
            </select>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              Export Report
            </button>
          </div>
        </div>
      </Card>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Patients Today</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{hospitalStats.patientsToday}</p>
              <p className="text-sm text-green-600 mt-1">+12% from yesterday</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Wait Time</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{hospitalStats.avgWaitTime}min</p>
              <p className="text-sm text-red-600 mt-1">+3min from yesterday</p>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Bed Occupancy</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{hospitalStats.bedOccupancy}%</p>
              <p className="text-sm text-green-600 mt-1">Optimal range</p>
            </div>
            <Activity className="w-8 h-8 text-green-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Revenue Today</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">${hospitalStats.revenueToday.toLocaleString()}</p>
              <p className="text-sm text-green-600 mt-1">+8% from yesterday</p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-600" />
          </div>
        </Card>
      </div>

      {/* Department Performance */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-6">Department Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {departmentPerformance.map((dept, index) => (
            <div key={index} className="p-4 border border-gray-200 dark:border-slate-600 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">{dept.name}</h3>
                <span className="text-sm text-gray-600 dark:text-gray-400">{dept.patients} patients</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Avg Wait Time</span>
                  <span className="font-medium">{dept.avgWait} min</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Satisfaction</span>
                  <span className="font-medium">{dept.satisfaction}/5.0 ⭐</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(dept.satisfaction / 5) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Hourly Traffic & Staff Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-6">Hourly Patient Traffic</h2>
          <div className="space-y-3">
            {hourlyTraffic.map((hour, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium w-16">{hour.hour}</span>
                <div className="flex-1 mx-4">
                  <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full"
                      style={{ width: `${(hour.patients / 50) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium w-12 text-right">{hour.patients}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-6">Staff & Resource Metrics</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
              <span className="text-sm font-medium">Staff on Duty</span>
              <span className="text-lg font-bold text-blue-600">{hospitalStats.staffOnDuty}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
              <span className="text-sm font-medium">Appointments Completed</span>
              <span className="text-lg font-bold text-green-600">{hospitalStats.appointmentsCompleted}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
              <span className="text-sm font-medium">Patient Satisfaction</span>
              <span className="text-lg font-bold text-purple-600">4.6/5.0</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
              <span className="text-sm font-medium">Equipment Utilization</span>
              <span className="text-lg font-bold text-emerald-600">87%</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Trends & Insights */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-6">Key Insights & Trends</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Peak Hours</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Highest patient traffic between 12:00-16:00. Consider additional staffing during peak hours.
            </p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900 rounded-lg">
            <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">Performance</h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              Emergency department showing excellent response times. Keep up the great work!
            </p>
          </div>
          <div className="p-4 bg-orange-50 dark:bg-orange-900 rounded-lg">
            <h3 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">Improvement Area</h3>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              Cardiology wait times have increased. Consider process optimization.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
