# Shared UI Components

این پوشه شامل کامپوننت‌های مشترک UI است که بر اساس Design System صفحات Market و Bots ساخته شده‌اند.

## Design System

### Colors
```typescript
import { colors } from "@/components/shared";

colors.background      // #1a1a1a
colors.panelBackground // #2a2a2a
colors.border          // rgba(255, 174, 0, 0.2)
colors.primary         // #FFAE00
colors.text            // #ededed
colors.secondaryText   // #888
colors.success         // #22c55e
colors.error           // #ef4444
colors.warning         // #f59e0b
colors.info            // #3b82f6
```

### Styles
```typescript
import { layoutStyle, panelStyle, inputStyle, buttonStyle } from "@/components/shared";
```

## Components

### ErrorMessage
نمایش پیام خطا با قابلیت retry و dismiss.

```tsx
import { ErrorMessage } from "@/components/shared";

<ErrorMessage
    message="Failed to load data"
    onRetry={() => fetchData()}
    onDismiss={() => setError(null)}
    retryCount={2}
    maxRetries={3}
    compact={false}
/>
```

### SuccessMessage
نمایش پیام موفقیت با auto-dismiss.

```tsx
import { SuccessMessage } from "@/components/shared";

<SuccessMessage
    message="Bot created successfully"
    onDismiss={() => setSuccess(null)}
    autoDismiss={true}
    autoDismissDelay={5000}
    compact={false}
/>
```

### LoadingSpinner
نمایش loading spinner با اندازه‌های مختلف.

```tsx
import { LoadingSpinner } from "@/components/shared";

<LoadingSpinner
    size="medium" // "small" | "medium" | "large"
    color="#FFAE00"
    text="Loading..."
    fullScreen={false}
/>
```

### Tooltip
نمایش tooltip برای توضیح قابلیت‌ها.

```tsx
import { Tooltip } from "@/components/shared";

<Tooltip
    content="This feature allows you to filter bots by status"
    position="top" // "top" | "bottom" | "left" | "right"
    icon={true}
    delay={300}
>
    <button>Filter</button>
</Tooltip>
```

### HelpText
نمایش متن راهنما با tooltip اختیاری.

```tsx
import { HelpText } from "@/components/shared";

<HelpText
    text="Select a symbol to view predictions"
    tooltip="Symbols are trading pairs like BTC/USDT"
    compact={false}
/>
```

### Breadcrumb
نمایش breadcrumb navigation.

```tsx
import { Breadcrumb } from "@/components/shared";

<Breadcrumb
    items={[
        { label: "Bots", path: "/bots" },
        { label: "Bot Details", path: "/bots/123" }
    ]}
    showHome={true}
/>
```

### ResponsiveContainer
کامپوننت برای نمایش محتوای مختلف بر اساس screen size.

```tsx
import { ResponsiveContainer } from "@/components/shared";

<ResponsiveContainer
    mobile={<MobileView />}
    tablet={<TabletView />}
    desktop={<DesktopView />}
>
    <DefaultView />
</ResponsiveContainer>
```

## Hooks

### useKeyboardShortcuts
Hook برای افزودن keyboard shortcuts.

```tsx
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

useKeyboardShortcuts([
    {
        key: "n",
        ctrl: true,
        action: () => createNew(),
        description: "Create new item"
    }
]);
```

### useTouchInteractions
Hook برای افزودن touch interactions (swipe, long press).

```tsx
import { useTouchInteractions } from "@/hooks/useTouchInteractions";

const touchHandlers = useTouchInteractions({
    onSwipeLeft: () => goToNext(),
    onSwipeRight: () => goToPrevious(),
    onLongPress: () => showMenu(),
    swipeThreshold: 50,
    longPressDelay: 500,
});

<div {...touchHandlers}>
    Content
</div>
```

### useResponsiveStyles
Hook برای دریافت responsive styles.

```tsx
import { useResponsiveStyles } from "@/components/shared";

const styles = useResponsiveStyles();

<div style={{ padding: styles.padding, fontSize: styles.fontSize.h1 }}>
    Title
</div>
```

## Keyboard Shortcuts

- `Ctrl+M` - Go to Market page
- `Ctrl+B` - Go to Bots page
- `Ctrl+T` - Go to Trading page
- `Ctrl+P` - Go to Performance page
- `Ctrl+R` - Go to Predictions page
- `Ctrl+Shift+R` - Refresh page
- `Ctrl+B` (in Sidebar) - Toggle sidebar
- `?` - Show keyboard shortcuts help

## Usage Example

```tsx
"use client";

import { ErrorMessage, SuccessMessage, LoadingSpinner, Tooltip, HelpText, Breadcrumb } from "@/components/shared";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

export default function MyPage() {
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useKeyboardShortcuts([
        { key: "r", ctrl: true, action: () => refresh() }
    ]);

    return (
        <div>
            <Breadcrumb />
            
            {error && (
                <ErrorMessage
                    message={error}
                    onDismiss={() => setError(null)}
                    onRetry={() => fetchData()}
                />
            )}
            
            {success && (
                <SuccessMessage
                    message={success}
                    onDismiss={() => setSuccess(null)}
                />
            )}
            
            {loading && <LoadingSpinner text="Loading data..." />}
            
            <div>
                <label>
                    Symbol
                    <Tooltip content="Select a trading pair" icon={true} />
                </label>
                <HelpText text="Select a symbol to view predictions" />
            </div>
        </div>
    );
}
```

