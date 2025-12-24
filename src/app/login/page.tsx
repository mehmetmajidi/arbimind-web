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

export default function LoginPage() {
     const router = useRouter();
     const [formData, setFormData] = useState({
          username: "",
          password: "",
     });
     const [loading, setLoading] = useState(false);
     const [error, setError] = useState<string | null>(null);
     const [showPassword, setShowPassword] = useState(false);

     const handleGoogleLogin = () => {
          const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          const redirectUri = typeof window !== "undefined" ? `${window.location.origin}/oauth-success` : "http://localhost:3000/oauth-success";
          
          // Redirect to backend OAuth endpoint
          window.location.href = `${apiUrl}/auth/google/login?redirect_uri=${encodeURIComponent(redirectUri)}`;
     };

     const handleSubmit = async (e: React.FormEvent) => {
          e.preventDefault();
          setLoading(true);
          setError(null);

          try {
               // Create form data for OAuth2PasswordRequestForm
               const formDataToSend = new URLSearchParams();
               formDataToSend.append("username", formData.username);
               formDataToSend.append("password", formData.password);

               // Use backend URL - in Docker use service name, locally use localhost
               // For client-side: use localhost since browser makes the request
               // NEXT_PUBLIC_API_URL is only for server-side rendering
               const apiUrl =
                    typeof window !== "undefined"
                         ? "http://localhost:8000" // Browser makes request to host
                         : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"; // SSR uses service name

               console.log("Attempting login to:", `${apiUrl}/auth/token`); // Debug

               const response = await fetch(`${apiUrl}/auth/token`, {
                    method: "POST",
                    headers: {
                         "Content-Type": "application/x-www-form-urlencoded",
                    },
                    body: formDataToSend,
               });

               console.log("Response status:", response.status); // Debug
               console.log("Response ok:", response.ok); // Debug
               console.log("Response headers:", Object.fromEntries(response.headers.entries())); // Debug

               // Check if response is ok or status is 200-299
               const isSuccess = response.ok || (response.status >= 200 && response.status < 300);

               console.log("isSuccess:", isSuccess); // Debug

               if (isSuccess) {
                    const data = await response.json();
                    console.log("Login response data:", data); // Debug
                    console.log("Login successful, token received:", data.access_token ? "Yes" : "No"); // Debug

                    if (data && data.access_token) {
                         // Store token in localStorage
                         localStorage.setItem("auth_token", data.access_token);
                         console.log("Token stored in localStorage"); // Debug

                         // Dispatch custom event to notify ExchangeContext to refetch accounts
                         window.dispatchEvent(new Event("authTokenSet"));

                         // Redirect to home or settings
                         setTimeout(() => {
                              router.push("/");
                              router.refresh();
                         }, 100);
                    } else {
                         console.error("Token not found in response:", data); // Debug
                         setError("Invalid response from server. Token not received.");
                    }
               } else {
                    const errorText = await response.text();
                    console.error("Login failed - Status:", response.status, "Response:", errorText); // Debug

                    try {
                         const errorData = JSON.parse(errorText);
                         setError(errorData.detail || errorData.message || "Login failed. Please check your credentials.");
                    } catch {
                         setError(`Login failed (${response.status}): ${errorText || "Unknown error"}`);
                    }
               }
          } catch (error) {
               console.error("Login error:", error);
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

               {/* Right Section - Login Form */}
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
                              Welcome to ArbiMind
                         </h1>
                         <p
                              style={{
                                   color: "#888",
                                   fontSize: "14px",
                                   margin: "0 0 32px 0",
                              }}
                         >
                              Login your account
                         </p>

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
                                        placeholder="Enter your username"
                                        onFocus={(e) => {
                                             e.target.style.borderColor = "#FFAE00";
                                        }}
                                        onBlur={(e) => {
                                             e.target.style.borderColor = "#444";
                                        }}
                                   />
                              </div>

                              {/* Password Field */}
                              <div style={{ marginBottom: "16px" }}>
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
                                             placeholder="Enter your password"
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

                              {/* Forgot Password Link */}
                              <div style={{ marginBottom: "24px", textAlign: "right" }}>
                                   <Link
                                        href="/forgot-password"
                                        style={{
                                             color: "#888",
                                             fontSize: "14px",
                                             textDecoration: "none",
                                        }}
                                        onMouseEnter={(e) => {
                                             e.currentTarget.style.color = "#FFAE00";
                                        }}
                                        onMouseLeave={(e) => {
                                             e.currentTarget.style.color = "#888";
                                        }}
                                   >
                                        Forgot Password
                                   </Link>
                              </div>

                              {/* Login Button */}
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
                                   {loading ? "Logging in..." : "Login"}
                              </button>
                         </form>

                         {/* Divider */}
                         <div style={{ marginTop: "32px", marginBottom: "24px", textAlign: "center", position: "relative" }}>
                              <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: "1px", backgroundColor: "#444" }}></div>
                              <span style={{ position: "relative", backgroundColor: "#2a2a2a", padding: "0 16px", color: "#888", fontSize: "14px" }}>or</span>
                         </div>

                         {/* Google Login Button */}
                         <button
                              onClick={handleGoogleLogin}
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
                              Sign in with Google
                         </button>

                         {/* Register Link */}
                         <div style={{ marginTop: "32px", textAlign: "center" }}>
                              <p style={{ color: "#888", margin: 0, fontSize: "14px" }}>
                                   Don't have an account?{" "}
                                   <Link
                                        href="/register"
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
                                        Register
                                   </Link>
                              </p>
                         </div>
                    </div>
               </div>
          </div>
     );
}
