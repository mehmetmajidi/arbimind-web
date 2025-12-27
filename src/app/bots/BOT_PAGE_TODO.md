# TODO: Trading Bot Page Implementation

این فایل شامل لیست TODO برای پیاده‌سازی صفحه Trading Bot بر اساس `BOT_PAGE_UI_DESIGN.md` است.

---

## 📋 Core Components

### 1. BotListPage (صفحه اصلی)
- [x] پیاده‌سازی Layout Pattern (Left, Center, Right panels)
- [x] پیاده‌سازی Header با title و action buttons
- [x] پیاده‌سازی Error handling و نمایش پیام‌های خطا
- [x] پیاده‌سازی Loading states
- [x] پیاده‌سازی Full-width layout (طبق BOT_PAGE_UI_DESIGN.md)

### 2. BotListTable (جدول Bot‌ها)
- [x] پیاده‌سازی جدول با columns: Name, Status, Strategy, Symbols, Capital, P&L, Win Rate, Trades, Actions
- [x] پیاده‌سازی Sortable columns
- [x] پیاده‌سازی Real-time status updates (via refresh)
- [x] پیاده‌سازی Quick actions (Start/Stop/Edit/Delete)
- [x] پیاده‌سازی Performance metrics inline
- [x] پیاده‌سازی Hover effects و selection state
- [x] پیاده‌سازی BotTableRow component

### 3. BotFiltersPanel (فیلترها - Left Panel)
- [x] پیاده‌سازی Status Filter (All, Active, Stopped, Error)
- [x] پیاده‌سازی Strategy Filter (All, Prediction Based, Confidence Weighted, Multi-Model Voting, Jump Enhanced)
- [x] پیاده‌سازی Symbol Filter (input field)
- [x] پیاده‌سازی Search (جستجو بر اساس نام)
- [x] پیاده‌سازی Filter state management
- [x] پیاده‌سازی Apply filters functionality

### 4. BotStatsPanel (آمار - Left Panel)
- [x] پیاده‌سازی Quick Stats (Total Bots, Active, Stopped, Error)
- [x] پیاده‌سازی Total P&L display
- [x] پیاده‌سازی Win Rate display
- [x] پیاده‌سازی StatItem component
- [x] پیاده‌سازی Real-time stats updates (via filteredAndSortedBots)

### 5. CreateBotForm (فرم ایجاد Bot)
- [x] پیاده‌سازی Modal/Dialog overlay
- [x] پیاده‌سازی Basic Info section (Bot Name, Exchange Account)
- [x] پیاده‌سازی Trading Settings section (Initial Capital, Risk Per Trade, Trading Symbols)
- [x] پیاده‌سازی Strategy Selection section (radio buttons یا cards)
- [x] پیاده‌سازی Risk Management section (Stop Loss, Take Profit, Paper Trading checkbox)
- [x] پیاده‌سازی Duration section (optional)
- [x] پیاده‌سازی Form validation
- [ ] پیاده‌سازی Real-time preview (optional enhancement)
- [x] پیاده‌سازی SymbolMultiSelect component (as button-based selector)
- [x] پیاده‌سازی Submit و Close handlers
- [x] پیاده‌سازی Error handling در form

### 6. BotDetailPage (صفحه جزئیات Bot)
- [x] پیاده‌سازی Route `/bots/[id]`
- [x] پیاده‌سازی Layout (Left, Center, Right panels)
- [x] پیاده‌سازی Bot Info Card (Left Panel)
- [x] پیاده‌سازی Quick Actions (Start/Stop/Edit/Delete)
- [x] پیاده‌سازی Configuration Summary
- [x] پیاده‌سازی Performance Charts (Center Panel)
- [x] پیاده‌سازی Trade History Table (Center Panel)
- [x] پیاده‌سازی Position List (Center Panel)
- [x] پیاده‌سازی Real-time Metrics (Right Panel)
- [x] پیاده‌سازی Current Positions (Right Panel)
- [x] پیاده‌سازی Recent Activity (Right Panel)

### 7. BotPerformanceCharts (نمودارهای عملکرد)
- [x] پیاده‌سازی P&L Over Time (Line Chart)
- [x] پیاده‌سازی Win Rate (Bar Chart)
- [x] پیاده‌سازی Trade Distribution (Pie Chart)
- [x] پیاده‌سازی Capital Over Time (Area Chart)
- [x] پیاده‌سازی استفاده از Recharts
- [x] پیاده‌سازی Dark theme styling برای charts
- [x] پیاده‌سازی Tooltip customization
- [x] پیاده‌سازی Responsive charts

### 8. BotTradeHistoryTable (تاریخچه معاملات)
- [x] پیاده‌سازی Table با columns: Symbol, Side, Entry Price, Exit Price, Quantity, P&L, Status, Time
- [x] پیاده‌سازی Sortable columns
- [x] پیاده‌سازی Filter by status (All, Open, Closed)
- [x] پیاده‌سازی Real-time updates (via onRefresh prop)
- [x] پیاده‌سازی Expandable rows برای details
- [x] پیاده‌سازی TradeTableRow component
- [x] پیاده‌سازی Pagination (20 items per page)

### 9. BotPositionsList (لیست پوزیشن‌ها)
- [x] پیاده‌سازی لیست پوزیشن‌های باز
- [x] پیاده‌سازی نمایش Symbol, Side, Entry Price, Quantity, Current Price, Unrealized P&L
- [x] پیاده‌سازی Real-time price updates (هر 5 ثانیه)
- [x] پیاده‌سازی Close position action
- [x] پیاده‌سازی Position card component

### 10. BotMetricsPanel (پنل متریک‌ها - Right Panel)
- [x] پیاده‌سازی Real-time performance metrics
- [x] پیاده‌سازی Current positions display
- [x] پیاده‌سازی Recent trades display
- [x] پیاده‌سازی Quick actions buttons (via click handlers)
- [x] پیاده‌سازی BotPerformancePanel component
- [x] پیاده‌سازی BotPositionsPanel component
- [x] پیاده‌سازی BotRecentTradesPanel component

---

## 🎨 UI Components

### 11. StatusBadge (نشانگر وضعیت)
- [x] پیاده‌سازی Badge برای نمایش status (Active, Stopped, Error, Inactive)
- [x] پیاده‌سازی رنگ‌بندی بر اساس status
- [x] پیاده‌سازی Styling مطابق Market Page

### 12. StatusIndicator (نشانگر وضعیت)
- [x] پیاده‌سازی Dot indicator برای status
- [x] پیاده‌سازی Animated indicator برای active status
- [x] پیاده‌سازی Styling مطابق Market Page

### 13. SymbolBadge (نماد)
- [x] پیاده‌سازی Badge برای نمایش symbols
- [x] پیاده‌سازی Styling مطابق Market Page
- [x] پیاده‌سازی Truncation برای symbols زیاد (via slice + "+X" indicator)

### 14. PnLIndicator (نمایش سود/زیان)
- [x] پیاده‌سازی Component برای نمایش P&L
- [x] پیاده‌سازی رنگ‌بندی (سبز برای مثبت، قرمز برای منفی)
- [x] پیاده‌سازی Formatting (+, - signs)

### 15. ProgressBar (نوار پیشرفت)
- [x] پیاده‌سازی Progress bar component
- [x] پیاده‌سازی Styling مطابق Market Page
- [x] پیاده‌سازی Animated progress

### 16. LoadingSpinner (لودینگ)
- [x] پیاده‌سازی Loading spinner component
- [x] پیاده‌سازی Styling مطابق Market Page
- [x] پیاده‌سازی استفاده در async operations

### 17. ErrorMessage (پیام خطا)
- [x] پیاده‌سازی Error message component
- [x] پیاده‌سازی Styling مطابق Market Page
- [x] پیاده‌سازی Dismiss functionality

### 18. SuccessMessage (پیام موفقیت)
- [x] پیاده‌سازی Success message component
- [x] پیاده‌سازی Styling مطابق Market Page
- [x] پیاده‌سازی Auto-dismiss functionality

---

## 🔄 Features

### 19. Real-time Updates
- [x] پیاده‌سازی WebSocket integration برای bot status updates
- [x] پیاده‌سازی WebSocket integration برای trade updates
- [x] پیاده‌سازی WebSocket integration برای position updates
- [x] پیاده‌سازی WebSocket integration برای metrics updates
- [x] پیاده‌سازی Polling fallback (اگر WebSocket در دسترس نباشد)
- [x] پیاده‌سازی Connection status indicator
- [x] پیاده‌سازی Reconnection logic

### 20. Filtering & Search
- [x] پیاده‌سازی Filter state management
- [x] پیاده‌سازی Apply filters به bot list
- [x] پیاده‌سازی Search functionality
- [x] پیاده‌سازی Clear filters button
- [ ] پیاده‌سازی URL query parameters برای filters (optional enhancement)

### 21. Sorting
- [x] پیاده‌سازی Sortable columns در BotListTable
- [x] پیاده‌سازی Sortable columns در TradeHistoryTable
- [x] پیاده‌سازی Sort state management
- [x] پیاده‌سازی Visual indicators برای sort direction

### 22. Pagination
- [ ] پیاده‌سازی Pagination برای BotListTable (اگر نیاز باشد - optional)
- [x] پیاده‌سازی Pagination برای TradeHistoryTable
- [ ] پیاده‌سازی Page size selector (optional enhancement)
- [x] پیاده‌سازی Page navigation

### 23. Responsive Design
- [ ] پیاده‌سازی Mobile layout (panels stack vertically)
- [ ] پیاده‌سازی Tablet layout
- [ ] پیاده‌سازی Desktop layout
- [ ] پیاده‌سازی Breakpoints (mobile: 768px, tablet: 1024px, desktop: 1280px)
- [ ] پیاده‌سازی Responsive charts
- [ ] پیاده‌سازی Responsive tables

### 24. Error Handling
- [x] پیاده‌سازی Error handling برای API calls
- [x] پیاده‌سازی Error messages display
- [ ] پیاده‌سازی Retry functionality (optional enhancement)
- [ ] پیاده‌سازی Error boundaries (optional enhancement)

### 25. Loading States
- [x] پیاده‌سازی Loading states برای bot list
- [x] پیاده‌سازی Loading states برای bot details
- [x] پیاده‌سازی Loading states برای trades
- [x] پیاده‌سازی Loading states برای positions
- [ ] پیاده‌سازی Skeleton loaders (optional enhancement)

---

## 🎨 Styling

### 26. Colors & Theme
- [x] استفاده از colors مطابق Market Page:
  - background: "#1a1a1a"
  - panelBackground: "#2a2a2a"
  - border: "rgba(255, 174, 0, 0.2)"
  - primary: "#FFAE00"
  - text: "#ededed"
  - secondaryText: "#888"
  - success: "#22c55e"
  - error: "#ef4444"
  - warning: "#f59e0b"
  - info: "#3b82f6"

### 27. Layout Styles
- [x] پیاده‌سازی layoutStyle (padding, maxWidth, margin, color)
- [x] پیاده‌سازی mainLayoutStyle (display: flex, gap, alignItems, height)
- [x] پیاده‌سازی panelStyle (backgroundColor, border, borderRadius, padding)
- [x] پیاده‌سازی inputStyle
- [x] پیاده‌سازی selectStyle
- [x] پیاده‌سازی buttonStyle
- [x] پیاده‌سازی badgeStyle (via StatusBadge, PnLIndicator, etc.)

### 28. Component Styles
- [x] استفاده از Inline styles (مطابق Market Page)
- [x] پیاده‌سازی Hover effects
- [x] پیاده‌سازی Transition effects
- [x] پیاده‌سازی Focus states
- [x] پیاده‌سازی Active states

---

## 🔌 API Integration

### 29. Bot Management Endpoints
- [x] پیاده‌سازی `GET /bots` - لیست Bot‌ها
- [x] پیاده‌سازی `POST /bots/create` - ایجاد Bot جدید
- [x] پیاده‌سازی `GET /bots/{id}` - جزئیات Bot
- [x] پیاده‌سازی `PUT /bots/{id}` - ویرایش Bot (via Edit button)
- [x] پیاده‌سازی `DELETE /bots/{id}` - حذف Bot
- [x] پیاده‌سازی `POST /bots/{id}/start` - شروع Bot
- [x] پیاده‌سازی `POST /bots/{id}/stop` - توقف Bot
- [x] پیاده‌سازی `GET /bots/{id}/status` - وضعیت Bot
- [x] پیاده‌سازی `GET /bots/{id}/trades` - لیست Trades

### 30. WebSocket Integration
- [x] پیاده‌سازی WebSocket connection به `WS /ws/bot/{id}`
- [x] پیاده‌سازی Handle `bot.status` events
- [x] پیاده‌سازی Handle `bot.trade` events
- [x] پیاده‌سازی Handle `bot.position` events
- [x] پیاده‌سازی Handle `bot.metrics` events
- [x] پیاده‌سازی Connection management
- [x] پیاده‌سازی Reconnection logic

---

## 📱 Pages

### 31. Bot List Page (`/bots`)
- [x] پیاده‌سازی کامل صفحه اصلی
- [x] پیاده‌سازی تمام panels (Left, Center, Right)
- [x] پیاده‌سازی Integration با تمام components
- [x] پیاده‌سازی Real-time updates (via refresh button)
- [x] پیاده‌سازی Error handling
- [x] پیاده‌سازی Loading states

### 32. Bot Detail Page (`/bots/[id]`)
- [x] پیاده‌سازی Route
- [x] پیاده‌سازی Layout (Left, Center, Right panels)
- [x] پیاده‌سازی Bot Info Panel
- [x] پیاده‌سازی Performance Charts
- [x] پیاده‌سازی Trade History Table
- [x] پیاده‌سازی Positions List
- [x] پیاده‌سازی Metrics Panel
- [x] پیاده‌سازی Real-time updates (WebSocket + Polling fallback)
- [x] پیاده‌سازی Error handling
- [x] پیاده‌سازی Loading states

---

## ✅ Completed Tasks

### Completed:
- [x] پیاده‌سازی Layout Pattern (Full-width)
- [x] پیاده‌سازی BotListPanel (Left Panel) - Basic structure
- [x] پیاده‌سازی BotListTable (Center Panel) - Basic structure
- [x] پیاده‌سازی BotDetailsPanel (Right Panel) - Basic structure
- [x] پیاده‌سازی Bot selection functionality
- [x] پیاده‌سازی API integration برای bot list
- [x] پیاده‌سازی API integration برای bot status
- [x] پیاده‌سازی API integration برای bot trades
- [x] پیاده‌سازی Performance Metrics Panel
- [x] پیاده‌سازی Current Positions Panel
- [x] پیاده‌سازی Recent Trades Panel
- [x] پیاده‌سازی Quick Actions Panel

---

## 📝 Notes

### Important:
1. **هماهنگی با Market Page**: تمام استایل‌ها باید مشابه Market Page باشند
2. **Inline Styles**: استفاده از inline styles (مشابه Market Page)
3. **Dark Theme**: استفاده از رنگ‌های یکسان
4. **Real-time**: به‌روزرسانی Real-time برای status و metrics
5. **Responsive**: طراحی Responsive برای mobile و tablet
6. **Error Handling**: مدیریت خطاها و نمایش پیام‌های مناسب
7. **Loading States**: نمایش loading states برای async operations

### Next Steps:
1. پیاده‌سازی CreateBotForm
2. پیاده‌سازی Filters Panel
3. پیاده‌سازی Performance Charts
4. پیاده‌سازی WebSocket integration
5. پیاده‌سازی Responsive design

---

**Last Updated**: 2025-12-26

