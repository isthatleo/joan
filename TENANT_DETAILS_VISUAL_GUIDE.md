# Tenant Details Page - Visual Layout Guide

## Page Structure Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Back to Tenants                                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ [Logo/Icon] Hospital Name               [Edit] [More]          │
│              Managed since Month DD, YYYY                        │
│                                      Slug: hospital-slug        │
│              [Premium Plan] [Active]                            │
├─────────────────────────────────────────────────────────────────┤
│ ✉ Contact Email: contact@hospital.com                          │
│ ☎ Phone: +1 (555) 123-4567                                     │
│ 📍 Address: 123 Hospital St, City, Country                     │
│ 📅 Provisioned: May 01, 2026                                   │
└─────────────────────────────────────────────────────────────────┘

┌────────────────┬────────────────┬────────────────┬────────────────┐
│ 👥 Total Users │ 👥 Active Users│ 📈 Patients    │ 📄 Invoices    │
│     42         │     38 of 42   │     1,234      │      28        │
└────────────────┴────────────────┴────────────────┴────────────────┘

┌────────────────────────────────────┬────────────────────────────────────┐
│ Plan Details                       │ Quick Stats                        │
├────────────────────────────────────┼────────────────────────────────────┤
│ Current Plan: Premium              │ Appointments: 5,234                │
│                                    │ Visits: 2,847                      │
│ ✓ Unlimited users                  │ Avg. Users per Patient: 0.02       │
│ ✓ Advanced analytics               │                                    │
│ ✓ Priority support                 │                                    │
│ ✓ Custom integrations              │                                    │
│ ✓ Dedicated account manager        │                                    │
└────────────────────────────────────┴────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ LEFT COLUMN (1/3)                 │ RIGHT COLUMN (2/3)              │
├─────────────────────────────────────────────────────────────────┤
│                                   │                                 │
│ Users                             │ Billing Overview              │
│ ├─ Active Users: 38               │ ┌─────┬─────┬─────┐          │
│ ├─ Inactive: 4                    │ │Billed│Paid │Pending│        │
│ │                                 │ │$2,400│$2,100│$300  │       │
│ │ Recent Users                    │ └─────┴─────┴─────┘          │
│ │ • John Doe (active)             │                                 │
│ │ • Jane Smith (active)           │ Invoice Summary                 │
│ │ • Mike Johnson (inactive)       │ ├─ Total: 28                   │
│ │ • Sarah Williams (active)       │ ├─ Paid: 24                    │
│ │ • Tom Brown (active)            │ ├─ Pending: 3                  │
│ │                                 │ ├─ Overdue: 1                  │
│ │ View all 42 users →             │                                 │
│ │                                 │ Recent Invoices                 │
│ │ Performance                     │ ┌─────────────────────┐        │
│ │ ├─ System Health: 99.9% ↑      │ │INV-A1B2C3D4   $500 │        │
│ │ ├─ HIPAA Compliant ✓            │ │Paid    May 15, 2026 │        │
│ │ ├─ Encrypted at Rest ✓          │ └─────────────────────┘        │
│ │                                 │ ┌─────────────────────┐        │
│ │                                 │ │INV-E5F6G7H8   $350 │        │
│ │                                 │ │Pending May 10, 2026 │        │
│ │                                 │ └─────────────────────┘        │
│ │                                 │ ┌─────────────────────┐        │
│ │                                 │ │INV-I9J0K1L2   $200 │        │
│ │                                 │ │Overdue May 01, 2026 │        │
│ │                                 │ └─────────────────────┘        │
│ │                                 │ View all 28 invoices →         │
│ │                                 │                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Responsive Breakpoints

### Mobile (< 768px)
- Single column layout
- Full-width cards
- Stacked sections
- Icons above text
- Smaller font sizes
- Condensed spacing

### Tablet (768px - 1024px)  
- 2-column layout for metrics
- Side-by-side sections
- Normal font sizes
- Medium spacing
- Optimized card width

### Desktop (> 1024px)
- 3-column layout (Left | Center | Right)
- Full-width header
- 4-column metric grid
- Comfortable spacing
- Optimized readability

## Color Scheme

### Plans
```
Basic:    [Slate] bg-slate-100 text-slate-700
Standard: [Blue]  bg-blue-50 text-blue-700
Premium:  [Purple] bg-purple-50 text-purple-700
```

### Status
```
Active:    [Green]  bg-green-50 text-green-700
Inactive:  [Gray]   bg-muted text-muted-foreground
Paid:      [Green]  bg-green-50 text-green-700
Pending:   [Yellow] bg-yellow-50 text-yellow-700
Overdue:   [Red]    bg-red-50 text-red-700
```

### Metrics
```
Appointments: [Orange] text-orange-600
Visits:       [Blue]   text-blue-600
Users:        [Purple] text-purple-600
Health:       [Green]  text-green-600
```

## Information Organization

### Header Section (Full Width)
- Hospital name and logo
- Tenant slug
- Plan and status badges
- Contact information
- Provisioning date
- Action buttons (Edit, More)

### Key Metrics (Full Width - 4 Columns Responsive)
- Total Users
- Active Users
- Total Patients
- Total Invoices

### Information Grid (1-2-3 Columns)
- Plan Details Card
- Quick Stats Card
- (Expandable for future sections)

### Main Content Area (1/3 - 2/3 Split)

**Left Column (1/3)**
- Users Section
  - Active/Inactive counts
  - Recent users list
  - View all link
- Performance Section
  - System health
  - Security status
  - Data encryption

**Right Column (2/3)**
- Billing Overview (3 metric cards)
- Invoice Statistics (4 stat boxes)
- Recent Invoices List
  - Sortable/filterable
  - Status badges
  - Pagination

## Typography

### Headers
- Page Title: 30px Bold (Hospital Name)
- Section Headers: 18px Semibold
- Card Headers: 16px Semibold
- Labels: 12px Medium uppercase

### Body Text
- Regular text: 14px Regular
- Small text: 12px Regular
- Monospace (IDs): 14px Mono

## Spacing System

- Page margin: 16px (mobile), 32px (desktop)
- Section gap: 32px
- Card spacing: 16px
- Internal padding: 24px
- Element spacing: 12px

## Interactive Elements

### Buttons
- Primary (Edit): Icon button with hover state
- Secondary (More): Icon button with hover state
- Links: Text with orange color, underline on hover

### Hover States
- Card hover: Border color change, subtle shadow
- Button hover: Background color change
- Link hover: Color deepening + underline

### Loading States
- Skeleton loaders for all sections
- Smooth fade-in animation
- Placeholder text during load

### Error States
- Alert box with icon
- Error message text
- Back button to retry

## Data Display Format

### Currency
- Format: $1,234.56
- No decimals for whole amounts
- Grouped by thousands

### Numbers
- Format: 1,234 (not 1234)
- Full precision for percentages
- Abbreviated for very large (1M, 1K)

### Dates
- Format: Month DD, YYYY
- Locale-aware formatting
- Readable timezone handling

### Statuses
- Capitalized: "Active", "Paid", "Pending"
- Badge styled with color coding
- Icon indicators where applicable

---

## Implementation Notes

✓ All sections are responsive and mobile-optimized
✓ Loading states prevent content flickering
✓ Error handling provides user guidance
✓ Color scheme is accessible WCAG AA compliant
✓ Spacing follows consistent grid
✓ Typography hierarchy clear and readable
✓ Interactive elements have proper feedback
✓ Icons enhance comprehension without being necessary

