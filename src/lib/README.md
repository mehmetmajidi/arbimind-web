# Shared Libraries

## Validation (`validation.ts`)

Validation utilities for form validation.

### Usage

```typescript
import { validateField, validateForm, commonRules } from "@/lib/validation";

// Validate single field
const error = validateField("username", { required: true, minLength: 3 });

// Validate entire form
const result = validateForm(
    { username: "john", email: "john@example.com" },
    {
        username: commonRules.username,
        email: commonRules.email,
    }
);
```

### Common Rules

- `commonRules.username` - Username validation (3-30 chars, alphanumeric + underscore)
- `commonRules.email` - Email validation
- `commonRules.password` - Password validation (8-128 chars)
- `commonRules.positiveNumber` - Positive number validation
- `commonRules.nonNegativeNumber` - Non-negative number validation
- `commonRules.symbol` - Trading symbol validation (e.g., BTC/USDT)

## Error Handling (`errorHandler.ts`)

Error handling utilities for API requests.

### Usage

```typescript
import { handleApiError, parseApiError, retryRequest } from "@/lib/errorHandler";

// Parse API error
const error = await parseApiError(response);

// Format error message
const message = handleApiError(error);

// Retry request
const result = await retryRequest(
    () => fetch("/api/endpoint"),
    { maxRetries: 3, retryDelay: 1000 }
);
```

## API Client (`apiClient.ts`)

Enhanced API client with error handling, retry, and logging.

### Usage

```typescript
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/apiClient";

// GET request
const data = await apiGet("/api/endpoint", {
    retry: { maxRetries: 3 },
    errorContext: { component: "MyComponent", action: "fetchData" },
});

// POST request
const result = await apiPost("/api/endpoint", { key: "value" }, {
    retry: { maxRetries: 3 },
});
```

## Form Validation Hook (`useFormValidation.ts`)

React hook for form validation with real-time feedback.

### Usage

```typescript
import { useFormValidation } from "@/hooks/useFormValidation";
import { commonRules } from "@/lib/validation";

const {
    values,
    errors,
    touched,
    isValid,
    handleChange,
    handleBlur,
    validate,
    getFieldProps,
} = useFormValidation({
    validationRules: {
        username: commonRules.username,
        email: commonRules.email,
    },
    validateOnChange: true,
    validateOnBlur: true,
});

// Use in form
<input {...getFieldProps("username")} />
{errors.username && <span>{errors.username}</span>}
```

## Retry Hook (`useRetry.ts`)

React hook for retry logic.

### Usage

```typescript
import { useRetry } from "@/hooks/useRetry";

const { execute, isRetrying, retryCount, error } = useRetry();

const handleSubmit = async () => {
    try {
        const result = await execute(
            () => apiPost("/api/endpoint", data),
            {
                maxRetries: 3,
                onRetryAttempt: (attempt) => {
                    console.log(`Retry attempt ${attempt}`);
                },
            }
        );
    } catch (err) {
        console.error("Failed after retries:", err);
    }
};
```

