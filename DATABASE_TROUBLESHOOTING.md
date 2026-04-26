# Database Connection Troubleshooting Guide

## Issue
Database connection errors when running `npm run dev`:
```
getaddrinfo ENOTFOUND ep-spring-dust-anfktbmz-pooler.c-6.us-east-1.aws.neon.tech
```

## Root Cause
DNS resolution is failing for the Neon PostgreSQL database endpoint. This typically means:
1. No internet connectivity
2. Network/Firewall restrictions
3. Neon service capacity issues
4. ISP DNS filtering

## Solutions

### Option 1: Use Local Development Database (Recommended for local testing)

1. Install PostgreSQL locally:
```bash
# macOS
brew install postgresql

# Windows
# Download from https://www.postgresql.org/download/windows/

# Linux
sudo apt-get install postgresql postgresql-contrib
```

2. Create local database:
```bash
createdb joanhealthcare_dev
```

3. Update `.env` to use local connection:
```
DATABASE_URL="postgresql://localhost/joanhealthcare_dev"
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_SECRET="your-secret-key"
```

4. Run migrations:
```bash
npm run db:push
```

5. Start development server:
```bash
npm run dev
```

### Option 2: Use Neon with Better Network

1. Verify your DATABASE_URL in `.env` is correct:
```
DATABASE_URL="postgresql://neondb_owner:npg_EMTKlq59JYQs@ep-spring-dust-anfktbmz-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
```

2. Test connectivity:
```bash
# Test DNS
nslookup ep-spring-dust-anfktbmz-pooler.c-6.us-east-1.aws.neon.tech

# Test connection (if psql installed)
psql $DATABASE_URL
```

3. If DNS fails, check:
   - Your internet connection: `ping 8.8.8.8`
   - Your local DNS: `cat /etc/resolv.conf` (Linux/Mac)
   - Try alternate DNS: Google (8.8.8.8) or Cloudflare (1.1.1.1)

### Option 3: Use Environment-Based Fallback

The system now includes fallback mock data for development. If database connection fails, APIs will return mock data.

To force mock mode:
```bash
MOCK_DATA=true npm run dev
```

### Option 4: Use Docker with Compose

1. Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: joanhealthcare_dev
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: devpass
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

2. Start:
```bash
docker-compose up -d
```

3. Update `.env`:
```
DATABASE_URL="postgresql://dev:devpass@localhost:5432/joanhealthcare_dev"
```

## Verifying Connection Works

After applying one of the above solutions:

1. Check if migrations run successfully:
```bash
npm run db:push
```

2. Try to access the API:
```bash
curl http://localhost:3000/api/health
```

3. Check browser console at `http://localhost:3000`

## Database Schema Setup

Once connected, initialize the database:

```bash
# Generate migrations (if schema changes)
npm run db:generate

# Apply migrations
npm run db:push

# Seed demo data
npm run seed:super-admin
```

## Monitoring Connection

To monitor the database connection:

1. Enable debug logging:
```typescript
// In lib/db/index.ts, set
neonConfig.debug = true;
```

2. Check error logs:
```bash
# In separate terminal
npm run dev 2>&1 | grep -i "database\|neon\|error"
```

## Next Steps

Once database is connected:

1. Initialize the admin account:
```bash
npm run seed:super-admin
```

2. Visit http://localhost:3000/login
3. Login with:
   - Email: `leonardlomude@icloud.com`
   - Password: `Myname@78`

4. Navigate to super-admin dashboard

## Getting Help

- Check Neon dashboard: https://console.neon.tech
- Neon docs: https://neon.tech/docs
- Joan Healthcare docs: See README.md

