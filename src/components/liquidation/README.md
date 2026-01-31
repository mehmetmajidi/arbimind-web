# 📊 Liquidation Map Component

کامپوننت نقشه لیکوییدیشن برای نمایش لیکوییدیشن‌های کوتاه و بلند در سطوح قیمتی مختلف.

---

## 📋 فهرست مطالب

- [نصب و استفاده](#نصب-و-استفاده)
- [کامپوننت‌ها](#کامپوننت‌ها)
- [API](#api)
- [ویژگی‌ها](#ویژگی‌ها)
- [استایل و تم](#استایل-و-تم)
- [بهینه‌سازی](#بهینه‌سازی)
- [مستندات](#مستندات)

---

## 🚀 نصب و استفاده

### استفاده پایه

```tsx
import LiquidationMap from "@/components/liquidation/LiquidationMap";
import LiquidationMapControls from "@/components/liquidation/LiquidationMapControls";
import { useLiquidationMap } from "@/components/liquidation/hooks/useLiquidationMap";

function MyComponent() {
    const [symbol, setSymbol] = useState("BTC");
    const [timeframe, setTimeframe] = useState("1w");
    
    const { data, loading, error, refresh } = useLiquidationMap({
        symbol,
        timeframe,
        autoFetch: true,
        autoRefreshInterval: 60, // Refresh every 60 seconds
        debounceMs: 300,
        enableCache: true,
    });

    return (
        <div>
            <LiquidationMapControls
                selectedSymbol={symbol}
                selectedTimeframe={timeframe}
                onSymbolChange={setSymbol}
                onTimeframeChange={setTimeframe}
                onRefresh={refresh}
                loading={loading}
            />
            <LiquidationMap data={data} loading={loading} error={error} />
        </div>
    );
}
```

---

## 🧩 کامپوننت‌ها

### `LiquidationMap`

کامپوننت اصلی برای نمایش نمودار لیکوییدیشن.

#### Props

```typescript
interface LiquidationMapProps {
    data: LiquidationMapResponse | null;
    loading?: boolean;
    error?: string | null;
}
```

#### ویژگی‌ها

- ✅ نمایش نمودار با Recharts
- ✅ Short/Long liquidations با رنگ‌های مختلف
- ✅ Current price line
- ✅ Exchange breakdown (stacked bars)
- ✅ Custom tooltip
- ✅ Responsive design
- ✅ Dark theme

---

### `LiquidationMapControls`

کامپوننت کنترل‌ها برای انتخاب Symbol و Timeframe.

#### Props

```typescript
interface LiquidationMapControlsProps {
    selectedSymbol: string;
    selectedTimeframe: string;
    onSymbolChange: (symbol: string) => void;
    onTimeframeChange: (timeframe: string) => void;
    onRefresh: () => void;
    onExport?: () => void;
    loading?: boolean;
    autoRefreshInterval?: number;
    onAutoRefreshChange?: (interval: number) => void;
}
```

#### ویژگی‌ها

- ✅ Symbol selector
- ✅ Timeframe selector
- ✅ Refresh button
- ✅ Loading indicator
- ✅ Auto-refresh settings (optional)

---

### `useLiquidationMap` Hook

Hook سفارشی برای مدیریت داده‌های لیکوییدیشن.

#### Options

```typescript
interface UseLiquidationMapOptions {
    symbol: string;
    timeframe: string;
    autoFetch?: boolean; // default: true
    autoRefreshInterval?: number; // in seconds, 0 to disable
    debounceMs?: number; // default: 300ms
    enableCache?: boolean; // default: true
}
```

#### Returns

```typescript
{
    data: LiquidationMapResponse | null;
    loading: boolean;
    error: string | null;
    refresh: () => void;
    fetchData: (forceRefresh?: boolean) => void;
}
```

#### ویژگی‌ها

- ✅ Auto-fetch on mount
- ✅ Auto-refresh با interval قابل تنظیم
- ✅ Debounce برای تغییرات
- ✅ LocalStorage caching (5 minutes TTL)
- ✅ Error handling
- ✅ Cleanup on unmount

---

## 🔌 API

### `getLiquidationMap(symbol, timeframe)`

دریافت داده‌های لیکوییدیشن از API.

```typescript
const data = await getLiquidationMap("BTC", "1w");
```

### `refreshLiquidationMap(symbol, timeframe)`

Refresh داده‌ها با bypass کردن cache.

```typescript
const data = await refreshLiquidationMap("BTC", "1w");
```

---

## ✨ ویژگی‌ها

### ✅ پیاده‌سازی شده

- [x] نمایش نمودار لیکوییدیشن
- [x] Short/Long liquidations
- [x] Exchange breakdown
- [x] Current price line
- [x] Custom tooltip
- [x] Responsive design
- [x] Dark theme
- [x] Error handling
- [x] Loading states
- [x] Auto-refresh
- [x] Debounce
- [x] Caching

### ⏳ در حال توسعه (Optional)

- [ ] Zoom و Pan
- [ ] Export به تصویر
- [ ] Animation
- [ ] Watermark

---

## 🎨 استایل و تم

### رنگ‌ها

```typescript
// Short liquidations
shortLiquidationColor: "#ef4444" // Red
shortLiquidationOpacity: 0.3

// Long liquidations
longLiquidationColor: "#22c55e" // Green
longLiquidationOpacity: 0.3

// Current price line
currentPriceLineColor: "#ef4444" // Red
```

### Exchange Colors

```typescript
Binance: "#1E90FF"      // Blue
Bybit: "#9370DB"        // Purple
Okex: "#FF8C00"         // Orange
Aster: "#00CED1"        // Turquoise
Hyperliquid: "#FF1493"  // Pink
```

### Dark Theme

```typescript
background: "#2a2a2a"
panelBackground: "#1a1a1a"
border: "rgba(255, 174, 0, 0.2)"
text: "#ededed"
secondaryText: "#888"
```

---

## ⚡ بهینه‌سازی

### Performance

1. **Memoization**: استفاده از `useMemo` برای chart data
2. **Debounce**: 300ms delay برای تغییرات symbol/timeframe
3. **Caching**: LocalStorage cache با 5 دقیقه TTL
4. **Animation**: غیرفعال برای performance بهتر
5. **Cleanup**: به درستی timers و intervals cleanup می‌شوند

### Memory Management

- Cache size محدود است (5 دقیقه TTL)
- Cleanup on unmount
- Debounce timers cleanup

---

## 📚 مستندات

### ساختار داده

```typescript
interface LiquidationMapResponse {
    symbol: string;
    current_price: number;
    timeframe: string;
    data: LiquidationData[];
    exchanges: string[];
}

interface LiquidationData {
    price: number;
    short_liquidation: number; // USD
    long_liquidation: number; // USD
    exchange_breakdown: Record<string, number>;
}
```

### مثال استفاده

```tsx
// با auto-refresh
const { data, loading, error, refresh } = useLiquidationMap({
    symbol: "BTC",
    timeframe: "1w",
    autoRefreshInterval: 60, // هر 60 ثانیه
});

// بدون cache
const { data, loading, error } = useLiquidationMap({
    symbol: "ETH",
    timeframe: "1d",
    enableCache: false,
});

// با debounce بیشتر
const { data, loading, error } = useLiquidationMap({
    symbol: "SOL",
    timeframe: "4h",
    debounceMs: 500,
});
```

---

## 🧪 تست

برای اطلاعات بیشتر در مورد تست‌ها، به فایل `LIQUIDATION_MAP_TESTING.md` مراجعه کنید.

---

## 📝 نکات مهم

1. **API Endpoint**: نیاز به endpoint `/market/liquidation-map/{symbol}?timeframe={timeframe}` در backend
2. **Authentication**: نیاز به Bearer token در header
3. **Error Handling**: 404 error به معنای endpoint not implemented است
4. **Cache**: Cache به صورت per-symbol/timeframe ذخیره می‌شود

---

## 🔗 فایل‌های مرتبط

- `LiquidationMap.tsx` - کامپوننت اصلی
- `LiquidationMapControls.tsx` - کامپوننت کنترل‌ها
- `useLiquidationMap.ts` - Custom hook
- `liquidationApi.ts` - API functions
- `constants.ts` - Constants و colors
- `types/liquidation.ts` - TypeScript types

---

**آخرین بروزرسانی**: 2025-01-20

