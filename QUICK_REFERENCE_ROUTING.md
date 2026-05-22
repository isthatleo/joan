# Quick Reference: Dashboard Pages & Routing

## Context-Aware URL Pattern

The system automatically routes URLs based on context:

### Super Admin Routes
```
/messages          → Messages page
/profile          → Profile page
/settings         → Settings page
/notifications    → Notifications page
/                 → Dashboard
```

### Tenant Routes (Automatic)
```
/tenant/{slug}/messages          → Messages page
/tenant/{slug}/profile          → Profile page
/tenant/{slug}/settings         → Settings page
/tenant/{slug}/notifications    → Notifications page
/tenant/{slug}                  → Dashboard
```

## Component Props

### Sidebar
```typescript
// Without tenant context (super admin)
<Sidebar />

// With tenant context
<Sidebar tenantSlug="hospital-abc" />
```

### Topbar
```typescript
// Without tenant context (super admin)
<Topbar />

// With tenant context
<Topbar tenantSlug="hospital-abc" />
```

## How It Works

### Sidebar Route Prefixing
When `tenantSlug` is provided, all routes are automatically prefixed:
- `/messages` → `/tenant/hospital-abc/messages`
- `/appointments` → `/tenant/hospital-abc/appointments`
- `/patients` → `/tenant/hospital-abc/patients`

### Topbar Dynamic Links
When `tenantSlug` is provided, profile menu links become:
- My Profile → `/tenant/hospital-abc/profile`
- Settings → `/tenant/hospital-abc/settings`
- All Notifications → `/tenant/hospital-abc/notifications`

### Breadcrumb Navigation
- Without tenantSlug: Home links to `/`
- With tenantSlug: Home links to `/tenant/hospital-abc`

## Pages Available

### Messages
- Real-time messaging with WebSockets
- Online status indicators
- Typing notifications
- Read receipts
- User search and conversations

### Profile
- Edit personal information
- Upload avatar
- View roles and permissions
- See activity history

### Settings
- User preferences
- Notification settings
- System settings

### Notifications
- All notification types (messages, appointments, alerts, broadcasts)
- Tabbed filtering
- Mark as read
- Delete notifications
- Real-time updates

## Implementation Details

### Modified Files
1. `app/tenant/[slug]/messages/page.tsx` - Updated to modern UI
2. `components/Sidebar.tsx` - Added tenant context support
3. `components/Topbar.tsx` - Added tenant context support
4. `app/tenant/[slug]/layout.tsx` - Passes context to components

### New Files
1. `app/tenant/[slug]/notifications/page.tsx` - New notifications page

## Usage Examples

### Setting Up a New Role/Tenant Page
```typescript
// In layout.tsx
export default function TenantLayout({ children }) {
  const { slug } = useParams();
  
  return (
    <div>
      <Sidebar tenantSlug={slug} />
      <Topbar tenantSlug={slug} />
      <main>{children}</main>
    </div>
  );
}
```

### Adding New Routes to Sidebar
Routes are defined in `components/Sidebar.tsx`:
```typescript
const sidebarConfigs = {
  doctor: [
    { label: "Dashboard", path: "/", icon: LayoutDashboard, category: "Main" },
    { label: "Messages", path: "/messages", icon: MessageSquare, category: "Communication" },
    // Route is automatically prefixed when tenantSlug is provided
  ]
};
```

## Socket Events (Real-Time Messaging)

```typescript
// User comes online/offline
socket.on("user-status", ({ userId, status }) => {
  // Update online status
});

// User is typing
socket.on("user-typing", ({ userId, isTyping }) => {
  // Show/hide typing indicator
});

// New message received
socket.on("notification", (payload) => {
  // Refetch conversations and messages
});
```

## API Calls

### Get Conversations
```typescript
fetch(`/api/tenant/${slug}/messages?type=conversations`)
```

### Get Chat Messages
```typescript
fetch(`/api/tenant/${slug}/messages?type=chat&otherUserId=${userId}`)
```

### Send Message
```typescript
fetch(`/api/tenant/${slug}/messages`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    senderId: currentUserId,
    receiverId: recipientId,
    message: messageText,
  })
})
```

### Get Notifications
```typescript
fetch(`/api/notifications?userId=${userId}`)
```

## Troubleshooting

### Messages Not Appearing?
1. Check WebSocket connection: `socket.connected`
2. Verify API endpoints are accessible
3. Check browser console for errors
4. Ensure user ID is correct

### Profile Links Not Working?
1. Check `tenantSlug` is being passed to Topbar
2. Verify tenant slug in URL matches database
3. Check profile page exists at correct path

### Sidebar Links Not Routing Correctly?
1. Verify `tenantSlug` is passed to Sidebar
2. Check route format matches configuration
3. Ensure route exists in Next.js file structure

## Performance Notes

- Notifications refetch every 30 seconds (fallback)
- WebSocket provides real-time updates
- Messages auto-scroll to latest
- Online status updates via socket
- Typing indicators debounce after 3 seconds

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- WebSocket support required
- LocalStorage for sidebar state
- ES2020+ support required

---

**Last Updated**: May 20, 2026
**Status**: ✅ Production Ready

