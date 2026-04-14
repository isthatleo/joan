"use client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Search, Plus, Building, Users, Settings, AlertTriangle } from "lucide-react";

export default function TenantsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");

  // Mock data - in real app, fetch from API
  const tenants = [
    {
      id: "1",
      name: "City General Hospital",
      slug: "city-general",
      plan: "Premium",
      status: "Active",
      hospitals: 1,
      users: 245,
      revenue: "$45,230",
      lastActivity: "2 hours ago"
    },
    {
      id: "2",
      name: "Metro Medical Center",
      slug: "metro-medical",
      plan: "Standard",
      status: "Active",
      hospitals: 2,
      users: 189,
      revenue: "$32,450",
      lastActivity: "1 day ago"
    },
    {
      id: "3",
      name: "Regional Health Network",
      slug: "regional-health",
      plan: "Basic",
      status: "Suspended",
      hospitals: 1,
      users: 67,
      revenue: "$12,890",
      lastActivity: "1 week ago"
    }
  ];

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterPlan === "all" || tenant.plan.toLowerCase() === filterPlan;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.status === "Active").length,
    premium: tenants.filter(t => t.plan === "Premium").length,
    totalRevenue: tenants.reduce((sum, t) => sum + parseFloat(t.revenue.replace(/[$,]/g, '')), 0)
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tenant Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage hospitals and healthcare organizations
            </p>
          </div>
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-5 h-5" />
            <span>Add New Tenant</span>
          </button>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tenants</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <Building className="w-8 h-8 text-blue-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active</p>
              <p className="text-3xl font-bold text-green-600">{stats.active}</p>
            </div>
            <Users className="w-8 h-8 text-green-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Premium Plans</p>
              <p className="text-3xl font-bold text-purple-600">{stats.premium}</p>
            </div>
            <Settings className="w-8 h-8 text-purple-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="text-3xl font-bold text-emerald-600">${stats.totalRevenue.toLocaleString()}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-emerald-600" />
          </div>
        </Card>
      </div>

      {/* Filters Card */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search tenants by name or slug..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Plans</option>
              <option value="premium">Premium</option>
              <option value="standard">Standard</option>
              <option value="basic">Basic</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Tenants Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTenants.map((tenant) => (
          <Card key={tenant.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <Building className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{tenant.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">@{tenant.slug}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  tenant.plan === 'Premium'
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                    : tenant.plan === 'Standard'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-200'
                }`}>
                  {tenant.plan}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  tenant.status === 'Active'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {tenant.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{tenant.hospitals}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Hospitals</p>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{tenant.users}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Users</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-4">
              <span>Revenue: <strong className="text-gray-900 dark:text-white">{tenant.revenue}</strong></span>
              <span>Last activity: {tenant.lastActivity}</span>
            </div>

            <div className="flex space-x-2">
              <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                View Details
              </button>
              <button className="flex-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                Manage
              </button>
              {tenant.status === 'Active' ? (
                <button className="px-4 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium hover:bg-red-200 dark:hover:bg-red-800 transition-colors">
                  Suspend
                </button>
              ) : (
                <button className="px-4 py-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium hover:bg-green-200 dark:hover:bg-green-800 transition-colors">
                  Activate
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {filteredTenants.length === 0 && (
        <Card className="p-12 text-center">
          <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No tenants found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first tenant'}
          </p>
        </Card>
      )}
    </div>
  );
}
