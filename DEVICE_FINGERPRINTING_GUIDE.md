# Device Fingerprinting & Activity Logging Integration Guide

This guide explains how to integrate device fingerprinting and activity logging throughout your Joan application.

## Overview

The system tracks:
- **Device Fingerprints**: Unique device identification with browser, OS, IP, and location info
- **User Sessions**: Logged-in sessions per device with session tokens
- **Activity Logs**: Comprehensive action tracking (login, view, create, update, delete, etc.)
- **Security Events**: Suspicious activities and security incidents

## Features

### 1. Device Fingerprinting
- Unique identification of each device accessing the system
- Tracks browser, OS, device type, screen resolution, timezone
- Detects VPN/proxy usage
- Records IP address and geolocation information

### 2. Activity Logging
- Every user action is logged with context (device, location, action type, resource)
- Stores previous and new data for updates/deletions (audit trail)
- Categorizes actions: login, logout, view, create, update, delete, export, download, upload, send_message
- Automatic timestamp and metadata capture

### 3. User Sessions
- Session tracking per device
- Session token generation and management
- Activity heartbeat tracking (last activity time)
- Automatic session expiration

### 4. Security Events
- Track suspicious activities and anomalies
- Severity levels: low, medium, high, critical
- Resolvable events with notes and resolution tracking
- Event types: suspicious_login, multiple_failed_logins, unusual_location, vpn_detected, bot_detected, permission_denied, data_access_anomaly

## API Endpoints

### Device Fingerprinting
```bash
POST /api/fingerprinting
  - Capture device fingerprint for a user
  - Automatically called on app initialization

GET /api/fingerprinting?userId={userId}&tenantId={tenantId}
  - Get all registered devices for a user
```

### Activity Logging
```bash
POST /api/activity-logging
  - Log a user action

GET /api/activity-logging?tenantId={tenantId}&hoursBack={24}&action={action}&resource={resource}
  - Retrieve activity logs with optional filters
```

### User Sessions
```bash
POST /api/sessions
  - Create a new user session

GET /api/sessions?tenantId={tenantId}&userId={userId}&action={active|all}
  - Get user sessions (active or all)

PUT /api/sessions?sessionId={sessionId}&action={update_activity|logout}
  - Update session activity or logout
```

### Security Events
```bash
POST /api/security-events
  - Record a security event

GET /api/security-events?tenantId={tenantId}&hoursBack={24}&severity={severity}&resolved={true|false}
  - Retrieve security events with filters

PUT /api/security-events?eventId={eventId}&resolvedBy={userId}
  - Mark security event as resolved
```

## Integration Examples

### 1. Basic Activity Logging in Components

```typescript
import { useActivityLogging } from "@/hooks/useActivityLogging";

export function MyComponent() {
  const { logActivity } = useActivityLogging();

  const handlePatientView = async (patientId: string) => {
    logActivity({
      action: "view",
      resource: "patient",
      resourceId: patientId,
      description: "Viewed patient profile",
      newData: { patientId },
    });
    // ... handle view logic
  };

  const handlePatientUpdate = async (patientId: string, data: any) => {
    const previousData = await fetchPreviousData(patientId);
    
    logActivity({
      action: "update",
      resource: "patient",
      resourceId: patientId,
      description: `Updated patient: ${Object.keys(data).join(", ")}`,
      previousData,
      newData: data,
    });
    
    // ... handle update logic
  };

  const handlePatientDelete = async (patientId: string) => {
    logActivity({
      action: "delete",
      resource: "patient",
      resourceId: patientId,
      description: "Deleted patient record",
      status: "success",
    });
    // ... handle delete logic
  };

  return (
    // ...
  );
}
```

### 2. Page View Tracking

```typescript
import { useActivityPageView } from "@/hooks/useActivityLogging";

export function PatientsPage() {
  useActivityPageView("Patients Dashboard", {
    section: "healthcare",
  });

  return (
    // ...
  );
}
```

### 3. Custom Action Tracking

```typescript
import { useActivityTrack } from "@/hooks/useActivityLogging";

export function MessagesSender() {
  const trackMessageSend = useActivityTrack("send_message");

  const handleSendMessage = async (message: string, conversationId: string) => {
    trackMessageSend({
      resource: "message",
      resourceId: conversationId,
      description: "Sent message",
      newData: { messageLength: message.length, conversationId },
    });
    // ... send message logic
  };

  return (
    // ...
  );
}
```

### 4. Security Event Logging

```typescript
// In your login/authentication flow

async function handleFailedLogin(userId: string, reason: string) {
  // Log security event
  await fetch("/api/security-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tenantId: session.user.tenantId,
      userId,
      eventType: "failed_login_attempt",
      severity: "medium",
      description: `Failed login attempt: ${reason}`,
      ipAddress: clientIp,
      userAgent: request.headers.get("user-agent"),
      metadata: { reason, timestamp: new Date().toISOString() },
    }),
  });
}

async function handleSuspiciousActivity(userId: string, details: any) {
  // Log suspicious activity
  await fetch("/api/security-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tenantId: details.tenantId,
      userId,
      eventType: "suspicious_activity",
      severity: "high",
      description: details.description,
      metadata: details,
    }),
  });
}
```

### 5. Adding to Admin Dashboard

```typescript
// In your admin dashboard page
import { ComprehensiveActivityDashboard } from "@/components/admin/ComprehensiveActivityDashboard";

export function AdminDashboard() {
  return (
    <ComprehensiveActivityDashboard 
      tenantId={session.user.tenantId}
      userId={adminUserId}
    />
  );
}
```

## Database Schema

### device_fingerprints
- Stores unique device identifiers and characteristics
- Links to users and tenants
- Tracks VPN/proxy detection and bot detection

### user_sessions
- Active sessions per user and device
- Session tokens for authentication
- Last activity timestamps for inactivity detection

### activity_logs
- Comprehensive action log for audit trails
- Stores both previous and new data for changes
- Indexed by tenant, user, action, resource, and timestamp

### security_events
- Security incidents and suspicious activities
- Resolvable with notes and resolution tracking
- Severity-based filtering

## Best Practices

### 1. Log Meaningful Actions
- Log user-initiated actions (not system events)
- Include resource IDs for traceability
- Provide descriptive action descriptions

### 2. Protect Sensitive Data
- Don't log passwords or sensitive credentials
- Sanitize PII in logs when possible
- Use metadata for complex information

### 3. Performance Considerations
- Activity logging is async and non-blocking
- Use batch operations when logging multiple actions
- Implement log retention policies

### 4. Security Events
- Log failed authentication attempts
- Track unusual access patterns
- Monitor permission violations
- Record data access anomalies

### 5. Privacy and Compliance
- Ensure GDPR compliance with data retention
- Allow users to view their activity logs
- Implement log deletion on account deletion
- Establish audit retention policies

## Permissions & Access Control

The following roles should have access to monitoring features:

- **Super Admin**: Full access to all activity logs, security events, and user devices
- **Network Engineer**: Access to system activity, device information, and security events
- **Hospital Admin**: Access to tenant-specific activity logs and security events
- **Department Manager**: Access to department-level activity logs only
- **User**: Can view only their own activity and devices

## Example Queries

### Get User's Recent Activity
```sql
SELECT * FROM activity_logs 
WHERE user_id = $1 AND tenant_id = $2 
ORDER BY timestamp DESC 
LIMIT 50
```

### Get Suspicious Activities
```sql
SELECT * FROM security_events 
WHERE tenant_id = $1 AND is_resolved = false 
ORDER BY severity DESC, created_at DESC
```

### Get Active Users by Location
```sql
SELECT DISTINCT user_id, country, city, COUNT(*) as active_sessions
FROM user_sessions 
WHERE tenant_id = $1 AND is_active = true
GROUP BY user_id, country, city
```

## Monitoring Dashboard Components

The following components are available:

1. **ComprehensiveActivityDashboard**: Main dashboard with all monitoring tabs
2. **SystemActivityMonitor**: Real-time active users and sessions
3. **ActivityLogsViewer**: Detailed activity log viewer with filters
4. **SecurityEventsMonitor**: Security incident tracking and resolution
5. **UserDevicesMonitor**: User devices and session information

## Future Enhancements

- [ ] Real-time activity stream using WebSockets
- [ ] AI-based anomaly detection
- [ ] Geographic access pattern analysis
- [ ] Automated security event generation
- [ ] Activity export and reporting
- [ ] Integration with SIEM systems
- [ ] Risk scoring per user/device
- [ ] Device trust management

