# Training Components Tests

This directory contains unit and integration tests for Training UI components.

## Test Structure

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test component interactions with APIs and other components
- **E2E Tests**: End-to-end tests in `/e2e` directory

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## Test Files

- `StatusBadge.test.tsx` - Unit tests for StatusBadge component
- `StatCard.test.tsx` - Unit tests for StatCard component
- `TrainingControlsPanel.test.tsx` - Unit tests for TrainingControlsPanel
- `TrainingJobsTable.integration.test.tsx` - Integration tests for TrainingJobsTable

## Mocking

- API calls are mocked using `jest.mock()`
- WebSocket connections are mocked
- LocalStorage is mocked in `jest.setup.js`

## Coverage Goals

- Unit tests: > 80% coverage
- Integration tests: Critical user flows
- E2E tests: Main user journeys

