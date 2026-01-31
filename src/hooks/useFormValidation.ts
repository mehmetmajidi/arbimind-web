"use client";

import { useState, useCallback, useMemo } from "react";
import { validateField, validateForm, FieldValidation, ValidationResult } from "@/lib/validation";

interface UseFormValidationOptions {
    validationRules: Record<string, FieldValidation>;
    initialValues?: Record<string, any>;
    validateOnChange?: boolean;
    validateOnBlur?: boolean;
}

export function useFormValidation({
    validationRules,
    initialValues = {},
    validateOnChange = true,
    validateOnBlur = true,
}: UseFormValidationOptions) {
    const [values, setValues] = useState<Record<string, any>>(initialValues);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Validate single field
    const validateFieldValue = useCallback(
        (field: string, value: any) => {
            const rules = validationRules[field];
            if (!rules) return null;

            const error = validateField(value, rules, values);
            setErrors((prev) => {
                if (error) {
                    return { ...prev, [field]: error };
                } else {
                    const newErrors = { ...prev };
                    delete newErrors[field];
                    return newErrors;
                }
            });
            return error;
        },
        [validationRules, values]
    );

    // Handle field change
    const handleChange = useCallback(
        (field: string, value: any) => {
            setValues((prev) => ({ ...prev, [field]: value }));
            
            if (validateOnChange && touched[field]) {
                validateFieldValue(field, value);
            }
        },
        [validateOnChange, touched, validateFieldValue]
    );

    // Handle field blur
    const handleBlur = useCallback(
        (field: string) => {
            setTouched((prev) => ({ ...prev, [field]: true }));
            
            if (validateOnBlur) {
                validateFieldValue(field, values[field]);
            }
        },
        [validateOnBlur, validateFieldValue, values]
    );

    // Validate entire form
    const validate = useCallback(() => {
        const result = validateForm(values, validationRules);
        setErrors(result.errors);
        setTouched(result.touched);
        return result.isValid;
    }, [values, validationRules]);

    // Reset form
    const reset = useCallback((newValues?: Record<string, any>) => {
        setValues(newValues || initialValues);
        setErrors({});
        setTouched({});
        setIsSubmitting(false);
    }, [initialValues]);

    // Set field value programmatically
    const setValue = useCallback((field: string, value: any) => {
        setValues((prev) => ({ ...prev, [field]: value }));
        if (touched[field]) {
            validateFieldValue(field, value);
        }
    }, [touched, validateFieldValue]);

    // Set field error programmatically
    const setError = useCallback((field: string, error: string | null) => {
        setErrors((prev) => {
            if (error) {
                return { ...prev, [field]: error };
            } else {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            }
        });
    }, []);

    // Check if form is valid
    const isValid = useMemo(() => {
        // Check if all required fields have values
        const requiredFields = Object.keys(validationRules).filter(
            (field) => validationRules[field].required
        );
        const allRequiredFilled = requiredFields.every(
            (field) => values[field] !== null && values[field] !== undefined && values[field] !== ""
        );
        return Object.keys(errors).length === 0 && allRequiredFilled;
    }, [errors, values, validationRules]);

    // Get field props for easy integration
    const getFieldProps = useCallback(
        (field: string) => ({
            value: values[field] || "",
            onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
                handleChange(field, e.target.value);
            },
            onBlur: () => handleBlur(field),
            error: errors[field],
            touched: touched[field],
        }),
        [values, errors, touched, handleChange, handleBlur]
    );

    return {
        values,
        errors,
        touched,
        isValid,
        isSubmitting,
        setIsSubmitting,
        handleChange,
        handleBlur,
        validate,
        reset,
        setValue,
        setError,
        getFieldProps,
    };
}

