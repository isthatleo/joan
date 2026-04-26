"use client";

import { PageHeader, StatCard, SectionCard } from "@/components/ui";

export default function TenantsPage() {
  return (
    <div>
      <PageHeader
        title="Tenant Management"
        subtitle="Manage all hospital tenants and subscriptions"
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Tenants" value="47" subtitle="Active hospitals" />
        <StatCard title="Active Subscriptions" value="45" subtitle="Paid accounts" />
        <StatCard title="Trial Accounts" value="2" subtitle="Free tier" />
        <StatCard title="Monthly Revenue" value="$487,200" subtitle="From tenants" />
      </div>

      {/* Tenant List */}
      <SectionCard title="All Tenants">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Hospital Name</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Plan</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Monthly Revenue</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Patients</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: "City Medical Center", plan: "Premium", status: "active", revenue: "$8,500", patients: 542 },
                { name: "County Hospital", plan: "Standard", status: "active", revenue: "$5,200", patients: 298 },
                { name: "Private Clinic", plan: "Premium", status: "active", revenue: "$7,800", patients: 215 },
                { name: "Medical University", plan: "Standard", status: "active", revenue: "$4,900", patients: 167 },
                { name: "Emergency Care Center", plan: "Basic", status: "active", revenue: "$2,100", patients: 89 },
              ].map((tenant, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">{tenant.name}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{tenant.plan}</td>
                  <td className="py-3 px-4">
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-md">
                      {tenant.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm font-semibold text-gray-900">{tenant.revenue}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{tenant.patients}</td>
                  <td className="py-3 px-4 text-sm">
                    <button className="text-blue-600 hover:text-blue-700 font-medium">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Plan Summary */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        {[
          { name: "Premium Tenants", count: 18, color: "blue", price: "High Tier" },
          { name: "Standard Tenants", count: 22, color: "green", price: "Mid Tier" },
          { name: "Basic Tenants", count: 7, color: "orange", price: "Entry Tier" },
        ].map((plan, idx) => (
          <SectionCard key={idx} title={plan.name}>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900 mb-2">{plan.count}</p>
              <p className="text-sm text-gray-600">{plan.price}</p>
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
