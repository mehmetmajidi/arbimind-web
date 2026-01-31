// Validation utilities for forms

export interface ValidationRule {
    validator: (value: any, formData?: Record<string, any>) => boolean | string;
    message: string;
}

export interface FieldValidation {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    custom?: (value: any, formData?: Record<string, any>) => boolean | string;
    email?: boolean;
    url?: boolean;
    numeric?: boolean;
    positive?: boolean;
}

export interface ValidationResult {
    isValid: boolean;
    errors: Record<string, string>;
    touched: Record<string, boolean>;
}

// Common validation functions
export const validators = {
    required: (value: any): boolean | string => {
        if (value === null || value === undefined || value === "") {
            return "This field is required";
        }
        if (typeof value === "string" && value.trim() === "") {
            return "This field is required";
        }
        return true;
    },

    minLength: (min: number) => (value: string): boolean | string => {
        if (!value) return true; // Let required handle empty values
        if (value.length < min) {
            return `Must be at least ${min} characters`;
        }
        return true;
    },

    maxLength: (max: number) => (value: string): boolean | string => {
        if (!value) return true;
        if (value.length > max) {
            return `Must be at most ${max} characters`;
        }
        return true;
    },

    min: (min: number) => (value: number | string): boolean | string => {
        if (value === null || value === undefined || value === "") return true;
        const num = typeof value === "string" ? parseFloat(value) : value;
        if (isNaN(num) || num < min) {
            return `Must be at least ${min}`;
        }
        return true;
    },

    max: (max: number) => (value: number | string): boolean | string => {
        if (value === null || value === undefined || value === "") return true;
        const num = typeof value === "string" ? parseFloat(value) : value;
        if (isNaN(num) || num > max) {
            return `Must be at most ${max}`;
        }
        return true;
    },

    pattern: (regex: RegExp, message?: string) => (value: string): boolean | string => {
        if (!value) return true;
        if (!regex.test(value)) {
            return message || "Invalid format";
        }
        return true;
    },

    email: (value: string): boolean | string => {
        if (!value) return true;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            return "Invalid email address";
        }
        return true;
    },

    url: (value: string): boolean | string => {
        if (!value) return true;
        try {
            new URL(value);
            return true;
        } catch {
            return "Invalid URL";
        }
    },

    numeric: (value: string | number): boolean | string => {
        if (value === null || value === undefined || value === "") return true;
        const num = typeof value === "string" ? parseFloat(value) : value;
        if (isNaN(num)) {
            return "Must be a number";
        }
        return true;
    },

    positive: (value: string | number): boolean | string => {
        if (value === null || value === undefined || value === "") return true;
        const num = typeof value === "string" ? parseFloat(value) : value;
        if (isNaN(num) || num <= 0) {
            return "Must be a positive number";
        }
        return true;
    },
};

// Validate a single field
export function validateField(
    value: any,
    rules: FieldValidation,
    formData?: Record<string, any>
): string | null {
    // Required check
    if (rules.required) {
        const requiredResult = validators.required(value);
        if (requiredResult !== true) {
            return requiredResult as string;
        }
    }

    // Skip other validations if value is empty (unless required)
    if (value === null || value === undefined || value === "") {
        return null;
    }

    // Min length
    if (rules.minLength && typeof value === "string") {
        const result = validators.minLength(rules.minLength)(value);
        if (result !== true) return result as string;
    }

    // Max length
    if (rules.maxLength && typeof value === "string") {
        const result = validators.maxLength(rules.maxLength)(value);
        if (result !== true) return result as string;
    }

    // Min value
    if (rules.min !== undefined) {
        const result = validators.min(rules.min)(value);
        if (result !== true) return result as string;
    }

    // Max value
    if (rules.max !== undefined) {
        const result = validators.max(rules.max)(value);
        if (result !== true) return result as string;
    }

    // Pattern
    if (rules.pattern) {
        const result = validators.pattern(rules.pattern)(value);
        if (result !== true) return result as string;
    }

    // Email
    if (rules.email && typeof value === "string") {
        const result = validators.email(value);
        if (result !== true) return result as string;
    }

    // URL
    if (rules.url && typeof value === "string") {
        const result = validators.url(value);
        if (result !== true) return result as string;
    }

    // Numeric
    if (rules.numeric) {
        const result = validators.numeric(value);
        if (result !== true) return result as string;
    }

    // Positive
    if (rules.positive) {
        const result = validators.positive(value);
        if (result !== true) return result as string;
    }

    // Custom validator
    if (rules.custom) {
        const result = rules.custom(value, formData);
        if (result !== true) {
            return typeof result === "string" ? result : "Invalid value";
        }
    }

    return null;
}

// Validate entire form
export function validateForm(
    formData: Record<string, any>,
    validationRules: Record<string, FieldValidation>
): ValidationResult {
    const errors: Record<string, string> = {};
    const touched: Record<string, boolean> = {};

    Object.keys(validationRules).forEach((field) => {
        const value = formData[field];
        const rules = validationRules[field];
        const error = validateField(value, rules, formData);
        
        if (error) {
            errors[field] = error;
        }
        touched[field] = true;
    });

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
        touched,
    };
}

// Common validation rules
export const commonRules = {
    username: {
        required: true,
        minLength: 3,
        maxLength: 30,
        pattern: /^[a-zA-Z0-9_]+$/,
    } as FieldValidation,

    email: {
        required: true,
        email: true,
    } as FieldValidation,

    password: {
        required: true,
        minLength: 8,
        maxLength: 128,
    } as FieldValidation,

    positiveNumber: {
        required: true,
        numeric: true,
        positive: true,
    } as FieldValidation,

    nonNegativeNumber: {
        required: true,
        numeric: true,
        min: 0,
    } as FieldValidation,

    symbol: {
        required: true,
        pattern: /^[A-Z0-9]+\/[A-Z0-9]+$/,
    } as FieldValidation,
};

