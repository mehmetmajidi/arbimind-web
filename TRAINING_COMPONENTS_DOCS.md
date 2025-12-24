# Training Components Documentation

## Overview

This document provides comprehensive documentation for all training-related React components in the ArbiMind frontend.

## Component Structure

All training components are located in `src/components/training/` and follow a consistent design pattern based on the Market Page UI/UX.

---

## Core Components

### 1. TrainingControlsPanel

**Location**: `src/components/training/TrainingControlsPanel.tsx`

**Purpose**: Left panel component displaying periodic retraining status, filter statistics, training queue, and quick actions.

**Props**:
```typescript
interface TrainingControlsPanelProps {
    onStartTraining: () => void;
    onCheckFilter: () => void;
    onSettings: () => void;
}
```

**Features**:
- Periodic retraining status card with trigger button
- Filter statistics display
- Training queue summary
- Quick action buttons (Start Training, Check Filter, Settings)

**Usage**:
```tsx
<TrainingControlsPanel
    onStartTraining={() => setShowStartTrainingModal(true)}
    onCheckFilter={() => checkFilter()}
    onSettings={() => setShowSettingsModal(true)}
/>
```

---

### 2. FilterStatusPanel

**Location**: `src/components/training/FilterStatusPanel.tsx`

**Purpose**: Panel for checking volatility and data freshness filter status for a specific symbol.

**Features**:
- Symbol input with interval selector
- Real-time filter status checking
- Expandable volatility and data freshness details
- Visual status indicators

**Usage**:
```tsx
<FilterStatusPanel />
```

---

### 3. TrainingJobsTable

**Location**: `src/components/training/TrainingJobsTable.tsx`

**Purpose**: Main table displaying all training jobs with filtering, sorting, and actions.

**Props**:
```typescript
interface TrainingJobsTableProps {
    onStartTraining?: () => void;
}
```

**Features**:
- Real-time job status updates (WebSocket + polling fallback)
- Filtering by status, symbol, and model type
- Auto-refresh toggle
- Job actions (View Logs, Cancel)
- Progress indicators for running jobs

**Usage**:
```tsx
<TrainingJobsTable
    onStartTraining={() => setShowStartTrainingModal(true)}
/>
```

---

### 4. TrainingQueuePanel

**Location**: `src/components/training/TrainingQueuePanel.tsx`

**Purpose**: Right panel displaying training queue status and quick stats.

**Features**:
- Queue status (pending, running, available slots)
- Next jobs list
- Running jobs list
- Quick stats (total jobs, success rate, avg duration)
- Process queue button

**Usage**:
```tsx
<TrainingQueuePanel />
```

---

### 5. TrainingMetricsCharts

**Location**: `src/components/training/TrainingMetricsCharts.tsx`

**Purpose**: Bottom panel displaying training metrics and statistics in chart format.

**Features**:
- Periodic retraining sessions chart
- Success rate trend chart
- Filter reasons pie chart
- Export functionality

**Usage**:
```tsx
<TrainingMetricsCharts />
```

---

## Modal Components

### 6. StartTrainingModal

**Location**: `src/components/training/StartTrainingModal.tsx`

**Purpose**: Modal for starting a new training job.

**Props**:
```typescript
interface StartTrainingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}
```

**Features**:
- Symbol input (optional)
- Model type selection
- Horizon selection
- Auto-determined interval
- Filter status checking
- Skip filters option (admin only)

**Usage**:
```tsx
<StartTrainingModal
    isOpen={showModal}
    onClose={() => setShowModal(false)}
    onSuccess={() => refreshJobs()}
/>
```

---

### 7. TrainingSettingsModal

**Location**: `src/components/training/TrainingSettingsModal.tsx`

**Purpose**: Modal for configuring training settings including filter thresholds and retraining configuration.

**Props**:
```typescript
interface TrainingSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}
```

**Features**:
- Volatility filter configuration
- Data freshness filter configuration
- Filter behavior toggles
- Retraining configuration
- Priority tier configuration (Tier 1 & Tier 2 symbols)

**Usage**:
```tsx
<TrainingSettingsModal
    isOpen={showSettings}
    onClose={() => setShowSettings(false)}
/>
```

---

### 8. JobLogsModal

**Location**: `src/components/training/JobLogsModal.tsx`

**Purpose**: Modal for viewing real-time training job logs.

**Props**:
```typescript
interface JobLogsModalProps {
    isOpen: boolean;
    onClose: () => void;
    jobId: string;
    autoRefresh?: boolean;
}
```

**Features**:
- Real-time log streaming
- Auto-scroll to bottom
- Error highlighting
- Search functionality
- Download logs
- Expand/collapse

**Usage**:
```tsx
<JobLogsModal
    isOpen={showLogs}
    onClose={() => setShowLogs(false)}
    jobId={selectedJobId}
    autoRefresh={jobStatus === "running"}
/>
```

---

## UI Components

### 9. StatusBadge

**Location**: `src/components/training/StatusBadge.tsx`

**Purpose**: Reusable badge component for displaying job status.

**Props**:
```typescript
interface StatusBadgeProps {
    status: "running" | "completed" | "failed" | "pending" | "cancelled" | "rejected";
    size?: "small" | "medium" | "large";
}
```

**Usage**:
```tsx
<StatusBadge status="running" size="small" />
```

---

### 10. FilterStatusIndicator

**Location**: `src/components/training/FilterStatusIndicator.tsx`

**Purpose**: Visual indicator for filter pass/fail/warning status.

**Props**:
```typescript
interface FilterStatusIndicatorProps {
    status: "passed" | "failed" | "warning";
    text?: string;
    size?: "small" | "medium";
}
```

**Usage**:
```tsx
<FilterStatusIndicator
    status={canTrain ? "passed" : "failed"}
    text={canTrain ? "Ready" : "Not Ready"}
    size="small"
/>
```

---

### 11. TrainingProgress

**Location**: `src/components/training/TrainingProgress.tsx`

**Purpose**: Progress bar component for training jobs.

**Props**:
```typescript
interface TrainingProgressProps {
    progress: number; // 0-100
    duration?: number; // in seconds
    eta?: number; // in seconds
    status: "running" | "completed" | "failed" | "pending" | "cancelled";
    message?: string;
    size?: "small" | "medium";
}
```

**Usage**:
```tsx
<TrainingProgress
    progress={75}
    duration={3600}
    eta={1200}
    status="running"
    message="Training in progress..."
    size="medium"
/>
```

---

### 12. StatCard

**Location**: `src/components/training/StatCard.tsx`

**Purpose**: Card component for displaying statistics.

**Props**:
```typescript
interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: React.ReactNode;
    trend?: "up" | "down" | "neutral";
    trendValue?: string | number;
    onClick?: () => void;
}
```

**Usage**:
```tsx
<StatCard
    title="Total Jobs"
    value={42}
    subtitle="Last 7 days"
    trend="up"
    trendValue="+5"
    onClick={() => navigateToJobs()}
/>
```

---

### 13. StatusCard

**Location**: `src/components/training/StatusCard.tsx`

**Purpose**: Card component for displaying status information.

**Props**:
```typescript
interface StatusCardProps {
    title: string;
    status: "active" | "inactive" | "pending" | "error";
    lastRun?: string;
    nextRun?: string;
    details?: React.ReactNode;
    actions?: React.ReactNode;
}
```

**Usage**:
```tsx
<StatusCard
    title="Periodic Retraining"
    status="active"
    lastRun="2024-12-24T10:00:00Z"
    nextRun="2024-12-24T16:00:00Z"
    actions={<button>Trigger Now</button>}
/>
```

---

## Utility Components

### 14. LoadingSpinner

**Location**: `src/components/training/LoadingSpinner.tsx`

**Purpose**: Simple loading spinner component.

**Props**:
```typescript
interface LoadingSpinnerProps {
    size?: "small" | "medium" | "large";
    color?: string;
}
```

**Usage**:
```tsx
<LoadingSpinner size="medium" color="#FFAE00" />
```

---

### 15. SkeletonLoader

**Location**: `src/components/training/SkeletonLoader.tsx`

**Purpose**: Skeleton loading placeholder component.

**Props**:
```typescript
interface SkeletonLoaderProps {
    type?: "text" | "card" | "table" | "circle";
    lines?: number;
    width?: string;
    height?: string;
}
```

**Usage**:
```tsx
<SkeletonLoader type="table" lines={5} />
```

---

### 16. Toast & ToastContainer

**Location**: `src/components/training/Toast.tsx` & `ToastContainer.tsx`

**Purpose**: Toast notification system.

**Usage**:
```tsx
import { showToast } from "@/components/training/ToastContainer";

showToast("success", "Training started successfully!");
showToast("error", "Failed to start training");
showToast("warning", "Filter check failed");
showToast("info", "Processing...");
```

---

### 17. ConfirmationModal

**Location**: `src/components/training/ConfirmationModal.tsx`

**Purpose**: Confirmation dialog component.

**Props**:
```typescript
interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: "warning" | "info" | "success" | "error";
    loading?: boolean;
}
```

**Usage**:
```tsx
<ConfirmationModal
    isOpen={showConfirm}
    onClose={() => setShowConfirm(false)}
    onConfirm={handleConfirm}
    title="Cancel Training Job"
    message="Are you sure you want to cancel this job?"
    type="warning"
    confirmText="Cancel Job"
    cancelText="Keep Running"
/>
```

---

### 18. ErrorBoundary

**Location**: `src/components/training/ErrorBoundary.tsx`

**Purpose**: React Error Boundary for catching component errors.

**Props**:
```typescript
interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}
```

**Usage**:
```tsx
<ErrorBoundary>
    <TrainingPage />
</ErrorBoundary>
```

---

## Styling Guidelines

All components follow the Market Page design system:

- **Colors**:
  - Background: `#1a1a1a`
  - Border: `rgba(255, 174, 0, 0.2)`
  - Primary: `#FFAE00`
  - Text: `#ededed`
  - Secondary text: `#888`
  - Error: `#ef4444`
  - Success: `#22c55e`

- **Layout**:
  - Padding: `12px` - `24px`
  - Gap: `12px` between elements
  - Border radius: `12px` for cards, `6px` for buttons
  - Border: `1px solid rgba(255, 174, 0, 0.2)`

- **Transitions**: All interactive elements use `transition: "all 0.2s ease"`

- **Hover Effects**: Background color changes, scale transforms, border color changes

- **Focus States**: Outline with `2px solid rgba(255, 174, 0, 0.5)` and `2px` offset

---

## Accessibility Features

All components include:

1. **ARIA Labels**: All buttons and interactive elements have `aria-label` attributes
2. **Keyboard Navigation**: All clickable elements are keyboard accessible with `tabIndex`
3. **Focus Indicators**: Clear focus outlines for keyboard navigation
4. **Screen Reader Support**: Semantic HTML and proper labeling

---

## Type Definitions

All TypeScript types are defined in `src/types/training.ts`:

- `TrainingJob`
- `FilterStatus`
- `FilterConfig`
- `QueueStatus`
- `QueueJob`
- `PeriodicRetrainStatus`
- `PeriodicRetrainSession`

---

## API Integration

Components use the centralized API service in `src/lib/trainingApi.ts`:

- `getTrainingJobs()` - Fetch all training jobs
- `startTraining(params)` - Start a new training job
- `cancelTraining(jobId)` - Cancel a training job
- `getJobLogs(jobId)` - Get job logs
- `getFilterStatus(symbol, interval)` - Get filter status
- `getPeriodicStatus()` - Get periodic retraining status
- `updateFilterConfig(config)` - Update filter configuration

---

## Real-time Updates

Components use WebSocket for real-time updates via `src/lib/trainingWebSocket.ts`:

- Automatic connection management
- Fallback to polling if WebSocket unavailable
- Job status update subscriptions
- Error handling and reconnection logic

---

## Best Practices

1. **Always use TypeScript types** from `@/types/training`
2. **Use centralized API functions** from `@/lib/trainingApi`
3. **Handle loading and error states** in all components
4. **Provide user feedback** using toast notifications
5. **Follow the design system** colors and spacing
6. **Include accessibility features** (ARIA labels, keyboard navigation)
7. **Use consistent naming** for props and state variables

