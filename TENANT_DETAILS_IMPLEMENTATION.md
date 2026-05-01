# Tenant Details Page - Implementation Guide

## Overview
A comprehensive tenant details page has been created that displays hospital information, users, usage metrics, and billing information when clicking the "Config" button in the tenants table.

## New Routes Created

### API Endpoint
- **Path**: `/api/tenants/[id]/details`
- **Method**: GET
- **Description**: Fetches comprehensive tenant details including:
  - Basic tenant information
  - User list and counts
  - Billing metrics and invoices
  - Usage statistics

### Frontend Page
- **Path**: `/tenants/[id]`
- **Description**: Displays all tenant details in a beautifully organized layout

## Features

### 1. Hospital Information Section
- Hospital name and logo
- Plan type (Basic, Standard, Premium)
- Status (Active/Inactive)
- Contact information (email, phone)
- Address details
- Creation/provisioning date
- Unique tenant slug

### 2. Users Section
- Total user count
- Active vs. inactive user breakdown
- Recent users list with status indicators
- Quick link to view all users

### 3. Usage Section
- Total patients count
- Total appointments count
- Total visits count
- Real-time metrics updated from database

### 4. Billing & Invoicing Section
Comprehensive billing overview with:
- **Billing Summary Cards**:
  - Total billed amount
  - Total paid amount
  - Pending amount due

- **Invoice Statistics**:
  - Total invoices count
  - Paid invoices
  - Pending invoices
  - Overdue invoices

- **Recent Invoices List**:
  - Invoice ID (truncated)
  - Amount
  - Status badge (color-coded)
  - Creation date
  - Paginated view (shows 8, link to all)

## Updated Components

### Config Button
- **Old link**: `/tenants/[id]/permissions`
- **New link**: `/tenants/[id]`
- Location: `/tenants` page action column

## Design Features

### Responsive Layout
- Mobile-first approach
- Desktop optimizations with multi-column grid
- Adapts from 1 column (mobile) → 3 columns (desktop)

### Visual Hierarchy
- Color-coded status badges
- Icon-based information grouping
- Clear typography hierarchy
- Hover states for interactivity

### Color Coding
- **Plan Types**: 
  - Basic: Slate
  - Standard: Blue
  - Premium: Purple
- **Status**: 
  - Paid: Green
  - Pending: Yellow
  - Overdue: Red
  - Active: Green
  - Inactive: Gray

### Loading States
- Skeleton loaders for initial load
- Smooth transitions
- Error handling with user-friendly messages

## Data Structure

```typescript
TenantDetails {
  tenant: {
    id, name, slug, plan, isActive,
    contactEmail, contactPhone, address, city, country,
    logoUrl, createdAt
  },
  users: {
    list: User[],
    count: number,
    active: number
  },
  billing: {
    metrics: { totalBilled, totalPaid, pendingAmount },
    invoiceStats: { total, paid, pending, overdue },
    invoices: Invoice[]
  },
  usage: {
    totalPatients, totalAppointments, totalVisits
  }
}
```

## Usage

1. Go to Tenant Registry page
2. Click "Config" button on any tenant row
3. View comprehensive tenant details
4. Click "Back to Tenants" to return to the list

## Future Enhancements

Potential additions for the details page:
- Edit hospital information modal
- Manage users directly from page
- View detailed invoice breakdown
- Export invoices as PDF
- Add usage charts/graphs
- Tenant action buttons (suspend, archive, etc.)
- Audit logs for tenant
- Custom fields/metadata editing
- Department management
- Department list with stats

