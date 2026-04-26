# 🔌 API Integration Guide

## Overview
All dashboards are designed with mock data and ready for real API integration. This guide shows how to connect to your backend.

---

## Step 1: Create API Service Layer

### File: `lib/services/dashboard.service.ts`

```typescript
import { db } from "@/lib/db/index";
import { tenants, users, appointments, patients } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export class DashboardService {
  // Super Admin Dashboard
  static async getSuperAdminMetrics() {
    try {
      const hospitalCount = await db.select().from(tenants);
      const userCount = await db.select().from(users);
      const appointmentCount = await db.select().from(appointments);
      const patientCount = await db.select().from(patients);

      return {
        totalHospitals: hospitalCount.length,
        totalPatients: patientCount.length,
        dailyRevenue: "$287,450", // Calculate from invoices
        systemHealth: "99.98%",
        activeUsers: userCount.filter(u => u.isActive).length,
        apiCalls: "1.2M",
        databaseLoad: "62%"
      };
    } catch (error) {
      console.error("Error fetching super admin metrics:", error);
      throw error;
    }
  }

  // Hospital Admin Dashboard
  static async getHospitalMetrics(tenantId: string) {
    try {
      const hospitalPatients = await db
        .select()
        .from(patients)
        .where(eq(patients.tenantId, tenantId));

      const hospitalAppointments = await db
        .select()
        .from(appointments)
        .where(eq(appointments.tenantId, tenantId));

      return {
        patientsToday: hospitalPatients.length,
        revenueToday: "$28,450",
        bedOccupancy: "87%",
        staffOnDuty: 58,
        appointmentsToday: hospitalAppointments.length,
        labTestsPending: 34,
        openInvoices: "$45,200"
      };
    } catch (error) {
      console.error("Error fetching hospital metrics:", error);
      throw error;
    }
  }

  // Doctor Dashboard
  static async getDoctorMetrics(doctorId: string) {
    try {
      const doctorAppointments = await db
        .select()
        .from(appointments)
        .where(eq(appointments.doctorId, doctorId));

      return {
        todayAppointments: doctorAppointments.length,
        waitingPatients: 3,
        criticalAlerts: 1,
        pendingLabResults: 4
      };
    } catch (error) {
      console.error("Error fetching doctor metrics:", error);
      throw error;
    }
  }

  // Nurse Dashboard
  static async getNurseMetrics(userId: string) {
    return {
      assignedPatients: 8,
      vitalsDue: 3,
      medicationsDue: 12,
      alerts: 2
    };
  }
}
```

---

## Step 2: Update Dashboard Component

### Replace Mock Data with API Calls

#### Before (Mock Data):
```tsx
<StatCard title="Total Hospitals" value="47" subtitle="Active tenants" />
```

#### After (Real Data):
```tsx
import { DashboardService } from "@/lib/services/dashboard.service";
import { useEffect, useState } from "react";

export default function SuperAdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await DashboardService.getSuperAdminMetrics();
        setMetrics(data);
      } catch (error) {
        console.error("Failed to load metrics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard 
          title="Total Hospitals" 
          value={metrics?.totalHospitals || "0"} 
          subtitle="Active tenants" 
        />
        <StatCard 
          title="Total Patients" 
          value={metrics?.totalPatients?.toLocaleString() || "0"} 
          subtitle="Across all hospitals" 
        />
        <StatCard 
          title="Daily Revenue" 
          value={metrics?.dailyRevenue || "$0"} 
          subtitle="Platform-wide" 
        />
        <StatCard 
          title="System Health" 
          value={metrics?.systemHealth || "0%"} 
          subtitle="All operational" 
        />
      </div>
      {/* Rest of component */}
    </div>
  );
}
```

---

## Step 3: Create Custom Hooks

### File: `hooks/useDashboard.ts`

```typescript
import { useEffect, useState } from "react";
import { DashboardService } from "@/lib/services/dashboard.service";

export function useSuperAdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const data = await DashboardService.getSuperAdminMetrics();
        setMetrics(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  return { metrics, loading, error };
}

export function useHospitalAdminDashboard(tenantId: string) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const data = await DashboardService.getHospitalMetrics(tenantId);
        setMetrics(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    if (tenantId) fetchMetrics();
  }, [tenantId]);

  return { metrics, loading, error };
}

export function useDoctorDashboard(doctorId: string) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const data = await DashboardService.getDoctorMetrics(doctorId);
        setMetrics(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    if (doctorId) fetchMetrics();
  }, [doctorId]);

  return { metrics, loading, error };
}
```

---

## Step 4: Usage Example

```tsx
"use client";

import { useSuperAdminDashboard } from "@/hooks/useDashboard";
import { PageHeader, StatCard } from "@/components/ui";

export default function Dashboard() {
  const { metrics, loading, error } = useSuperAdminDashboard();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading dashboard</div>;

  return (
    <div>
      <PageHeader
        title="Global Command Center"
        subtitle="Platform-wide healthcare intelligence"
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard 
          title="Total Hospitals" 
          value={metrics.totalHospitals} 
          subtitle="Active tenants" 
        />
        {/* Rest of cards */}
      </div>
    </div>
  );
}
```

---

## Step 5: Data Fetching Patterns

### Pattern 1: Individual Fetches
```tsx
const hospitals = await db.select().from(tenants);
const patients = await db.select().from(patients);
```

### Pattern 2: Aggregated Queries
```tsx
const hospitalCount = await db
  .select({ count: sql`count(*)` })
  .from(tenants);
```

### Pattern 3: With Filters
```tsx
const activeHospitals = await db
  .select()
  .from(tenants)
  .where(eq(tenants.isActive, true));
```

### Pattern 4: Joined Queries
```tsx
const hospitalsWithPatients = await db
  .select()
  .from(tenants)
  .leftJoin(patients, eq(tenants.id, patients.tenantId));
```

---

## Step 6: Error Handling

```tsx
try {
  const metrics = await DashboardService.getMetrics();
  setMetrics(metrics);
} catch (error) {
  if (error instanceof Error) {
    console.error("Dashboard error:", error.message);
    setError("Failed to load dashboard data");
  }
}
```

---

## Step 7: Caching & Performance

```tsx
// Use React Query for better caching
import { useQuery } from "@tanstack/react-query";

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ["dashboard", "metrics"],
    queryFn: () => DashboardService.getSuperAdminMetrics(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

---

## Database Queries Reference

### Get Hospital Statistics
```sql
SELECT 
  COUNT(*) as total_hospitals,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active,
  COUNT(CASE WHEN is_active = false THEN 1 END) as inactive
FROM tenants;
```

### Get Patient Metrics
```sql
SELECT 
  tenant_id,
  COUNT(*) as total_patients,
  COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as active
FROM patients
GROUP BY tenant_id;
```

### Get Revenue Data
```sql
SELECT 
  DATE(created_at) as date,
  SUM(CAST(total_amount AS DECIMAL)) as daily_revenue
FROM invoices
WHERE status = 'paid'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## Real-Time Updates

```tsx
// Subscribe to real-time updates
import { useRealtimeSubscription } from "@/lib/supabase";

export function useDashboardLiveUpdates() {
  const { data } = useRealtimeSubscription(
    "dashboards",
    (payload) => {
      // Update metrics when data changes
      setMetrics(prev => ({
        ...prev,
        ...payload.new
      }));
    }
  );

  return data;
}
```

---

## Testing

```tsx
// Mock the service for testing
jest.mock("@/lib/services/dashboard.service", () => ({
  DashboardService: {
    getSuperAdminMetrics: jest.fn().mockResolvedValue({
      totalHospitals: 47,
      totalPatients: 124850,
      dailyRevenue: "$287,450",
      systemHealth: "99.98%"
    })
  }
}));

test("Dashboard loads metrics", async () => {
  render(<Dashboard />);
  await waitFor(() => {
    expect(screen.getByText("47")).toBeInTheDocument();
  });
});
```

---

## Deployment Checklist

- [ ] Environment variables set (DATABASE_URL)
- [ ] Database migrations applied
- [ ] Services tested locally
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Caching configured
- [ ] Real-time updates working
- [ ] Performance optimized
- [ ] Security checks passed
- [ ] Tests passing

---

**Next**: Follow these patterns to integrate all dashboards with real data!
