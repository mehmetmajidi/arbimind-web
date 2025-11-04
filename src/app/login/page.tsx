"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
     const router = useRouter();
     const [formData, setFormData] = useState({
          username: "",
          password: "",
     });
     const [loading, setLoading] = useState(false);
     const [error, setError] = useState<string | null>(null);

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
                    <h1 style={{ marginBottom: "8px", textAlign: "center" }}>Login</h1>
                    <p style={{ textAlign: "center", color: "#666", marginBottom: "24px" }}>Sign in to your ArbiMind account</p>

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
                                   placeholder="Enter your username"
                              />
                         </div>

                         <div style={{ marginBottom: "24px" }}>
                              <label style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>Password</label>
                              <input
                                   type="password"
                                   value={formData.password}
                                   onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                   required
                                   disabled={loading}
                                   style={{
                                        width: "100%",
                                        padding: "10px",
                                        borderRadius: "4px",
                                        border: "1px solid #ddd",
                                        fontSize: "16px",
                                   }}
                                   placeholder="Enter your password"
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
                              {loading ? "Logging in..." : "Login"}
                         </button>
                    </form>

                    <div style={{ marginTop: "24px", textAlign: "center" }}>
                         <p style={{ color: "#666", margin: 0 }}>
                              Don't have an account?{" "}
                              <Link href="/register" style={{ color: "#0070f3", textDecoration: "none" }}>
                                   Register
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
