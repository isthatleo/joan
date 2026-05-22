"use client";

import { Bed, Users, AlertCircle, TrendingUp, Plus, Trash2 } from "lucide-react";

export default function ResourcesDashboard() {
  const bedInventory = [
    {
      ward: "ICU",
      total: 20,
      occupied: 18,
      available: 2,
      status: "critical",
    },
    {
      ward: "General Ward",
      total: 80,
      occupied: 62,
      available: 18,
      status: "good",
    },
    {
      ward: "Pediatrics",
      total: 40,
      occupied: 28,
      available: 12,
      status: "good",
    },
    {
      ward: "Emergency",
      total: 30,
      occupied: 24,
      available: 6,
      status: "warning",
    },
  ];

  const staffSchedule = [
    {
      dept: "Emergency",
      doctors: 8,
      nurses: 16,
      technicians: 6,
      total: 30,
    },
    { dept: "Surgery", doctors: 6, nurses: 12, technicians: 4, total: 22 },
    {
      dept: "Cardiology",
      doctors: 5,
      nurses: 10,
      technicians: 3,
      total: 18,
    },
    { dept: "Pediatrics", doctors: 4, nurses: 8, technicians: 2, total: 14 },
  ];

  const equipment = [
    {
      name: "Ventilators",
      available: 8,
      total: 12,
      maintenance: 2,
      status: "good",
    },
    {
      name: "ECG Machines",
      available: 12,
      total: 15,
      maintenance: 1,
      status: "good",
    },
    {
      name: "Ultrasound Units",
      available: 5,
      total: 8,
      maintenance: 2,
      status: "warning",
    },
    {
      name: "X-Ray Machines",
      available: 3,
      total: 4,
      maintenance: 1,
      status: "critical",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          Resource Management
        </p>
        <h1 className="text-3xl font-bold text-foreground mt-1">
          Resources & Capacity
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Hospital beds, staff allocation, and equipment management
        </p>
      </div>

      {/* Bed Occupancy Overview */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Bed className="h-5 w-5 text-orange-500" />
          Bed Occupancy Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {bedInventory.map((bed, idx) => {
            const occupancyPercent = (bed.occupied / bed.total) * 100;
            return (
              <div
                key={idx}
                className={`p-6 rounded-2xl border ${
                  bed.status === "critical"
                    ? "border-red-200 bg-red-50"
                    : bed.status === "warning"
                    ? "border-yellow-200 bg-yellow-50"
                    : "border-green-200 bg-green-50"
                } hover:shadow-lg transition-all`}
              >
                <h3 className="text-sm font-bold text-gray-900 mb-3">
                  {bed.ward}
                </h3>
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">
                      Occupancy
                    </span>
                    <span className="text-xs font-bold text-gray-900">
                      {occupancyPercent.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        bed.status === "critical"
                          ? "bg-red-500"
                          : bed.status === "warning"
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                      style={{ width: `${occupancyPercent}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/50 border border-white/50">
                  <span className="text-xs text-gray-700">
                    <span className="font-bold">{bed.occupied}</span>/{bed.total}
                  </span>
                  <span className="text-xs font-bold text-green-600">
                    {bed.available} free
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Staffing & Equipment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Staff Allocation */}
        <div className="p-6 rounded-2xl border border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-500" />
            Staff Allocation
          </h2>
          <div className="space-y-4">
            {staffSchedule.map((staff, idx) => (
              <div key={idx} className="p-4 rounded-lg border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-900">
                    {staff.dept}
                  </p>
                  <span className="text-xs font-bold px-2 py-1 rounded-md bg-orange-50 text-orange-600">
                    {staff.total} total
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="text-blue-700 font-semibold">{staff.doctors}</p>
                    <p className="text-blue-600">Doctors</p>
                  </div>
                  <div className="p-2 rounded-lg bg-pink-50 border border-pink-200">
                    <p className="text-pink-700 font-semibold">{staff.nurses}</p>
                    <p className="text-pink-600">Nurses</p>
                  </div>
                  <div className="p-2 rounded-lg bg-purple-50 border border-purple-200">
                    <p className="text-purple-700 font-semibold">
                      {staff.technicians}
                    </p>
                    <p className="text-purple-600">Tech</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Equipment Availability */}
        <div className="p-6 rounded-2xl border border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            Equipment Status
          </h2>
          <div className="space-y-3">
            {equipment.map((equip, idx) => {
              const availPercent = (equip.available / equip.total) * 100;
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${
                    equip.status === "critical"
                      ? "border-red-200 bg-red-50/30"
                      : equip.status === "warning"
                      ? "border-yellow-200 bg-yellow-50/30"
                      : "border-green-200 bg-green-50/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-900">
                      {equip.name}
                    </p>
                    <span
                      className={`text-xs px-2 py-1 rounded-md font-semibold ${
                        equip.status === "critical"
                          ? "text-red-600 bg-red-50"
                          : equip.status === "warning"
                          ? "text-yellow-600 bg-yellow-50"
                          : "text-green-600 bg-green-50"
                      }`}
                    >
                      {equip.available}/{equip.total}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          equip.status === "critical"
                            ? "bg-red-500"
                            : equip.status === "warning"
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        }`}
                        style={{ width: `${availPercent}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-600">
                      {equip.maintenance} maintenance
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Capacity Planning */}
      <div className="p-6 rounded-2xl border border-gray-200 bg-white">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          Capacity Alerts & Recommendations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border border-red-200 bg-red-50">
            <p className="text-sm font-semibold text-red-900 mb-2">
              🚨 Critical Capacity
            </p>
            <ul className="space-y-1 text-xs text-red-800">
              <li>• ICU beds at 90% capacity</li>
              <li>• Only 2 ICU beds available</li>
              <li>• X-Ray machines need attention</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50">
            <p className="text-sm font-semibold text-yellow-900 mb-2">
              ⚠️ Maintenance Required
            </p>
            <ul className="space-y-1 text-xs text-yellow-800">
              <li>• 2 Ultrasound units in maintenance</li>
              <li>• 1 X-Ray machine scheduled</li>
              <li>• Estimated completion: May 15</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
            <p className="text-sm font-semibold text-blue-900 mb-2">
              💡 Recommendations
            </p>
            <ul className="space-y-1 text-xs text-blue-800">
              <li>• Consider adding 10 ICU beds</li>
              <li>• Schedule equipment maintenance during off-peak</li>
              <li>• Redistribute staff for peak hours</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg border border-green-200 bg-green-50">
            <p className="text-sm font-semibold text-green-900 mb-2">
              ✓ Opportunities
            </p>
            <ul className="space-y-1 text-xs text-green-800">
              <li>• 18 available beds in General Ward</li>
              <li>• Staff utilization at optimal levels</li>
              <li>• Equipment availability good overall</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

