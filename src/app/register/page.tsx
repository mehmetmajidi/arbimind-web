"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleGoogleRegister = () => {
        const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const redirectUri = typeof window !== "undefined" ? `${window.location.origin}/oauth-success` : "http://localhost:3000/oauth-success";
        
        // Redirect to backend OAuth endpoint
        window.location.href = `${apiUrl}/auth/google/login?redirect_uri=${encodeURIComponent(redirectUri)}`;
    };

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

        try {
            const apiUrl =
                typeof window !== "undefined"
                    ? "http://localhost:8000"
                    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const response = await fetch(`${apiUrl}/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username: formData.username,
                    email: formData.email,
                    password: formData.password,
                }),
            });

            if (response.ok) {
                setSuccess(true);
                setTimeout(() => {
                    router.push("/login");
                }, 2000);
            } else {
                const errorData = await response.json().catch(() => ({}));
                setError(errorData.detail || "Registration failed. Please try again.");
            }
        } catch (error) {
            console.error("Registration error:", error);
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

            {/* Right Section - Register Form */}
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
                    {/* Welcome Text */}
                    <h1
                        style={{
                            color: "#FFAE00",
                            fontSize: "32px",
                            fontWeight: "bold",
                            fontFamily: "sans-serif",
                            margin: "0 0 8px 0",
                        }}
                    >
                        Create Account
                    </h1>
                    <p
                        style={{
                            color: "#888",
                            fontSize: "14px",
                            margin: "0 0 32px 0",
                        }}
                    >
                        Sign up for your ArbiMind account
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
                            Registration successful! Redirecting to login...
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

                    <form onSubmit={handleSubmit}>
                        {/* Username Field */}
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
                                Username
                            </label>
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
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
                                placeholder="Choose a username"
                                onFocus={(e) => {
                                    e.target.style.borderColor = "#FFAE00";
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = "#444";
                                }}
                            />
                        </div>

                        {/* Email Field */}
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
                                Email
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                                Password
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
                                    placeholder="Enter password (min 6 characters)"
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
                                    placeholder="Confirm your password"
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

                        {/* Register Button */}
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
                            {loading ? "Registering..." : "Register"}
                        </button>
                    </form>

                    {/* Divider */}
                    <div style={{ marginTop: "32px", marginBottom: "24px", textAlign: "center", position: "relative" }}>
                        <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: "1px", backgroundColor: "#444" }}></div>
                        <span style={{ position: "relative", backgroundColor: "#2a2a2a", padding: "0 16px", color: "#888", fontSize: "14px" }}>or</span>
                    </div>

                    {/* Google Register Button */}
                    <button
                        onClick={handleGoogleRegister}
                        disabled={loading}
                        style={{
                            width: "100%",
                            padding: "14px",
                            backgroundColor: "#1a1a1a",
                            color: "#ededed",
                            border: "1px solid #444",
                            borderRadius: "8px",
                            fontSize: "16px",
                            fontWeight: "500",
                            cursor: loading ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                            if (!loading) {
                                e.currentTarget.style.backgroundColor = "#2a2a2a";
                                e.currentTarget.style.borderColor = "#FFAE00";
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!loading) {
                                e.currentTarget.style.backgroundColor = "#1a1a1a";
                                e.currentTarget.style.borderColor = "#444";
                            }
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                            <g fill="none" fillRule="evenodd">
                                <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" fillRule="nonzero"/>
                                <path d="M9 18c2.43 0 4.467-.806 5.96-2.18l-2.908-2.258c-.806.54-1.837.86-3.052.86-2.347 0-4.337-1.584-5.047-3.71H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853" fillRule="nonzero"/>
                                <path d="M3.953 10.71c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.958H.957C3.438 2.017 6.482 0 9 0c2.43 0 4.467.806 5.96 2.18L9 4.5c-2.347 0-4.337 1.584-5.047 3.71z" fill="#FBBC05" fillRule="nonzero"/>
                                <path d="M9 3.75c1.325 0 2.515.456 3.45 1.35l2.585-2.585C13.467.806 11.43 0 9 0 5.482 0 2.438 2.017.957 4.958L3.953 7.71C4.663 5.584 6.653 3.75 9 3.75z" fill="#EA4335" fillRule="nonzero"/>
                            </g>
                        </svg>
                        Sign up with Google
                    </button>

                    {/* Login Link */}
                    <div style={{ marginTop: "32px", textAlign: "center" }}>
                        <p style={{ color: "#888", margin: 0, fontSize: "14px" }}>
                            Already have an account?{" "}
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
