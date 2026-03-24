# Design System - Agentlytics UI

## Overview
A clean, responsive, subtle, and professional analytics dashboard design system built with Tailwind CSS v4 and React 19.

## Aesthetic Direction
**Refined Minimalist Dashboard** - Inspired by Linear, Vercel Analytics, and Arc browser.

Core principles:
- Generous white space for breathing room
- Strong typographic hierarchy
- Subtle depth with soft shadows and refined borders
- Cohesive indigo/purple accent color palette
- Smooth micro-interactions
- Professional, polished appearance at every pixel

## Typography

### Font Families
- **UI Font**: `Inter` (sans-serif) - Primary interface text
- **Monospace**: `JetBrains Mono` - Data, numbers, code

### Font Scale
```
xs:   12px    (tiny labels, metadata)
sm:   14px    (secondary text, captions)
base: 16px    (body text, paragraphs) - DEFAULT
lg:   18px    (subheadings)
xl:   20px    (section headers)
2xl:  24px    (card headers)
3xl:  32px    (page titles)
```

### Font Weights
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700

## Color Palette

### Dark Theme (Default)

#### Backgrounds
```css
--color-bg:       #0a0a0a   (primary background)
--color-bg-2:     #111111   (cards, panels)
--color-bg-3:     #1a1a1a   (inputs, hover states)
--color-bg-4:     #242424   (borders, dividers)
--color-bg-5:     #2e2e2e   (inactive elements)
```

#### Text Colors
```css
--color-text:     #f5f5f5   (primary text)
--color-text-2:   #a1a1aa   (secondary text)
--color-text-3:   #71717a   (tertiary, muted)
--color-text-4:   #52525b   (disabled, hints)
```

#### Accent Colors
```css
--color-accent:          #6366f1  (indigo-500)
--color-accent-light:    #818cf8  (indigo-400)
--color-accent-dim:      #4f46e5  (indigo-600)
--color-accent-subtle:   rgba(99, 102, 241, 0.1)  (subtle tint)
```

#### Borders & Effects
```css
--color-border:    rgba(255, 255, 255, 0.08)   (primary border)
--color-border-2:  rgba(255, 255, 255, 0.04)   (subtle border)

--shadow-sm:   0 1px 2px rgba(0, 0, 0, 0.3)
--shadow-md:   0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3)
--shadow-lg:   0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.3)
```

### Light Theme

All variables automatically invert when `.light` class is applied to `<html>`.

## Spacing System

Consistent spacing scale (inrem):
```
4px   (0.25rem)  - tiny gaps
6px   (0.375rem) - minimal spacing
8px   (0.5rem)   - small spacing
12px  (0.75rem)  - component padding
16px  (1rem)     - standard gap
24px  (1.5rem)   - section spacing
32px  (2rem)     - major section gaps
48px  (3rem)     - page margins
```

Common patterns:
- **Card padding**: `p-4` or `p-5` (16-20px)
- **Section spacing**: `space-y-6` between major sections
- **Container padding**: `px-6` (24px)
- **Header height**: `py-4` (16px vertical)
- **Button padding**: `px-4 py-2` (16x8px)

## Components

### Card
```jsx
<div className="card">
  {/* Content */}
</div>
```

**Styles**:
- Background: `var(--color-bg-2)`
- Border: `1px solid var(--color-border)`
- Border radius: `8px`
- Shadow: `var(--shadow-sm)`
- Hover: Elevates with `var(--shadow-md)` and subtle border change

**Variants**:
- `card` - Standard card
- `card p-5` - Card with padding
- `card-elevated` - Increased shadow for emphasis

### Button
```jsx
<Button variant="primary" size="md" icon={Icon} onClick={handleClick}>
  Button Text
</Button>
```

**Variants**:
- `primary` - Accent colored, for main actions
- `secondary` - Neutral with border, for secondary actions
- `ghost` - No background, for tertiary actions
- `accent` - Subtle accent, for highlighted secondary actions

**Sizes**:
- `sm` - Small, dense UIs
- `md` - Default (most common)
- `lg` - Large, prominent actions
- `xl` - Hero sections

### Input
```jsx
<input className="input" placeholder="Enter value..." />
```

**Styles**:
- Background: `var(--color-bg-3)`
- Border: `1px solid var(--color-border)`
- Padding: `px-4 py-2.5`
- Focus: `border-[var(--color-accent)]` with `box-shadow: 0 0 0 3px var(--color-accent-subtle)`

### KPI Card
```jsx
<KpiCard
  label="Total Sessions"
  value={1234}
  sub="+12% from last month"
  icon={Activity}
  trend={12}
/>
```

**Features**:
- Large numeric value with monospace font
- Optional icon in accent circle
- Optional trend indicator (green up/red down)
- Hover scale effect for interactivity

### Section Title
```jsx
<SectionTitle icon={BarChart3}>Section Name</SectionTitle>
```

**Styles**:
- `text-sm font-semibold uppercase tracking-wider`
- Color: `var(--color-text-2)`
- Optional icon in accent color
- Bottom margin: `mb-4`

### Badge
```jsx
<span className="badge badge-accent">New</span>
```

**Variants**:
- `badge-accent` - Accent background for highlights
- `badge-muted` - Subtle neutral background

## Layout Patterns

### Grid System
```jsx
// Responsive equal columns
<div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>

// Responsive with breakpoints
<div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
```

### Container
```jsx
<div className="max-w-[1600px] mx-auto px-6 py-8">
  {/* Content */}
</div>
```

### Flex Spacing
- Use `gap-3` / `gap-4` / `gap-6` instead of margins
- Use `justify-between` for header layouts
- Use `items-center` for vertical centering
- Use `flex-1` for expandable elements

## Tables

```jsx
<table className="w-full text-sm">
  <thead>
    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-4)' }}>
        Column Header
      </th>
    </tr>
  </thead>
  <tbody>
    <tr
      className="cursor-pointer transition"
      style={{ borderBottom: '1px solid var(--color-border)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-3)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <td className="py-3 px-4" style={{ color: 'var(--color-text)' }}>Cell content</td>
    </tr>
  </tbody>
</table>
```

**Table best practices**:
- Use `text-sm` base size
- Header text: `text-xs font-semibold uppercase tracking-wider`
- Row hover: `bg-[var(--color-bg-3)]`
- Vertical padding: `py-3` for readability
- Horizontal padding: `px-4`

## Charts (Chart.js)

### Consistent Styling
```jsx
const MONO = 'JetBrains Mono, monospace'
const legendColor = dark ? '#a1a1aa' : '#52525b'
const gridColor = dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.06)'

const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: legendColor, font: { size: 11, family: MONO }, usePointStyle: true, pointStyle: 'circle', padding: 10 }
    },
    tooltip: {
      backgroundColor: 'var(--color-bg-3)',
      borderColor: 'var(--color-border)',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
      titleFont: { family: MONO, size: 12 },
      bodyFont: { family: MONO, size: 12 },
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: legendColor, font: { size: 10, family: MONO } } },
    y: { grid: { color: gridColor }, ticks: { color: legendColor, font: { size: 10, family: MONO } }, border: { display: false } },
  },
}
```

## Animations

### Fade In (default page transition)
```css
.fade-in {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Hover Scale
```jsx
className="transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
```

### Smooth Transitions
Use `transition-all duration-200` for most interactive elements.

## Utility Classes

### Common Patterns
```jsx
// Truncate text
className="truncate"           // single line
className="line-clamp-2"      // two lines
className="line-clamp-3"      // three lines

// Centering
className="flex items-center justify-center"

// Scrollable area
className="overflow-y-auto scrollbar-thin"

// Transparent background for overlays
style={{ background: 'transparent' }}
```

## Responsive Breakpoints

Tailwind's default breakpoints (using custom CSS for grid):
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

**Best practices**:
- Use `hidden lg:flex` for desktop-only elements
- Use `grid-cols-1 md:grid-cols-2 xl:grid-cols-3` for responsive grids
- Sidebar: `hidden lg:flex w-[300px]` (300px width on desktop)

## Accessibility

### Focus States
All interactive elements have `:focus-visible` styles:
```css
:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
```

### Color Contrast
- Primary text: `#f5f5f5` on `#0a0a0a` (AAA)
- Secondary text: `#a1a1aa` on `#0a0a0a` (AA)
- Interactive elements meet WCAG 2.1 AA

### Interactive Elements
- Buttons and links have hover states
- Touch targets minimum 44x44px
- Disabled states have `opacity: 0.5` and `cursor: not-allowed`

## Migration from Old Design

### Changes Made
1. **Typography**: Increased base font from 13px → 16px (Inter instead of JetBrains Mono for UI)
2. **Colors**: Replaced hardcoded inline colors with CSS variables
3. **Spacing**: Systematized from 2/3/4px to 4/6/8/12/16/24/32/48px scale
4. **Border radius**: Changed from `0` to `8px` for softer look
5. **Shadows**: Added `--shadow-sm`, `--shadow-md`, `--shadow-lg`
6. **Components**: Standardized Card, Button, Input, Badge, KpiCard
7. **Dark theme**: Refined colors for better contrast and less eye strain
8. **Light theme**: Extended color definitions for both themes

### Variable Mapping (Old → New)
| Old | New |
|-----|-----|
| `--c-bg` | `--color-bg` |
| `--c-bg2` | `--color-bg-2` |
| `--c-bg3` | `--color-bg-3` |
| `--c-bg4` | `--color-bg-4` |
| `--c-text` | `--color-text` |
| `--c-text2` | `--color-text-2` |
| `--c-text3` | `--color-text-3` |
| `--c-white` | `--color-text` (context-dependent) |
| `--c-border` | `--color-border` |
| `--c-card` | `--color-bg-2` (cards now use bg-2) |
| `--c-code-bg` | `--color-bg-3` |
| `--c-md-strong` | `--color-text` |
| `text-[11px]` | `text-sm` (14px) |
| `text-[12px]` | `text-sm` (14px) |
| `text-[10px]` | `text-xs` (12px) |

### Updated Components
- ✅ `KpiCard` - New design with icons and trends
- ✅ `SectionTitle` - Consistent section headers
- ✅ `Card` - Global utility class
- ✅ `Button` - New reusable component
- ✅ `Input` - Global utility class
- ✅ `RelayDashboard` - Full typography/spacing refactor
- ✅ `Compare` - Enhanced layout and charts
- ✅ `Settings` - Modern list view
- ✅ `App` - Header and navigation updates

## Code Examples

### Page Layout
```jsx
export default function MyPage() {
  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>
          Page Title
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-3)' }}>
          Page description
        </p>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <div className="card p-5">
          <SectionTitle>Section Header</SectionTitle>
          {/* Content */}
        </div>
      </div>
    </div>
  )
}
```

### Interactive Row
```jsx
<div
  className="flex items-center gap-4 px-5 py-4 transition-all border-b"
  style={{ borderBottomColor: 'var(--color-border)' }}
  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-3)'}
  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
>
  {/* Content */}
</div>
```

## Development Guidelines

### Do's
✅ Use CSS variables for all colors
✅ Use the spacing scale (4/6/8/12/16/24/32/48)
✅ Use `card` class for content containers
✅ Use `fade-in` for page transitions
✅ Use `mono` font class for data display
✅ Use `transition-all duration-200` for smooth interactions
✅ Keep line height at 1.5-1.6 for readability
✅ Use `focus:ring` for accessibility

### Don'ts
❌ Don't hardcode color values (use CSS variables)
❌ Don't use arbitrary spacing (e.g., `p-[13px]`)
❌ Don't use `border-radius: 0` (the system uses 8px)
❌ Don't mix fonts (UI = Inter, Data = JetBrains Mono only)
❌ Don't use tiny text (< 14px for body, < 12px for labels)
❌ Don't skip hover states on interactive elements

## Browser Support
- Modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- CSS Grid, Flexbox, CSS Variables
- `line-clamp` for text truncation

## Performance
- All animations use `transform` and `opacity` for 60fps
- `will-change` not needed for simple transitions
- Font loading: Google Fonts CDN, preload in production
- Images: Use `loading="lazy"` for below-the-fold content
