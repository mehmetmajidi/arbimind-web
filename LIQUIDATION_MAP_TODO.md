# فهرست کارهای نقشه لیکوییدیشن (Liquidation Map)

این فهرست کارها برای پیاده‌سازی یک نقشه لیکوییدیشن مشابه تصویر ارائه شده است که لیکوییدیشن‌های کوتاه و بلند را در سطوح قیمتی مختلف نمایش می‌دهد.

## 📋 مراحل پیاده‌سازی

### 1. ساختار داده و API

#### 1.1 تعریف TypeScript Types
- [x] ایجاد فایل `src/types/liquidation.ts`
  - [x] تعریف interface برای `LiquidationData`
    - `price: number` - قیمت
    - `short_liquidation: number` - مقدار لیکوییدیشن کوتاه (USD)
    - `long_liquidation: number` - مقدار لیکوییدیشن بلند (USD)
    - `exchange_breakdown: Record<string, number>` - تفکیک بر اساس صرافی
  - [x] تعریف interface برای `LiquidationMapResponse`
    - `symbol: string` - نماد (مثلاً BTC)
    - `current_price: number` - قیمت فعلی
    - `timeframe: string` - بازه زمانی (1w, 1d, 4h, etc.)
    - `data: LiquidationData[]` - آرایه داده‌های لیکوییدیشن
    - `exchanges: string[]` - لیست صرافی‌ها
  - [x] تعریف interface برای `ExchangeColors` برای نگاشت رنگ‌ها به صرافی‌ها

#### 1.2 ایجاد API Service
- [x] ایجاد فایل `src/lib/liquidationApi.ts`
  - [x] تابع `getLiquidationMap(symbol: string, timeframe: string)`
    - استفاده از pattern مشابه `trainingApi.ts`
    - Endpoint: `GET /market/liquidation-map/{symbol}?timeframe={timeframe}`
    - مدیریت authentication token
    - مدیریت خطاها و 401 redirect
  - [x] تابع `refreshLiquidationMap()` برای refresh دستی

### 2. کامپوننت‌های UI

#### 2.1 کامپوننت اصلی LiquidationMap
- [x] ایجاد فایل `src/components/liquidation/LiquidationMap.tsx`
  - [x] استفاده از Recharts برای visualization
  - [x] نمایش نمودار با:
    - محور X: قیمت (Price)
    - محور Y: مقدار لیکوییدیشن (USD in Billions)
    - ناحیه قرمز برای Short Liquidations (سمت چپ)
    - ناحیه سبز برای Long Liquidations (سمت راست)
    - Stacked Bar Chart برای نمایش تفکیک صرافی‌ها
  - [x] خط عمودی قرمز برای Current Price
  - [x] Label "Current Price: {price}" بالای خط
  - [x] Legend برای نمایش صرافی‌ها و رنگ‌هایشان
  - [x] Responsive design

#### 2.2 کامپوننت کنترل‌ها (Controls)
- [x] ایجاد فایل `src/components/liquidation/LiquidationMapControls.tsx`
  - [x] Dropdown برای انتخاب Symbol (BTC, ETH, etc.)
  - [x] Dropdown برای انتخاب Timeframe (1w, 1d, 4h, 1h, etc.)
  - [x] دکمه Refresh (آیکون فلش دایره‌ای)
  - [x] Loading state هنگام fetch داده

#### 2.3 کامپوننت Tooltip سفارشی
- [x] ایجاد `src/components/liquidation/LiquidationMapTooltip.tsx` (در LiquidationMap.tsx پیاده‌سازی شده)
  - [x] نمایش اطلاعات دقیق در hover
    - قیمت
    - مجموع لیکوییدیشن کوتاه
    - مجموع لیکوییدیشن بلند
    - تفکیک بر اساس صرافی
  - [x] استایل dark theme مشابه سایر کامپوننت‌ها

### 3. صفحه اصلی (Page)

#### 3.1 ایجاد صفحه Liquidation Map
- [x] اضافه شدن به MainChart به صورت تب (طبق دیزاین)
  - [x] استفاده از `useExchange` context برای selectedAccountId
  - [x] State management با hook `useLiquidationMap`:
    - `liquidationData: LiquidationMapResponse | null`
    - `loading: boolean`
    - `error: string | null`
    - `selectedSymbol: string` (default: "BTC")
    - `selectedTimeframe: string` (default: "1w")
  - [x] useEffect برای fetch اولیه داده
  - [x] Handler برای تغییر Symbol
  - [x] Handler برای تغییر Timeframe
  - [x] Handler برای Refresh
  - [x] Error handling و نمایش پیام خطا
  - [x] Layout مشابه سایر صفحات (padding, maxWidth, etc.)

### 4. استایل و تم

#### 4.1 رنگ‌بندی صرافی‌ها
- [x] تعریف رنگ‌های ثابت برای صرافی‌های مختلف:
  - Binance: آبی (#1E90FF)
  - Bybit: بنفش روشن (#9370DB)
  - Okex: نارنجی (#FF8C00)
  - Aster: آبی روشن/فیروزه‌ای (#00CED1)
  - Hyperliquid: صورتی/ارغوانی (#FF1493)
- [x] ایجاد فایل `src/components/liquidation/constants.ts` برای رنگ‌ها

#### 4.2 استایل نمودار
- [x] Background: `#2a2a2a` (مشابه سایر نمودارها)
- [x] Grid lines: `#444` با strokeDasharray
- [x] Text colors: `#888` برای labels
- [x] Short liquidation area: قرمز با opacity مناسب
- [x] Long liquidation area: سبز با opacity مناسب
- [x] Current price line: قرمز با strokeDasharray

### 5. ویژگی‌های پیشرفته (Optional)

#### 5.1 قابلیت‌های اضافی
- [x] Zoom و Pan برای نمودار - ✅ انجام شده (با Brush component از Recharts)
- [x] Export به تصویر (آیکون دوربین) - ✅ انجام شده (SVG to Canvas export)
- [x] نمایش مقادیر دقیق در hover - ✅ انجام شده (در CustomTooltip)
- [x] Animation برای تغییر داده‌ها - ✅ انجام شده (با enableAnimation prop)
- [x] Auto-refresh با interval قابل تنظیم - ✅ انجام شده (در useLiquidationMap hook)
- [x] نمایش Watermark (در صورت نیاز) - ✅ انجام شده (با showWatermark prop)

#### 5.2 بهینه‌سازی
- [x] Memoization برای محاسبات داده - ✅ انجام شده
  - useMemo برای chartData transformation
  - useMemo برای exchanges list
  - useMemo برای formatPrice و formatLiquidation functions
  - useCallback برای handleBrushChange و handleExport
- [x] Debounce برای تغییر Symbol/Timeframe - ✅ انجام شده
  - Debounce در useLiquidationMap hook
  - Configurable debounceMs (default: 300ms)
  - Cleanup timers on unmount
- [x] Caching برای داده‌های اخیر - ✅ انجام شده
  - localStorage cache با 5 دقیقه TTL
  - Per-symbol/timeframe cache keys
  - Background refresh برای cached data
  - Configurable enableCache option
- [x] Lazy loading برای کامپوننت - ✅ انجام شده
  - React.lazy برای LiquidationMap
  - Suspense با fallback UI
  - Code splitting برای bundle size optimization

### 6. تست و بررسی

#### 6.1 تست عملکرد
- [x] تست با Symbol های مختلف (BTC, ETH, etc.) - ✅ انجام شده (مراجعه به LIQUIDATION_MAP_TESTING.md)
- [x] تست با Timeframe های مختلف - ✅ انجام شده
- [x] تست Refresh functionality - ✅ انجام شده
- [x] تست Error handling (network errors, 401, etc.) - ✅ انجام شده
- [x] تست Responsive design در اندازه‌های مختلف صفحه - ✅ انجام شده

#### 6.2 بررسی UI/UX
- [x] بررسی خوانایی نمودار - ✅ انجام شده
- [x] بررسی رنگ‌بندی و contrast - ✅ انجام شده
- [x] بررسی عملکرد در dark theme - ✅ انجام شده
- [x] بررسی سرعت load و render - ✅ انجام شده

### 7. مستندسازی

#### 7.1 کامنت‌گذاری
- [x] اضافه کردن JSDoc comments برای توابع API - ✅ انجام شده
- [x] اضافه کردن comments برای منطق پیچیده - ✅ انجام شده
- [x] توضیح ساختار داده‌ها - ✅ انجام شده

#### 7.2 README (در صورت نیاز)
- [x] توضیح نحوه استفاده از کامپوننت - ✅ انجام شده (README.md ایجاد شد)
- [x] مثال‌های استفاده - ✅ انجام شده
- [x] توضیح props و state - ✅ انجام شده

## 📝 یادداشت‌های پیاده‌سازی

### کتابخانه‌های مورد نیاز
- `recharts` - برای رسم نمودار (قبلاً نصب شده)
- ممکن است نیاز به `d3-scale` برای scale کردن قیمت‌ها باشد

### ساختار داده پیشنهادی از Backend
```typescript
{
  "symbol": "BTC",
  "current_price": 89938,
  "timeframe": "1w",
  "exchanges": ["Binance", "Bybit", "Okex", "Aster", "Hyperliquid"],
  "data": [
    {
      "price": 84640,
      "short_liquidation": 4700000000,
      "long_liquidation": 0,
      "exchange_breakdown": {
        "Binance": 2000000000,
        "Bybit": 1500000000,
        "Okex": 800000000,
        "Aster": 200000000,
        "Hyperliquid": 200000000
      }
    },
    // ... more price points
  ]
}
```

### نکات مهم
1. داده‌ها باید بر اساس قیمت مرتب شوند
2. Short liquidations در سمت چپ (قیمت‌های پایین‌تر) و Long liquidations در سمت راست (قیمت‌های بالاتر)
3. Current price باید به صورت خط عمودی نمایش داده شود
4. Stacked bars باید تفکیک صرافی‌ها را نشان دهند

## ✅ چک‌لیست نهایی

- [x] تمام کامپوننت‌ها ایجاد شده‌اند
- [x] API integration کامل است
- [x] UI مطابق با design است
- [x] Error handling پیاده‌سازی شده
- [x] Loading states اضافه شده
- [x] Responsive design کار می‌کند
- [x] تست‌ها انجام شده (مراجعه به LIQUIDATION_MAP_TESTING.md)
- [x] Code review انجام شده
- [x] مستندسازی کامل شده (README.md و JSDoc comments)

---

**تاریخ ایجاد:** $(date)
**وضعیت:** در انتظار شروع

