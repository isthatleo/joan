"use client";

import { DashboardGreeting } from "@/components/DashboardGreeting";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  HeartPulse, Activity, Thermometer, Weight, Ruler, Droplets,
  TrendingUp, TrendingDown, Calendar, Clock, Target, Award,
  AlertTriangle, CheckCircle2, RefreshCw, Download, Share,
  BarChart3, LineChart, PieChart, Zap
} from "lucide-react";

interface VitalSigns {
  heartRate: number;
  bloodPressure: {
    systolic: number;
    diastolic: number;
  };
  temperature: number;
  weight: number;
  height: number;
  bmi: number;
  oxygenSaturation: number;
  respiratoryRate: number;
  lastUpdated: string;
}

interface HealthMetric {
  id: string;
  name: string;
  value: number | string;
  unit: string;
  status: "normal" | "high" | "low" | "critical";
  trend: "up" | "down" | "stable";
  trendValue: number;
  date: string;
}

interface HealthGoal {
  id: string;
  title: string;
  description: string;
  target: number | string;
  current: number | string;
  unit: string;
  deadline: string;
  progress: number;
  status: "active" | "completed" | "overdue";
}

interface SymptomLog {
  id: string;
  symptom: string;
  severity: 1 | 2 | 3 | 4 | 5;
  description: string;
  date: string;
  time: string;
  notes?: string;
}

export default function MyHealthPage() {
  const { slug } = useParams();
  const [vitalSigns, setVitalSigns] = useState<VitalSigns | null>(null);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  const [healthGoals, setHealthGoals] = useState<HealthGoal[]>([]);
  const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"vitals" | "metrics" | "goals" | "symptoms">("vitals");

  // Fetch health data
  const fetchHealthData = async () => {
    try {
      setRefreshing(true);
      const [vitalsRes, metricsRes, goalsRes, symptomsRes] = await Promise.all([
        fetch(`/api/tenant/${slug}/patient/health/vitals`),
        fetch(`/api/tenant/${slug}/patient/health/metrics`),
        fetch(`/api/tenant/${slug}/patient/health/goals`),
        fetch(`/api/tenant/${slug}/patient/health/symptoms`),
      ]);

      if (vitalsRes.ok) setVitalSigns(await vitalsRes.json());
      if (metricsRes.ok) setHealthMetrics(await metricsRes.json());
      if (goalsRes.ok) setHealthGoals(await goalsRes.json());
      if (symptomsRes.ok) setSymptomLogs(await symptomsRes.json());

      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch health data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "normal": return "text-green-600 bg-green-50";
      case "high": return "text-red-600 bg-red-50";
      case "low": return "text-blue-600 bg-blue-50";
      case "critical": return "text-red-700 bg-red-100";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const getGoalStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-600 bg-green-50 border-green-200";
      case "active": return "text-blue-600 bg-blue-50 border-blue-200";
      case "overdue": return "text-red-600 bg-red-50 border-red-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
          Loading your health data...
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "vitals", label: "Vital Signs", icon: HeartPulse },
    { id: "metrics", label: "Health Metrics", icon: BarChart3 },
    { id: "goals", label: "Health Goals", icon: Target },
    { id: "symptoms", label: "Symptom Log", icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <DashboardGreeting roleLabel="Patient" />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Health Monitoring
          </p>
          <h1 className="text-3xl font-bold text-foreground mt-1">
            My Health Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your vital signs, health metrics, and wellness goals
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all">
            <Download className="h-4 w-4" />
            Export Data
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all">
            <Share className="h-4 w-4" />
            Share with Doctor
          </button>
          <button
            onClick={fetchHealthData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-white text-orange-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Vital Signs Tab */}
      {activeTab === "vitals" && (
        <div className="space-y-6">
          {/* Current Vital Signs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-6 rounded-2xl border border-gray-200 bg-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-red-50 text-red-600">
                  <HeartPulse className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Heart Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{vitalSigns?.heartRate || 72} BPM</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span>+2 BPM from last reading</span>
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-gray-200 bg-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Blood Pressure</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {vitalSigns?.bloodPressure.systolic || 120}/{vitalSigns?.bloodPressure.diastolic || 80}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                <span>Normal range</span>
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-gray-200 bg-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
                  <Thermometer className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Temperature</p>
                  <p className="text-2xl font-bold text-gray-900">{vitalSigns?.temperature || 98.6}°F</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                <span>Normal</span>
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-gray-200 bg-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                  <Droplets className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Oxygen Saturation</p>
                  <p className="text-2xl font-bold text-gray-900">{vitalSigns?.oxygenSaturation || 98}%</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                <span>Excellent</span>
              </div>
            </div>
          </div>

          {/* Additional Vitals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 rounded-2xl border border-gray-200 bg-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-green-50 text-green-600">
                  <Weight className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Weight</p>
                  <p className="text-2xl font-bold text-gray-900">{vitalSigns?.weight || 165} lbs</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <TrendingDown className="h-3 w-3 text-green-500" />
                <span>-2 lbs this month</span>
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-gray-200 bg-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-cyan-50 text-cyan-600">
                  <Ruler className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">BMI</p>
                  <p className="text-2xl font-bold text-gray-900">{vitalSigns?.bmi || 24.5}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                <span>Healthy range</span>
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-gray-200 bg-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Respiratory Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{vitalSigns?.respiratoryRate || 16} breaths/min</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                <span>Normal</span>
              </div>
            </div>
          </div>

          {/* Last Updated */}
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-blue-900 font-medium">Last Updated</p>
                <p className="text-blue-700 text-sm">
                  {vitalSigns?.lastUpdated ? new Date(vitalSigns.lastUpdated).toLocaleString() : "Recently"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Health Metrics Tab */}
      {activeTab === "metrics" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {healthMetrics.map((metric) => (
              <div key={metric.id} className="p-6 rounded-2xl border border-gray-200 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{metric.name}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {metric.value} {metric.unit}
                    </p>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(metric.status)}`}>
                    {metric.status.toUpperCase()}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {metric.trend === "up" ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : metric.trend === "down" ? (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  ) : (
                    <div className="h-3 w-3 rounded-full bg-gray-300" />
                  )}
                  <span>
                    {metric.trendValue > 0 ? "+" : ""}{metric.trendValue} {metric.unit} from last reading
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(metric.date).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>

          {/* Health Trends Chart Placeholder */}
          <div className="p-6 rounded-2xl border border-gray-200 bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Health Trends</h3>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <LineChart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Interactive health trends chart</p>
                <p className="text-sm text-gray-400">Coming soon - Advanced analytics</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Health Goals Tab */}
      {activeTab === "goals" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Your Health Goals</h2>
            <button className="px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-all">
              Add New Goal
            </button>
          </div>

          <div className="space-y-4">
            {healthGoals.map((goal) => (
              <div
                key={goal.id}
                className={`p-6 rounded-2xl border bg-white ${getGoalStatusColor(goal.status)}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{goal.title}</h3>
                    <p className="text-gray-600">{goal.description}</p>
                  </div>
                  <div className={`px-3 py-1 rounded text-sm font-semibold ${getGoalStatusColor(goal.status)}`}>
                    {goal.status.toUpperCase()}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span>Progress</span>
                    <span>{goal.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-orange-500 h-2 rounded-full transition-all"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Target: {goal.target} {goal.unit}</span>
                  <span>Current: {goal.current} {goal.unit}</span>
                  <span>Deadline: {new Date(goal.deadline).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>

          {healthGoals.length === 0 && (
            <div className="text-center py-12">
              <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No health goals set</p>
              <p className="text-sm text-gray-400 mt-1">
                Set goals to track your health progress
              </p>
            </div>
          )}
        </div>
      )}

      {/* Symptom Log Tab */}
      {activeTab === "symptoms" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Symptom Log</h2>
            <button className="px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-all">
              Log New Symptom
            </button>
          </div>

          <div className="space-y-4">
            {symptomLogs.map((symptom) => (
              <div key={symptom.id} className="p-6 rounded-2xl border border-gray-200 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{symptom.symptom}</h3>
                    <p className="text-gray-600">{symptom.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-3 h-3 rounded-full ${
                            i < symptom.severity ? "bg-red-500" : "bg-gray-200"
                          }`}
                        />
                      ))}
                      <span className="text-sm text-gray-600 ml-2">Severity: {symptom.severity}/5</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {new Date(symptom.date).toLocaleDateString()} at {symptom.time}
                    </p>
                  </div>
                </div>

                {symptom.notes && (
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-600">
                      <strong>Notes:</strong> {symptom.notes}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {symptomLogs.length === 0 && (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No symptoms logged</p>
              <p className="text-sm text-gray-400 mt-1">
                Track your symptoms to share with your healthcare provider
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
