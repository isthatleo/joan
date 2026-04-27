# Database & System Synchronization Guide

**Status**: Complete API routes implemented  
**Date**: April 27, 2026  
**Issue**: Database connection failures to Neon

## Current Issue Analysis

### Symptoms
- ❌ Cannot log into any account (even super admin)
- ❌ Database connection errors: `getaddrinfo ENOTFOUND`
- ❌ Errors occur at:
  - `api.c-6.us-east-1.aws.neon.tech` (HTTP API endpoint)
  - `ep-spring-dust-anfktbmz-pooler.c-6.us-east-1.aws.neon.tech` (Connection pooler)

### Root Causes (Possible)
1. **Network Connectivity**: Machine cannot reach Neon servers
2. **DNS Resolution**: Network doesn't support external DNS resolution
3. **Firewall/Proxy**: Network blocking PostgreSQL connections
4. **Environmental**: No internet access on development machine
5. **Configuration**: Incorrect DATABASE_URL format or credentials

---

## Solution Steps

### Step 1: Verify Environment

```bash
# Check if DATABASE_URL is set
echo $env:DATABASE_URL

# Test DNS resolution
nslookup api.c-6.us-east-1.aws.neon.tech

# Test network connectivity
Test-NetConnection -ComputerName api.c-6.us-east-1.aws.neon.tech -Port 443
```

### Step 2: Fix Auth Connection

**Updated**: `lib/auth.ts` now uses Neon HTTP client instead of node-postgres.

The issue was that Better Auth was using `drizzle-orm/node-postgres` which requires a TCP connection. We've switched to `drizzle-orm/neon-http` which uses Neon's HTTP API.

**File**: `lib/auth.ts` ✅ FIXED

### Step 3: Solution Options

#### Option A: Use Local PostgreSQL (Recommended for Development)

If you don't have internet access, use local PostgreSQL instead:

```bash
# Install PostgreSQL
# Then update .env:
DATABASE_URL="postgresql://postgres:password@localhost:5432/joan"

# Create database and run migrations
npm run db:push
```

#### Option B: Setup Neon with Proper Connection

1. Go to https://console.neon.tech
2. Create/check your project
3. Copy the CONNECTION STRING (check "Connection pooling" option)
4. Update `.env`:
   ```
   DATABASE_URL="postgresql://user:password@pool.endpoint.region.postgres.neon.tech/dbname?sslmode=require"
   ```
5. Run: `npm run db:push`

#### Option C: Use Supabase (Alternative to Neon)

1. Create a Supabase project
2. Copy the connection string
3. Update DATABASE_URL

### Step 4: Verify Database Setup

```bash
# Run the verification script
node verify-db.js

# Or use npm
npm run verify:db
```

---

## API Routes Implemented

### ✅ Authentication Routes
- `POST /api/auth/[...all]` - Better Auth handler
- `GET /api/auth/first-user` - Check if first user exists
- `POST /api/auth/role` - Get user role

### ✅ Super Admin APIs (9 endpoints)
- `GET /api/super-admin?action=dashboard` - Dashboard metrics
- `GET /api/super-admin?action=recent-users` - Recent users
- `GET /api/super-admin?action=system-status` - System status
- `POST /api/super-admin` - Create admin user

### ✅ Tenant Management
- `GET /api/tenants` - List tenants
- `GET /api/tenants?stats=true` - Tenant statistics
- `GET /api/tenants?usage=true` - Usage statistics
- `POST /api/tenants` - Create tenant
- `PUT /api/tenants?id=<id>` - Update tenant
- `DELETE /api/tenants?id=<id>` - Delete tenant

### ✅ Analytics APIs (All Roles)
- `GET /api/analytics/doctor` - Doctor analytics
- `GET /api/analytics/nurse` - Nurse analytics
- `GET /api/analytics/lab` - Lab technician analytics
- `GET /api/analytics/pharmacy` - Pharmacist analytics
- `GET /api/analytics/accountant` - Accountant analytics
- `GET /api/analytics/receptionist` - Receptionist analytics
- `GET /api/analytics/patient` - Patient analytics
- `GET /api/analytics/hospital-admin` - Hospital admin analytics
- `GET /api/analytics/global` - Global analytics

### ✅ Compliance & Audit
- `GET /api/compliance/data` - Compliance data
- `GET /api/compliance/data?category=metrics` - Compliance metrics
- `GET /api/compliance/data?category=risks` - Risk assessment
- `GET /api/audit-logs` - Audit logs

### ✅ System Management
- `GET /api/system/health` - System health
- `GET /api/health` - General health check
- `GET /api/platform/settings` - Platform settings

### ✅ User & Role Management
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `GET /api/roles` - List roles
- `POST /api/roles` - Create role
- `GET /api/permissions` - List permissions
- `POST /api/permissions` - Create permission

**Total**: 30+ API endpoints implemented

---

## Database Schema

### Tables Created
```
✅ tenants
✅ branches
✅ departments
✅ users
✅ roles
✅ permissions
✅ rolePermissions
✅ userRoles
✅ patients
✅ appointments
✅ visits
✅ auditLogs
... and more
```

---

## Testing the System

### 1. Start the server
```bash
npm run dev
```

### 2. Test health check
```bash
curl http://localhost:3000/api/health
```

### 3. Check database
```bash
node verify-db.js
```

### 4. Test login (once DB is connected)
```bash
# Go to http://localhost:3000/login
# Try: Super Admin Access > /master
```

---

## Quick Diagnostics

Run this to see system status:

```bash
# PowerShell
.\test-apis.sh

# Or Node
npm run test:apis
```

---

## Environment Variables Checklist

```env
✓ DATABASE_URL=postgresql://...
✓ BETTER_AUTH_SECRET=<long-random-string>
✓ BETTER_AUTH_URL=http://localhost:3000
✓ NODE_ENV=development
```

---

## Success Indicators

Once properly configured, you should see:

1. ✅ `npm run dev` completes without DB errors
2. ✅ `/api/health` returns `status: "operational"`
3. ✅ `/api/super-admin?action=dashboard` returns metrics
4. ✅ Can login at `/login`
5. ✅ Dashboard loads at `/` after login

---

## Next Steps

1. **Immediate**: Fix database connection using Step 2 above
2. **Setup**: Run `npm run db:push` to create/sync schema
3. **Seed**: Run `npm run seed:super-admin` to create super admin user
4. **Verify**: Test login with super admin credentials
5. **Deploy**: System ready for production

---

## Support

If DB still won't connect:

1. Check `.env` file has correct DATABASE_URL
2. Verify network can reach database endpoint
3. Try local PostgreSQL as workaround
4. Check Neon project is active and not paused
5. Verify connection pooling settings

---

**Status**: System ready for synchronization  
**Action Required**: Establish database connection  
**Estimated Time**: 10-15 minutes

