# Joan Design System Documentation

## Overview
This document outlines the standardized design system for all Joan dashboards. All role-based dashboards should follow this consistent styling and layout.

## Color Palette

### Primary Colors
- **Orange**: `#ff9633` - Used for buttons, highlights, badges, icons
  - Dark: `#d86608`
  - Light: `#ffe8d6`
  - Very Light: `#fffbf7`

### Neutral Colors
- **Gray**: `#f7f8fa` (background) to `#111827` (darkest)
  - Background: `#f7f8fa`
  - Cards: `#ffffff`
  - Text Primary: `#1f2937` / `#111827`
  - Text Secondary: `#6b7280`
  - Borders: `#e5e7eb`

### Status Colors
- **Active**: Orange badge
- **Pending**: Yellow badge
- **Inactive**: Gray badge

## Layout Structure

### Fixed Sidebar (Left)
- Width: `16rem` (64px * 4)
- Fixed position
- Contains:
  - Logo + Product Name
  - Navigation sections with icons
  - User role indicator

### Top Header
- Sticky to top
- Contains:
  - Breadcrumb navigation
  - Page title with status badge
  - Action buttons on the right
  - Icons (notifications, settings, logout) far right

### Main Content Area
- Padding: `1.5rem` (24px)
- Background: `#f7f8fa`
- Responsive grid layout

## Component Usage

### StandardDashboardLayout
Wrapper component that handles sidebar and header.

```tsx
<StandardDashboardLayout
  sidebarConfig={{
    logo: "J",
    productName: "Joan",
    sections: [...],
    userRole: "Super Admin"
  }}
  headerConfig={{
    title: "Page Title",
    breadcrumbs: [...],
    status: "active",
    actions: [...]
  }}
>
  {/* Page content */}
</StandardDashboardLayout>
```

### Card Component
```tsx
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card-new";

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
  <CardFooter>
    Footer content
  </CardFooter>
</Card>
```

### Button Component
```tsx
import { Button } from "@/components/ui/button-new";

<Button variant="primary" size="md">
  Click me
</Button>

// Variants: primary | secondary | outline | ghost
// Sizes: sm | md | lg
```

### Badge Component
```tsx
import { Badge } from "@/components/ui/badge-new";

<Badge variant="active">Active</Badge>

// Variants: active | pending | inactive | default
```

### StatCard Component
```tsx
import { StatCard } from "@/components/StatCard";
import { Users } from "lucide-react";

<StatCard
  label="Total Users"
  value="1,234"
  iconComponent={Users}
  iconColor="blue"
  change={{ value: 12, isPositive: true }}
/>

// iconColor: orange | blue | green | red
```

## Typography

- **Page Title**: `text-2xl font-bold text-gray-900`
- **Section Title**: `text-lg font-semibold text-gray-900`
- **Card Title**: `text-lg font-semibold text-gray-900`
- **Body Text**: `text-base text-gray-700`
- **Secondary Text**: `text-sm text-gray-600`
- **Small Text**: `text-xs text-gray-500`

## Spacing System

Based on 4px unit:
- `xs`: 4px
- `sm`: 8px
- `md`: 16px
- `lg`: 24px
- `xl`: 32px
- `2xl`: 48px

### Standard Spacing
- Card padding: `px-6 py-5`
- Section gap: `gap-6`
- Card spacing: `gap-6` (between cards)

## Button Guidelines

### Primary Button
- Use for main actions (Create, Submit, Save)
- Color: Orange
- Rounded corners: `rounded-lg`

### Secondary Button
- Use for alternative actions
- Color: Gray background
- Hover: Slightly darker gray

### Outline Button
- Use for less important actions
- Border: Gray
- No background

### Ghost Button
- Minimal, text-only style
- Use for tertiary actions
- Hover: Light gray background

## Icon Guidelines

- Use Lucide React icons
- Outline style (not filled)
- Consistent stroke width
- Size: Usually `w-5 h-5` or `w-6 h-6`
- Color: Match text or use accent colors

## Responsive Grid

- **1 Column**: Mobile (`grid-cols-1`)
- **2 Columns**: Tablet (`md:grid-cols-2`)
- **3-4 Columns**: Desktop (`lg:grid-cols-3` or `lg:grid-cols-4`)

## How to Create a New Dashboard Page

1. Import the StandardDashboardLayout
2. Define sidebar configuration
3. Define header configuration
4. Use Cards and StatCards for content
5. Follow the spacing and typography guidelines

## Example: Hospital Admin Dashboard

See `/app/(dashboard)/super-admin/page.tsx` for a complete example implementation.

## Design Tokens

All colors, spacing, and typography are defined in `tailwind.config.ts`. Use Tailwind classes instead of hardcoding values.

### Common Patterns

**Stat Cards Grid**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* StatCards */}
</div>
```

**List with Icons**
```tsx
<div className="space-y-4">
  {items.map((item) => (
    <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
      <Icon className="w-6 h-6 text-orange-600" />
      <div>
        <p className="font-semibold text-gray-900">{item.title}</p>
        <p className="text-sm text-gray-600">{item.subtitle}</p>
      </div>
    </div>
  ))}
</div>
```

**Progress Bars**
```tsx
<div className="w-full bg-gray-200 rounded-full h-2">
  <div className="bg-orange-500 h-2 rounded-full" style={{ width: "45%" }}></div>
</div>
```

## Accessibility

- Use semantic HTML
- Ensure color contrast meets WCAG AA standards
- Use `aria-` attributes where appropriate
- All buttons must be keyboard accessible
- Links should be distinguishable from regular text

