# Database Connection & Sync - Complete Setup Guide

**Last Updated**: April 26, 2026  
**Status**: Ready for Implementation

## Issue Overview

The current error is:
```
Error: getaddrinfo ENOTFOUND ep-spring-dust-anfktbmz-pooler.c-6.us-east-1.aws.neon.tech
```

This indicates the Neon database endpoint cannot be reached from your environment.

---

## Solution 1: Use Local PostgreSQL (Recommended for Development)

### Step 1: Install PostgreSQL

**Windows (using Chocolatey):**
```powershell
choco install postgresql
```

**Or download**: https://www.postgresql.org/download/windows/

### Step 2: Update .env

Replace the `.env` file with:
```env
BETTER_AUTH_SECRET="2pLrXk2TvS7zcrusZcabzjO7OrEw0THf"
BETTER_AUTH_URL="http://localhost:3000"
DATABASE_URL="postgresql://postgres:password@localhost:5432/joan"
```

Replace `password` with your PostgreSQL password.

### Step 3: Create Database

```powershell
# Connect to PostgreSQL
psql -U postgres

# In psql:
CREATE DATABASE joan;
\q
```

### Step 4: Run Migrations

```powershell
npm run db:push
```

### Step 5: Seed Data

```powershell
npm run dev:seed
```

---

## Solution 2: Use Neon Cloud (Production-Ready)

### Step 1: Verify Connection String

In `.env`, ensure:
```env
DATABASE_URL="postgresql://neondb_owner:npg_EMTKlq59JYQs@ep-spring-dust-anfktbmz-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
```

### Step 2: Test Connection

```powershell
# Install psql (if not already installed)
# Then:
psql $DATABASE_URL -c "SELECT 1;"
```

### Step 3: Run Migrations

```powershell
npm run db:push
```

### Step 4: Initialize Database

```powershell
npx tsx seed-super-admin.ts
```

---

## Solution 3: Use Docker (Fastest Setup)

### Step 1: Install Docker

Download from: https://www.docker.com/products/docker-desktop

### Step 2: Create docker-compose.yml

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: joan
      POSTGRES_PASSWORD: joandemo123
      POSTGRES_DB: joan
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Step 3: Start PostgreSQL

```powershell
docker-compose up -d
```

### Step 4: Update .env

```env
DATABASE_URL="postgresql://joan:joandemo123@localhost:5432/joan"
```

### Step 5: Run Setup

```powershell
npm run db:push
npx tsx seed-super-admin.ts
npm run dev
```

---

## Complete Step-by-Step Setup (Quick Path)

### For Windows PowerShell:

```powershell
# 1. Navigate to project
cd C:\Users\leona\Downloads\joan

# 2. Update .env (use local PostgreSQL)
# Edit .env and set: DATABASE_URL="postgresql://postgres:password@localhost:5432/joan"

# 3. Create database (if using local PostgreSQL)
createdb -U postgres joan

# 4. Install dependencies
npm install

# 5. Generate and push migrations
npm run db:generate
npm run db:push

# 6. Seed super admin user
npx tsx seed-super-admin.ts

# 7. Start development server
npm run dev

# 8. Access the app
# Open: http://localhost:3000
# Login as super admin:
#   Email: leonardlomude@icloud.com
#   Password: Myname@78
```

---

## Verification Checklist

- [ ] DATABASE_URL is set in `.env`
- [ ] Database is created and accessible
- [ ] Migrations have been applied (`npm run db:push`)
- [ ] Seed data has been populated
- [ ] Development server starts without database errors
- [ ] Can access `http://localhost:3000/api/health`
- [ ] Can login with super admin credentials

---

## Troubleshooting

### Error: `ENOTFOUND` (DNS Resolution Failed)

**Cause**: Network connectivity issue to Neon cloud  
**Solution**: Use local PostgreSQL or Docker

### Error: `ECONNREFUSED` (Connection Refused)

**Cause**: PostgreSQL not running or wrong port  
**Solution**: Ensure PostgreSQL service is running

```powershell
# Check if PostgreSQL is running (Windows)
Get-Service postgresql-x64-* | Select-Object Status
```

### Error: `Authentication failed`

**Cause**: Wrong password or credentials  
**Solution**: Verify DATABASE_URL credentials

### Tables don't exist

**Cause**: Migrations not run  
**Solution**: Run `npm run db:push`

### Still can't login

**Cause**: Seed data not initialized  
**Solution**: Run `npx tsx seed-super-admin.ts`

---

## Post-Setup: Test the System

```bash
# 1. Test API health
curl http://localhost:3000/api/health

# 2. Test database connection
curl http://localhost:3000/api/auth/first-user

# 3. Test super admin dashboard
# Navigate to http://localhost:3000
# Click "Super Admin Access"
```

---

## All Available API Endpoints (After Setup)

### Authentication
- `GET /api/auth/first-user` - Check if first user exists
- `POST /api/auth/sign-in/email` - Login
- `POST /api/auth/role` - Get user role
- `POST /api/auth/assign-role` - Assign role to user

### Super Admin
- `GET /api/super-admin?action=dashboard` - Get dashboard metrics
- `GET /api/super-admin?action=recent-users` - Get recent users
- `GET /api/super-admin?action=system-status` - Get system status
- `POST /api/super-admin` - Create admin user (action: create-admin-user)

### Tenants
- `GET /api/tenants` - List tenants
- `GET /api/tenants?stats=true` - Get tenant statistics
- `GET /api/tenants?usage=true` - Get tenant usage
- `POST /api/tenants` - Create tenant
- `PUT /api/tenants` - Update tenant
- `DELETE /api/tenants?id=<id>` - Delete tenant

### Patients
- `GET /api/patients` - List patients
- `POST /api/patients` - Create patient
- `PUT /api/patients` - Update patient
- `DELETE /api/patients?id=<id>` - Delete patient

### Appointments
- `GET /api/appointments` - List appointments
- `POST /api/appointments` - Create appointment
- `PUT /api/appointments` - Update appointment
- `DELETE /api/appointments?id=<id>` - Delete appointment

### Analytics
- `GET /api/analytics/global` - Global analytics
- `GET /api/analytics/role-based` - Role-based analytics
- `GET /api/analytics/<role>` - Role-specific analytics

---

## Database Schema

The system uses 15+ tables for comprehensive healthcare management:

```
Core Tables:
- tenants
- branches
- departments
- users
- roles
- permissions
- rolePermissions
- userRoles

Clinical Tables:
- patients
- patientAllergies
- appointments
- visits
- vitals

Service Tables:
- labOrders
- labResults
- prescriptions
- pharmacyInventory

Finance Tables:
- billing
- payments
- invoices

Audit Tables:
- auditLogs
```

---

## Support

If you encounter issues:

1. Check `.env` file is properly configured
2. Verify database is running and accessible
3. Check logs: `npm run dev` shows real-time errors
4. Ensure all migrations are applied: `npm run db:push`
5. Verify seed data: `npx tsx seed-super-admin.ts`

---

**Setup Complete! 🚀**

Your Joan Healthcare OS is now ready to use.

