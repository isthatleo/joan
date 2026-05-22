# Lab Technician Dashboard - Navigation Guide

## 🗺️ Complete Navigation Map

### Main Entry Point
```
/tenant/[slug]/lab
```

---

## 📊 Dashboard Pages Navigation

### 1. **Main Lab Dashboard**
- **URL**: `/tenant/[slug]/lab`
- **Title**: Lab Dashboard
- **Features**:
  - Overview of all metrics
  - Quick navigation cards
  - Recent orders table
  - Auto-refresh every 30 seconds
  - One-click access to all sections
- **Quick Links**:
  - Lab Orders button
  - Results button
  - Inventory button
  - Quality Control button
  - Settings button

### 2. **Lab Orders Management**
- **URL**: `/tenant/[slug]/lab/lab-orders`
- **Access From**:
  - Main dashboard → "Lab Orders" button
  - Main dashboard → "Lab Orders" card
  - Quick stats click on "Pending" metric
  - Quick stats click on "Total Orders" metric
- **Features**:
  - Create new lab orders
  - View all orders with full details
  - Filter by status (Pending, In Progress, Completed, Cancelled)
  - Filter by priority (Routine, Urgent, Critical)
  - Search by patient name, test type, or order ID
  - Update order status
  - Delete orders
  - Real-time statistics
  - Back to dashboard button
- **Data Updated Every**: 30 seconds

### 3. **Lab Results Management**
- **URL**: `/tenant/[slug]/lab/lab-results`
- **Access From**:
  - Main dashboard → "Results" button
  - Main dashboard → "Lab Results" card
  - Quick stats click on "Completed" metric
- **Features**:
  - Upload test results
  - View all results with details
  - Filter by status (Pending, Reviewed, Approved)
  - Search by patient name or test type
  - Download result files
  - View result data
  - Update result status
  - Real-time result statistics
- **Data Updated Every**: 60 seconds

### 4. **Inventory Management**
- **URL**: `/tenant/[slug]/lab/lab-inventory`
- **Access From**:
  - Main dashboard → "Inventory" button
  - Main dashboard → "Inventory" card
  - Quick stats click on "Inventory" metric
- **Features**:
  - View all inventory items
  - Add new items
  - Edit existing items
  - Search by item name
  - Filter by category
  - Track stock levels
  - Monitor expiry dates
  - Low stock alerts
  - Reorder level tracking
  - Real-time inventory statistics
- **Data Updated Every**: 5 minutes

### 5. **Quality Control**
- **URL**: `/tenant/[slug]/lab/lab-qc`
- **Access From**:
  - Main dashboard → "Quality Control" button
  - Main dashboard → "Quality Control" card
  - Settings page → Quality Control link (if configured)
- **Features**:
  - Create QC test records
  - View all QC records
  - Filter by status (Pass, Fail, Under Review)
  - Search by test name
  - Track pass rates
  - Review detailed results
  - Add notes to records
  - Real-time QC statistics
  - Pass rate percentage calculation
- **Data Updated Every**: 5 minutes

### 6. **Lab Analytics**
- **URL**: `/tenant/[slug]/lab/lab-analytics`
- **Access From**:
  - Main dashboard → "Analytics" link (future)
  - Main dashboard → Analytics card (future)
  - Direct URL navigation
- **Features**:
  - Comprehensive analytics dashboard
  - Total orders overview
  - Completion rate percentage
  - Average turnaround time in hours
  - Orders by priority distribution
  - Daily order volume trends (last 7-30 days)
  - Quality metrics (accuracy, availability, uptime)
  - Export report functionality
  - Date range selection
  - Detailed performance summary
  - Visual charts and graphs ready
- **Data Updated Every**: 10 minutes

### 7. **Performance Monitoring**
- **URL**: `/tenant/[slug]/analytics/lab-performance`
- **Access From**:
  - Direct URL navigation
  - Settings → Performance link (future)
  - Admin panel (if accessible)
- **Features**:
  - Real-time system metrics
  - CPU usage monitoring
  - Memory usage monitoring
  - Disk usage tracking
  - API response time
  - System uptime percentage
  - Active users count
  - Performance trends
  - Orders processed tracking
  - Completion rate trends
  - Error rate monitoring
  - Database performance metrics
  - Health status indicators
- **Data Updated Every**: 1 minute

### 8. **Lab Technician Settings**
- **URL**: `/tenant/[slug]/lab/settings`
- **Access From**:
  - Main dashboard → "Settings" button
  - Main dashboard → settings icon (future)
- **Tabs**:
  1. **Profile Tab**
     - Display name
     - Email address
     - Phone number
     - Change password button
  
  2. **Notifications Tab**
     - Lab order alerts toggle
     - Result ready alerts toggle
     - Inventory alerts toggle
     - Email notifications toggle
     - System notifications toggle
  
  3. **Preferences Tab**
     - Theme selection (Light, Dark, System)
     - Language selection (English, Spanish, French, German)
     - Timezone selection
     - Date format selection
     - Time format (12h/24h)
     - Default view selection
     - Items per page
     - Auto-refresh toggle
     - Refresh interval slider
  
  4. **Security Tab**
     - Change password button
     - Current session info
     - Last login display
     - Session timeout info

### 9. **Shared Messages Page**
- **URL**: `/tenant/[slug]/messages`
- **Access From**:
  - Main dashboard → "Messages" link (future)
  - Direct URL navigation
  - Any navigation menu with Messages option
- **Features** (Existing):
  - Send and receive messages
  - Thread-based conversations
  - File attachments
  - Message search
  - Archive functionality
  - Direct messaging
  - Team notifications
- **Note**: This page is shared across all roles (repurposed from existing system)

---

## 🔄 Navigation Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│          /tenant/[slug]/lab                         │
│         (Main Lab Dashboard)                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────┐  ┌─────────┐  ┌──────────┐  ┌────┐  ┌─────────┐
│  │Orders│  │ Results │  │Inventory │  │ QC │  │Settings │
│  └──┬───┘  └────┬────┘  └─────┬────┘  └─┬──┘  └────┬────┘
│     │           │             │         │          │
│     │           │             │         │          │
│  /lab-orders  /lab-results /lab-inventory /lab-qc /lab/settings
│     │           │             │         │          │
│     └───────────┴─────────────┴─────────┴──────────┘
│                    ▼
│     ┌──────────────────────────┐
│     │ /lab/lab-analytics       │
│     │ (View from dashboard)    │
│     └──────────────────────────┘
│                    ▼
│     ┌──────────────────────────────────┐
│     │ /analytics/lab-performance       │
│     │ (System monitoring)              │
│     └──────────────────────────────────┘
│                    ▼
│     ┌──────────────────────────────────┐
│     │ /messages                        │
│     │ (Shared messaging system)        │
│     └──────────────────────────────────┘
│
└─────────────────────────────────────────────────────┘
```

---

## 📱 URL Quick Reference

| Page | URL | Icon | Access |
|------|-----|------|--------|
| Dashboard | `/tenant/[slug]/lab` | 🏠 | Home |
| Lab Orders | `/tenant/[slug]/lab/lab-orders` | 🧪 | Orders Button |
| Lab Results | `/tenant/[slug]/lab/lab-results` | 🔬 | Results Button |
| Inventory | `/tenant/[slug]/lab/lab-inventory` | 📦 | Inventory Button |
| Quality Control | `/tenant/[slug]/lab/lab-qc` | ✅ | QC Button |
| Analytics | `/tenant/[slug]/lab/lab-analytics` | 📊 | Analytics Link |
| Performance | `/tenant/[slug]/analytics/lab-performance` | ⚡ | Performance Link |
| Settings | `/tenant/[slug]/lab/settings` | ⚙️ | Settings Button |
| Messages | `/tenant/[slug]/messages` | 💬 | Messages Link |

---

## 🎯 Common User Journeys

### Journey 1: Create and Track Lab Order
1. Start at `/tenant/[slug]/lab` (Dashboard)
2. Click "New Order" button or "Lab Orders" card
3. Navigate to `/tenant/[slug]/lab/lab-orders`
4. Click "New Order" button
5. Fill in order details and submit
6. View order in table
7. Click on order to see details
8. Update status as work progresses

### Journey 2: Upload Test Results
1. Start at `/tenant/[slug]/lab` (Dashboard)
2. Click "Results" button or "Lab Results" card
3. Navigate to `/tenant/[slug]/lab/lab-results`
4. Click "Upload Result" button
5. Fill in result details
6. Attach result file (PDF, CSV, TXT)
7. Submit result
8. Monitor result status

### Journey 3: Manage Inventory
1. Start at `/tenant/[slug]/lab` (Dashboard)
2. Click "Inventory" button or card
3. Navigate to `/tenant/[slug]/lab/lab-inventory`
4. Review current items and stock levels
5. Note any low stock items (highlighted)
6. Click "Add Item" to add new supplies
7. Fill in item details
8. Optionally update quantities

### Journey 4: Review Quality Control
1. Start at `/tenant/[slug]/lab` (Dashboard)
2. Click "Quality Control" card
3. Navigate to `/tenant/[slug]/lab/lab-qc`
4. View all QC records
5. Filter by status if needed
6. Click on record to view details
7. Click "New QC Test" to add record
8. Monitor pass rate percentage

### Journey 5: Check Analytics
1. Start at `/tenant/[slug]/lab` (Dashboard)
2. Scroll to analytics section or click Analytics link
3. Navigate to `/tenant/[slug]/lab/lab-analytics`
4. Review key metrics
5. Check priority distribution
6. View daily volume trends
7. Export report if needed

### Journey 6: Monitor Performance
1. Navigate to `/tenant/[slug]/analytics/lab-performance`
2. Review system health status
3. Monitor resource usage (CPU, Memory, Disk)
4. Check API response times
5. View performance trends
6. Note any issues or bottlenecks

### Journey 7: Customize Settings
1. Start at `/tenant/[slug]/lab` (Dashboard)
2. Click "Settings" button
3. Navigate to `/tenant/[slug]/lab/settings`
4. Click desired tab (Profile, Notifications, Preferences, Security)
5. Make changes
6. Click "Save Changes" button
7. Confirm changes applied

---

## 🔐 Access Control

All pages require:
- ✅ User authentication
- ✅ Valid session
- ✅ Lab Technician role (or higher)
- ✅ Tenant assignment
- ✅ No data outside tenant scope is visible

---

## 📈 Data Refresh Rates

| Page | Refresh Rate | Manual Refresh |
|------|--------------|---------------|
| Dashboard | 30 seconds | ✅ Yes |
| Lab Orders | 30 seconds | ✅ Yes |
| Lab Results | 60 seconds | ✅ Yes |
| Inventory | 5 minutes | ✅ Yes |
| QC Records | 5 minutes | ✅ Yes |
| Analytics | 10 minutes | ✅ Yes |
| Performance | 1 minute | ✅ Yes |
| Settings | On Save | - |
| Messages | Real-time | ✅ Yes |

---

## 💡 Tips for Navigation

1. **Quick Access**: Bookmark your most-used pages
2. **Mobile Navigation**: All pages are mobile-responsive
3. **Browser Back**: Use browser back button to return
4. **Direct URLs**: You can type URLs directly in address bar
5. **Quick Links**: Use colored buttons and cards for quick navigation
6. **Search**: Use search functionality within pages
7. **Filters**: Use filters to narrow down data quickly
8. **Auto-Refresh**: Enabled by default but configurable in Settings

---

## 🆘 Navigation Help

If you can't find a page:

1. **From Dashboard**: Click the relevant card or button
2. **Using URL**: Replace [slug] with your tenant slug
3. **Settings**: Customize Your Default View in preferences
4. **Bookmarks**: Save frequently used pages
5. **Help**: Check the documentation files

---

**Last Updated**: May 13, 2026  
**Status**: Complete and Functional  
All pages accessible and fully operational.

