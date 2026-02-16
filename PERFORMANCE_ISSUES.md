# گزارش مشکلات لود و پرفرمنس صفحات - ArbiMind Web

این سند مشکلات لود و پرفرمنس هر صفحه را به‌صورت خلاصه لیست می‌کند و در پایان پیشنهادهای کلی برای بهبود پرفرمنس آورده شده است.

---

## مشکلات مشترک در سطح اپلیکیشن

- **Layout و Provider:** در همهٔ صفحات (غیر از auth) ابتدا `ApolloProvider`، `ExchangeProvider` و `LayoutWrapper` لود می‌شوند. `ExchangeContext` بلافاصله بعد از mount درخواست `GET /exchange/accounts` می‌زند و تا قبل از جواب، وضعیت `loading` است؛ در نتیجه اولین محتوا با تأخیر نشان داده می‌شود.
- **عدم Code Splitting برای کتابخانه‌های سنگین:** `recharts` و `lightweight-charts` در چندین صفحه به‌صورت static import شده‌اند و باندل اولیه را سنگین می‌کنند.
- **API Base URL:** در خیلی از صفحات `http://localhost:8000` به‌صورت هاردکد استفاده شده؛ بهتر است فقط از `process.env.NEXT_PUBLIC_API_URL` استفاده شود تا در پروداکشن یک نقطهٔ تنظیم وجود داشته باشد (اثر مستقیم روی سرعت لود کم است، ولی برای نگهداری مهم است).

### باید چیکار کنیم

- **Layout و Provider:** در مسیرهای auth (login, register, forgot-password, reset-password, oauth-success) اصلاً نیازی به `ExchangeProvider` یا fetch کردن accounts نیست. باید یا این provider را فقط دور صفحاتی که به اکسچنج نیاز دارند بگذاریم، یا داخل `ExchangeProvider` با چک کردن مسیر فعلی در مسیرهای auth اصلاً درخواست نزنیم و `loading` را false نگه داریم تا بلوک نشود. برای بقیهٔ صفحات می‌توان یک Skeleton مشترک نشان داد تا وقتی جواب accounts آمد محتوا رندر شود.
- **کتابخانه‌های سنگین:** برای `recharts` و `lightweight-charts` در هر صفحه‌ای که استفاده می‌شوند، به‌جای import در بالای فایل، از `next/dynamic` با `ssr: false` استفاده کنیم تا آن کامپوننت (یا کل صفحه) فقط وقتی لازم است لود شود و باندل اولیه سبک بماند. اگر یک کامپوننت چارت در چند صفحه استفاده می‌شود، یک بار با dynamic تعریف و همه جا استفاده شود.
- **API Base URL:** یک ماژول مرکزی (مثلاً `src/lib/apiBaseUrl.ts` یا داخل `apiClient`) تعریف کنیم که فقط از `process.env.NEXT_PUBLIC_API_URL` خوانده و مقدار پیش‌فرض را برای توسعه `http://localhost:8000` بگذارد. بعد در تمام صفحات و سرویس‌ها به‌جای رشتهٔ هاردکد از همین تابع/ثابت استفاده کنیم و در پروداکشن فقط با env تنظیم شود.

### To‑Do (مشکلات مشترک)

- [x] **ExchangeContext در auth:** در `ExchangeProvider` با `usePathname()` مسیر چک می‌شود؛ در مسیرهای `/login`, `/register`, `/forgot-password`, `/reset-password`, `/oauth-success` درخواست `GET /exchange/accounts` زده نمی‌شود و `loading` بلافاصله false می‌شود.
- [x] **Skeleton برای لود accounts:** کامپوننت `AccountsLoadingSkeleton` در `components/shared` اضافه شد و در `LayoutWrapper` وقتی `accountsLoading` است نمایش داده می‌شود.
- [ ] **Dynamic import برای recharts:** در صفحات Market، Performance، Metrics، Monitoring، Predictions (در صورت استفاده) کامپوننت‌هایی که از recharts استفاده می‌کنند با `next/dynamic` و `ssr: false` لود شوند.
- [ ] **Dynamic import برای lightweight-charts:** در صفحات/کامپوننت‌هایی که از lightweight-charts استفاده می‌کنند (مثلاً MainChart) همان استراتژی dynamic با `ssr: false` اعمال شود.
- [x] **ماژول مرکزی API URL:** فایل `src/lib/apiBaseUrl.ts` با `getApiUrl()` و `getWsUrl()` ایجاد شد.
- [x] **جایگزینی هاردکد API:** استفاده‌های `"http://localhost:8000"` در app، components، lib و hooks با `getApiUrl()` / `getWsUrl()` جایگزین شدند (فایل‌های .old و .backup نادیده گرفته شدند).

---

## ۱. صفحهٔ Home (`/`)

| مشکل | توضیح |
|------|--------|
| SSR غیرفعال برای Health | کوئری GraphQL با `ssr: false` فقط سمت کلاینت اجرا می‌شود؛ کاربر تا بعد از hydration منتظر می‌ماند. |
| خواندن localStorage در useEffect | برای `isAuthenticated` بعد از mount انجام می‌شود؛ احتمال هیدریشن نامطمئن و یک فریم دیرتر نمایش لینک‌ها. |
| نبود Skeleton مناسب | فقط متن "Loading health status..." نشان داده می‌شود؛ تجربهٔ لود ضعیف است. |
| وابستگی به Apollo | برای یک کوئری ساده Health، کل Apollo Client در باندل اولیه لود می‌شود. |

---

## ۲. صفحهٔ Login (`/login`)

| مشکل | توضیح |
|------|--------|
| تزریق استایل در سطح ماژول | بلوک `if (typeof document !== "undefined")` با `document.createElement("style")` و انیمیشن gradient در هر بار import صفحه اجرا می‌شود و می‌تواند باعث فلش یا تأخیر جزئی شود. |
| تصویر لوگو | استفاده از `unoptimized` برای لوگو؛ تصویر بهینه نمی‌شود و ممکن است سایز و زمان لود بیشتر باشد. |
| آیکون‌های react-icons | `MdVisibility` / `MdVisibilityOff` به‌صورت static import؛ اگر فقط در این صفحه استفاده شوند، بهتر است با dynamic import یا فقط SVG این دو آیکون لود شوند. |
| عدم Lazy برای بخش فرم | کل صفحه یک کامپوننت سنگین است؛ تفکیک بخش فرم و بخش برندینگ و lazy load بخش دوم می‌تواند FCP را بهتر کند. |

---

## ۳. صفحهٔ Register (`/register`)

| مشکل | توضیح |
|------|--------|
| همان مشکلات Login | تزریق استایل gradient، تصویر با `unoptimized`، react-icons به‌صورت static. |
| کد تکراری با Login | استایل‌های انیمیشن و ساختار برندینگ تقریباً یکسان؛ می‌توان در یک کامپوننت مشترک (مثلاً AuthLayout) متمرکز و یک بار لود کرد. |

---

## ۴. صفحهٔ Forgot Password (`/forgot-password`)

| مشکل | توضیح |
|------|--------|
| استایل gradient | همان الگوی تزریق استایل در سطح ماژول مثل Login/Register. |
| تصویر و ساختار | مشابه صفحات auth؛ امکان اشتراک‌گذاری با AuthLayout. |

---

## ۵. صفحهٔ Reset Password (`/reset-password`)

| مشکل | توضیح |
|------|--------|
| استایل gradient و Image | مثل بقیهٔ صفحات auth. |
| وابستگی به useSearchParams | داخل Suspense است؛ خوب است ولی کل صفحه با react-icons و انیمیشن یکجا لود می‌شود. |

---

## ۶. صفحهٔ OAuth Success (`/oauth-success`)

| مشکل | توضیح |
|------|--------|
| Fallback ساده | فقط "Loading..." و یک باکس ساده؛ می‌توان یک Skeleton یا اسپینر یکپارچه با بقیهٔ اپ نشان داد. |
| یک درخواست تکی | بعد از دریافت code فقط یک فراخوانی برای مبادلهٔ token؛ خودِ درخواست معمولاً سریع است، ولی اگر بک‌اند کند باشد کل صفحه در حالت loading می‌ماند. |

---

## ۷. صفحهٔ Bots (`/bots`)

| مشکل | توضیح |
|------|--------|
| import سنگین از `@/components/bots` | چندین کامپوننت (BotStatsPanel, BotListTable, BotDetailsPanel, CreateBotForm, EditBotForm, ...) و SkeletonLoader و ErrorBoundary یکجا لود می‌شوند. |
| تزریق استایل pulse | بلوک `document.createElement("style")` در سطح ماژول. |
| چند درخواست متوالی | ابتدا `fetchBots()`، بعد با انتخاب هر ربات `fetchBotStatus` و `fetchBotTrades`؛ بدون آبشاری یا موازی‌سازی بهینه. |
| مودال‌ها همیشه در باندل | CreateBotForm و EditBotForm و FiltersModal در همان باندل صفحه؛ می‌توان با dynamic import فقط هنگام باز شدن مودال لود کرد. |
| useResponsive | در هر رندر چک سایز؛ بهتر است با یک hook بهینه یا CSS/container query جایگزین شود تا رندرهای اضافه کم شود. |
| Suspense fallback | فقط متن "Loading..."؛ مناسب برای یک صفحهٔ پرترافیک نیست. |

### To-do برای صفحه Bots (پرفرمنس + تمیزکاری کد)

مثل صفحهٔ Market هدف این است: کد تمیزتر، بدون ارور/هشدار لینتر، و پرفرمنس بهتر.

- [x] **رفع ارورها و هشدارهای لینتر:** حذف متغیر استفاده‌نشده (`isDesktop`)، اصلاح dependency آرایهٔ `useEffect` (یا اضافه کردن `botStatus` یا استثنا با توضیح)، حذف تایپ `any` در sort comparator (استفاده از `string | number` برای `aValue`/`bValue`).
- [x] **استایل pulse:** حذف بلوک `document.createElement("style")` از سطح ماژول؛ انیمیشن `@keyframes pulse` به `app/globals.css` منتقل شد.
- [x] **کاهش import سنگین از `@/components/bots`:** BotStatsPanel، BotListTable و BotDetailsPanel با `next/dynamic` و `ssr: false` لود می‌شوند؛ SkeletonLoader و ErrorBoundary برای حالت لود اولیه static مانده‌اند.
- [x] **Dynamic import برای مودال‌ها:** CreateBotForm، EditBotForm و FiltersModal با `next/dynamic` و `ssr: false` لود می‌شوند.
- [x] **بهینه‌سازی درخواست‌ها:** با انتخاب ربات، `fetchBotStatus` و `fetchBotTrades` با `Promise.all` به‌صورت موازی فراخوانی می‌شوند.
- [ ] **بهینه‌سازی useResponsive:** استفاده از یک hook با `resize` listener و state به‌روز (با throttle/debounce) یا جایگزینی با CSS/container query تا در هر رندر چک سایز نشود و رندرهای اضافه کاهش یابد.
- [x] **Suspense fallback:** به‌جای متن "Loading..." کامپوننت `BotsPageSkeleton` با بلوک‌های خاکستری شبیه layout صفحه استفاده می‌شود.
- [x] **استخراج منطق به فایل/ماژول جدا:** توابع fetch و منطق فیلتر/مرتب‌سازی در `lib/botsApi.ts` و `lib/botsUtils.ts` قرار گرفتند؛ صفحهٔ Bots از این ماژول‌ها استفاده می‌کند.

---

## ۸. صفحهٔ جزئیات Bot (`/bots/[id]`)

| مشکل | توضیح |
|------|--------|
| همان کامپوننت‌های سنگین bots | BotInfoPanel, BotPerformanceCharts, BotTradeHistoryTable, BotPositionsList, BotMetricsPanel, BotDecisionLogs و ... همگی static import. |
| WebSocket + چند fetch | useBotWebSocket به‌علاوه fetchBot، fetchBotStatus، fetchBotTrades؛ اگر ترتیب یا کش کردن درست نباشد، چند بار درخواست و رندر اضافه می‌شود. |
| عدم Lazy برای پنل‌های ثانویه | مثلاً BotDecisionLogs یا چارت‌ها می‌توانند فقط وقتی تب/بخش مربوط باز است با dynamic import لود شوند. |

### To-do برای صفحهٔ جزئیات Bot (انجام‌شده)

- [x] **Dynamic import کامپوننت‌های سنگین:** BotInfoPanel، BotPerformanceCharts، BotTradeHistoryTable، BotPositionsList، BotMetricsPanel، BotDecisionLogs و EditBotForm با `next/dynamic` و `ssr: false` لود می‌شوند؛ BotStatusBadge و ConnectionStatusIndicator سبک هستند و static مانده‌اند.
- [x] **بهینه‌سازی درخواست‌های اولیه:** fetchBot و سپس `Promise.all([fetchBotStatus(), fetchBotTrades()])` تا status و trades به‌صورت موازی گرفته شوند؛ وابستگی‌های useEffect به fetchBot، fetchBotStatus، fetchBotTrades اضافه شد.
- [x] **Lazy برای پنل ثانویه:** BotDecisionLogs فقط وقتی `bot?.status === "active"` است رندر می‌شود تا چانک آن فقط برای ربات فعال لود شود.
- [x] **حالت لودینگ:** به‌جای متن "Loading bot details..." یک اسکلتون ساده با سه بلوک (چپ، وسط، راست) نمایش داده می‌شود.

---

## ۹. صفحهٔ Market (`/market`)

| مشکل | توضیح |
|------|--------|
| حجم زیاد کامپوننت و state | PriceWidget, MainChart, OrderPanel, TradingPanel, PricePredictionsPanel, ActiveOrders, ArbitragePanel, DemoWallet و recharts (ComposedChart, Line, Area, ...) در یک صفحه. |
| fetchOHLCV با چند درخواست | برای ۵۰۰ کندل تا ۱۰ درخواست متوالی (batch)؛ زمان لود اولیهٔ چارت زیاد است. |
| بازهٔ قیمت زنده | هر ۱۰ ثانیه fetchLivePrice؛ خوب است ولی در ترکیب با بقیهٔ درخواست‌ها می‌تواند شبکه را شلوغ کند. |
| recharts در سطح صفحه | Line, XAxis, YAxis, ... به‌صورت static؛ حتی اگر بخشی از چارت با lightweight-charts باشد، recharts در باندل اولیه هست. |
| تعداد زیاد useEffect و state | به‌خاطر منطق کندل، قیمت، پیش‌بینی و ... رندر و اثرات فرعی زیاد است. |
| MainChart | داخل MainChart از `lazy(LiquidationMap)` استفاده شده که خوب است؛ بقیهٔ MainChart و سایر ویجت‌ها lazy نیستند. |

### To‑Do (صفحهٔ Market)

- [x] **کاهش حجم لود اولیه:** ویجت‌های سنگین (MainChart، OrderPanel، ActiveOrders، ArbitragePanel، PricePredictionsPanel، DemoWallet، DemoPortfolioStats) با `next/dynamic` و `ssr: false` لود می‌شوند؛ فقط TradingPanel به‌صورت static است و یک loading برای MainChart نمایش داده می‌شود.
- [x] **سبک‌کردن fetch OHLCV:** لود اولیه به ۳۰۰ کندل و حداکثر ۲ درخواست (maxAttempts = 2) محدود شد؛ «Load more» همان fetchMoreOHLCV قبلی است.
- [ ] **اولویت‌دهی درخواست‌ها:** اول یک درخواست قیمت زنده (یا خلاصه) بزنیم و چارت را با همان تعداد کم کندل نشان دهیم؛ بعد در پس‌زمینه کندل‌های بیشتر را بگیریم تا زمان تا اولین نقاشی (TTFP) کم شود.
- [x] **Dynamic import برای recharts:** import مستقیم recharts از صفحهٔ Market حذف شد (استفاده در صفحه نبود).
- [ ] **کاهش state و useEffect:** منطق کندل، قیمت زنده و پیش‌بینی را تا حد ممکن در یک یا چند custom hook (مثلاً `useOhlcv`، `useLivePrice`، `usePredictions`) جمع کنیم و stateهای مشتق را با `useMemo` محاسبه کنیم تا رندرهای زنجیره‌ای و وابستگی‌های useEffect کم شود.
- [x] **قیمت زنده بعد از لود چارت:** اینتروال ۱۰ ثانیهٔ `fetchLivePrice` فقط وقتی شروع می‌شود که `ohlcvData.length > 0`؛ اولین بار بلافاصله بعد از انتخاب symbol یک بار fetchLivePrice صدا زده می‌شود.
- [x] **Lazy برای پنل‌های کناری:** OrderPanel، ActiveOrders، DemoWallet و DemoPortfolioStats با `next/dynamic` لود می‌شوند و فقط وقتی symbol انتخاب شده رندر می‌شوند (شرط selectedSymbol از قبل بود).

---

## ۱۰. صفحهٔ Trading (`/trading`)

| مشکل | توضیح |
|------|--------|
| فایل بسیار بزرگ | بیش از ۲۲۰۰ خط؛ چندین بخش (orders, positions, balance, trades, WebSocket orders/positions، مودال‌ها) در یک کامپوننت. |
| چند منبع داده همزمان | در mount یا وابسته به account: orders، positions، closed positions، balance، trades؛ همه می‌توانند همزمان درخواست بفرستند و باعث قفل یا کندی اولیه شوند. |
| دو WebSocket | یکی برای orders و یکی برای positions؛ اتصال و ریکانکت و state جداگانه می‌تواند باعث رندر و پیچیدگی زیاد شود. |
| عدم تفکیک با lazy | بخش‌های مودال (جزئیات اردر، جزئیات پوزیشن) و لیست‌ها می‌توانند با dynamic import لود شوند. |

---

## ۱۱. صفحهٔ Performance (`/performance`)

| مشکل | توضیح |
|------|--------|
| فایل بسیار بزرگ | حدود ۲۱۰۰ خط با تب‌های trades و model و فیلترها و export. |
| recharts کامل | LineChart, BarChart, PieChart و ... به‌صورت static؛ در هر دو تب استفاده می‌شوند و همیشه در باندل هستند. |
| چندین منبع داده | آمار، trade results، مدل‌ها، تاریخچهٔ مدل، win rate، prediction accuracy، should retrain و ...؛ درخواست‌های متعدد روی mount یا تغییر فیلتر. |
| Auto-refresh | با بازهٔ ۳۰ ثانیه؛ در ترکیب با داده‌های زیاد می‌تواند بار سرور و رندر را زیاد کند. |
| Export modal و چارت‌ها | می‌توان چارت‌ها یا بخش export را فقط هنگام نیاز با lazy لود کرد. |

---

## ۱۲. صفحهٔ Predictions (`/predictions`)

| مشکل | توضیح |
|------|--------|
| تعداد زیاد کامپوننت | PredictionFilters, PredictionStats, PredictionTable, PredictionPagination, GetPredictionModal, SinglePredictionModal و مودال Batch به‌صورت inline. |
| fetchPredictions در mount | بلافاصله با لود صفحه؛ اگر لیست طولانی باشد پاسخ سنگین است. |
| Auto-refresh | با بازهٔ قابل تنظیم (مثلاً ۳۰ ثانیه)؛ مثل سایر صفحات. |
| مودال Batch به‌صورت inline | یک بلوک JSX بزرگ برای مودال batch؛ بهتر است به یک کامپوننت جدا و در صورت امکان lazy منتقل شود. |
| fetch markets فقط با باز شدن مودال | خوب است؛ ولی خود مودال‌ها و جدول پیش‌بینی‌ها در باندل اولیه هستند. |

---

## ۱۳. صفحهٔ Monitoring (`/monitoring`)

| مشکل | توضیح |
|------|--------|
| recharts | LineChart, BarChart و ... برای anomaly history و نمایش داده. |
| چندین تابع fetch جدا | fetchAnomalyScore, fetchJumpDetection, fetchAlerts, fetchThresholdTriggers, monitorSymbol؛ با تغییر symbol/interval همگی دوباره صدا زده می‌شوند. |
| WebSocket برای آلرت‌ها | اتصال و ریکانکت و نگهداری alert history در state و localStorage. |
| خواندن/نوشتن localStorage برای alertHistory | برای لیست طولانی می‌تواند UI را در اولین لود کمی کند کند. |

---

## ۱۴. صفحهٔ Metrics (`/metrics`)

| مشکل | توضیح |
|------|--------|
| چک ادمین قبل از هر چیز | ابتدا `/auth/me` و بعد در صورت admin بودن `/metrics`؛ دو درخواست متوالی برای دیدن محتوا. |
| recharts | BarChart و PieChart برای method و status. |
| Auto-refresh | با بازهٔ ۵/۱۰/۳۰/۶۰ ثانیه؛ برای ادمین قابل قبول است ولی در صورت باز بودن چند تب می‌تواند بار اضافه ایجاد کند. |

---

## ۱۵. صفحهٔ Training (`/training`)

| مشکل | توضیح |
|------|--------|
| import یکجا از `@/components/training` | TrainingControlsPanel, FilterStatusPanel, TrainingJobsTable, TrainingQueuePanel, TrainingMetricsCharts, TrainingSettingsModal, StartTrainingModal, ToastContainer؛ همه در باندل اولیه. |
| بدون lazy برای مودال‌ها و پنل‌ها | Settings و Start Training مودال و پنل صف و چارت‌ها می‌توانند با dynamic import لود شوند. |
| وابستگی به سایز برای layout | با resize و state isMobile؛ مشابه useResponsive در Bots. |

---

## ۱۶. صفحهٔ Backfill (`/backfill`)

| مشکل | توضیح |
|------|--------|
| هوک useBackfillData سنگین | حجم state و توابع زیاد؛ هر تغییر تب یا فیلتر می‌تواند باعث محاسبات و رندر زیاد شود. |
| چندین کامپوننت جدول و تب | BackfillHeader, BackfillTabs, SyncSymbolsSection, SymbolsTable, BackfillJobsTable, BatchBackfillTab؛ همگی در همان باندل. |
| وابستگی به Exchange | با تغییر selectedAccountId دوباره داده‌ها و لیست بازارها لود می‌شوند. |

---

## ۱۷. صفحهٔ Settings (`/settings`)

| مشکل | توضیح |
|------|--------|
| فایل خیلی بزرگ | بیش از ۱۶۰۰ خط با تب‌های profile، exchange-accounts، exchanges، users، symbols. |
| fetch اولیه برای exchanges و accounts | در mount؛ اگر API کند باشد کل صفحه دیر نمایش داده می‌شود. |
| fetchSymbolsByExchange هنگام انتخاب تب/اکسچنج | خوب است که شرطی است؛ ولی خود کامپوننت SymbolList و فرم‌ها سنگین هستند. |
| عدم تفکیک تب‌ها | هر تب می‌تواند یک کامپوننت جدا با dynamic import باشد تا فقط تب فعال لود شود. |

---

## کارهایی که برای پرفرمنس بهتر می‌توان انجام داد

### ۱. Code splitting و Lazy loading

- **صفحات:** از `next/dynamic` با `ssr: false` یا `loading` برای صفحات سنگین (مثل Market، Trading، Performance، Bots، Training، Backfill، Settings) استفاده کنید تا باندل اول فقط layout و یک اسکلتون/اسپینر باشد.
- **کامپوننت‌های سنگین:** مودال‌ها (CreateBotForm، EditBotForm، GetPredictionModal، Batch prediction، Export، جزئیات اردر/پوزیشن)، پنل‌های ثانویه (مثل BotDecisionLogs، TrainingQueuePanel، TrainingMetricsCharts) و جداول بزرگ را با `React.lazy` + `Suspense` لود کنید.
- **کتابخانه‌ها:** recharts را فقط در صفحاتی که واقعاً چارت دارند با dynamic import بگیرید؛ اگر ممکن است برای چارت‌های ساده از یک کتابخانهٔ سبک‌تر یا SVG ساده استفاده کنید.

### ۲. داده و درخواست‌ها

- **اولویت و آبشاری:** در صفحاتی که چند منبع داده دارند (مثلاً Bots، Market، Trading)، اول یک درخواست حیاتی (مثلاً لیست ربات‌ها یا یک خلاصه) را بفرستید و بعد با دادهٔ اولیه بقیه را (مثلاً وضعیت ربات انتخاب‌شده) بگیرید؛ از fetchهای موازی غیرضروری در همان ثانیهٔ اول کم کنید.
- **کش و نگهداری:** برای داده‌های کم‌تغییر (مثلاً لیست اکسچنج‌ها، جفت‌ها) از کش حافظه یا React Query با staleTime استفاده کنید تا با هر بار ورود به صفحه درخواست تکراری نزنید.
- **پagination و حد داده:** در لیست‌های بلند (predictions، trades، alerts) حتماً pagination سمت سرور باشد و حد پیش‌فرض (مثلاً ۲۰–۵۰) اعمال شود تا پاسخ و پردازش اولیه سبک باشد.

### ۳. لایهٔ مشترک (Layout / Auth)

- **ExchangeContext:** اگر مسیر auth است (login, register, forgot-password, reset-password, oauth-success) اصلاً نیازی به لود ExchangeProvider یا درخواست accounts نیست؛ با چک مسیر در layout یا در خود provider از fetch در صفحات auth جلوگیری کنید.
- **استایل انیمیشن auth:** استایل gradient و انیمیشن صفحات login/register/forgot/reset را در یک فایل CSS یا در یک کامپوننت مشترک (مثلاً AuthLayout) قرار دهید و از تزریق استایل با `document.createElement` در سطح ماژول خودداری کنید.
- **Skeleton یکسان:** برای همهٔ صفحاتی که دادهٔ اولیه دارند یک Skeleton مشترک (مثلاً در `components/shared`) تعریف کنید و به‌جای متن سادهٔ "Loading..." از آن استفاده کنید.

### ۴. تصاویر و آیکون‌ها

- **لوگو:** تصویر لوگو را با `next/image` بدون `unoptimized` سرو کنید تا Next بهینه‌سازی و سایز مناسب را اعمال کند.
- **آیکون‌ها:** اگر فقط یکی دو آیکون از react-icons استفاده می‌شود، یا همان آیکون‌ها را به‌صورت SVG مستقیم در کامپوننت بگذارید یا با dynamic import فقط در صفحهٔ مورد نظر لود کنید تا باندل سبک‌تر شود.

### ۵. رندر و state

- **کاهش رندر:** در صفحات با state زیاد (Trading، Performance، Market)، stateهای محلی را تا حد ممکن به زیرکامپوننت‌ها منتقل کنید و با `React.memo` برای لیست‌ها و ردیف‌های جدول از رندرهای زنجیره‌ای جلوگیری کنید.
- **Responsive:** به‌جای چک مدام `window.innerWidth` در هر رندر، از CSS (مثلاً container queries یا media queries) یا یک hook با throttle و یک state واحد استفاده کنید تا رندرهای اضافه کم شود.

### ۶. باندل و Build

- **تحلیل باندل:** با `@next/bundle-analyzer` یا ابزارهای مشابه باندل را آنالیز کنید و ماژول‌های خیلی بزرگ (مثلاً recharts، moment اگر هست) را شناسایی و در صورت امکان با جایگزین سبک‌تر یا dynamic import کوچک‌تر کنید.
- **مرز صفحات:** مطمئن شوید هر صفحه فقط چیزی که برای همان مسیر لازم است را در باندل خودش دارد؛ با lazy کردن مودال‌ها و تب‌های سنگین این مرزها روشن‌تر می‌شوند.

### ۷. تجربهٔ کاربری لود

- **اول محتوا، بعد جزئیات:** در صفحاتی مثل Market و Trading، اول لیست/خلاصه را نشان دهید و چارت یا پنل جزئیات را بعد از لود اولیه یا با کلیک کاربر رندر کنید.
- **استفاده از Suspense:** برای بخش‌های lazy حتماً یک fallback مناسب (اسکلتون یا اسپینر هماهنگ با طراحی) بگذارید تا کاربر احساس کند صفحه در حال لود است نه گیر کرده.

با اعمال تدریجی موارد بالا (به‌خصوص lazy loading صفحات و کامپوننت‌های سنگین و سبک‌کردن اولین درخواست‌ها) زمان لود اولیه و تعاملی‌تر شدن صفحه در همهٔ مسیرها بهتر می‌شود.
