# Testing Guide

This directory contains all tests for the DocAI Analysis Platform.

## Test Structure

```
tests/
├── setup.ts                    # Test setup and mocks
├── ai/
│   └── rag-pipeline.test.ts   # Unit tests for RAG pipeline
├── processors/
│   └── pdf-processor.test.ts  # Unit tests for PDF processor
├── integration/
│   └── upload-flow.test.ts    # Integration tests for upload flow
└── e2e/
    └── document-analysis.test.ts # E2E tests for full user flow
```

## Running Tests

### Unit Tests (Vitest)

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### E2E Tests (Playwright)

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in specific browser
npx playwright test --project=chromium
```

## Test Coverage

- **Unit Tests**: Test individual functions and components in isolation
- **Integration Tests**: Test interactions between multiple modules
- **E2E Tests**: Test complete user flows from start to finish

## Known Limitations

Some tests are skipped due to technical limitations:

- **PDF Processor Tests**: Some PDF processor tests are skipped because the `pdf-parse` module uses dynamic imports with `new Function()` which Vitest cannot intercept. These should be tested as integration tests with the actual module installed.

## Test Results

Current test status:

- ✅ RAG Pipeline Tests: All passing
- ✅ Integration Tests: All passing
- ⏭️ PDF Processor Tests: 3 skipped (require actual pdf-parse module)
- ⏭️ E2E Tests: Run separately with Playwright (requires `npx playwright install`)

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('MyFunction', () => {
  it('should do something', () => {
    expect(myFunction()).toBe(expected);
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('should complete user flow', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Welcome')).toBeVisible();
});
```

## Mocking

Tests use Vitest's mocking capabilities. See `tests/setup.ts` for global mocks.

## Environment Variables

Tests use mock environment variables defined in `tests/setup.ts`. No real API keys are needed for testing.
