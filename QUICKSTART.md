# Joan Healthcare OS - Quick Start Guide

## Installation

```bash
# Install dependencies
npm install

# Set up environment variables
# Create .env.local with:
DATABASE_URL=your_neon_database_url
OPENAI_API_KEY=your_openai_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=generate_a_secret
```

## Database Setup

```bash
# Generate migrations
npm run db:generate

# Push schema to database
npm run db:push
```

## Start Development

```bash
# Start Next.js dev server
npm run dev

# In another terminal, start WebSocket server
# cd lib && node ws-server.ts
```

## Access Points

- **Web App**: http://localhost:3000
- **API**: http://localhost:3000/api
- **WebSocket**: ws://localhost:4000
- **Docs**: http://localhost:3000/docs

## Default Roles

1. **Super Admin** - Full platform control
2. **Hospital Admin** - Hospital management
3. **Doctor** - Patient care
4. **Nurse** - Care coordination
5. **Lab Technician** - Lab operations
6. **Pharmacist** - Pharmacy operations
7. **Accountant** - Billing
8. **Receptionist** - Patient intake
9. **Patient** - Health portal
10. **Guardian** - Family oversight

## Key Features by Role

### Doctor
- View patient queue
- Access patient profiles
- Create visits & diagnoses
- Order labs & prescriptions
- AI-assisted diagnostics
- Critical alerts

### Nurse
- Track vitals
- Administer medications
- Manage patient care
- Update patient status
- Coordinate ward care

### Pharmacist
- Manage prescriptions
- Track inventory
- Dispense medications
- Monitor expiry dates
- Reorder supplies

### Accountant
- Generate invoices
- Track payments
- Process insurance claims
- Generate reports
- Monitor revenue

### Patient/Guardian
- Book appointments
- View medical history
- Access lab results
- Manage family health
- Pay bills
- Download records

## API Usage

```bash
# Create patient
curl -X POST http://localhost:3000/api/patients \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Doe","tenantId":"..."}'

# Create appointment
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{"patientId":"...","doctorId":"...","scheduledAt":"2026-04-20T10:00:00Z"}'

# Add to queue
curl -X POST http://localhost:3000/api/queue/add \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"...","patientId":"...","departmentId":"...","priority":"normal"}'

# Get AI summary
curl http://localhost:3000/api/ai/summary/[patientId]
```

## Project Structure

```
joan/
├── app/
│   ├── (dashboard)/        # Role-based dashboards
│   ├── api/               # API routes
│   ├── docs/              # Documentation
│   └── layout.tsx         # Root layout
├── components/            # React components
├── hooks/                 # Custom hooks
├── lib/
│   ├── db/               # Drizzle schema & client
│   ├── services/         # Business logic
│   ├── auth/             # Auth & RBAC
│   ├── api-client.ts     # API wrapper
│   ├── event-bus.ts      # Event system
│   └── redis.ts          # Redis client
├── stores/               # Zustand stores
├── public/               # Static files
├── middleware.ts         # Auth middleware
└── package.json
```

## Customization

### Add New Permission
1. Create in `permissions` table
2. Add to role in `rolePermissions`
3. Check in UI with `useCan()`

### Add New Role
1. Create role in `roles` table
2. Assign permissions
3. Add dashboard page
4. Update sidebar

### Add New Service
1. Create service in `lib/services/`
2. Create API route in `app/api/`
3. Create hook in `hooks/use-queries.ts`
4. Use in component

## Deployment

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Environment Checklist

- [ ] Database connection tested
- [ ] OpenAI API key active
- [ ] Twilio credentials verified
- [ ] Better-auth secret set
- [ ] Redis connection working
- [ ] WebSocket server running
- [ ] Email notifications (if needed)

## Support & Documentation

- Full docs: http://localhost:3000/docs
- GitHub: (Add your repo)
- Issues: (Add issue tracker)

---

**Joan is ready for clinical use. Ensure HIPAA/GDPR compliance before production deployment.**
