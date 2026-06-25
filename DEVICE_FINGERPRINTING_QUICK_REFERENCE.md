# Quick Reference: Device Fingerprinting & Activity Logging

## Quick Start (5-Minute Setup)

### 1. Add Activity Logging to Any Component

```typescript
import { useActivityLogging } from "@/hooks/useActivityLogging";

export function MyComponent() {
  const { logActivity } = useActivityLogging();

  const handleAction = async () => {
    logActivity({
      action: "create",
      resource: "patient",
      resourceId: "123",
      description: "Created patient record",
    });
  };

  return <button onClick={handleAction}>Create Patient</button>;
}
```

### 2. Add Admin Dashboard to Settings Page

```typescript
import { ComprehensiveActivityDashboard } from "@/components/admin/ComprehensiveActivityDashboard";

export function AdminSettingsPage() {
  const { user } = useSession();
  
  return (
    <ComprehensiveActivityDashboard 
      tenantId={user.tenantId}
      userId={user.id}
    />
  );
}
```

## API Endpoints Reference

### Log an Activity
```bash
curl -X POST https://joan-healthcare-system.vercel.app//api/activity-logging \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "tenantId": "tenant-456",
    "action": "create",
    "resource": "patient",
    "resourceId": "patient-789",
    "description": "Created new patient",
    "newData": { "name": "John Doe" }
  }'
```

### Get Activity Logs
```bash
curl "https://joan-healthcare-system.vercel.app//api/activity-logging?tenantId=tenant-456&hoursBack=24&limit=100"
```

### Get User Devices
```bash
curl "https://joan-healthcare-system.vercel.app//api/fingerprinting?userId=user-123&tenantId=tenant-456"
```

### Get Active Sessions
```bash
curl "https://joan-healthcare-system.vercel.app//api/sessions?tenantId=tenant-456&action=active"
```

### Log Security Event
```bash
curl -X POST https://joan-healthcare-system.vercel.app//api/security-events \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant-456",
    "userId": "user-123",
    "eventType": "suspicious_login",
    "severity": "high",
    "description": "Login from unusual location"
  }'
```

## Common Action Types to Log

| Action | Description | Example |
|--------|-------------|---------|
| `login` | User login | After successful auth |
| `logout` | User logout | On session end |
| `view` | Resource viewed | Patient profile opened |
| `create` | Resource created | New patient added |
| `update` | Resource modified | Patient info updated |
| `delete` | Resource deleted | Patient record deleted |
| `export` | Data exported | Patient records exported |
| `download` | File downloaded | Report downloaded |
| `upload` | File uploaded | Lab results uploaded |
| `send_message` | Message sent | Message in chat sent |

## Security Event Types

| Event Type | Severity | Description |
|------------|----------|-------------|
| `failed_login_attempt` | MEDIUM | Invalid password/username |
| `multiple_failed_logins` | HIGH | Multiple failed attempts |
| `suspicious_login` | MEDIUM | Unusual location/time |
| `unusual_location` | MEDIUM | Access from new country |
| `vpn_detected` | MEDIUM | VPN connection detected |
| `bot_detected` | HIGH | Bot/crawler detected |
| `permission_denied` | MEDIUM | Unauthorized access attempt |
| `data_access_anomaly` | HIGH | Unusual data access pattern |

## Component Usage Examples

### Track Page View
```typescript
import { useActivityPageView } from "@/hooks/useActivityLogging";

export function PatientsDashboard() {
  useActivityPageView("Patients Dashboard", {
    section: "healthcare",
  });
  
  return <Your Dashboard Content />;
}
```

### Track User Action
```typescript
import { useActivityTrack } from "@/hooks/useActivityLogging";

export function PatientForm() {
  const trackSave = useActivityTrack("update");
  
  const handleSave = async (data) => {
    trackSave({
      resource: "patient",
      resourceId: patientId,
      previousData: oldData,
      newData: data,
    });
  };
}
```

### Monitor Active Users
```typescript
import { SystemActivityMonitor } from "@/components/admin/SystemActivityMonitor";

<SystemActivityMonitor tenantId={tenantId} />
```

### View Activity Logs
```typescript
import { ActivityLogsViewer } from "@/components/admin/ActivityLogsViewer";

<ActivityLogsViewer tenantId={tenantId} />
```

### Track Security Events
```typescript
import { SecurityEventsMonitor } from "@/components/admin/SecurityEventsMonitor";

<SecurityEventsMonitor tenantId={tenantId} />
```

### View User Devices
```typescript
import { UserDevicesMonitor } from "@/components/admin/UserDevicesMonitor";

<UserDevicesMonitor userId={userId} tenantId={tenantId} />
```

## Filtering Examples

### Get failed logins in last 6 hours
```bash
curl "https://joan-healthcare-system.vercel.app//api/activity-logging?tenantId=tenant-456&action=login&hoursBack=6&status=failure"
```

### Get patient data access
```bash
curl "https://joan-healthcare-system.vercel.app//api/activity-logging?tenantId=tenant-456&resource=patient&limit=50"
```

### Get critical security events
```bash
curl "https://joan-healthcare-system.vercel.app//api/security-events?tenantId=tenant-456&severity=critical&resolved=false"
```

### Get active sessions by user
```bash
curl "https://joan-healthcare-system.vercel.app//api/sessions?tenantId=tenant-456&userId=user-123&action=active"
```

## Data Flow Diagram

```
User Action
    ↓
useActivityLogging Hook
    ↓
logActivity() function
    ↓
/api/activity-logging POST
    ↓
activity_logs table
    ↓
Admin Dashboard
    ↓
ActivityLogsViewer Component
```

## Device Information Captured

- **Browser**: Chrome, Safari, Firefox, Edge, etc.
- **OS**: Windows, macOS, Linux, iOS, Android
- **Device Type**: Mobile, Tablet, Desktop
- **Screen Resolution**: e.g., 1920x1080
- **Language**: Browser language
- **Timezone**: User timezone
- **IP Address**: Client IP
- **Location**: Country and City
- **VPN/Proxy**: Detection flags
- **Bot Detection**: Spider/crawler detection

## Permissions & Roles

```javascript
const permissions = {
  superAdmin: ["view_all_activity", "manage_security_events", "export_logs"],
  networkEngineer: ["view_all_activity", "view_security_events"],
  hospitalAdmin: ["view_tenant_activity", "view_tenant_security_events"],
  departmentManager: ["view_department_activity"],
  regularUser: ["view_own_activity", "view_own_devices"],
};
```

## Best Practices

✅ **DO:**
- Log meaningful user actions
- Include resource IDs for traceability
- Use descriptive action names
- Store previous/new data for audits
- Log failed operations with error messages
- Track sensitive data access
- Monitor suspicious patterns

❌ **DON'T:**
- Log passwords or credentials
- Log excessive debug information
- Store sensitive PII unnecessarily
- Forget to include resource IDs
- Skip error logging
- Log system events as user actions

## Troubleshooting

### No activities showing up
- Check: `useActivityLogging` is called after `useSession` is loaded
- Verify: Device fingerprinting is initialized
- Confirm: API is accessible and database is connected

### Session not found
- Ensure: Session was created with `POST /api/sessions`
- Check: Session hasn't expired (7 day default)
- Verify: Correct sessionId format

### Security events not triggering
- Implement: Custom anomaly detection logic
- Add: Failed login attempt counters
- Set up: Location-based alerts

## Performance Tips

- Use `hoursBack` parameter to limit query results (24 hours default)
- Filter by `action` or `resource` for faster queries
- Batch log updates when handling multiple changes
- Archive old logs after 90 days
- Implement pagination for large result sets

## Documentation References

- Complete Guide: `DEVICE_FINGERPRINTING_GUIDE.md`
- Implementation Status: `DEVICE_FINGERPRINTING_IMPLEMENTATION.md`
- Code Examples: `examples/LoginFlowIntegration.ts`
- Database Schema: `lib/db/schema.ts` (search for `device_fingerprints`, `activity_logs`, etc.)

## Support

For implementation help, see:
- Device fingerprinting utilities: `lib/fingerprinting.ts`
- React hooks: `hooks/useActivityLogging.ts`
- Example components: `components/admin/`

---

**Ready to use! Start logging activities and monitoring users now.** 🚀

