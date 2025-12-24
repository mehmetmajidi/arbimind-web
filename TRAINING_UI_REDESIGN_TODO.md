# TODO: بازطراحی UI/UX صفحه Training

## 📋 خلاصه پروژه

بازطراحی کامل صفحه Training بر اساس سیستم جدید:
- **Volatility & Data Freshness Filters**
- **Periodic Retraining System**
- **Training Queue Management**
- **Retraining Metrics & Monitoring**

---

## Phase 1: پاک کردن کدهای قدیمی

### ✅ Task 1: حذف فایل‌های قدیمی
- **فایل**: `arbimind-web/src/app/training/page.tsx`
- **اقدام**: 
  - Backup کردن فایل قدیمی (به `page.old.tsx`)
  - پاک کردن تمام کدهای قدیمی
  - نگه داشتن فقط structure اولیه (imports, exports)
- **Status**: ✅ **Completed** - فایل backup شد و کدهای قدیمی پاک شدند:
  - Backup: `page.old.tsx` ایجاد شد
  - فایل جدید: فقط structure اولیه با placeholder message
  - آماده برای Phase 2

### ✅ Task 2: بررسی و حذف Dependencies غیرضروری
- **فایل**: `arbimind-web/package.json`
- **اقدام**:
  - بررسی dependencies که فقط برای training قدیمی استفاده می‌شدند
  - حذف dependencies غیرضروری (اگر وجود دارد)
- **Status**: ✅ **Completed** - بررسی انجام شد:
  - تمام dependencies موجود (recharts, react-icons, etc.) در Market Page هم استفاده می‌شوند
  - هیچ dependency غیرضروری برای حذف وجود ندارد
  - همه dependencies قابل استفاده برای Training Page جدید هستند

---

## Phase 2: طراحی UI/UX جدید (بر اساس Market Page)

### ✅ Task 3: طراحی Layout اصلی (Panel-based - مشابه Market Page)
- **Component**: `TrainingPage` (صفحه اصلی)
- **Layout** (exact مشابه Market Page structure):
  ```tsx
  <div style={{ padding: "24px", maxWidth: "1600px", margin: "0 auto", color: "#ededed" }}>
    <h1 style={{ color: "#FFAE00", marginBottom: "24px" }}>Training Dashboard</h1>
    
    {/* Main Layout - Flexbox مشابه Market */}
    <div style={{ 
      display: "flex", 
      gap: "0.5rem", 
      alignItems: "flex-start", 
      height: "calc(100vh - 200px)", 
      minHeight: "600px" 
    }}>
      {/* Left Panel - مشابه TradingPanel */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <TrainingControlsPanel />
        <FilterStatusPanel />
      </div>
      
      {/* Main Content - مشابه MainChart area */}
      <div style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "12px" }}>
        <TrainingJobsTable />
      </div>
      
      {/* Right Panel - Optional (مشابه OrderPanel) */}
      <div style={{ width: "320px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
        <TrainingQueuePanel />
        <MetricsSummaryPanel />
      </div>
    </div>
    
    {/* Bottom Panel - مشابه ArbitragePanel */}
    <div style={{ marginTop: "12px" }}>
      <TrainingMetricsCharts />
    </div>
  </div>
  ```
- **Features**:
  - **Exact same structure** به Market Page
  - Flexbox layout با `display: "flex", gap: "0.5rem"`
  - Left panel: Controls & Stats
  - Center: Main content (Table)
  - Right panel: Queue & Summary (optional)
  - Bottom: Charts & Metrics
  - Dark theme: `#1a1a1a`, `#2a2a2a`, `#FFAE00`
  - Inline styles (مشابه Market Page)
- **Status**: ✅ **Completed** - Layout اصلی پیاده‌سازی شد:
  - Structure مشابه Market Page ایجاد شد
  - Left Panel, Main Content, Right Panel, Bottom Panel اضافه شدند
  - Placeholder components برای Phase 3 آماده شدند
  - Styling مشابه Market Page اعمال شد
  - فایل: `arbimind-web/src/app/training/page.tsx`

### ✅ Task 4: Left Panel - Controls & Stats
- **Component**: `TrainingControlsPanel` (مشابه TradingPanel در Market)
- **Location**: Left sidebar (width: ~320px)
- **Styling**: Exact مشابه TradingPanel
  ```tsx
  <div style={{
    backgroundColor: "#1a1a1a",
    borderRadius: "12px",
    padding: "16px",
    border: "1px solid rgba(255, 174, 0, 0.2)",
    minWidth: "280px",
  }}>
    {/* Cards inside */}
  </div>
  ```
- **Content** (Card-based):
  - **Periodic Retraining Status Card**:
    - Header: "Periodic Retraining" (color: #FFAE00)
    - Last run: [timestamp]
    - Next run: [timestamp]
    - Status badge: Active/Paused
    - Success rate: [%] (7 days)
    - Button: "Trigger Now"
  - **Filter Statistics Card**:
    - Header: "Filter Statistics"
    - Total filtered: [count]
    - By volatility: [count]
    - By data freshness: [count]
  - **Queue Status Card**:
    - Header: "Training Queue"
    - Pending: [count]
    - Running: [count]
    - Max concurrent: [number]
    - Button: "Process Queue"
  - **Quick Actions Card**:
    - Button: "Start Training" (primary)
    - Button: "Check Filter" (secondary)
    - Button: "Settings" (secondary)
- **Status**: ✅ **Completed** - TrainingControlsPanel پیاده‌سازی شد:
  - Periodic Retraining Status Card با last run, next run, success rate
  - Filter Statistics Card با total filtered, by volatility, by data freshness
  - Queue Status Card با pending, running, max concurrent
  - Quick Actions Card با 3 buttons
  - Auto-refresh هر 30 ثانیه
  - API integration با `/train/periodic-status`
  - Styling مشابه TradingPanel

### ✅ Task 5: Main Content Area - Training Jobs Table
- **Component**: `TrainingJobsTable` (مشابه MainChart area در Market)
- **Location**: Center main area (`flex: "1"`)
- **Styling**: Exact مشابه MainChart container
  ```tsx
  <div style={{
    flex: "1",
    minWidth: "0",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  }}>
    {/* Table container */}
  </div>
  ```
- **Features**:
  - **Table Container** (dark theme):
    ```tsx
    <div style={{
      backgroundColor: "#1a1a1a",
      borderRadius: "12px",
      padding: "16px",
      border: "1px solid rgba(255, 174, 0, 0.2)",
    }}>
      {/* Table header با filters */}
      {/* Table body */}
    </div>
    ```
  - **Table Header**:
    - Title: "Training Jobs"
    - Filters row: Status dropdown, Symbol search, Model type, Date range
    - Actions: Start Training, Refresh, Auto-refresh toggle
  - **Table**:
    - Columns: Job ID, Symbol, Model Type, Horizon, Status, Started, Duration, Actions
    - Row styling: hover effect, alternating colors
    - Status badges
    - Action buttons (View Logs, Cancel)
  - **Pagination** (اگر نیاز باشد)
- **Status**: ✅ **Completed** - TrainingJobsTable پیاده‌سازی شد:
  - Table با columns: Job ID, Symbol, Model Type, Horizon, Status, Started, Duration, Actions
  - Filters: Status dropdown, Symbol search, Model type filter
  - Actions: Start Training, Refresh, Auto-refresh toggle
  - Status badges با رنگ‌های مناسب
  - Action buttons: Cancel (برای running jobs)
  - Expandable logs section
  - Auto-refresh هر 5 ثانیه (اگر enabled)
  - API integration با `/train/status` و `/train/logs/{job_id}`
  - Styling مشابه MainChart container

### ✅ Task 6: Filter Status Panel
- **Component**: `FilterStatusPanel` (مشابه PricePredictionsPanel در Market)
- **Location**: Left Panel (زیر TrainingControlsPanel)
- **Styling**: Exact مشابه PricePredictionsPanel
  ```tsx
  <div style={{
    backgroundColor: "#1a1a1a",
    borderRadius: "12px",
    padding: "16px",
    border: "1px solid rgba(255, 174, 0, 0.2)",
  }}>
    <h4 style={{ color: "#FFAE00", margin: "0 0 12px 0", fontSize: "14px", fontWeight: "600" }}>
      Filter Status
    </h4>
    {/* Content */}
  </div>
  ```
- **Features**:
  - **Symbol Search Section**:
    - Input field (مشابه Market)
    - Interval selector (dropdown: 1h, 4h, 1d)
    - "Check" button
  - **Filter Status Display** (برای symbol انتخاب شده):
    - **Volatility Card**:
      - Header: "Volatility"
      - Score: [0.85] با progress bar
      - Status: ✅/❌ badge
      - Metrics: (collapsible section)
        - Price volatility: [%]
        - Daily range: [%]
        - Volume volatility: [value]
        - Movement frequency: [%]
      - Recommendation: [text]
    - **Data Freshness Card**:
      - Header: "Data Freshness"
      - Status: ✅/❌ badge
      - Last candle: [timestamp]
      - Data age: [hours]
      - Completeness: [%]
      - Gaps: [count]
      - Recommendation: [text]
    - **Overall Status**:
      - Can train: ✅/❌
      - Can predict: ✅/❌
      - Reason: [text] (red if failed)
- **Status**: ✅ **Completed** - FilterStatusPanel پیاده‌سازی شد:
  - Symbol Search Section با input field و interval selector (1h, 4h, 1d)
  - Check button با loading state
  - Volatility Card با score (progress bar), status badge, collapsible metrics, recommendation
  - Data Freshness Card با status badge, last candle, data age, completeness, gaps (collapsible), recommendation
  - Overall Status با can train/predict indicators و reason
  - API integration با `/train/filter-status/{symbol}`
  - Styling مشابه PricePredictionsPanel
  - Error handling و loading states

### ✅ Task 7: Right Panel - Queue & Summary (Optional)
- **Component**: `TrainingQueuePanel` (مشابه OrderPanel در Market)
- **Location**: Right sidebar (width: 320px)
- **Styling**: Exact مشابه OrderPanel
  ```tsx
  <div style={{
    width: "320px",
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  }}>
    {/* Queue panel */}
    {/* Summary panel */}
  </div>
  ```
- **Features**:
  - **Queue Panel**:
    - Header: "Training Queue"
    - Queue list (compact)
    - Stats: Pending, Running, Avg wait time
    - Actions: Process queue, Clear completed
  - **Summary Panel**:
    - Header: "Quick Stats"
    - Total jobs today
    - Success rate
    - Average duration
- **Status**: ✅ **Completed** - TrainingQueuePanel پیاده‌سازی شد:
  - Queue Panel با stats: Pending, Running, Max concurrent, Available slots
  - Next Jobs list (top 5 pending jobs)
  - Running Jobs list
  - Process Queue button
  - Summary Panel با Quick Stats:
    - Total jobs (7d)
    - Success rate (با رنگ‌بندی)
    - Average duration
  - Auto-refresh هر 10 ثانیه
  - API integration با `/train/periodic-status`
  - Styling مشابه OrderPanel
  - Priority color coding برای jobs

### ✅ Task 8: Bottom Panel - Metrics & Charts
- **Component**: `TrainingMetricsCharts` (مشابه ArbitragePanel در Market)
- **Location**: Bottom section (زیر main layout)
- **Styling**: Exact مشابه ArbitragePanel
  ```tsx
  <div style={{
    marginTop: "12px",
    backgroundColor: "#1a1a1a",
    borderRadius: "12px",
    padding: "16px",
    border: "1px solid rgba(255, 174, 0, 0.2)",
  }}>
    {/* Charts */}
  </div>
  ```
- **Features**:
  - **Charts Grid** (با Recharts):
    - Line Chart: Retraining sessions over time
    - Line Chart: Success rate trend
    - Bar Chart: Models retrained per session
    - Pie Chart: Filter reasons breakdown
  - **Metrics Summary Table**:
    - Recent sessions (last 10)
    - Recent filtered symbols
  - **Export Button**: CSV/JSON export
- **Status**: ✅ **Completed** - TrainingMetricsCharts پیاده‌سازی شد:
  - Charts Grid با Recharts:
    - Bar Chart: Retraining sessions over time (successful vs failed)
    - Line Chart: Success rate trend
    - Pie Chart: Filter reasons breakdown (volatility vs data freshness)
  - Metrics Summary Table:
    - Recent sessions (last 10) با columns: Time, Total, Success, Failed, Rate, Duration
    - Color-coded success rate
  - Export Button: JSON export functionality
  - Auto-refresh هر 1 دقیقه
  - API integration با `/train/periodic-status`
  - Styling مشابه ArbitragePanel
  - Responsive grid layout

### ✅ Task 9: Settings Modal
- **Component**: `TrainingSettingsModal` (Modal overlay)
- **Trigger**: Button در Left Panel
- **Features**:
  - **Filter Configuration Section**:
    - Volatility thresholds (number inputs)
    - Data freshness thresholds (number inputs)
    - Enable/disable toggles
    - Block on failure toggle
  - **Retraining Configuration Section**:
    - Periodic interval (dropdown)
    - Cooldown period (input)
    - Max concurrent (input)
  - **Priority Configuration Section**:
    - Tier 1 symbols (view-only list)
    - Tier 2 symbols (view-only list)
    - Note: Symbols configured on server
  - **Save/Cancel buttons**
- **Styling**: Modal overlay، مشابه modals در Market
- **Status**: ✅ **Completed** - TrainingSettingsModal پیاده‌سازی شد:
  - Filter Configuration Section:
    - Volatility thresholds (min volatility, price range, volume volatility, movement frequency, window days)
    - Data freshness thresholds (max age, min completeness, max gaps, check window)
    - Enable/disable toggles برای هر filter
    - Block on failure toggle
  - Retraining Configuration Section:
    - Periodic interval dropdown (1h, 3h, 6h, 12h, 24h)
    - Cooldown period input
    - Max concurrent jobs input
  - Priority Configuration Section:
    - Tier 1 symbols list (view-only)
    - Tier 2 symbols list (view-only)
    - Note about server configuration
  - Save/Cancel buttons
  - API integration با `/train/filter-status/{symbol}` برای دریافت config
  - Styling مشابه modals در Market Page
  - Error handling و success messages

---

## Phase 3: Components (بر اساس Market Page Components)

### ✅ Task 10: Start Training Modal
- **Component**: `StartTrainingModal` (Modal overlay)
- **Styling**: مشابه modals در Market page
- **Fields**:
  - Symbol (input با autocomplete)
  - Model Type (dropdown)
  - Horizon (dropdown)
  - Interval (auto-determined, نمایش read-only)
  - Skip Filters (checkbox, admin only)
- **Features**:
  - Real-time filter status check (نمایش در modal)
  - Warning message اگر filter fail شود
  - Validation قبل از submit
  - Loading state هنگام submit
- **Status**: ✅ **Completed** - StartTrainingModal پیاده‌سازی شد:
  - Symbol input با auto-normalization (BTC/USDT یا BTCUSDT)
  - Model Type dropdown (9 options)
  - Horizon dropdown (5 options)
  - Interval auto-determined از horizon
  - Skip Filters checkbox
  - Real-time filter status check با debounce (500ms)
  - FilterStatusIndicator برای نمایش status
  - Warning message برای failed filters
  - Validation و error handling
  - Loading state
  - API integration با `/train/start`

### ✅ Task 11: Job Logs Modal
- **Component**: `JobLogsModal` (Modal overlay)
- **Styling**: Full-screen modal یا large modal
- **Features**:
  - Log display area (monospace font)
  - Real-time log streaming (WebSocket یا polling)
  - Auto-scroll toggle
  - Search input برای logs
  - Download button
  - Error highlighting (red background)
  - Close button
- **Status**: ✅ **Completed** - JobLogsModal پیاده‌سازی شد:
  - Large modal (90% width, max 1200px)
  - Monospace font برای logs
  - Real-time polling (هر 3 ثانیه برای running jobs)
  - Auto-scroll toggle
  - Search input با icon
  - Download button (JSON export)
  - Error highlighting (خطوط با error keywords)
  - Expandable header
  - API integration با `/train/logs/{jobId}`
  - Auto-refresh برای running jobs

### ✅ Task 12: Status Badges Component
- **Component**: `StatusBadge` (reusable)
- **Variants**:
  - Running (blue, animated pulse)
  - Completed (green)
  - Failed (red)
  - Rejected (orange)
  - Pending (gray)
- **Usage**: در tables و cards
- **Styling**: مشابه badges در Market page
- **Status**: ✅ **Completed** - StatusBadge پیاده‌سازی شد:
  - 6 variants: running, completed, failed, rejected, pending, cancelled
  - 3 sizes: small, medium, large
  - Animated pulse برای running status
  - Colors و styling مشابه Market page
  - استفاده در TrainingJobsTable

### ✅ Task 13: Filter Status Indicator Component
- **Component**: `FilterStatusIndicator` (reusable)
- **Variants**:
  - Passed (green checkmark icon)
  - Failed (red X icon)
  - Warning (yellow warning icon)
- **Usage**: در FilterStatusPanel
- **Styling**: Icon + text، مشابه indicators در Market
- **Status**: ✅ **Completed** - FilterStatusIndicator پیاده‌سازی شد:
  - 3 variants: passed, failed, warning
  - Icons: MdCheckCircle, MdCancel, MdWarning
  - 3 sizes: small, medium, large
  - Customizable text
  - استفاده در FilterStatusPanel و StartTrainingModal

---

## Phase 4: API Integration

### ✅ Task 14: API Service Functions
- **File**: `arbimind-web/src/lib/trainingApi.ts`
- **Functions**:
  - `getTrainingJobs()` - GET /train/status
  - `startTraining()` - POST /train/start
  - `cancelTraining()` - POST /train/cancel/{job_id}
  - `getJobLogs()` - GET /train/logs/{job_id}
  - `getPeriodicStatus()` - GET /train/periodic-status
  - `getFilterStatus()` - GET /train/filter-status/{symbol}
  - `getQueueStatus()` - GET /train/queue-status (if exists)
  - `processQueue()` - POST /train/queue/process (if exists)
  - `getMetrics()` - From periodic-status response
  - `updateSettings()` - PUT /train/settings (if exists)
- **Status**: ✅ **Completed** - trainingApi.ts پیاده‌سازی شد:
  - تمام API functions با error handling
  - TypeScript types از `@/types/training`
  - Centralized headers و auth token management
  - Functions: getTrainingJobs, startTraining, cancelTraining, getJobLogs, getTrainingJobStatus, getPeriodicStatus, getFilterStatus, getQueueStatus, getMetrics, getAvailableModels, retrainModel
  - همه کامپوننت‌ها به‌روزرسانی شدند تا از این API functions استفاده کنند

### ✅ Task 15: TypeScript Interfaces
- **File**: `arbimind-web/src/types/training.ts`
- **Interfaces**:
  - `TrainingJob`
  - `Model`
  - `FilterStatus`
  - `VolatilityStatus`
  - `DataFreshnessStatus`
  - `PeriodicRetrainStatus`
  - `QueueStatus`
  - `TrainingMetrics`
  - `FilterConfig`
- **Status**: ✅ **Completed** - types/training.ts پیاده‌سازی شد:
  - تمام interfaces با types کامل
  - Type aliases: TrainingJobStatus, ModelType, Horizon, Interval
  - Interfaces: TrainingJob, TrainingRequest, StartTrainingResponse, VolatilityMetrics, VolatilityStatus, DataFreshnessStatus, FilterStatus, FilterConfig, PeriodicRetrainSession, QueueJob, QueueStatus, PeriodicRetrainStatus, TrainingMetrics, JobLogsResponse, Model
  - استفاده در تمام کامپوننت‌ها و API functions

### ✅ Task 16: Real-time Updates
- **Implementation**:
  - WebSocket connection for job status updates
  - Polling for periodic retraining status
  - Auto-refresh toggle
  - Configurable refresh interval
- **Status**: ✅ **Completed** - trainingWebSocket.ts پیاده‌سازی شد:
  - WebSocket service class با reconnection logic
  - Fallback به polling اگر WebSocket در دسترس نباشد
  - Job status update callbacks
  - Error handling و reconnection attempts
  - استفاده در TrainingJobsTable برای real-time updates
  - Auto-refresh toggle در کامپوننت‌ها
  - Configurable refresh intervals (5 seconds برای polling)

---

## Phase 5: Visual Components (مشابه Market Page)

### ✅ Task 17: Progress Indicators
- **Component**: `TrainingProgress`
- **Features**:
  - Progress bar برای running jobs (در table)
  - ETA estimation
  - Stage indicators (optional)
- **Styling**: مشابه progress indicators در Market
- **Status**: ✅ **Completed** - TrainingProgress پیاده‌سازی شد:
  - Progress bar با animation برای running jobs
  - نمایش درصد progress (0-100)
  - نمایش duration و ETA
  - Stage indicators (optional)
  - رنگ‌بندی بر اساس status (running, completed, failed, pending)
  - استفاده در TrainingJobsTable برای running jobs

### ✅ Task 18: Charts & Graphs (با Recharts)
- **Components** (در Bottom Panel):
  - `RetrainingSessionsChart` (Line chart)
  - `FilterReasonsChart` (Pie chart)
  - `SuccessRateChart` (Line chart)
  - `MetricsTrendChart` (Area chart)
- **Styling**: مشابه charts در Market page
- **Library**: Recharts (already in use)
- **Status**: ✅ **Completed** - TrainingMetricsCharts پیاده‌سازی شد:
  - Bar chart برای retraining sessions (models, successful, failed)
  - Line chart برای success rate trend
  - Pie chart برای filter reasons breakdown
  - Summary table برای recent sessions
  - Export button برای JSON export
  - استفاده از Recharts library
  - Styling مشابه Market page charts

### ✅ Task 19: Card Components
- **Components**:
  - `StatCard` (برای stats در Left Panel)
  - `StatusCard` (برای periodic retraining status)
  - `FilterStatusCard` (برای volatility/freshness)
- **Styling**: مشابه cards در Market page
- **Features**: Rounded corners, padding, border, hover effects
- **Status**: ✅ **Completed** - Card components پیاده‌سازی شدند:
  - **StatCard**: برای نمایش آمار با title, value, subtitle, icon, trend
  - **StatusCard**: برای نمایش status با dot indicator, last run, next run, actions
  - **FilterStatusCard**: برای نمایش filter status با metrics, recommendation, details
  - همه cards با rounded corners (12px), padding, border (rgba(255, 174, 0, 0.2))
  - Hover effects برای interactive cards
  - Styling مشابه Market page cards

---

## Phase 6: UX Enhancements

### ✅ Task 21: Loading States
- **Implementation**:
  - Skeleton loaders for tables
  - Spinner for API calls
  - Progress indicators
- **Status**: ✅ **Completed** - Loading components پیاده‌سازی شدند:
  - **LoadingSpinner**: Spinner component با 3 sizes (small, medium, large) و customizable color
  - **SkeletonLoader**: Skeleton loader با 4 types (text, table, card, circle) و customizable lines/width/height
  - استفاده در TrainingJobsTable, TrainingControlsPanel, TrainingQueuePanel, TrainingMetricsCharts
  - Progress indicators قبلاً در TrainingProgress پیاده‌سازی شده بود

### ✅ Task 22: Error Handling
- **Implementation**:
  - Error messages (toast notifications)
  - Retry mechanisms
  - Fallback UI states
- **Status**: ✅ **Completed** - Error handling پیاده‌سازی شد:
  - **ToastContainer**: Toast notification system با 4 types (success, error, warning, info)
  - **ErrorBoundary**: React Error Boundary برای catch کردن errors
  - Error messages در تمام کامپوننت‌ها با toast notifications
  - Fallback UI states برای loading و error states
  - Retry mechanisms در fetchJobs (با showError parameter)

### ✅ Task 23: Success Feedback
- **Implementation**:
  - Success toasts
  - Confirmation modals
  - Visual feedback on actions
- **Status**: ✅ **Completed** - Success feedback پیاده‌سازی شد:
  - **Toast**: Toast notifications برای success, error, warning, info
  - **ConfirmationModal**: Confirmation modal با 4 types و customizable colors
  - Success toasts برای actions (start training, cancel job)
  - Confirmation modal برای cancel training job
  - Visual feedback در buttons و actions

### ✅ Task 24: Responsive Design
- **Implementation**:
  - Mobile-friendly layout
  - Tablet optimization
  - Desktop full features
- **Status**: ✅ **Completed** - Responsive design پیاده‌سازی شد:
  - Mobile detection با window.innerWidth < 1024
  - Layout changes: flexDirection column برای mobile, row برای desktop
  - Panel reordering: FilterStatusPanel و TrainingQueuePanel به bottom در mobile
  - Width adjustments: 100% width برای mobile, fixed widths برای desktop
  - Font size adjustments: smaller fonts برای mobile
  - Table horizontal scroll برای mobile
  - Padding adjustments: smaller padding برای mobile

---

## Phase 7: Testing & Polish

### ✅ Task 25: Component Testing
- **Tests**:
  - Unit tests for components
  - Integration tests for API calls
  - E2E tests for user flows
- **Status**: ⏳ Pending

### ✅ Task 26: UI Polish
- **Tasks**:
  - ✅ Animation transitions (added `transition: "all 0.2s ease"` to all interactive elements)
  - ✅ Hover effects (added `onMouseEnter`/`onMouseLeave` handlers with color/transform changes)
  - ✅ Focus states (added `onFocus`/`onBlur` handlers with outline styles for keyboard navigation)
  - ✅ Accessibility improvements (added `aria-label` attributes, `tabIndex` for clickable elements, keyboard navigation support)
- **Status**: ✅ **Completed**

### ✅ Task 27: Documentation
- **Content**:
  - ✅ Component documentation (`TRAINING_COMPONENTS_DOCS.md`)
  - ✅ API integration guide (`TRAINING_API_GUIDE.md`)
  - ✅ User guide (`TRAINING_USER_GUIDE.md`)
- **Status**: ✅ **Completed**

---

## 📊 خلاصه

| Phase | Tasks | Status |
|-------|-------|--------|
| Phase 1: Cleanup | 2 tasks | ✅ **Completed** |
| Phase 2: UI Design (Panel-based) | 6 tasks | ✅ **Completed** |
| Phase 3: Components | 4 tasks | ⏳ Pending |
| Phase 4: API Integration | 3 tasks | ⏳ Pending |
| Phase 5: Visual Components | 3 tasks | ⏳ Pending |
| Phase 6: UX Enhancements | 4 tasks | ⏳ Pending |
| Phase 7: Testing & Polish | 3 tasks | ⏳ Pending |
| **Total** | **26 tasks** | **⏳ All Pending** |

---

## 🎨 Design Principles (بر اساس Market Page)

1. **Consistency**: استفاده از exact same styling و layout pattern به Market Page
2. **Panel-based Layout**: Left panel برای controls، main area برای content، bottom برای charts
3. **Dark Theme**: استفاده از رنگ‌های Market Page (#1a1a1a, #2a2a2a, #FFAE00)
4. **Inline Styles**: استفاده از inline styles (مشابه Market Page)
5. **Component Structure**: ساختار مشابه Market components (TradingPanel, MainChart, etc.)
6. **Responsive**: Flexbox layout مشابه Market Page

---

## 🔗 API Endpoints Reference

### Training Jobs
- `GET /train/status` - لیست training jobs
- `POST /train/start` - شروع training جدید
- `POST /train/retrain` - Retrain یک model
- `POST /train/cancel/{job_id}` - Cancel یک job
- `GET /train/logs/{job_id}` - دریافت logs

### Periodic Retraining
- `GET /train/periodic-status` - Status periodic retraining

### Filters
- `GET /train/filter-status/{symbol}?interval=1h` - Filter status برای یک symbol

### Models
- `GET /train/models` - لیست available models

---

## 📝 Notes

### Styling Guidelines (بر اساس Market Page):
- **Colors**:
  - Background: `#1a1a1a`
  - Border: `rgba(255, 174, 0, 0.2)`
  - Primary: `#FFAE00`
  - Text: `#ededed`
  - Secondary text: `#888`
  - Error: `#ef4444`
  - Success: `#22c55e`
- **Layout**:
  - Padding: `24px` برای page container
  - Gap: `0.5rem` یا `12px` بین panels
  - Border radius: `12px`
  - Border: `1px solid rgba(255, 174, 0, 0.2)`
- **Components**:
  - استفاده از inline styles (مشابه Market Page)
  - استفاده از TypeScript
  - استفاده از React Hooks
  - استفاده از Recharts برای charts
  - استفاده از react-icons (Md*) برای icons

