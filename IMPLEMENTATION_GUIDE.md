# Quick Implementation Guide for Each Dashboard

## Using the Sidebar Configuration

```tsx
import { ROLE_SIDEBAR_CONFIGS } from "@/lib/config/sidebarConfig";

// Get the config for a specific role
const sidebarConfig = ROLE_SIDEBAR_CONFIGS.doctor;

export default function DoctorDashboard() {
  return (
    <StandardDashboardLayout sidebarConfig={sidebarConfig} headerConfig={headerConfig}>
      {/* Your content */}
    </StandardDashboardLayout>
  );
}
```

## Example Implementations

### 1. Doctor Dashboard
**Key Components:**
- Stat cards for: Active Patients, Appointments Today, Pending Lab Results
- Patient list with status
- Upcoming appointments
- Recent medical notes

```tsx
const headerConfig = {
  title: "My Patients",
  breadcrumbs: [{ label: "Doctor" }, { label: "Dashboard" }],
  status: "active",
  actions: [
    {
      label: "New Appointment",
      onClick: () => {},
      variant: "primary",
      icon: <Plus className="w-4 h-4" />,
    },
  ],
};
```

### 2. Nurse Dashboard
**Key Components:**
- Stat cards for: Assigned Patients, Tasks Today, Pending Orders
- Patient vitals summary
- Task list
- Recent patient notes

### 3. Lab Technician Dashboard
**Key Components:**
- Stat cards for: Pending Orders, Completed Tests, Samples in Queue
- Orders list with status
- Queue management
- Equipment status

### 4. Pharmacist Dashboard
**Key Components:**
- Stat cards for: New Prescriptions, Pending Orders, Stock Alerts
- Prescription queue
- Inventory status
- Expiring medications

### 5. Accountant Dashboard
**Key Components:**
- Stat cards for: Total Revenue, Pending Invoices, Collection Rate
- Recent transactions
- Invoice summary
- Financial charts

### 6. Receptionist Dashboard
**Key Components:**
- Stat cards for: Today's Appointments, Check-Ins, Pending Registration
- Appointment schedule
- Walk-in queue
- Visitor log

### 7. Hospital Admin Dashboard
**Key Components:**
- Stat cards for: Total Patients, Bed Occupancy, Staff Count, Revenue
- Department performance
- Operational metrics
- Recent activity

### 8. Patient Portal
**Key Components:**
- Stat cards for: Upcoming Appointments, Pending Results, Active Prescriptions
- Appointment booking
- Medical records view
- Message center

### 9. Guardian Portal
**Key Components:**
- Stat cards for: Dependents Count, Upcoming Appointments, Pending Records
- Dependent list
- Appointment management
- Health data view

## Common UI Patterns

### Patient List
```tsx
<Card>
  <CardHeader>
    <CardTitle>Patients</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      {patients.map((patient) => (
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
          <div>
            <p className="font-semibold text-gray-900">{patient.name}</p>
            <p className="text-sm text-gray-600">{patient.id}</p>
          </div>
          <Badge variant={patient.status}>{patient.status}</Badge>
        </div>
      ))}
    </div>
  </CardContent>
</Card>
```

### Appointment Schedule
```tsx
<Card>
  <CardHeader>
    <CardTitle>Today's Appointments</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-3">
      {appointments.map((apt) => (
        <div className="flex items-start gap-4 p-3 border border-gray-200 rounded-lg">
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <Clock className="w-6 h-6 text-orange-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">{apt.time}</p>
            <p className="text-sm text-gray-600">{apt.patientName}</p>
          </div>
          <Button variant="ghost" size="sm">Details</Button>
        </div>
      ))}
    </div>
  </CardContent>
</Card>
```

### Activity Feed
```tsx
<Card>
  <CardHeader>
    <CardTitle>Recent Activity</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-3">
      {activities.map((activity) => (
        <div className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
          <div className="w-2 h-2 rounded-full bg-orange-500 mt-2"></div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{activity.action}</p>
            <p className="text-xs text-gray-500">{activity.time}</p>
          </div>
        </div>
      ))}
    </div>
  </CardContent>
</Card>
```

### Status Metrics
```tsx
<Card>
  <CardHeader>
    <CardTitle>Metrics</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-600">Occupancy</p>
          <p className="text-sm font-semibold text-gray-900">75%</p>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-orange-500 h-2 rounded-full" style={{ width: "75%" }}></div>
        </div>
      </div>
    </div>
  </CardContent>
</Card>
```

## Implementation Checklist

For each dashboard:
- [ ] Import `StandardDashboardLayout`
- [ ] Import `ROLE_SIDEBAR_CONFIGS` and select the role
- [ ] Define `headerConfig` with appropriate breadcrumbs and actions
- [ ] Add 4-6 stat cards
- [ ] Add 1-2 main content cards
- [ ] Add activity feed or metrics
- [ ] Test responsive layout
- [ ] Verify all links work

## File Structure

```
app/(dashboard)/
├── [role]/
│   ├── page.tsx (main dashboard)
│   ├── patients/
│   │   └── page.tsx
│   ├── appointments/
│   │   └── page.tsx
│   └── ... (other routes)
```

Each dashboard should follow the same structure and design patterns.

