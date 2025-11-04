"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
               // Use backend URL - in Docker use service name, locally use localhost
               const apiUrl =
                    typeof window !== "undefined"
                         ? "http://localhost:8000" // Browser makes request to host
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
                    // Redirect to login after 2 seconds
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
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#f5f5f5",
               }}
          >
               <div
                    style={{
                         width: "100%",
                         maxWidth: "400px",
                         padding: "32px",
                         backgroundColor: "white",
                         borderRadius: "8px",
                         boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                    }}
               >
                    <h1 style={{ marginBottom: "8px", textAlign: "center" }}>Register</h1>
                    <p style={{ textAlign: "center", color: "#666", marginBottom: "24px" }}>Create a new ArbiMind account</p>

                    {success && (
                         <div
                              style={{
                                   padding: "12px",
                                   backgroundColor: "#d4edda",
                                   border: "1px solid #c3e6cb",
                                   borderRadius: "4px",
                                   marginBottom: "16px",
                                   color: "#155724",
                              }}
                         >
                              Registration successful! Redirecting to login...
                         </div>
                    )}

                    {error && (
                         <div
                              style={{
                                   padding: "12px",
                                   backgroundColor: "#fee",
                                   border: "1px solid #fcc",
                                   borderRadius: "4px",
                                   marginBottom: "16px",
                                   color: "#c00",
                              }}
                         >
                              {error}
                         </div>
                    )}

                    <form onSubmit={handleSubmit}>
                         <div style={{ marginBottom: "16px" }}>
                              <label style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>Username</label>
                              <input
                                   type="text"
                                   value={formData.username}
                                   onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                   required
                                   disabled={loading}
                                   style={{
                                        width: "100%",
                                        padding: "10px",
                                        borderRadius: "4px",
                                        border: "1px solid #ddd",
                                        fontSize: "16px",
                                   }}
                                   placeholder="Choose a username"
                              />
                         </div>

                         <div style={{ marginBottom: "16px" }}>
                              <label style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>Email</label>
                              <input
                                   type="email"
                                   value={formData.email}
                                   onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                   required
                                   disabled={loading}
                                   style={{
                                        width: "100%",
                                        padding: "10px",
                                        borderRadius: "4px",
                                        border: "1px solid #ddd",
                                        fontSize: "16px",
                                   }}
                                   placeholder="Enter your email"
                              />
                         </div>

                         <div style={{ marginBottom: "16px" }}>
                              <label style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>Password</label>
                              <input
                                   type="password"
                                   value={formData.password}
                                   onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                   required
                                   disabled={loading}
                                   minLength={6}
                                   style={{
                                        width: "100%",
                                        padding: "10px",
                                        borderRadius: "4px",
                                        border: "1px solid #ddd",
                                        fontSize: "16px",
                                   }}
                                   placeholder="Enter password (min 6 characters)"
                              />
                         </div>

                         <div style={{ marginBottom: "24px" }}>
                              <label style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>Confirm Password</label>
                              <input
                                   type="password"
                                   value={formData.confirmPassword}
                                   onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                   required
                                   disabled={loading}
                                   style={{
                                        width: "100%",
                                        padding: "10px",
                                        borderRadius: "4px",
                                        border: "1px solid #ddd",
                                        fontSize: "16px",
                                   }}
                                   placeholder="Confirm your password"
                              />
                         </div>

                         <button
                              type="submit"
                              disabled={loading}
                              style={{
                                   width: "100%",
                                   padding: "12px",
                                   backgroundColor: loading ? "#ccc" : "#0070f3",
                                   color: "white",
                                   border: "none",
                                   borderRadius: "4px",
                                   fontSize: "16px",
                                   fontWeight: "500",
                                   cursor: loading ? "not-allowed" : "pointer",
                              }}
                         >
                              {loading ? "Registering..." : "Register"}
                         </button>
                    </form>

                    <div style={{ marginTop: "24px", textAlign: "center" }}>
                         <p style={{ color: "#666", margin: 0 }}>
                              Already have an account?{" "}
                              <Link href="/login" style={{ color: "#0070f3", textDecoration: "none" }}>
                                   Login
                              </Link>
                         </p>
                    </div>

                    <div style={{ marginTop: "16px", textAlign: "center" }}>
                         <Link href="/" style={{ color: "#666", textDecoration: "none", fontSize: "14px" }}>
                              ← Back to Home
                         </Link>
                    </div>
               </div>
          </div>
     );
}
