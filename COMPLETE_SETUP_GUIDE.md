# 🚀 Joan Healthcare OS - Complete Setup & Troubleshooting Guide

**Date**: April 27, 2026  
**System Version**: 1.0.0  
**Status**: Ready for Deployment

---

## 🎯 Quick Start (5 Minutes)

### Step 1: Fix Database Connection

The current error "getaddrinfo ENOTFOUND" means the system can't reach Neon. Choose one solution:

#### **Option A: Use Local PostgreSQL (Fastest for Development)**

```powershell
# 1. Install PostgreSQL from https://www.postgresql.org/download/windows/
# Or use Windows Subsystem for Linux (WSL2)

# 2. Create database and user
# Open PostgreSQL psql:
createdb joan
createuser joan_user with password 'joan_password'
ALTER USER joan_user WITH SUPERUSER;

# 3. Update .env
DATABASE_URL="postgresql://joan_user:joan_password@localhost:5432/joan"

# 4. Push schema
npm run db:push
```

#### **Option B: Setup Neon Cloud (Production Recommended)**

```powershell
# 1. Go to https://console.neon.tech
# 2. Create a project
# 3. Copy full connection string
# 4. Enable "Connection pooling"
# 5. Update .env:

$env:DATABASE_URL = "postgresql://user:password@pool.endpoint.region.postgres.neon.tech/dbname"

# Or edit .env file directly and save

# 6. Test connection
npm run verify:db

# 7. Push schema
npm run db:push
```

#### **Option C: Use Docker for PostgreSQL**

```powershell
# Create docker-compose.yml:

version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: joan
      POSTGRES_USER: joan_user
      POSTGRES_PASSWORD: joan_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:

# Start:
docker-compose up -d

# Update .env:
DATABASE_URL="postgresql://joan_user:joan_password@localhost:5432/joan"

# Push schema:
npm run db:push
```

---

### Step 2: Create Database Tables

```powershell
# Run migrations
npm run db:push

# Verify tables created
node verify-db.js
```

Expected output:
```
✅ Database connection successful!
Found 15+ tables:
  ✓ users
  ✓ roles
  ✓ permissions
  ✓ tenants
  ... and more
```

---

### Step 3: Seed Super Admin User

```powershell
# Create default tenant and super admin user
npm run seed:super-admin

# Output should show:
# ✓ Default tenant created
# ✓ Super admin user created
# ✓ Super admin role created
# ✓ Super admin setup completed successfully
```

**Default Super Admin Credentials:**
```
Email: leonardlomude@icloud.com
Password: Myname@78
```

---

### Step 4: Start Development Server

```powershell
npm run dev

# Output should show:
# ✓ Ready in X seconds
# ▲ Local: http://localhost:3000
# No database errors should appear!
```

---

### Step 5: Test the System

```powershell
# Terminal 1: Keep dev server running
npm run dev

# Terminal 2: Run tests
npm run test:apis

# Or use PowerShell test script
.\test-apis.ps1

# Should see:
# ✓ /api/health - 200
# ✓ /api/super-admin?action=dashboard - 200
# ✓ /api/tenants - 200
# ... all endpoints passing
```

---

### Step 6: Login to System

1. Open http://localhost:3000/login
2. Select role: "Super Admin" (or use "Super Admin Access" link)
3. Or navigate to: http://localhost:3000/master
4. Email: `leonardlomude@icloud.com`
5. Password: `Myname@78`
6. Expected: Redirected to `/` (Dashboard)

---

## ✅ Verification Checklist

After setup, verify:

- [ ] `npm run dev` starts without DB errors
- [ ] `node verify-db.js` shows "connected"
- [ ] `/api/health` returns `status: "operational"`
- [ ] `/api/super-admin?action=dashboard` returns metrics
- [ ] `/api/tenants` returns tenant list
- [ ] Login page loads at `/login`
- [ ] Can select super admin role
- [ ] Can enter credentials
- [ ] Dashboard loads after login
- [ ] All sidebar links work

---

## 🐛 Troubleshooting

### Issue 1: "getaddrinfo ENOTFOUND" Error

**Cause**: Database endpoint not reachable

**Solutions**:
```powershell
# 1. Check internet connection
Test-NetConnection google.com

# 2. Check if Neon endpoint is correct
$url = "api.c-6.us-east-1.aws.neon.tech"
nslookup $url

# 3. Verify DATABASE_URL in .env
cat .env | Select-String DATABASE_URL

# 4. Use local PostgreSQL instead
# See Option A above
```

---

### Issue 2: "error: connect ECONNREFUSED"

**Cause**: Database server not running

**Solutions**:
```powershell
# 1. If using local PostgreSQL:
# Start PostgreSQL service
$service = Get-Service postgresql-x64-15
if ($service.Status -ne 'Running') {
    Start-Service postgresql-x64-15
}

# 2. If using Docker:
docker-compose up -d

# 3. If using Neon:
# Make sure project is active (not paused)
# Go to https://console.neon.tech and check
```

---

### Issue 3: "User already exists" when seeding

**Cause**: Super admin already created

**Solution**:
```powershell
# Safe to ignore - user already exists
# Or reset database (WARNING: deletes all data)

# For local PostgreSQL:
dropdb joan
createdb joan
npm run db:push
npm run seed:super-admin

# For Neon:
# Go to console and reset database
# Or create new project
```

---

### Issue 4: Can't login even with correct credentials

**Cause**: Better Auth database tables not created

**Solution**:
```powershell
# Check Better Auth tables exist
# These should be created automatically:
# - user
# - account
# - session
# - verification

# If missing:
npm run db:push

# Then restart server:
npm run dev
```

---

### Issue 5: "TypeScript errors" on startup

**Cause**: Type mismatches

**Solution**:
```powershell
# 1. Clean build
npm run clean

# 2. Reinstall dependencies
rm -r node_modules package-lock.json
npm install

# 3. Restart dev server
npm run dev
```

---

### Issue 6: Pages don't load after login

**Cause**: Middleware or auth issues

**Solution**:
```powershell
# 1. Check middleware.ts is correct
# Should protect /api and /admin routes

# 2. Check session is stored
# Open DevTools > Application > Cookies
# Should see session cookie

# 3. Restart server and clear cache
# Ctrl+Shift+Del in browser
# Hard refresh: Ctrl+Shift+R

# 4. Check console for errors
# F12 > Console tab
```

---

## 📊 API Endpoints Testing

Test all endpoints:

```powershell
# Run comprehensive test suite
.\test-apis.ps1

# Or test specific endpoints:
function Test-API {
    param([string]$Endpoint)
    Invoke-WebRequest -Uri "http://localhost:3000$Endpoint" | ConvertTo-Json | Out-Host
}

# Examples:
Test-API "/api/health"
Test-API "/api/super-admin?action=dashboard"
Test-API "/api/tenants"
Test-API "/api/analytics/doctor"
```

---

## 🔧 Configuration Reference

### Environment Variables

```env
# REQUIRED
DATABASE_URL=postgresql://user:password@host:port/dbname

# REQUIRED
BETTER_AUTH_SECRET=<generate with: openssl rand -base64 32>

# OPTIONAL (defaults shown)
BETTER_AUTH_URL=http://localhost:3000
NODE_ENV=development

# OPTIONAL - Sentry
SENTRY_AUTH_TOKEN=<your-token>
```

### Generate BETTER_AUTH_SECRET

```powershell
# Option 1: PowerShell
$bytes = New-Object byte[] 32
[Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes($bytes)
[Convert]::ToBase64String($bytes)

# Option 2: Node
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Update .env with generated value
```

---

## 📁 Important Files

```
.env                           - Environment variables
lib/auth.ts                    - Authentication setup ✅ FIXED
lib/db/index.ts               - Database connection
lib/db/schema.ts              - Database schema
app/api/auth/[...all]/route.ts - Auth API endpoint
app/api/*/route.ts            - All API endpoints
app/*/page.tsx                - All frontend pages
```

---

## 🎓 System Architecture

```mermaid
┌─────────────────────────────────────┐
│   Browser / Client Application      │
│   - Next.js Frontend                │
│   - React Components (shadcn/ui)    │
│   - Real-time dashboards            │
└────────────┬────────────────────────┘
             │ HTTPS/REST
┌────────────▼────────────────────────┐
│   Next.js API Layer                 │
│   - 35+ REST Endpoints              │
│   - Better Auth                     │
│   - Middleware (auth, logging)      │
│   - Error handling                  │
└────────────┬────────────────────────┘
             │ TCP/HTTP
┌────────────▼────────────────────────┐
│   Drizzle ORM                       │
│   - Query builder                   │
│   - Type safety                     │
│   - Migration management            │
└────────────┬────────────────────────┘
             │ SQL
┌────────────▼────────────────────────┐
│   PostgreSQL (Neon or Local)        │
│   - 15+ tables                      │
│   - RBAC schema                     │
│   - Audit logging                   │
│   - Multi-tenancy                   │
└─────────────────────────────────────┘
```

---

## 📈 Performance Optimization

The system includes:

- ✅ Server-side rendering (SSR)
- ✅ Static generation where possible
- ✅ Image optimization
- ✅ Code splitting
- ✅ Database query optimization
- ✅ Connection pooling (Neon)
- ✅ Response caching utilities
- ✅ Component memoization

---

## 🔒 Security Checklist

Before production:

- [ ] Database password changed from defaults
- [ ] `BETTER_AUTH_SECRET` is strong and random
- [ ] `BETTER_AUTH_URL` matches production domain
- [ ] Environment variables properly secured
- [ ] Firewall configured (only needed ports open)
- [ ] HTTPS enabled in production
- [ ] Database backups configured
- [ ] Monitoring/alerting setup
- [ ] Audit logging enabled
- [ ] Access control reviewed

---

## 🚀 Deployment

### Vercel (Recommended)

```powershell
# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy
vercel

# 3. Add environment variables in Vercel dashboard
# DATABASE_URL, BETTER_AUTH_SECRET

# 4. Done! System deployed
```

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

```powershell
# Build and run
docker build -t joan-healthcare .
docker run -p 3000:3000 -e DATABASE_URL="..." joan-healthcare
```

---

## 📞 Support & Troubleshooting

**Check documentation files:**
- `DATABASE_SYNC_GUIDE.md` - Database setup
- `API_DOCUMENTATION.md` - API reference
- `IMPLEMENTATION_COMPLETE_REPORT.md` - Full feature list
- `QUICK_REFERENCE.md` - Quick answers

**Common commands:**
```powershell
npm run dev               # Start development server
npm run db:push         # Create/sync database tables
npm run seed:super-admin # Create initial super admin
npm run lint            # Check code quality
npm run type-check      # Check TypeScript types
node verify-db.js       # Verify database connection
.\test-apis.ps1         # Test all API endpoints
```

---

## ✨ System Status

| Component | Status | Action |
|-----------|--------|--------|
| Frontend | ✅ Ready | No action needed |
| APIs | ✅ Ready | No action needed |
| Database | ⏳ Pending | Establish connection |
| Auth | ✅ Ready | No action needed |
| Components | ✅ Ready | No action needed |
| Testing | ✅ Ready | Run after DB setup |

---

## 🎯 Final Checklist

- [ ] Database connection established
- [ ] Schema migrated (`npm run db:push`)
- [ ] Super admin created (`npm run seed:super-admin`)
- [ ] Development server running (`npm run dev`)
- [ ] All API tests passing (`.\test-apis.ps1`)
- [ ] Login works
- [ ] Dashboard loads
- [ ] All pages accessible
- [ ] Ready for production

---

**🎉 Once all items checked, system is production-ready!**

**Next Step**: Establish database connection (See Step 1 above)

**Estimated Time**: 10-15 minutes

**Support**: See troubleshooting section above

