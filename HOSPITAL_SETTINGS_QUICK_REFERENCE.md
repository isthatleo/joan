# 🏥 Hospital Settings Quick Reference

## 📍 Where to Access

| User Type | Access | URL |
|-----------|--------|-----|
| Hospital Admin | Hospital Settings | `/settings/hospital` |
| Hospital Admin | Main Settings | `/settings` |
| Super Admin | Hospital Settings | `/settings/hospital` |
| Other Users | Only own settings | `/settings` |

## 📋 What You Can Do

### Update Hospital Info
```
Hospital Name, Registration #, License #, Description
↓
Real-time sync to sidebar and all dashboards
```

### Update Branding
```
Logo + Colors
↓
Real-time updates to all open tabs
↓
Persists to database
```

### Configure Integrations
```
Twilio, Resend, SendGrid, Stripe, AWS S3
↓
Test connection
↓
Enable for use
```

### Enable/Disable Features
```
Appointments, Pharmacy, Lab, Billing, etc.
↓
Navigation updates for all users
↓
Settings persist
```

### Set Billing & Compliance
```
Tax rates, currencies, invoice prefixes
HIPAA mode, GDPR mode, encryption, audit logging
↓
Applied system-wide
```

## 🔗 API Quick Reference

### Get All Settings
```bash
GET /api/hospital/settings?tenantId={id}
```

### Update Settings
```bash
PUT /api/hospital/settings?tenantId={id}
{
  "hospital": { "name": "New Name" },
  "branding": { "primaryColor": "#FF6B35" },
  "modules": { "telemedicine": true }
}
```

### Add Integration
```bash
POST /api/hospital/integrations?tenantId={id}
{
  "provider": "twilio",
  "apiKey": "...",
  "apiSecret": "...",
  "accountName": "Main Account",
  "config": { "phoneNumber": "+1234567890" }
}
```

### Test Integration
```bash
PATCH /api/hospital/integrations?tenantId={id}&integrationId={id}
```

### List Integrations
```bash
GET /api/hospital/integrations?tenantId={id}
```

### Delete Integration
```bash
DELETE /api/hospital/integrations?tenantId={id}&integrationId={id}
```

## 🎨 Sections in Hospital Settings

| # | Section | Key Features |
|---|---------|--------------|
| 1 | Hospital Profile | Name, slug, registration, license |
| 2 | Branding | Logo, colors, favicon |
| 3 | Contact Info | Email, phone, website, address |
| 4 | Modules | Enable/disable features |
| 5 | Communication | Email/SMS providers, preferences |
| 6 | Billing | Tax, currency, invoice, payments |
| 7 | Integrations | Twilio, Resend, etc. |
| 8 | Compliance | HIPAA, GDPR, encryption, audit |
| 9 | Audit | Change history and logs |

## 🔄 Real-Time Sync Behavior

### When You Update...
| Update | What Changes | Sync Speed |
|--------|-------------|-----------|
| Hospital Name | Sidebar title, page title | Instant |
| Logo | Sidebar logo, all instances | Instant |
| Colors | Theme, buttons, accents | Instant |
| Modules | Navigation items | Instant |
| Any Setting | All open tabs | <1 second |
| Database | Persists forever | Immediate |

## 💾 Database Tables

| Table | Purpose | Updated |
|-------|---------|---------|
| `tenants` | Hospital info, logo, contact | When you save |
| `tenantSettings` | All settings (key-value) | When you save |
| `integrations` | API credentials, status | When you save/test |
| `auditLogs` | Change history | On every change |

## 🔐 Who Can Access

- **Hospital Admin**: Full access to hospital settings
- **Super Admin**: Full access to all hospital settings
- **Other Users**: Can only change own settings

## ⚠️ Important Notes

1. **Logo URL**: Must be publicly accessible
2. **API Keys**: Encrypted at storage (production-ready)
3. **Changes Sync**: All open tabs update automatically
4. **Audit Trail**: Every change is logged with user info
5. **Database**: Changes persist forever (can be audited)

## 🚀 Quick Setup (5 minutes)

1. Go to `/settings/hospital`
2. Update hospital name
3. Upload logo
4. Choose primary color
5. Click "Save changes"
6. ✅ Done! Changes sync everywhere

## 🧪 Test Real-Time Sync

1. Open `/settings/hospital` in Tab A
2. Open `/` (dashboard) in Tab B
3. Update hospital name in Tab A
4. Watch Tab B sidebar update instantly!

## 📧 Add Twilio SMS (3 steps)

1. Click "Add Integration" → Select "Twilio"
2. Enter Account SID and Auth Token
3. Click "Connect" → ✅ Done!

## 📊 Billing Setup (2 minutes)

1. Go to Billing section
2. Set tax rate (e.g., 16%)
3. Choose currency (e.g., KES)
4. Select payment methods
5. Click "Save changes"

## 🔒 Enable HIPAA (1 click)

1. Go to Compliance section
2. Toggle "HIPAA Mode" ON
3. Click "Save changes"
4. ✅ HIPAA protections enabled system-wide

## 📝 Troubleshooting

| Problem | Solution |
|---------|----------|
| Logo not showing | Check URL is accessible, clear browser cache |
| Changes not saving | Verify database connection, check browser console |
| Integration fails | Verify API credentials, test with provider's API directly |
| Colors not updating | Clear cache, verify hex color format |
| Can't access page | Check if user is hospital_admin or super_admin |

## 🔗 Important Links

- Settings Page: `/settings/hospital`
- Main Dashboard: `/`
- Settings (Personal): `/settings`
- Docs: `/HOSPITAL_SETTINGS_DOCS.md`
- Examples: `/lib/hospital-settings-examples.ts`

## 📞 Support

1. Check `/HOSPITAL_SETTINGS_DOCS.md`
2. Review code examples in `/lib/hospital-settings-examples.ts`
3. Check browser console for errors
4. Verify database schema with `/lib/db/schema.ts`

## 🎯 Common Tasks

### Update Hospital Name
1. Go to Hospital Profile section
2. Change "Hospital Name" field
3. Click "Save changes"
4. ✅ Updates everywhere instantly

### Change Logo
1. Go to Branding section
2. Click upload area or paste URL
3. Click "Save changes"
4. ✅ Logo updates in sidebar instantly

### Add SMS Integration
1. Go to Integrations section
2. Click "Add Integration"
3. Select "Twilio"
4. Enter credentials
5. Click "Connect"
6. ✅ SMS ready to use

### Disable a Feature
1. Go to Modules section
2. Uncheck feature (e.g., Telemedicine)
3. Click "Save changes"
4. ✅ Navigation item hides for all users

### Enable HIPAA Compliance
1. Go to Compliance section
2. Toggle "HIPAA Mode" ON
3. Click "Save changes"
4. ✅ HIPAA protections active

---

**Last Updated**: May 11, 2026
**Status**: Ready to Use ✅
**Version**: 1.0.0

