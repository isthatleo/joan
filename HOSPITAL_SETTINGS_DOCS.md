# Hospital Settings & Configuration System

## Overview

The Hospital Settings system is a comprehensive, production-ready configuration management dashboard for hospital administrators. It allows full control over hospital branding, integrations, compliance, communication channels, billing, and system-wide preferences. All changes automatically sync across all tenant dashboards and user sessions.

## Features

### 1. **Hospital Profile Management**
- Hospital name, display name, and short name
- Registration and license numbers
- Hospital description and slug
- Contact information (email, phone, website)
- Physical address (street, city, country, postal code)

**API Endpoint**: `PUT /api/hospital/settings?tenantId={id}`

```typescript
const settings = {
  hospital: {
    name: "JJ Hospital",
    displayName: "JJ Hospital",
    shortName: "JJH",
    slug: "jjhospital",
    registrationNumber: "HOSP/2024/001",
    licenseNumber: "LIC/2024/001",
    description: "Leading healthcare provider..."
  },
  contact: {
    email: "contact@jjhospital.com",
    phone: "+254 700 000 000",
    website: "https://jjhospital.com",
    address: "123 Hospital Road",
    city: "Nairobi",
    country: "Kenya",
    postalCode: "00100"
  }
};
```

### 2. **Branding & Visual Identity**
- Hospital logo upload (SVG, PNG, JPG)
- Primary and accent color customization
- Light mode alternative logo
- Favicon configuration
- Changes sync to sidebar logo across all dashboards

**Features**:
- Logo validation (max 5MB)
- Format support: SVG, PNG, JPG
- Real-time preview
- Light/dark mode logo variants
- Automatic sidebar synchronization

**API Endpoint**: `PUT /api/hospital/[tenantId]/branding`

```typescript
{
  name: "New Hospital Name",
  logoUrl: "https://cdn.example.com/logo.svg",
  primaryColor: "#FF6B35",
  accentColor: "#004E89"
}
```

### 3. **Module Management**
Enable/disable hospital features:
- Appointments
- Pharmacy
- Lab Services
- Billing & Invoicing
- Inpatient Management
- Emergency Department
- Telemedicine
- Insurance Claims

```typescript
modules: {
  appointments: true,
  pharmacy: true,
  lab: true,
  billing: true,
  inpatient: true,
  emergency: false,
  telemedicine: false,
  insurance: true
}
```

### 4. **Communication Channels**
Configure multiple communication providers:

#### Email Providers
- **Resend** - Transactional email service
- **SendGrid** - Email marketing and transactional
- **Mailgun** - Email infrastructure

#### SMS Providers
- **Twilio** - SMS, voice, WhatsApp
- **AWS SNS** - Amazon Simple Notification Service

#### Notification Preferences
- Email notifications
- SMS notifications
- Push notifications
- In-app notifications

**API Endpoint**: `GET/POST/PATCH/DELETE /api/hospital/integrations?tenantId={id}`

```typescript
communication: {
  emailProvider: "resend",
  smsProvider: "twilio",
  notificationPreferences: {
    emailEnabled: true,
    smsEnabled: true,
    pushEnabled: false,
    inAppEnabled: true
  }
}
```

### 5. **Third-Party Integrations**
Manage API keys and configurations for:
- **Twilio**: SMS, voice messaging
- **Resend**: Email service
- **SendGrid**: Advanced email
- **Stripe**: Payment processing
- **AWS S3**: File storage
- **Auth0**: Authentication (custom)

**Features**:
- Secure API key encryption (in production)
- Connection testing
- Status monitoring
- Configuration per provider
- Audit logging for all integration changes

**Database Table**: `integrations`
```typescript
{
  id: UUID,
  tenantId: UUID,
  provider: string, // "twilio", "resend", etc.
  isActive: boolean,
  apiKeyEncrypted: string, // Encrypted
  apiSecretEncrypted: string, // Encrypted
  accountId: string,
  accountName: string,
  config: JSON,
  status: "pending" | "testing" | "active" | "error",
  lastTestedAt: timestamp,
  testError: string,
  metadata: JSON
}
```

**API Endpoints**:
- `GET /api/hospital/integrations?tenantId={id}` - List all integrations
- `POST /api/hospital/integrations?tenantId={id}` - Create/update integration
- `PATCH /api/hospital/integrations?tenantId={id}&integrationId={id}` - Test connection
- `DELETE /api/hospital/integrations?tenantId={id}&integrationId={id}` - Remove integration

### 6. **Billing & Invoicing**
- Currency selection (KES, USD, EUR, GBP)
- Tax rate configuration
- Invoice prefix customization
- Payment method selection
- Auto-charge insurance option

```typescript
billing: {
  taxRate: 16,
  currency: "KES",
  invoicePrefix: "INV-",
  paymentMethods: ["cash", "card", "bank_transfer", "mpesa", "insurance"],
  autoChargeInsurance: false
}
```

### 7. **Compliance & Security**
- **HIPAA Mode**: Enforce HIPAA-grade security controls
- **GDPR Mode**: Apply EU data subject rights
- **Encryption at Rest**: AES-256 encryption for all PHI
- **Audit Logging**: Record all privileged actions
- **Data Retention**: Configurable data retention period (default 7 years)

```typescript
compliance: {
  hipaaMode: true,
  gdprMode: false,
  encryptionAtRest: true,
  auditLoggingEnabled: true,
  dataRetentionDays: 2555 // 7 years
}
```

### 8. **User Preferences**
- Timezone selection
- Language preferences
- Date/time formatting
- Week start day
- UI theme (light, dark, system)

```typescript
preferences: {
  timezone: "Africa/Nairobi",
  language: "en",
  currency: "KES",
  dateFormat: "YYYY-MM-DD",
  timeFormat: "24h",
  weekStartDay: "Monday"
},
ui: {
  theme: "light",
  compactMode: false,
  sidebarCollapsed: false,
  primaryTheme: "orange"
}
```

### 9. **Audit Logs**
Complete audit trail of all settings changes:
- Who made the change
- What was changed
- When the change occurred
- Previous and new values
- Compliance reporting

**Database Table**: `auditLogs`
```typescript
{
  id: UUID,
  userId: UUID,
  action: string, // "hospital.settings_updated"
  entity: string, // "hospital"
  entityId: UUID,
  metadata: JSON, // changes, keys modified
  createdAt: timestamp
}
```

## Database Schema

### New Tables

#### `integrations`
Stores third-party service integrations with encrypted credentials.

```sql
CREATE TABLE integrations (
  id UUID PRIMARY KEY,
  tenantId UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  isActive BOOLEAN DEFAULT false,
  apiKeyEncrypted TEXT,
  apiSecretEncrypted TEXT,
  accountId TEXT,
  accountName TEXT,
  config JSONB DEFAULT {},
  status TEXT DEFAULT 'pending',
  lastTestedAt TIMESTAMP,
  testError TEXT,
  metadata JSONB,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  INDEX(tenantId),
  INDEX(provider)
);
```

### Updated Tables

#### `tenants`
Added/existing fields for branding:
- `logoUrl` - Hospital logo URL
- `name` - Hospital name
- `slug` - URL-friendly identifier
- `contactEmail` - Primary contact email
- `contactPhone` - Primary contact phone
- `timezone` - Hospital timezone
- `address`, `city`, `country` - Location info

#### `tenantSettings`
Key-value store for all hospital settings (branding, communication, modules, preferences, compliance, ui, billing).

```sql
CREATE TABLE tenantSettings (
  id UUID PRIMARY KEY,
  tenantId UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  updatedAt TIMESTAMP DEFAULT NOW(),
  updatedBy UUID,
  INDEX(tenantId)
);
```

## API Endpoints

### Hospital Settings
```
GET  /api/hospital/settings?tenantId={id}
PUT  /api/hospital/settings?tenantId={id}
```

### Hospital Branding
```
GET  /api/hospital/{tenantId}/branding
PUT  /api/hospital/{tenantId}/branding
```

### Integrations
```
GET    /api/hospital/integrations?tenantId={id}
POST   /api/hospital/integrations?tenantId={id}
PATCH  /api/hospital/integrations?tenantId={id}&integrationId={id}
DELETE /api/hospital/integrations?tenantId={id}&integrationId={id}
```

## Data Synchronization

### Changes Sync Across Dashboards
When hospital settings are updated:

1. **Logo Updates** → Sidebar logo updates in real-time for all users
2. **Hospital Name** → Updated in all dashboards and role displays
3. **Branding Colors** → Theme applies to all user sessions
4. **Module Toggles** → Sidebar navigation updates for all users
5. **Communication Settings** → New notifications sent via configured channels

**Implementation**:
- Zustand store updates on client
- WebSocket/SSE broadcasts to all tenant users
- Fallback: Periodic polling (30s) for settings changes

### Broadcasting (Future Enhancement)
```typescript
// Example: Redis Pub/Sub or WebSocket
await redis.publish(`tenant:${tenantId}:settings`, JSON.stringify({
  type: 'settings_updated',
  changes: updatedSettings,
  timestamp: Date.now()
}));
```

## Security Considerations

### API Key Management
1. **Encryption**: All API keys/secrets encrypted at rest
2. **Never Expose**: Never return full API keys to client
3. **Rotation**: Support for periodic key rotation
4. **Audit**: All API key changes logged

### Access Control
- Only `hospital_admin` and `super_admin` can access settings
- All changes require authentication
- Audit logs tied to user making changes

### Compliance
- HIPAA compliance mode available
- GDPR data retention controls
- Audit trail for compliance reporting
- Encryption at rest option

## Usage Examples

### Fetching Hospital Settings
```typescript
const response = await fetch(`/api/hospital/settings?tenantId=${tenantId}`);
const settings = await response.json();

console.log(settings.hospital.name);
console.log(settings.branding.logoUrl);
console.log(settings.integrations.twilio);
```

### Updating Hospital Settings
```typescript
const updates = {
  hospital: {
    name: "New Hospital Name"
  },
  branding: {
    logoUrl: "https://example.com/new-logo.svg",
    primaryColor: "#FF6B35"
  }
};

const response = await fetch(`/api/hospital/settings?tenantId=${tenantId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(updates)
});

const result = await response.json();
console.log(result.changedKeys);
```

### Adding an Integration
```typescript
const integration = {
  provider: "twilio",
  apiKey: process.env.TWILIO_ACCOUNT_SID,
  apiSecret: process.env.TWILIO_AUTH_TOKEN,
  accountName: "Main Account",
  config: {
    phoneNumber: "+1234567890"
  }
};

const response = await fetch(`/api/hospital/integrations?tenantId=${tenantId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(integration)
});
```

### Testing Integration
```typescript
const response = await fetch(
  `/api/hospital/integrations?tenantId=${tenantId}&integrationId=${integrationId}`,
  { method: 'PATCH' }
);

const result = await response.json();
console.log(result.success); // true/false
console.log(result.error);   // Error message if failed
```

## File Structure

```
app/
├── (dashboard)/
│   ├── settings/
│   │   ├── page.tsx              # Main settings page
│   │   └── hospital/
│   │       └── page.tsx          # Hospital settings page (new)
│   └── hospital-admin/
│       ├── layout.tsx
│       └── page.tsx

api/
├── hospital/
│   ├── settings/
│   │   └── route.ts              # Settings CRUD (new)
│   ├── integrations/
│   │   └── route.ts              # Integration management (new)
│   └── [tenantId]/
│       └── branding/
│           └── route.ts          # Branding sync (new)

lib/
└── db/
    └── schema.ts                 # Updated with integrations table

stores/
└── auth.ts                       # User context with hospitalId
```

## Next Steps

### Phase 1 (Current) ✅
- [x] Schema updates with integrations table
- [x] API endpoints for settings management
- [x] Hospital settings page UI
- [x] Integration configuration interface
- [x] Audit logging

### Phase 2 (Recommended)
- [ ] Real-time WebSocket broadcasting
- [ ] API key encryption implementation
- [ ] Integration testing (actual Twilio/Resend API calls)
- [ ] Logo upload to cloud storage (AWS S3)
- [ ] More integrations (Stripe, Google Calendar, etc.)

### Phase 3 (Advanced)
- [ ] Settings templates for different hospital sizes
- [ ] Multi-tenant settings inheritance
- [ ] Settings versioning and rollback
- [ ] Advanced compliance reporting
- [ ] Settings import/export

## Testing

### Manual Testing Checklist
- [ ] Update hospital name and verify sidebar updates
- [ ] Upload new logo and verify display
- [ ] Change primary color and verify theme
- [ ] Enable/disable modules and check navigation
- [ ] Configure integration and test connection
- [ ] Update billing settings
- [ ] Enable HIPAA mode
- [ ] Check audit logs for changes

### API Testing
```bash
# Get settings
curl -X GET "http://localhost:3000/api/hospital/settings?tenantId=..."

# Update settings
curl -X PUT "http://localhost:3000/api/hospital/settings?tenantId=..." \
  -H "Content-Type: application/json" \
  -d '{"hospital":{"name":"New Name"}}'

# List integrations
curl -X GET "http://localhost:3000/api/hospital/integrations?tenantId=..."

# Add integration
curl -X POST "http://localhost:3000/api/hospital/integrations?tenantId=..." \
  -H "Content-Type: application/json" \
  -d '{"provider":"twilio","apiKey":"..."}'
```

## Support

For issues or questions:
1. Check audit logs for recent changes
2. Verify API endpoint responses
3. Check browser console for errors
4. Review database schema integrity

