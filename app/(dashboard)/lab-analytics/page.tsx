"use client";
import { Card } from "@/components/ui/card";
import { TrendingUp, TestTube, Clock, CheckCircle, AlertTriangle, Activity, Calendar } from "lucide-react";

export default function LabAnalyticsPage() {
  const labStats = {
    testsToday: 145,
    avgProcessingTime: 45,
    completedTests: 132,
    pendingTests: 13,
    errorRate: 0.8,
    criticalResults: 5
  };

  const testPerformance = [
    { test: "CBC", count: 45, avgTime: 30, accuracy: 99.2 },
    { test: "Lipid Panel", count: 32, avgTime: 45, accuracy: 98.8 },
    { test: "Liver Function", count: 28, avgTime: 40, accuracy: 99.5 },
    { test: "Thyroid Panel", count: 25, avgTime: 50, accuracy: 98.9 },
    { test: "Urinalysis", count: 15, avgTime: 25, accuracy: 99.7 }
  ];

  const dailyWorkload = [
    { day: "Mon", tests: 142 },
    { day: "Tue", tests: 158 },
    { day: "Wed", tests: 134 },
    { day: "Thu", tests: 167 },
    { day: "Fri", tests: 145 },
    { day: "Sat", tests: 89 },
    { day: "Sun", tests: 67 }
  ];

  const equipmentStatus = [
    { name: "Hematology Analyzer", status: "operational", uptime: 99.5, lastMaintenance: "2026-03-15" },
    { name: "Chemistry Analyzer", status: "operational", uptime: 98.8, lastMaintenance: "2026-03-20" },
    { name: "Microscope", status: "operational", uptime: 100, lastMaintenance: "2026-04-01" },
    { name: "Centrifuge", status: "maintenance", uptime: 95.2, lastMaintenance: "2026-04-10" }
  ];

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Lab Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Laboratory performance metrics and insights
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <select className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 3 months</option>
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tests Today</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{labStats.testsToday}</p>
              <p className="text-sm text-green-600 mt-1">+12% from yesterday</p>
            </div>
            <TestTube className="w-8 h-8 text-blue-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Processing Time</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{labStats.avgProcessingTime}min</p>
              <p className="text-sm text-green-600 mt-1">-5min from last week</p>
            </div>
            <Clock className="w-8 h-8 text-green-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completion Rate</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{Math.round((labStats.completedTests / labStats.testsToday) * 100)}%</p>
              <p className="text-sm text-green-600 mt-1">Excellent performance</p>
            </div>
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Error Rate</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{labStats.errorRate}%</p>
              <p className="text-sm text-green-600 mt-1">Below target</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* Test Performance */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-6">Test Performance by Type</h2>
        <div className="space-y-4">
          {testPerformance.map((test, index) => (
            <div key={index} className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-600 rounded-lg">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white">{test.test}</h3>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <span>{test.count} tests</span>
                  <span>Avg: {test.avgTime}min</span>
                  <span>Accuracy: {test.accuracy}%</span>
                </div>
              </div>
              <div className="w-32 bg-gray-200 dark:bg-slate-700 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full"
                  style={{ width: `${test.accuracy}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Daily Workload & Equipment Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-6">Weekly Test Volume</h2>
          <div className="space-y-3">
            {dailyWorkload.map((day, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium w-12">{day.day}</span>
                <div className="flex-1 mx-4">
                  <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full"
                      style={{ width: `${(day.tests / 170) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium w-12 text-right">{day.tests}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-6">Equipment Status</h2>
          <div className="space-y-4">
            {equipmentStatus.map((equipment, index) => (
              <div key={index} className="p-3 border border-gray-200 dark:border-slate-600 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">{equipment.name}</span>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      equipment.status === 'operational' ? 'bg-green-500' : 'bg-yellow-500'
                    }`} />
                    <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">{equipment.status}</span>
                  </div>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Uptime: {equipment.uptime}% | Last Maintenance: {equipment.lastMaintenance}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quality Metrics & Alerts */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-6">Quality Metrics & Alerts</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-green-50 dark:bg-green-900 rounded-lg">
            <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">Quality Control</h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              All quality control checks passed for the week. Equipment calibration within acceptable ranges.
            </p>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Turnaround Time</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Average TAT improved by 8% this month. STAT results delivered within 30 minutes 95% of the time.
            </p>
          </div>
          <div className="p-4 bg-orange-50 dark:bg-orange-900 rounded-lg">
            <h3 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">Reagent Inventory</h3>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              3 reagents are below minimum stock levels. Consider reordering CBC reagent and glucose strips.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
