"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

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

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [resetToken, setResetToken] = useState<string | null>(null);
    const [resetUrl, setResetUrl] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);
        setResetToken(null);
        setResetUrl(null);

        try {
            const apiUrl =
                typeof window !== "undefined"
                    ? "http://localhost:8000"
                    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

            const response = await fetch(`${apiUrl}/auth/forgot-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(true);
                // In development, show the token and URL
                if (data.reset_token) {
                    setResetToken(data.reset_token);
                    setResetUrl(data.reset_url);
                }
            } else {
                setError(data.detail || "Failed to send reset link. Please try again.");
            }
        } catch (error) {
            console.error("Forgot password error:", error);
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

            {/* Right Section - Forgot Password Form */}
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
                        Forgot Password
                    </h1>
                    <p
                        style={{
                            color: "#888",
                            fontSize: "14px",
                            margin: "0 0 32px 0",
                        }}
                    >
                        Enter your email address and we'll send you a link to reset your password.
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
                            {resetToken ? (
                                <div>
                                    <p style={{ margin: "0 0 8px 0" }}>
                                        Reset link has been sent! (Development mode)
                                    </p>
                                    <p style={{ margin: "0 0 8px 0", fontSize: "12px", wordBreak: "break-all" }}>
                                        <strong>Reset URL:</strong> {resetUrl}
                                    </p>
                                    <Link
                                        href={`/reset-password?token=${resetToken}`}
                                        style={{
                                            color: "#22c55e",
                                            textDecoration: "underline",
                                            fontSize: "12px",
                                        }}
                                    >
                                        Click here to reset your password
                                    </Link>
                                </div>
                            ) : (
                                <p style={{ margin: 0 }}>
                                    If an account with that email exists, a password reset link has been sent.
                                </p>
                            )}
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
                            {/* Email Field */}
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
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={loading}
                                    style={{
                                        width: "100%",
                                        padding: "12px 16px",
                                        borderRadius: "8px",
                                        border: "1px solid #444",
                                        backgroundColor: "#1a1a1a",
                                        color: "#ededed",
                                        fontSize: "16px",
                                        outline: "none",
                                        boxSizing: "border-box",
                                    }}
                                    placeholder="Enter your email"
                                    onFocus={(e) => {
                                        e.target.style.borderColor = "#FFAE00";
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = "#444";
                                    }}
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    width: "100%",
                                    padding: "14px",
                                    backgroundColor: loading ? "#666" : "#FFAE00",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "8px",
                                    fontSize: "16px",
                                    fontWeight: "600",
                                    cursor: loading ? "not-allowed" : "pointer",
                                    transition: "background-color 0.2s ease",
                                }}
                                onMouseEnter={(e) => {
                                    if (!loading) {
                                        e.currentTarget.style.backgroundColor = "#ffb733";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!loading) {
                                        e.currentTarget.style.backgroundColor = "#FFAE00";
                                    }
                                }}
                            >
                                {loading ? "Sending..." : "Send Reset Link"}
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

