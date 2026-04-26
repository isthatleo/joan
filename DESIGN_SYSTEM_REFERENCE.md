# 🎨 Design System & Component Reference

## Design DNA - LOCKED IN ✅

### Core Philosophy
```
Muted Grayscale + Soft Borders + Rounded Corners + Tight Spacing
= Calm, Structured, Expensive Feel
```

---

## 🎨 Color Palette

### Backgrounds
```
Primary: #f9fafb (Main background)
Card: #ffffff (Card background)
Hover: #f3f4f6 (Hover state)
Active: #f9fafb (Active state)
```

### Text
```
Headline: #111827 (Black-gray)
Body: #4b5563 (Medium gray)
Meta: #9ca3af (Light gray)
Label: #6b7280 (Label gray)
```

### Borders
```
Default: #e5e7eb (Light gray border)
Subtle: #d1d5db (Slightly darker)
```

### Status Colors
```
Success: #059669 (Green-600)
Warning: #d97706 (Amber-600)
Critical: #dc2626 (Red-600)
Info: #2563eb (Blue-600)
```

---

## 📏 Spacing System

### Standard Values
```
Gap between items: gap-4 (1rem)
Section margin: mb-6 (1.5rem)
Section margin bottom: mb-6
Item margin: mb-1 / mb-2
Card padding: p-4 (1rem)
Page padding: px-6 py-5
Container padding: px-4 py-5
```

### Grid Layouts
```
4-column grid (KPIs): grid-cols-4 gap-4
3-column grid: grid-cols-3 gap-4
2-column grid: grid-cols-2 gap-4
Flexible: grid-cols-1 lg:grid-cols-2
```

---

## 🔤 Typography

### Hierarchy
```
Page Title: text-xl font-semibold (20px, 600)
Card Value: text-2xl font-bold (24px, 700)
Card Title: text-sm font-semibold (14px, 600)
Body Text: text-sm text-gray-600 (14px, 400)
Meta Text: text-xs text-gray-500 (12px, 400)
Label: text-xs font-semibold text-gray-400 uppercase (12px, 600)
```

---

## 🧱 Core Components

### 1. PageHeader
```tsx
<PageHeader
  title="Page Title"
  subtitle="Descriptive subtitle"
/>

Output:
┌─────────────────────────────────┐
│ Page Title                      │
│ Descriptive subtitle            │
└─────────────────────────────────┘
```

**Usage**: Every page starts with this
**Spacing**: mb-6 below

---

### 2. StatCard
```tsx
<StatCard
  title="Total Revenue"
  value="$287,450"
  subtitle="Platform-wide"
/>

Output:
┌──────────────────────┐
│ TOTAL REVENUE        │
│ $287,450             │
│ Platform-wide        │
└──────────────────────┘
```

**Usage**: KPI metrics
**Grid**: grid-cols-4 gap-4 (or 3)
**Spacing**: mb-6 after row

---

### 3. SectionCard
```tsx
<SectionCard title="Recent Activity">
  <div className="space-y-3">
    {/* Content */}
  </div>
</SectionCard>

Output:
┌──────────────────────────────┐
│ RECENT ACTIVITY              │
├──────────────────────────────┤
│ Content goes here            │
│ ...                          │
└──────────────────────────────┘
```

**Usage**: Tables, lists, content
**Padding**: p-4
**Spacing**: mb-6 between cards

---

## 🎯 Common Patterns

### Pattern 1: KPI Grid
```tsx
<div className="grid grid-cols-4 gap-4 mb-6">
  <StatCard title="..." value="..." subtitle="..." />
  <StatCard title="..." value="..." subtitle="..." />
  <StatCard title="..." value="..." subtitle="..." />
  <StatCard title="..." value="..." subtitle="..." />
</div>
```

### Pattern 2: Content Grid
```tsx
<div className="grid grid-cols-2 gap-4">
  <SectionCard title="...">
    {/* Left content */}
  </SectionCard>
  <SectionCard title="...">
    {/* Right content */}
  </SectionCard>
</div>
```

### Pattern 3: Stacked Content
```tsx
<SectionCard title="...">
  <div className="space-y-3">
    <div className="flex items-center justify-between p-3 border rounded-lg">
      {/* Item */}
    </div>
  </div>
</SectionCard>
```

---

## 🎨 Status Badges

### Success (Green)
```tsx
<span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-md">
  Active
</span>
```

### Warning (Orange)
```tsx
<span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-md">
  Pending
</span>
```

### Critical (Red)
```tsx
<span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-md">
  Critical
</span>
```

### Info (Blue)
```tsx
<span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
  Processing
</span>
```

---

## 📊 Data Visualization Elements

### Progress Bar
```tsx
<div className="w-full bg-gray-200 rounded-full h-2">
  <div
    className="bg-green-500 h-2 rounded-full"
    style={{ width: "75%" }}
  ></div>
</div>
```

### List Item
```tsx
<div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
  <div>
    <p className="text-sm font-medium text-gray-900">Label</p>
    <p className="text-xs text-gray-500">Subtitle</p>
  </div>
  <div className="text-right">
    <p className="text-sm font-semibold text-gray-900">Value</p>
    <span className="text-xs text-gray-500">Meta</span>
  </div>
</div>
```

### Table
```tsx
<div className="overflow-x-auto">
  <table className="w-full">
    <thead>
      <tr className="border-b border-gray-100">
        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
          Column
        </th>
      </tr>
    </thead>
    <tbody>
      <tr className="border-b border-gray-100 hover:bg-gray-50">
        <td className="py-3 px-4 text-sm text-gray-900">Data</td>
      </tr>
    </tbody>
  </table>
</div>
```

---

## ⚠️ Alert Cards

### Urgent (Red)
```tsx
<div className="flex items-start gap-3 p-3 rounded-lg border border-red-200 bg-red-50">
  <div className="flex-1">
    <p className="text-sm font-medium text-gray-900">Alert Title</p>
    <p className="text-xs text-gray-500">Description</p>
  </div>
</div>
```

### Warning (Orange)
```tsx
<div className="flex items-start gap-3 p-3 rounded-lg border border-yellow-200 bg-yellow-50">
  {/* Same structure */}
</div>
```

### Success (Green)
```tsx
<div className="flex items-start gap-3 p-3 rounded-lg border border-green-200 bg-green-50">
  {/* Same structure */}
</div>
```

---

## 🔘 Buttons & Interactive Elements

### Primary Button
```tsx
<button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
  Action
</button>
```

### Text Button (Link Style)
```tsx
<button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
  Action →
</button>
```

### Icon Button
```tsx
<button className="rounded-md p-2 hover:bg-gray-100">
  <Icon className="w-5 h-5 text-gray-600" />
</button>
```

---

## 🎭 Hover & Active States

### Card Hover
```tsx
className="border border-gray-100 hover:bg-gray-50 transition-colors"
```

### Button Active
```tsx
className="bg-gray-100 font-medium text-gray-900"
```

### Link Hover
```tsx
className="text-blue-600 hover:text-blue-700"
```

---

## 📱 Responsive Breakpoints

### Mobile First
```tsx
className="block lg:hidden"  // Show on mobile
className="hidden lg:block"  // Hide on mobile

className="grid grid-cols-1 lg:grid-cols-2"  // 1 col mobile, 2 lg
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4"  // Progressive
```

---

## 🔒 CSS Rules - DO NOT BREAK

### ✅ Allowed
```css
- margin: mb-1, mb-2, mb-4, mb-6
- padding: p-2, p-3, p-4, px-3, py-2, px-4, py-5
- gap: gap-1, gap-2, gap-3, gap-4, gap-6
- border-radius: rounded-lg, rounded-xl, rounded-full
- border-width: border (default = 1px)
- colors: gray-*, green-*, orange-*, red-*, blue-*
```

### ❌ Not Allowed
```css
- Large shadows (only soft borders)
- Bright neon colors
- Large gradients
- Heavy animations
- Inconsistent spacing
- Multiple font weights per section
- More than 2 colors per card
```

---

## 🎯 Layout Flow

### Page Structure
```
┌─────────────────────────────────────┐
│ <PageHeader />                      │
├─────────────────────────────────────┤
│ <div className="grid grid-cols-4">  │
│   <StatCard /> (4 cards)             │
│ </div>                              │
│                                     │
│ <div className="grid grid-cols-3">  │
│   <StatCard /> (3 cards)             │
│ </div>                              │
│                                     │
│ <div className="grid grid-cols-2">  │
│   <SectionCard />                   │
│   <SectionCard />                   │
│ </div>                              │
└─────────────────────────────────────┘
```

---

## 📋 Component Checklist

Use this when building new pages:

- [ ] PageHeader at top
- [ ] KPI StatCards (4-col grid)
- [ ] Secondary StatCards (3-col grid)
- [ ] Content SectionCards (2-col grid)
- [ ] Proper spacing (mb-6 between sections)
- [ ] Tables with borders
- [ ] Status badges colored correctly
- [ ] Hover effects on interactive elements
- [ ] Responsive grid layouts
- [ ] Loading state structure
- [ ] Error state structure
- [ ] Consistent typography

---

## 🎨 Design QA Checklist

- [ ] All text meets WCAG contrast requirements
- [ ] No two adjacent sections are the same color
- [ ] Icons used consistently (if any)
- [ ] Tables are readable
- [ ] Badges are clearly distinguished
- [ ] Spacing is consistent (gap-4, mb-6)
- [ ] No hardcoded colors (use Tailwind)
- [ ] Responsive design tested
- [ ] Hover states are subtle
- [ ] Loading states visible
- [ ] Error states prominent

---

## 💡 Golden Rules

1. **Restraint over decoration** - Simplicity is premium
2. **Consistency over variation** - Same spacing, same colors
3. **Hierarchy over equality** - Clear visual importance
4. **Breathing room over crowding** - Generous whitespace
5. **Soft over harsh** - Smooth transitions, gentle colors
6. **Order over chaos** - Aligned, grouped, structured
7. **Information over decoration** - Data-first, style-second
8. **Accessibility over style** - Proper contrast, semantic HTML

---

## 🚀 Implementation Template

```tsx
"use client";

import { PageHeader, StatCard, SectionCard } from "@/components/ui";

export default function RoleDashboard() {
  return (
    <div>
      {/* Header */}
      <PageHeader
        title="Page Title Here"
        subtitle="Descriptive subtitle here"
      />

      {/* KPI Row 1 - 4 columns */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard title="..." value="..." subtitle="..." />
        <StatCard title="..." value="..." subtitle="..." />
        <StatCard title="..." value="..." subtitle="..." />
        <StatCard title="..." value="..." subtitle="..." />
      </div>

      {/* KPI Row 2 - 3 columns */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard title="..." value="..." subtitle="..." />
        <StatCard title="..." value="..." subtitle="..." />
        <StatCard title="..." value="..." subtitle="..." />
      </div>

      {/* Content Row - 2 columns */}
      <div className="grid grid-cols-2 gap-4">
        <SectionCard title="Section 1">
          {/* Content here */}
        </SectionCard>

        <SectionCard title="Section 2">
          {/* Content here */}
        </SectionCard>
      </div>
    </div>
  );
}
```

---

## 📚 Quick Reference

| Element | Class | When To Use |
|---------|-------|-------------|
| Page Title | text-xl font-semibold | Once per page, in PageHeader |
| KPI Value | text-2xl font-bold | In StatCard |
| Section Label | text-xs font-semibold text-gray-400 uppercase | Section headers |
| Body Text | text-sm text-gray-600 | Regular content |
| Meta Text | text-xs text-gray-500 | Small descriptions |
| Badge | text-xs ... px-2 py-1 rounded-md | Status indicators |
| Table Header | py-3 px-4 text-xs font-semibold text-gray-600 uppercase | Table column headers |
| List Item | p-3 rounded-lg border border-gray-100 hover:bg-gray-50 | Repeating items |

---

## ✨ Final Notes

This design system ensures:
- ✅ Professional appearance
- ✅ Quick understanding of information
- ✅ Consistent user experience
- ✅ Easy to scan and navigate
- ✅ Premium feel through restraint
- ✅ Accessibility compliance
- ✅ Mobile responsiveness
- ✅ Scalability for future features

**Follow these rules religiously** - They're what make Joan look professional and expensive.

---

*Last Updated: April 17, 2026*  
*Status: LOCKED IN - Do not modify without approval*
