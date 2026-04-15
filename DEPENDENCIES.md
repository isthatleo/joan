# Joan Healthcare OS - Dependencies Documentation

## 📦 Complete Package List

**Version:** 1.0.0  
**Last Updated:** April 15, 2026  
**Node:** ≥18.0.0 | **npm:** ≥9.0.0

---

## 🎯 Core Framework Dependencies

### Next.js & React
- **next** `^16.2.3` - React metaframework with built-in routing
- **react** `^18.2.0` - UI library
- **react-dom** `^18.2.0` - React DOM renderer

### TypeScript & Build Tools
- **typescript** `^5.3.3` - Type safety
- **tsx** `^4.21.0` - TypeScript execution
- **postcss** `^8.4.32` - CSS processing
- **autoprefixer** `^10.4.16` - Vendor prefixes

---

## 🎨 UI & Styling

### Tailwind CSS
- **tailwindcss** `^3.4.1` - Utility-first CSS
- **tailwind-merge** `^2.6.1` - Class merging
- **tailwindcss-animate** `^1.0.7` - Animations

### Component Libraries
- **lucide-react** `^0.378.0` - 378+ icons
- **@radix-ui/react-*** (8 packages) - Headless components
- **sonner** `^2.0.7` - Toast notifications
- **cmdk** `^1.1.1` - Command palette
- **input-otp** `^1.4.2` - OTP input component

### Utilities
- **class-variance-authority** `^0.7.1` - Component variants
- **clsx** `^2.1.1` - Class composition
- **next-themes** `^0.3.0` - Theme management

---

## 🔐 Authentication & Authorization

### Auth Systems
- **better-auth** `^1.4.6` - Modern auth solution
- **next-auth** `^5.0.0` - NextAuth.js v5
- **jsonwebtoken** `^9.1.2` - JWT handling
- **bcryptjs** `^2.4.3` - Password hashing

### Types
- **@types/jsonwebtoken** `^9.0.7` - JWT types
- **@types/bcryptjs** `^2.4.6` - bcryptjs types

---

## 📊 State Management & Data Fetching

### State Management
- **zustand** `^4.4.7` - Lightweight state management
- **react-query** `^3.39.3` - Server state caching

### Data Fetching & Querying
- **@tanstack/react-query** `^5.32.0` - TanStack Query v5
- **superjson** `^2.2.1` - JSON serialization

### Form Management
- **react-hook-form** `^7.51.4` - Form handling
- **@hookform/resolvers** `^3.3.4` - Validation resolvers
- **zod** `^3.23.6` - Schema validation

---

## 🗄️ Database & ORM

### Database Drivers
- **pg** `^8.20.0` - PostgreSQL client
- **@types/pg** `^8.20.0` - PostgreSQL types
- **@neondatabase/serverless** `^1.0.2` - Neon serverless driver

### ORM
- **drizzle-orm** `^0.30.7` - SQL ORM
- **drizzle-kit** `^0.20.14` - Schema management

---

## 📡 Real-time & Communication

### WebSockets
- **socket.io** `^4.8.3` - WebSocket server
- **socket.io-client** `^4.8.3` - WebSocket client
- **redis** `^5.12.1` - Redis client
- **@types/redis** `^4.0.10` - Redis types

### Messaging
- **twilio** `^5.0.4` - SMS & voice
- **resend** `^3.0.0` - Email API

---

## 💳 Payments & Billing

### Payment Processing
- **stripe** `^14.21.0` - Payment processor

---

## 🤖 AI & Machine Learning

### AI Services
- **openai** `^6.34.0` - OpenAI API (GPT, Claude)

---

## 📱 Backend & APIs

### Backend Integration
- **node-appwrite** `^12.0.1` - Appwrite SDK
- **@trpc/client** `^10.45.0` - tRPC client
- **@trpc/server** `^10.45.0` - tRPC server
- **@trpc/next** `^10.45.0` - tRPC Next.js
- **@trpc/react-query** `^10.45.0` - tRPC React Query integration

---

## 📥 File & Date Handling

### File Operations
- **react-dropzone** `^14.2.3` - File drag & drop

### Date & Time
- **date-fns** `^4.1.0` - Date utilities
- **react-datepicker** `^6.9.0` - Date picker
- **react-day-picker** `^9.14.0` - Day picker

---

## ☎️ Phone & Input

### Phone Numbers
- **react-phone-number-input** `^3.4.1` - Phone input

---

## 🔍 Code Quality & Development

### Linting & Formatting
- **eslint** `^8.56.0` - Linter
- **eslint-config-next** `^16.2.3` - Next.js ESLint config
- **eslint-config-standard** `^17.1.0` - Standard ESLint config
- **eslint-config-prettier** `^9.1.0` - Prettier integration
- **eslint-plugin-import** `^2.29.1` - Import linting
- **eslint-plugin-tailwindcss** `^3.15.1` - Tailwind linting
- **@typescript-eslint/eslint-plugin** `^6.17.0` - TypeScript linting
- **@typescript-eslint/parser** `^6.17.0` - TypeScript parser

### Code Formatting
- **prettier** `^3.2.5` - Code formatter

---

## 🚨 Monitoring & Error Tracking

### Sentry
- **@sentry/nextjs** `^8.9.2` - Error tracking & monitoring

---

## 📊 Data Tables

### Table Management
- **@tanstack/react-table** `^8.21.3` - Headless table component

---

## 🔄 Utilities

### Environment Variables
- **dotenv** `^17.4.2` - Environment management

---

## 📝 Type Definitions

### Type Packages
- **@types/node** `^20.10.6` - Node.js types
- **@types/react** `^18.2.46` - React types
- **@types/react-dom** `^18.2.18` - React DOM types
- **@types/react-datepicker** `^6.2.0` - DatePicker types

---

## 🎯 Dependency Summary by Category

```
Core Framework:        3 packages
UI & Components:       15 packages
Authentication:        4 packages
State & Data:         5 packages
Database:             5 packages
Real-time:            4 packages
Payments:             1 package
AI:                   1 package
Backend:              5 packages
File Handling:        1 package
Date/Time:            3 packages
Phone Input:          1 package
Code Quality:         8 packages
Monitoring:           1 package
Data Tables:          1 package
Utilities:            1 package

TOTAL:                58 packages
```

---

## 📋 Installation Command

```bash
npm install
# or
yarn install
# or
pnpm install
```

---

## 🚀 Build & Development Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Database operations
npm run db:generate  # Generate migrations
npm run db:push      # Push to database
npm run db:studio    # Open Drizzle Studio

# Code quality
npm run lint         # Run ESLint
npm run format       # Format with Prettier
npm run type-check   # TypeScript check
```

---

## 🔄 Update Strategy

### Regular Updates
```bash
# Check for updates
npm outdated

# Update packages
npm update

# Update specific package
npm install <package>@latest
```

### Security Audits
```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

---

## 📦 Key Dependencies Explained

| Package | Purpose | Why We Use It |
|---------|---------|---------------|
| **Next.js 16** | Full-stack React framework | Server-side rendering, API routes, optimization |
| **TypeScript** | Type safety | Catch errors at compile time |
| **Tailwind CSS** | Utility CSS | Fast, responsive styling |
| **Zustand** | State management | Lightweight, simple state handling |
| **Drizzle ORM** | Database | Type-safe SQL queries |
| **tRPC** | API development | End-to-end type safety |
| **Socket.io** | Real-time | Live queue updates, notifications |
| **OpenAI** | AI assistance | Diagnosis suggestions, summaries |
| **Stripe** | Payments | Payment processing |
| **Sentry** | Error tracking | Production monitoring |
| **Zod** | Validation | Type-safe validation |

---

## 🚨 Important Notes

### Version Compatibility
- **Node.js:** 18.0.0 or higher
- **npm:** 9.0.0 or higher
- **Next.js:** 16.2.3 (latest)

### Breaking Changes
- Next.js 16 uses App Router (no Pages Router)
- React 18+ required for Concurrent Features
- TypeScript 5.3+ for latest features

### Security Considerations
- Keep all packages updated
- Run `npm audit` regularly
- Use `.env.local` for secrets (never commit)
- Rotate API keys periodically

---

## 📞 Dependency Support

### Community Packages
All packages have active maintainers and community support:
- React & Next.js: Vercel & React core team
- Tailwind CSS: Tailwind Labs
- Radix UI: Radical Design
- Socket.io: Automattic

### Updates Frequency
- **Critical updates:** Applied immediately
- **Minor updates:** Monthly review
- **Patch updates:** Automatic via Dependabot

---

## 🎁 Optional Dependencies (Not Included)

Consider adding these later:
- `testing-library` - Component testing
- `vitest` - Fast unit testing
- `playwright` - E2E testing
- `storybook` - Component documentation
- `graphql` - GraphQL API option
- `prisma` - Alternative ORM

---

## 📊 File Size Impact

```
Core Dependencies:     ~450MB (node_modules)
Production Build:      ~200KB (bundle)
Database Driver:       ~5MB
Socket.io:            ~2MB
OpenAI SDK:           ~3MB
```

---

## ✅ Verification Checklist

After installation:

- ✅ Run `npm install` successfully
- ✅ Run `npm run build` without errors
- ✅ Run `npm run dev` - starts dev server
- ✅ Run `npm run type-check` - no TypeScript errors
- ✅ Run `npm run lint` - no ESLint errors
- ✅ Database initialized with `npm run db:push`
- ✅ Environment variables configured
- ✅ All pages load in browser

---

## 🔗 Useful Links

- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [Drizzle ORM](https://orm.drizzle.team)
- [Socket.io](https://socket.io)
- [tRPC](https://trpc.io)
- [Zustand](https://github.com/pmndrs/zustand)
- [OpenAI API](https://platform.openai.com/docs)

---

*Last Updated: April 15, 2026*  
*Joan Healthcare OS v1.0.0*

