# Testing Guide

این فایل شامل راهنمای کامل برای تست‌های Training UI است.

---

## 📋 Setup

### نصب Dependencies

```bash
npm install
```

### Dependencies مورد نیاز

- **Jest**: Testing framework
- **React Testing Library**: برای تست React components
- **Playwright**: برای E2E tests
- **@testing-library/jest-dom**: Matchers برای DOM assertions

---

## 🧪 انواع تست‌ها

### 1. Unit Tests

تست‌های واحد برای کامپوننت‌های منفرد:

```bash
npm test
```

**فایل‌های تست:**
- `src/components/training/__tests__/StatusBadge.test.tsx`
- `src/components/training/__tests__/StatCard.test.tsx`
- `src/components/training/__tests__/TrainingControlsPanel.test.tsx`

**مثال:**
```typescript
import { render, screen } from '@testing-library/react'
import StatusBadge from '../StatusBadge'

test('renders with correct status', () => {
  render(<StatusBadge status="running" />)
  expect(screen.getByText('Running')).toBeInTheDocument()
})
```

### 2. Integration Tests

تست‌های یکپارچه برای تعاملات بین کامپوننت‌ها و API:

```bash
npm test -- --testPathPattern=integration
```

**فایل‌های تست:**
- `src/components/training/__tests__/TrainingJobsTable.integration.test.tsx`
- `src/lib/__tests__/trainingApi.test.ts`

**مثال:**
```typescript
test('fetches and displays training jobs', async () => {
  render(<TrainingJobsTable />)
  await waitFor(() => {
    expect(trainingApi.getTrainingJobs).toHaveBeenCalled()
  })
})
```

### 3. E2E Tests

تست‌های end-to-end با Playwright:

```bash
npm run test:e2e
```

**فایل‌های تست:**
- `e2e/training.spec.ts`

**مثال:**
```typescript
test('should open start training modal', async ({ page }) => {
  await page.goto('/training')
  await page.click('text=Start Training')
  await expect(page.getByText(/Start New Training/i)).toBeVisible()
})
```

---

## 🎯 Coverage Goals

- **Unit Tests**: > 80% coverage
- **Integration Tests**: تمام critical user flows
- **E2E Tests**: Main user journeys

### مشاهده Coverage

```bash
npm run test:coverage
```

---

## 📝 نوشتن تست‌های جدید

### Unit Test Example

```typescript
import { render, screen } from '@testing-library/react'
import MyComponent from '../MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('handles user interaction', () => {
    render(<MyComponent />)
    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(screen.getByText('Clicked')).toBeInTheDocument()
  })
})
```

### Integration Test Example

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import MyComponent from '../MyComponent'
import * as api from '@/lib/api'

jest.mock('@/lib/api')

describe('MyComponent Integration', () => {
  it('fetches data on mount', async () => {
    (api.getData as jest.Mock).mockResolvedValue({ data: 'test' })
    render(<MyComponent />)
    await waitFor(() => {
      expect(api.getData).toHaveBeenCalled()
    })
  })
})
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test'

test('user can complete a flow', async ({ page }) => {
  await page.goto('/my-page')
  await page.click('text=Start')
  await expect(page.getByText('Success')).toBeVisible()
})
```

---

## 🔧 Mocking

### Mock API Calls

```typescript
jest.mock('@/lib/trainingApi', () => ({
  getTrainingJobs: jest.fn(),
  startTraining: jest.fn(),
}))
```

### Mock WebSocket

```typescript
jest.mock('@/lib/trainingWebSocket', () => ({
  getTrainingWebSocketService: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
  })),
}))
```

### Mock LocalStorage

```typescript
// Already set up in jest.setup.js
localStorage.setItem('auth_token', 'test-token')
```

---

## 🐛 Debugging Tests

### Run tests in watch mode

```bash
npm run test:watch
```

### Run specific test file

```bash
npm test StatusBadge.test.tsx
```

### Run tests with verbose output

```bash
npm test -- --verbose
```

### Debug E2E tests

```bash
# Run in headed mode
npx playwright test --headed

# Run in debug mode
npx playwright test --debug
```

---

## 📊 Test Reports

### Jest Coverage Report

```bash
npm run test:coverage
```

گزارش در `coverage/` directory ایجاد می‌شود.

### Playwright HTML Report

```bash
npm run test:e2e
```

گزارش در `playwright-report/` directory ایجاد می‌شود.

---

## ✅ Best Practices

1. **Test Behavior, Not Implementation**
   - تست کنید که کامپوننت چه کاری انجام می‌دهد، نه چطور
   - از `getByRole` و `getByLabelText` استفاده کنید

2. **Keep Tests Simple**
   - هر تست باید یک چیز را تست کند
   - از describe blocks برای گروه‌بندی استفاده کنید

3. **Mock External Dependencies**
   - API calls را mock کنید
   - WebSocket connections را mock کنید
   - LocalStorage را mock کنید

4. **Use Async Utilities**
   - از `waitFor` برای async operations استفاده کنید
   - از `findBy*` queries برای elements که بعداً render می‌شوند

5. **Clean Up**
   - از `beforeEach` و `afterEach` برای cleanup استفاده کنید
   - Mock functions را reset کنید

---

## 🚀 CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
      - run: npm run test:e2e
```

---

**آخرین بروزرسانی**: 2025-01-20

