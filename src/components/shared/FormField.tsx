"use client";

import { colors } from "./designSystem";
import HelpText from "./HelpText";
import Tooltip from "./Tooltip";

interface FormFieldProps {
    label: string;
    name: string;
    value: any;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    onBlur?: () => void;
    error?: string;
    touched?: boolean;
    required?: boolean;
    helpText?: string;
    tooltip?: string;
    type?: string;
    placeholder?: string;
    options?: Array<{ value: string; label: string }>;
    rows?: number;
    disabled?: boolean;
    min?: number;
    max?: number;
    step?: number;
}

export default function FormField({
    label,
    name,
    value,
    onChange,
    onBlur,
    error,
    touched,
    required = false,
    helpText,
    tooltip,
    type = "text",
    placeholder,
    options,
    rows,
    disabled = false,
    min,
    max,
    step,
}: FormFieldProps) {
    const hasError = touched && error;
    const borderColor = hasError ? colors.error : colors.border;
    const showError = hasError && error;

    const inputStyle: React.CSSProperties = {
        width: "100%",
        padding: "10px 12px",
        backgroundColor: colors.background,
        border: `1px solid ${borderColor}`,
        borderRadius: "8px",
        color: colors.text,
        fontSize: "14px",
        transition: "border-color 0.2s",
    };

    if (disabled) {
        inputStyle.opacity = 0.6;
        inputStyle.cursor = "not-allowed";
    }

    return (
        <div style={{ marginBottom: "16px" }}>
            <label
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginBottom: "8px",
                    color: colors.text,
                    fontSize: "14px",
                    fontWeight: "500",
                }}
            >
                {label}
                {required && <span style={{ color: colors.error }}>*</span>}
                {tooltip && <Tooltip content={tooltip} icon={true} />}
            </label>

            {type === "select" && options ? (
                <select
                    name={name}
                    value={value || ""}
                    onChange={onChange}
                    onBlur={onBlur}
                    disabled={disabled}
                    style={inputStyle}
                >
                    <option value="">Select...</option>
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            ) : type === "textarea" ? (
                <textarea
                    name={name}
                    value={value || ""}
                    onChange={onChange}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    disabled={disabled}
                    rows={rows || 4}
                    style={{
                        ...inputStyle,
                        resize: "vertical",
                        fontFamily: "inherit",
                    }}
                />
            ) : (
                <input
                    type={type}
                    name={name}
                    value={value || ""}
                    onChange={onChange}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    disabled={disabled}
                    min={min}
                    max={max}
                    step={step}
                    style={inputStyle}
                />
            )}

            {showError && (
                <div
                    style={{
                        marginTop: "6px",
                        color: colors.error,
                        fontSize: "12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                    }}
                >
                    <span>⚠️</span>
                    <span>{error}</span>
                </div>
            )}

            {!showError && helpText && (
                <HelpText text={helpText} compact={true} />
            )}
        </div>
    );
}

