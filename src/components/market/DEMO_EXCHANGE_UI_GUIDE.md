# Demo Exchange UI/UX Enhancements

راهنمای کامل UI/UX enhancements برای Demo Exchange.

## 📋 فهرست مطالب

1. [Design System Integration](#design-system-integration)
2. [Responsive Design](#responsive-design)
3. [Charts & Visualizations](#charts--visualizations)
4. [Components](#components)

---

## Design System Integration

### استفاده از Design System

تمام کامپوننت‌های Demo Exchange از Design System مشترک استفاده می‌کنند:

```typescript
import { colors, panelStyle, typography, spacing, breakpoints } from "@/components/shared/designSystem";
```

### Colors

```typescript
colors.background      // #1a1a1a
colors.panelBackground // #2a2a2a
colors.border          // rgba(255, 174, 0, 0.2)
colors.primary         // #FFAE00
colors.text            // #ededed
colors.secondaryText   // #888
colors.success         // #22c55e
colors.error           // #ef4444
```

### Styles

```typescript
panelStyle      // Panel container style
inputStyle      // Input field style
buttonStyle     // Button style
typography      // Typography styles
spacing         // Spacing constants
```

---

## Responsive Design

### useResponsive Hook

Hook برای responsive design:

```typescript
import { useResponsive } from "@/hooks/useResponsive";

const { isMobile, isTablet, isDesktop, width } = useResponsive();
```

### Breakpoints

```typescript
breakpoints.mobile  // 768px
breakpoints.tablet  // 1024px
breakpoints.desktop // 1280px
```

### Responsive Layout

```typescript
const layoutStyle: React.CSSProperties = {
    padding: isMobile ? "8px" : "0 16px",
    maxWidth: "1870px",
    margin: "0 auto",
};

const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    gap: "12px",
};

const panelStyle: React.CSSProperties = {
    width: isMobile ? "100%" : isTablet ? "280px" : "320px",
};
```

---

## Charts & Visualizations

### MainChart Component

- ✅ **Lightweight Charts**: استفاده از `lightweight-charts` برای performance بهتر
- ✅ **Candlestick Chart**: نمایش OHLCV data
- ✅ **Prediction Lines**: نمایش پیش‌بینی‌های قیمت
- ✅ **Real-time Updates**: به‌روزرسانی Real-time قیمت‌ها
- ✅ **Drawing Tools**: ابزارهای رسم روی نمودار
- ✅ **Liquidation Map**: نقشه Liquidation در tab جداگانه

### Chart Features

- **Timeframes**: 1m, 5m, 15m, 1h, 4h, 1d
- **Horizons**: 10m, 30m, 1h, 4h, 24h
- **Zoom & Pan**: قابلیت zoom و pan
- **Responsive**: سازگار با تمام اندازه‌های صفحه

---

## Components

### DemoExchangeBadge

Badge برای نمایش Demo Exchange:

```tsx
import { DemoExchangeBadge } from "@/components/market";

<DemoExchangeBadge size="medium" />
```

**Props:**
- `size`: "small" | "medium" | "large"
- `className`: Optional CSS class

### DemoPortfolioStats

کامپوننت برای نمایش آمار پورتفولیو:

```tsx
import { DemoPortfolioStats } from "@/components/market";

<DemoPortfolioStats />
```

**Features:**
- Total P&L
- Win Rate
- Total Trades
- Winning/Losing Trades
- Auto-refresh

---

## Responsive Behavior

### Mobile (< 768px)

- **Layout**: Column layout (vertical stacking)
- **Panels**: Full width
- **Chart**: Full width, reduced height
- **Navigation**: Simplified

### Tablet (768px - 1024px)

- **Layout**: Row layout with narrower panels
- **Panels**: 280px width
- **Chart**: Flexible width
- **Navigation**: Standard

### Desktop (> 1024px)

- **Layout**: Full row layout
- **Panels**: 320px width
- **Chart**: Maximum width
- **Navigation**: Full features

---

## Best Practices

1. **استفاده از Design System**: همیشه از shared styles استفاده کنید
2. **Responsive First**: ابتدا mobile design کنید
3. **Performance**: از lazy loading برای charts استفاده کنید
4. **Accessibility**: از semantic HTML استفاده کنید
5. **Consistency**: از همان patterns در تمام صفحات استفاده کنید

---

## مثال‌ها

### Responsive Panel

```tsx
const { isMobile, isTablet } = useResponsive();

<div style={{
    width: isMobile ? "100%" : isTablet ? "280px" : "320px",
    ...panelStyle
}}>
    {/* Content */}
</div>
```

### Conditional Rendering

```tsx
{isDemoExchange && (
    <DemoExchangeBadge size="medium" />
)}
```

---

## منابع بیشتر

- [Design System](../shared/designSystem.ts)
- [Shared Components](../shared/README.md)
- [Market Page](../../app/market/page.tsx)

