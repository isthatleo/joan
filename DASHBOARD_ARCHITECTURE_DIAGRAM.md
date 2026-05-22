# Dashboard Architecture & Routing Diagram

## System Architecture

```
Next.js App
├── app/(dashboard)           [Super Admin Context]
│   ├── layout.tsx
│   │   ├── Sidebar (no tenantSlug)
│   │   ├── Topbar (no tenantSlug)
│   │   └── children
│   ├── page.tsx              → Dashboard
│   ├── messages/
│   │   └── page.tsx          → /messages (Real-time WebSocket)
│   ├── profile/
│   │   ├── page.tsx          → /profile
│   │   └── settings/
│   │       └── page.tsx      → /profile/settings
│   ├── settings/
│   │   └── page.tsx          → /settings
│   ├── notifications/
│   │   └── page.tsx          → /notifications
│   └── [other-routes]/
│
└── app/tenant/[slug]        [Tenant Context]
    ├── layout.tsx
    │   ├── Sidebar (tenantSlug={slug})
    │   ├── Topbar (tenantSlug={slug})
    │   └── children
    ├── page.tsx              → /tenant/{slug} (Dashboard)
    ├── messages/
    │   └── page.tsx          → /tenant/{slug}/messages ✨ UPDATED
    ├── profile/
    │   ├── page.tsx          → /tenant/{slug}/profile
    │   └── settings/
    │       └── page.tsx      → /tenant/{slug}/profile/settings
    ├── settings/
    │   └── page.tsx          → /tenant/{slug}/settings
    ├── notifications/
    │   └── page.tsx          → /tenant/{slug}/notifications ✨ NEW
    └── [other-routes]/
```

## Route Navigation Flow

### Super Admin Context
```
┌─────────────────────────────────────┐
│    Super Admin Dashboard            │
│  (/dashboard layout, no tenantSlug)  │
└─────────────────────────────────────┘
         ↓
    ┌────────────────────────┐
    │      Sidebar           │
    │  (no tenantSlug prop)   │
    └────────────────────────┘
         ↓
    Routes:
    • / → Dashboard
    • /messages → /messages
    • /profile → /profile
    • /settings → /settings
    • /notifications → /notifications
```

### Tenant Context
```
┌──────────────────────────────────────────────┐
│    Tenant Dashboard                          │
│  (/tenant/[slug] layout, tenantSlug={slug})  │
└──────────────────────────────────────────────┘
         ↓
    ┌──────────────────────────┐
    │      Sidebar             │
    │  (tenantSlug prop passed) │
    │  Routes auto-prefixed ✨  │
    └──────────────────────────┘
         ↓
    Routes:
    • / → /tenant/{slug}
    • /messages → /tenant/{slug}/messages
    • /profile → /tenant/{slug}/profile
    • /settings → /tenant/{slug}/settings
    • /notifications → /tenant/{slug}/notifications
```

## Component Prop Flow

```
┌─────────────────────────────────────┐
│   TenantLayout                      │
│   • params.slug = "hospital-abc"    │
└────────────┬────────────────────────┘
             │
    ┌────────┴────────┬────────────────┐
    ↓                 ↓                 ↓
┌─────────┐    ┌──────────┐    ┌──────────────┐
│Sidebar  │    │ Topbar   │    │ main children│
│props: { │    │props: {  │    │              │
│ tenantSlug:  │ tenantSlug:    │
│ "hospital-abc"│ "hospital-abc"│
│}        │    │}        │    │
└────┬────┘    └──┬──────┘    └──────────────┘
     │           │
     ↓           ↓
Routes auto-   Links auto-
prefixed      prefixed with
             /tenant/{slug}
```

## Sidebar Route Transformation

### Without tenantSlug
```
Configuration:          Used Routes:
─────────────────       ───────────
/messages        →      /messages
/profile         →      /profile
/settings        →      /settings
/appointments    →      /appointments
/patients        →      /patients
```

### With tenantSlug="hospital-abc"
```
Configuration:          Used Routes:
─────────────────       ─────────────────────────────────
/messages        →      /tenant/hospital-abc/messages
/profile         →      /tenant/hospital-abc/profile
/settings        →      /tenant/hospital-abc/settings
/appointments    →      /tenant/hospital-abc/appointments
/patients        →      /tenant/hospital-abc/patients
```

## Topbar Links Flow

### Super Admin (No tenantSlug)
```
Topbar Dropdown
├── My Profile      → /profile
├── Settings        → /settings
├── Notifications   → /notifications
└── Sign out
```

### Tenant User (With tenantSlug="hospital-abc")
```
Topbar Dropdown
├── My Profile      → /tenant/hospital-abc/profile
├── Settings        → /tenant/hospital-abc/settings
├── Notifications   → /tenant/hospital-abc/notifications
└── Sign out
```

## Data Flow: Real-Time Messaging

```
┌──────────────────┐
│   User Opens     │
│   Messages Page  │
└────────┬─────────┘
         │
         ↓
┌──────────────────────────────┐
│ WebSocket Connection Established
│ • userId: auth.user.id       │
│ • tenantId: auth.user.tenantId
└────────┬─────────────────────┘
         │
    ┌────┴────┬─────────────┬─────────────┐
    ↓         ↓             ↓             ↓
┌──────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│Fetch │ │Listen on │ │Listen on │ │Listen on │
│Conv- │ │user-     │ │user-     │ │notifi-   │
│ersa- │ │status    │ │typing    │ │cation    │
│tions │ │event     │ │event     │ │event     │
└──┬───┘ └──────────┘ └──────────┘ └──────────┘
   │
   ↓
┌──────────────────┐
│ Display Messages │
│ • Conversations  │
│ • Chat History   │
│ • User Status    │
└──────────────────┘
   │
   ↓
┌──────────────────┐
│ User Types       │
│ Emit "typing"    │
└──────────────────┘
```

## Pages Import Hierarchy

```
(dashboard)/layout.tsx
├── AuthProvider
├── ThemeProvider
├── Sidebar (no tenantSlug)
├── Topbar (no tenantSlug)
└── children
    ├── page.tsx (Dashboard - role router)
    ├── messages/page.tsx
    ├── profile/page.tsx
    ├── settings/page.tsx
    └── notifications/page.tsx

tenant/[slug]/layout.tsx
├── Sidebar (tenantSlug prop)
├── Topbar (tenantSlug prop)
└── children
    ├── page.tsx (Dashboard - role router)
    ├── messages/page.tsx ✨ Updated
    ├── profile/page.tsx
    ├── settings/page.tsx
    └── notifications/page.tsx ✨ New
```

## User Flow Examples

### Super Admin Accessing Messages
```
1. User logged in as super_admin
2. Clicks "Messages" in sidebar
3. Sidebar has no tenantSlug prop
4. Route: /messages
5. File: app/(dashboard)/messages/page.tsx
6. WebSocket connects: userId={user.id}, tenantId={user.tenantId}
```

### Doctor Accessing Messages in Hospital ABC
```
1. User logged in as doctor, tenant=hospital-abc
2. Navigates to: /tenant/hospital-abc
3. TenantLayout receives slug="hospital-abc"
4. Passes tenantSlug={slug} to Sidebar
5. Clicks "Messages" in sidebar
6. Sidebar transforms route: /messages → /tenant/hospital-abc/messages
7. File: app/tenant/[slug]/messages/page.tsx
8. WebSocket connects: userId={user.id}, tenantId={user.tenantId}
```

### Nurse Accessing Profile
```
1. User logged in as nurse, tenant=hospital-abc
2. TenantLayout receives slug="hospital-abc"
3. Passes tenantSlug={slug} to Topbar
4. Clicks avatar dropdown → "My Profile"
5. Topbar constructs URL: /tenant/hospital-abc/profile
6. Navigates to: /tenant/hospital-abc/profile
7. File: app/tenant/[slug]/profile/page.tsx
8. Page fetches: /api/users/profile?userId={user.id}
```

## Socket.io Events Flow

```
┌──────────────────────┐
│  Messages Page Init  │
└──────────┬───────────┘
           │
           ↓
┌────────────────────────────────────┐
│ Socket.connect() with auth:        │
│ • userId: {user.id}                │
│ • tenantId: {user.tenantId}        │
└────────┬──────────────────────────┘
         │
    ┌────┴────┬──────────┬──────────┐
    ↓         ↓          ↓          ↓
 Socket    Socket    Socket    Socket
"connect" "user-    "user-    "notifi-
         status"   typing"   cation"
         
    ↓         ↓          ↓          ↓
 Show     Update    Show/hide  Refresh
 Chat     Online    Typing     Queries
 History  Status    Indicator
```

## File Structure Summary

```
✅ UPDATED FILES:
  • app/tenant/[slug]/messages/page.tsx
  • components/Sidebar.tsx
  • components/Topbar.tsx
  • app/tenant/[slug]/layout.tsx

✅ NEW FILES:
  • app/tenant/[slug]/notifications/page.tsx
  • PAGES_INTEGRATION_COMPLETE.md
  • QUICK_REFERENCE_ROUTING.md
  • DASHBOARD_ARCHITECTURE_DIAGRAM.md

✅ EXISTING FILES (NO CHANGES):
  • app/(dashboard)/layout.tsx
  • app/(dashboard)/messages/page.tsx
  • app/(dashboard)/profile/page.tsx
  • app/(dashboard)/settings/page.tsx
  • app/(dashboard)/notifications/page.tsx
  • app/tenant/[slug]/profile/page.tsx
  • app/tenant/[slug]/settings/page.tsx
  • app/tenant/[slug]/page.tsx
```

## Key Concepts

### 1. Context-Aware Routing
Routes automatically prefix based on component props:
- No prop = super admin context (/)
- With prop = tenant context (/tenant/{slug})

### 2. Lazy Route Prefixing
Sidebar prefixes routes at render time, not configuration:
```typescript
if (tenantSlug) {
  sidebarItems = sidebarItems.map(item => ({
    ...item,
    path: item.path === "/" 
      ? `/tenant/${tenantSlug}` 
      : `/tenant/${tenantSlug}${item.path}`
  }));
}
```

### 3. Component Reusability
Same components (Sidebar, Topbar) work for both contexts:
- Backward compatible (optional props)
- No breaking changes
- Single source of truth

### 4. Page Co-location
Pages exist in both contexts:
- app/(dashboard)/messages/page.tsx
- app/tenant/[slug]/messages/page.tsx
- Same functionality, different routing

---

**Diagram Created**: May 20, 2026
**Architecture Version**: 1.0
**Status**: ✅ Ready for Implementation

