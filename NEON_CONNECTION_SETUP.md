# Neon PostgreSQL Connection Troubleshooting Guide

## Current Issue
Error: `getaddrinfo ENOTFOUND api.c-6.us-east-1.aws.neon.tech`

This error means the system cannot resolve the Neon database hostname. This is typically a network/DNS issue, not a code issue.

## Diagnosis Steps

### Step 1: Verify Environment Configuration
```bash
# Check if DATABASE_URL is set
echo $DATABASE_URL

# Expected format:
# postgresql://neondb_owner:npg_EMTKlq59JYQs@ep-spring-dust-anfktbmz-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

### Step 2: Test Network Connectivity
```bash
# Test DNS resolution
nslookup ep-spring-dust-anfktbmz-pooler.c-6.us-east-1.aws.neon.tech

# Alternative DNS test
dig ep-spring-dust-anfktbmz-pooler.c-6.us-east-1.aws.neon.tech

# Test connectivity with ping (might be blocked by firewall)
ping ep-spring-dust-anfktbmz-pooler.c-6.us-east-1.aws.neon.tech

# Test connectivity with curl
curl -I https://ep-spring-dust-anfktbmz-pooler.c-6.us-east-1.aws.neon.tech
```

### Step 3: Check Neon Account Status
1. Go to https://console.neon.tech
2. Log in to your account
3. Check if project is active (not suspended)
4. Verify endpoint status
5. Check for any quota limits

### Step 4: Verify Connection String

Extract components from `DATABASE_URL`:
- **User**: `neondb_owner`
- **Password**: `npg_EMTKlq59JYQs`
- **Host**: `ep-spring-dust-anfktbmz-pooler.c-6.us-east-1.aws.neon.tech`
- **Database**: `neondb`
- **Port**: (default 5432)
- **SSL**: required
- **Channel Binding**: required

## Solutions

### Solution 1: Network/Firewall Issues (Most Common)

#### Behind Corporate Firewall
1. **Request Proxy Configuration**
   ```bash
   # If using proxy, configure connection
   export DATABASE_URL="postgresql://user:pass@proxy:port/database"
   ```

2. **Use VPN**
   - Connect to corporate VPN if applicable
   - VPN may resolve DNS and allow external connections

3. **Contact IT/Network Team**
   - Request allowlist for Neon endpoints
   - Request outbound HTTPS access to: `*.neon.tech`

#### Home/ISP Issues
1. **Restart Router**
   ```bash
   # Power cycle network equipment
   # Wait 2-3 minutes
   # Test again
   ```

2. **Switch DNS Server**
   ```bash
   # Try Google DNS (8.8.8.8) or Cloudflare (1.1.1.1)
   # On Windows: Settings > Network > Change adapter options > DNS
   # On macOS: System Preferences > Network > DNS
   # On Linux: /etc/resolv.conf
   ```

3. **Use ISP DNS**
   - Reset to ISP defaults if custom DNS fails

### Solution 2: Verify Neon Endpoint

```bash
# Via Neon CLI
npm install -g @neondatabase/neon-cli
neon auth login
neon connection-string --project-id=YOUR_PROJECT_ID

# Via Neon Console
# https://console.neon.tech -> Project -> Connection
```

### Solution 3: Update Connection Settings

Try alternative connection methods in Neon:
1. **Pooled Connection** (Recommended for serverless)
   - Host: `pooler-***.c-*.region.aws.neon.tech`
   - Port: `5432` (or specified)

2. **Direct Connection** (Use for local development)
   - Host: `ep-***.c-*.region.aws.neon.tech`
   - Port: `5432`

### Solution 4: Docker/Local Testing

If local machine has issues, test in Docker:
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY . .

ENV DATABASE_URL="postgresql://..."
RUN npm install
CMD ["npm", "run", "dev"]
```

```bash
docker build -t joan:latest .
docker run -e DATABASE_URL="postgresql://..." joan:latest
```

### Solution 5: Temporary Workaround

If Neon connection is unavailable, consider:
1. **Local PostgreSQL** (for development)
   ```bash
   # Install PostgreSQL locally
   # Update DATABASE_URL to local instance
   # Continue development offline
   ```

2. **Alternative Cloud Database**
   - Supabase (PostgreSQL-compatible)
   - Railway.app
   - Heroku PostgreSQL

## Code-Level Fixes

### Update Connection Pool Settings
```typescript
// lib/db/index.ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

// Add retry logic
const createConnection = async () => {
  let retries = 3;
  while (retries > 0) {
    try {
      const sql = neon(process.env.DATABASE_URL!);
      return sql;
    } catch (error) {
      retries--;
      if (retries === 0) throw error;
      // Wait before retry
      await new Promise(r => setTimeout(r, 1000 * (3 - retries)));
    }
  }
};

const sql = await createConnection();
export const db = drizzle(sql, { schema });
```

### Add Connection Timeout
```typescript
// lib/db/index.ts
const sql = neon(process.env.DATABASE_URL!, {
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  maxConns: 4, // Limit for serverless
});
```

### Error Handling in API Routes
```typescript
// app/api/users/route.ts
export async function GET(request: NextRequest) {
  try {
    const users = await service.getAllUsers();
    return NextResponse.json(users);
  } catch (error) {
    if ((error as any).message.includes('ENOTFOUND')) {
      return NextResponse.json(
        { error: "Database connection failed", retry: true },
        { status: 503 } // Service Unavailable
      );
    }
    throw error;
  }
}
```

## Production Deployment Checklist

- [ ] Neon endpoint is active and not suspended
- [ ] Database credentials are correct
- [ ] Network firewall allows outbound to Neon
- [ ] DNS resolution works (`nslookup` returns IP)
- [ ] SSL connection is verified
- [ ] Connection pool is configured for serverless
- [ ] Retry logic is implemented
- [ ] Error monitoring is set up (Sentry)
- [ ] Database backups are enabled
- [ ] Connection limits are respected

## Monitoring

### Add Health Check
```bash
# Test database connectivity
curl https://localhost:3000/api/health

# Expected response:
{
  "status": "operational",
  "services": {
    "database": { "status": "up", "latency": 45 }
  }
}
```

### Set Up Alerts
1. Monitor `/api/health` endpoint
2. Alert if status != "operational"
3. Track connection latency
4. Log failed connection attempts

## References

- Neon Docs: https://neon.tech/docs
- Connection Strings: https://neon.tech/docs/connect/connection-string
- Drizzle ORM: https://orm.drizzle.team/docs/get-started-postgresql
- Node.js DNS: https://nodejs.org/api/dns.html

## Support Contacts

- **Neon Support**: https://console.neon.tech/support
- **Network Team**: Contact your IT department
- **ISP**: Contact your internet provider
- **DevOps**: Check deployment environment logs

## Quick Fix Checklist

If you see `ENOTFOUND` error:

1. ✅ Run `nslookup ep-spring-dust-anfktbmz-pooler.c-6.us-east-1.aws.neon.tech`
   - If fails: DNS issue
   - If succeeds: Connection issue

2. ✅ Check `.env` file has correct `DATABASE_URL`
   - Verify no typos
   - Verify line endings are LF not CRLF

3. ✅ Restart Next.js dev server (`npm run dev`)

4. ✅ Check Neon console for project status
   - Verify project is active
   - Verify endpoint exists

5. ✅ If behind VPN/proxy, configure properly

6. ✅ Clear `.next` folder and rebuild:
   ```bash
   rm -rf .next
   npm run build
   ```

Once DNS resolves, the connection should work immediately! 🎉

