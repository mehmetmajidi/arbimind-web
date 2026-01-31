# Validation & Error Handling Guide

این راهنما نحوه استفاده از سیستم Validation و Error Handling را توضیح می‌دهد.

## Validation

### استفاده از `useFormValidation` Hook

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
        password: commonRules.password,
    },
    initialValues: {
        username: "",
        email: "",
        password: "",
    },
    validateOnChange: true,  // Validate on input change
    validateOnBlur: true,     // Validate on blur
});
```

### استفاده در فرم

```tsx
<input
    type="text"
    value={values.username}
    onChange={(e) => handleChange("username", e.target.value)}
    onBlur={() => handleBlur("username")}
    style={{
        border: `1px solid ${touched.username && errors.username ? "#ef4444" : "#2a2a2a"}`,
    }}
/>
{touched.username && errors.username && (
    <div style={{ color: "#ef4444", fontSize: "12px" }}>
        {errors.username}
    </div>
)}
```

### استفاده از `FormField` Component

```tsx
import { FormField } from "@/components/shared";

<FormField
    label="Username"
    name="username"
    {...getFieldProps("username")}
    required={true}
    helpText="Enter your username"
    tooltip="Username must be 3-30 characters"
/>
```

## Error Handling

### استفاده از `apiClient`

```typescript
import { apiGet, apiPost } from "@/lib/apiClient";

// GET request with retry
const data = await apiGet("/api/endpoint", {
    retry: {
        maxRetries: 3,
        retryDelay: 1000,
    },
    errorContext: {
        component: "MyComponent",
        action: "fetchData",
    },
});

// POST request
const result = await apiPost("/api/endpoint", { key: "value" }, {
    retry: { maxRetries: 3 },
});
```

### استفاده از `ErrorMessage` Component

```tsx
import { ErrorMessage } from "@/components/shared";

<ErrorMessage
    message={error}
    onDismiss={() => setError(null)}
    onRetry={() => fetchData()}
    retryCount={retryCount}
    maxRetries={3}
    showDetails={true}  // Show full error details
/>
```

### استفاده از `useRetry` Hook

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

## Common Validation Rules

```typescript
import { commonRules } from "@/lib/validation";

// Username: 3-30 chars, alphanumeric + underscore
commonRules.username

// Email: valid email format
commonRules.email

// Password: 8-128 chars
commonRules.password

// Positive number
commonRules.positiveNumber

// Non-negative number
commonRules.nonNegativeNumber

// Trading symbol (e.g., BTC/USDT)
commonRules.symbol
```

## Custom Validation

```typescript
const validationRules = {
    customField: {
        required: true,
        minLength: 5,
        custom: (value, formData) => {
            if (value === formData.otherField) {
                return "Fields must be different";
            }
            return true;
        },
    },
};
```

## Error Messages

سیستم به صورت خودکار error messages را format می‌کند:

- **Network errors**: "Network error. Please check your connection and try again."
- **401**: "Authentication required. Please log in again."
- **403**: "You don't have permission to perform this action."
- **404**: "Resource not found."
- **429**: "Too many requests. Please try again later."
- **500+**: "Server error. Please try again later."
- **Validation errors**: نمایش field-specific errors

## مثال کامل

```tsx
"use client";

import { useFormValidation } from "@/hooks/useFormValidation";
import { commonRules } from "@/lib/validation";
import { apiPost } from "@/lib/apiClient";
import { ErrorMessage } from "@/components/shared";
import { FormField } from "@/components/shared";

export default function MyForm() {
    const {
        values,
        errors,
        touched,
        isValid,
        handleChange,
        handleBlur,
        validate,
        setIsSubmitting,
    } = useFormValidation({
        validationRules: {
            email: commonRules.email,
            password: commonRules.password,
        },
    });

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validate()) {
            return;
        }

        setLoading(true);
        setError(null);
        setIsSubmitting(true);

        try {
            await apiPost("/api/login", values, {
                retry: { maxRetries: 3 },
                errorContext: {
                    component: "MyForm",
                    action: "login",
                },
            });
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {error && (
                <ErrorMessage
                    message={error}
                    onDismiss={() => setError(null)}
                    showDetails={true}
                />
            )}

            <FormField
                label="Email"
                name="email"
                value={values.email}
                onChange={(e) => handleChange("email", e.target.value)}
                onBlur={() => handleBlur("email")}
                error={touched.email ? errors.email : undefined}
                required={true}
            />

            <FormField
                label="Password"
                name="password"
                type="password"
                value={values.password}
                onChange={(e) => handleChange("password", e.target.value)}
                onBlur={() => handleBlur("password")}
                error={touched.password ? errors.password : undefined}
                required={true}
            />

            <button type="submit" disabled={!isValid || loading}>
                {loading ? "Submitting..." : "Submit"}
            </button>
        </form>
    );
}
```

