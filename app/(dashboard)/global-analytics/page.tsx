"use client";
import { Card } from "@/components/ui/card";
import { TrendingUp, Users, DollarSign, Activity, Building, Calendar } from "lucide-react";

export default function GlobalAnalyticsPage() {
  const globalStats = {
    totalHospitals: 12,
    totalUsers: 4230,
    totalRevenue: 1234560,
    activeUsers: 3876,
    monthlyGrowth: 23,
    systemUptime: 99.8
  };

  const hospitalPerformance = [
    { name: "City General Hospital", patients: 1200, revenue: 45230, growth: 15 },
    { name: "Metro Medical Center", patients: 980, revenue: 32450, growth: 8 },
    { name: "Regional Health Network", patients: 756, revenue: 12890, growth: -2 },
    { name: "Central Hospital", patients: 894, revenue: 28750, growth: 12 },
    { name: "Community Medical", patients: 567, revenue: 15670, growth: 5 }
  ];

  const systemMetrics = [
    { label: "API Response Time", value: "145ms", status: "good" },
    { label: "Database Performance", value: "98%", status: "excellent" },
    { label: "Error Rate", value: "0.02%", status: "excellent" },
    { label: "Cache Hit Rate", value: "94%", status: "good" }
  ];

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Global Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Platform-wide performance and insights
            </p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>Last updated: {new Date().toLocaleString()}</span>
          </div>
        </div>
      </Card>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Hospitals</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{globalStats.totalHospitals}</p>
              <p className="text-sm text-green-600 mt-1">+2 this month</p>
            </div>
            <Building className="w-8 h-8 text-blue-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Users</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{globalStats.activeUsers.toLocaleString()}</p>
              <p className="text-sm text-green-600 mt-1">+{globalStats.monthlyGrowth}% growth</p>
            </div>
            <Users className="w-8 h-8 text-green-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">${globalStats.totalRevenue.toLocaleString()}</p>
              <p className="text-sm text-green-600 mt-1">+18% this month</p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">System Uptime</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{globalStats.systemUptime}%</p>
              <p className="text-sm text-green-600 mt-1">Excellent</p>
            </div>
            <Activity className="w-8 h-8 text-emerald-600" />
          </div>
        </Card>
      </div>

      {/* Hospital Performance Chart */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-6">Hospital Performance</h2>
        <div className="space-y-4">
          {hospitalPerformance.map((hospital, index) => (
            <div key={index} className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-600 rounded-lg">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white">{hospital.name}</h3>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <span>{hospital.patients} patients</span>
                  <span>${hospital.revenue.toLocaleString()} revenue</span>
                  <span className={hospital.growth >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {hospital.growth >= 0 ? '+' : ''}{hospital.growth}% growth
                  </span>
                </div>
              </div>
              <div className="w-32 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${Math.min(100, (hospital.patients / 15))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* System Health & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-6">System Health</h2>
          <div className="space-y-4">
            {systemMetrics.map((metric, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-200 dark:border-slate-600 rounded-lg">
                <span className="text-sm font-medium text-gray-900 dark:text-white">{metric.label}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{metric.value}</span>
                  <div className={`w-2 h-2 rounded-full ${
                    metric.status === 'excellent' ? 'bg-green-500' :
                    metric.status === 'good' ? 'bg-blue-500' : 'bg-yellow-500'
                  }`} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-6">Revenue Trends</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">This Month</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">$123,456</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Last Month</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">$101,234</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Growth</span>
              <span className="text-lg font-bold text-green-600">+22.1%</span>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3">
                <div className="bg-green-600 h-3 rounded-full" style={{ width: '75%' }} />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">75% of monthly target achieved</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-6">Recent Platform Activity</h2>
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
            <div className="flex-1">
              <p className="text-sm text-gray-900 dark:text-white">New hospital onboarded: Valley Medical Center</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">2 hours ago</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <div className="flex-1">
              <p className="text-sm text-gray-900 dark:text-white">System update deployed successfully</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">5 hours ago</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
            <div className="flex-1">
              <p className="text-sm text-gray-900 dark:text-white">Monthly revenue target exceeded</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">1 day ago</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
