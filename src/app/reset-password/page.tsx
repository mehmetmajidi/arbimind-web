"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { MdVisibility, MdVisibilityOff } from "react-icons/md";

// Add animated gradient styles
if (typeof document !== "undefined") {
    const style = document.createElement("style");
    style.textContent = `
        @keyframes gradientShift {
            0% {
                background-position: 0% 50%;
            }
            50% {
                background-position: 100% 50%;
            }
            100% {
                background-position: 0% 50%;
            }
        }
        .animated-gradient {
            background: linear-gradient(
                135deg,
                #ff6b9d 0%,
                #c44569 25%,
                #8b5cf6 50%,
                #06b6d4 75%,
                #ff6b9d 100%
            );
            background-size: 400% 400%;
            animation: gradientShift 15s ease infinite;
        }
    `;
    if (!document.head.querySelector('style[data-gradient-animation]')) {
        style.setAttribute('data-gradient-animation', 'true');
        document.head.appendChild(style);
    }
}

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [formData, setFormData] = useState({
        password: "",
        confirmPassword: "",
    });
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        const tokenParam = searchParams.get("token");
        if (tokenParam) {
            setToken(tokenParam);
        } else {
            setError("Reset token is missing. Please use the link from your email.");
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        // Validation
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }

        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters");
            setLoading(false);
            return;
        }

        if (!token) {
            setError("Reset token is missing");
            setLoading(false);
            return;
        }

        try {
            const apiUrl =
                typeof window !== "undefined"
                    ? "http://localhost:8000"
                    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

            const response = await fetch(`${apiUrl}/auth/reset-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    token: token,
                    new_password: formData.password,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(true);
                setTimeout(() => {
                    router.push("/login");
                }, 2000);
            } else {
                setError(data.detail || "Failed to reset password. Please try again.");
            }
        } catch (error) {
            console.error("Reset password error:", error);
            setError("Network error. Please check your connection and try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                backgroundColor: "#2a2a2a",
                padding: "24px",
                gap: "24px",
            }}
        >
            {/* Left Section - Gradient Background with Branding */}
            <div
                className="animated-gradient"
                style={{
                    width: "60%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    padding: "60px",
                    position: "relative",
                    borderRadius: "16px",
                }}
            >
                {/* ArbiMind Branding */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                    }}
                >
                    {/* Logo */}
                    <div
                        style={{
                            marginBottom: "8px",
                        }}
                    >
                        <Image
                            src="/brandlogo/Logo_dark_mode.svg"
                            alt="ArbiMind Logo"
                            width={180}
                            height={60}
                            priority
                            unoptimized
                            style={{
                                maxWidth: "100%",
                                height: "auto",
                                filter: "brightness(0) invert(1)", // Make logo white
                            }}
                        />
                    </div>
                    
                    {/* Promotional Message */}
                    <p
                        style={{
                            color: "#ffffff",
                            fontSize: "48px",
                            fontWeight: "900",
                            fontFamily: "sans-serif",
                            margin: "24px 0 0 0",
                            lineHeight: "1.2",
                        }}
                    >
                        Transform Your<br />
                        Crypto Journey<br />
                        Redefine the Future!
                    </p>
                </div>
            </div>

            {/* Right Section - Reset Password Form */}
            <div
                style={{
                    width: "40%",
                    backgroundColor: "#2a2a2a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "40px",
                }}
            >
                <div
                    style={{
                        width: "100%",
                        maxWidth: "360px",
                    }}
                >
                    {/* Title */}
                    <h1
                        style={{
                            color: "#FFAE00",
                            fontSize: "32px",
                            fontWeight: "bold",
                            fontFamily: "sans-serif",
                            margin: "0 0 8px 0",
                        }}
                    >
                        Reset Password
                    </h1>
                    <p
                        style={{
                            color: "#888",
                            fontSize: "14px",
                            margin: "0 0 32px 0",
                        }}
                    >
                        Enter your new password below.
                    </p>

                    {success && (
                        <div
                            style={{
                                padding: "12px",
                                backgroundColor: "rgba(34, 197, 94, 0.15)",
                                border: "1px solid rgba(34, 197, 94, 0.5)",
                                borderRadius: "8px",
                                marginBottom: "24px",
                                color: "#22c55e",
                                fontSize: "14px",
                            }}
                        >
                            Password reset successful! Redirecting to login...
                        </div>
                    )}

                    {error && (
                        <div
                            style={{
                                padding: "12px",
                                backgroundColor: "rgba(255, 68, 68, 0.15)",
                                border: "1px solid rgba(255, 68, 68, 0.5)",
                                borderRadius: "8px",
                                marginBottom: "24px",
                                color: "#ff4444",
                                fontSize: "14px",
                            }}
                        >
                            {error}
                        </div>
                    )}

                    {!success && (
                        <form onSubmit={handleSubmit}>
                            {/* Password Field */}
                            <div style={{ marginBottom: "20px" }}>
                                <label
                                    style={{
                                        display: "block",
                                        marginBottom: "8px",
                                        color: "#ededed",
                                        fontSize: "14px",
                                        fontWeight: "500",
                                    }}
                                >
                                    New Password
                                </label>
                                <div style={{ position: "relative" }}>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                        disabled={loading}
                                        minLength={6}
                                        style={{
                                            width: "100%",
                                            padding: "12px 48px 12px 16px",
                                            borderRadius: "8px",
                                            border: "1px solid #444",
                                            backgroundColor: "#1a1a1a",
                                            color: "#ededed",
                                            fontSize: "16px",
                                            outline: "none",
                                            boxSizing: "border-box",
                                        }}
                                        placeholder="Enter new password (min 6 characters)"
                                        onFocus={(e) => {
                                            e.target.style.borderColor = "#FFAE00";
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = "#444";
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: "absolute",
                                            right: "12px",
                                            top: "50%",
                                            transform: "translateY(-50%)",
                                            background: "none",
                                            border: "none",
                                            cursor: "pointer",
                                            color: "#888",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            padding: "4px",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.color = "#FFAE00";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.color = "#888";
                                        }}
                                    >
                                        {showPassword ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password Field */}
                            <div style={{ marginBottom: "24px" }}>
                                <label
                                    style={{
                                        display: "block",
                                        marginBottom: "8px",
                                        color: "#ededed",
                                        fontSize: "14px",
                                        fontWeight: "500",
                                    }}
                                >
                                    Confirm Password
                                </label>
                                <div style={{ position: "relative" }}>
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        required
                                        disabled={loading}
                                        style={{
                                            width: "100%",
                                            padding: "12px 48px 12px 16px",
                                            borderRadius: "8px",
                                            border: "1px solid #444",
                                            backgroundColor: "#1a1a1a",
                                            color: "#ededed",
                                            fontSize: "16px",
                                            outline: "none",
                                            boxSizing: "border-box",
                                        }}
                                        placeholder="Confirm your new password"
                                        onFocus={(e) => {
                                            e.target.style.borderColor = "#FFAE00";
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = "#444";
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        style={{
                                            position: "absolute",
                                            right: "12px",
                                            top: "50%",
                                            transform: "translateY(-50%)",
                                            background: "none",
                                            border: "none",
                                            cursor: "pointer",
                                            color: "#888",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            padding: "4px",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.color = "#FFAE00";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.color = "#888";
                                        }}
                                    >
                                        {showConfirmPassword ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
                                    </button>
                                </div>
                            </div>

                            {/* Reset Button */}
                            <button
                                type="submit"
                                disabled={loading || !token}
                                style={{
                                    width: "100%",
                                    padding: "14px",
                                    backgroundColor: loading || !token ? "#666" : "#FFAE00",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "8px",
                                    fontSize: "16px",
                                    fontWeight: "600",
                                    cursor: loading || !token ? "not-allowed" : "pointer",
                                    transition: "background-color 0.2s ease",
                                }}
                                onMouseEnter={(e) => {
                                    if (!loading && token) {
                                        e.currentTarget.style.backgroundColor = "#ffb733";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!loading && token) {
                                        e.currentTarget.style.backgroundColor = "#FFAE00";
                                    }
                                }}
                            >
                                {loading ? "Resetting..." : "Reset Password"}
                            </button>
                        </form>
                    )}

                    {/* Back to Login Link */}
                    <div style={{ marginTop: "32px", textAlign: "center" }}>
                        <p style={{ color: "#888", margin: 0, fontSize: "14px" }}>
                            Remember your password?{" "}
                            <Link
                                href="/login"
                                style={{
                                    color: "#FFAE00",
                                    textDecoration: "none",
                                    fontWeight: "500",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.textDecoration = "underline";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.textDecoration = "none";
                                }}
                            >
                                Login
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense
            fallback={
                <div
                    style={{
                        minHeight: "100vh",
                        display: "flex",
                        backgroundColor: "#2a2a2a",
                        padding: "24px",
                        gap: "24px",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <div
                        style={{
                            padding: "40px",
                            textAlign: "center",
                            color: "#888",
                            fontSize: "14px",
                        }}
                    >
                        Loading...
                    </div>
                </div>
            }
        >
            <ResetPasswordForm />
        </Suspense>
    );
}

