"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function OAuthCallbackHandler() {
     const router = useRouter();
     const searchParams = useSearchParams();
     const [error, setError] = useState<string | null>(null);
     const [loading, setLoading] = useState(true);

     useEffect(() => {
          const handleOAuthCallback = async () => {
               try {
                    const code = searchParams.get("code");
                    const errorParam = searchParams.get("error");

                    if (errorParam) {
                         setError(`OAuth error: ${errorParam}`);
                         setLoading(false);
                         return;
                    }

                    if (!code) {
                         setError("No authorization code received");
                         setLoading(false);
                         return;
                    }

                    const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
                    const redirectUri = typeof window !== "undefined" ? `${window.location.origin}/oauth-success` : "http://localhost:3000/oauth-success";

                    // Exchange code for token
                    const response = await fetch(`${apiUrl}/auth/google/callback?code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(redirectUri)}`, {
                         method: "GET",
                         headers: {
                              "Content-Type": "application/json",
                         },
                    });

                    if (response.ok) {
                         const data = await response.json();
                         
                         if (data && data.access_token) {
                              // Store token in localStorage
                              localStorage.setItem("auth_token", data.access_token);
                              
                              // Dispatch custom event to notify ExchangeContext to refetch accounts
                              window.dispatchEvent(new Event("authTokenSet"));
                              
                              // Redirect to home
                              setTimeout(() => {
                                   router.push("/");
                                   router.refresh();
                              }, 100);
                         } else {
                              setError("Invalid response from server. Token not received.");
                              setLoading(false);
                         }
                    } else {
                         const errorText = await response.text();
                         try {
                              const errorData = JSON.parse(errorText);
                              setError(errorData.detail || errorData.message || "Failed to authenticate with Google");
                         } catch {
                              setError(`Authentication failed: ${errorText || "Unknown error"}`);
                         }
                         setLoading(false);
                    }
               } catch (error) {
                    console.error("OAuth callback error:", error);
                    setError("Network error. Please check your connection and try again.");
                    setLoading(false);
               }
          };

          handleOAuthCallback();
     }, [searchParams, router]);

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
                         textAlign: "center",
                    }}
               >
                    {loading ? (
                         <>
                              <div style={{ marginBottom: "16px" }}>⏳</div>
                              <h2>Completing authentication...</h2>
                              <p style={{ color: "#666", marginTop: "8px" }}>Please wait while we sign you in.</p>
                         </>
                    ) : error ? (
                         <>
                              <div style={{ marginBottom: "16px", fontSize: "48px" }}>❌</div>
                              <h2>Authentication Failed</h2>
                              <p style={{ color: "#c00", marginTop: "8px", marginBottom: "24px" }}>{error}</p>
                              <button
                                   onClick={() => router.push("/login")}
                                   style={{
                                        padding: "12px 24px",
                                        backgroundColor: "#0070f3",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "4px",
                                        fontSize: "16px",
                                        fontWeight: "500",
                                        cursor: "pointer",
                                   }}
                              >
                                   Back to Login
                              </button>
                         </>
                    ) : null}
               </div>
          </div>
     );
}

export default function OAuthSuccessPage() {
     return (
          <Suspense
               fallback={
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
                                   textAlign: "center",
                              }}
                         >
                              <div style={{ marginBottom: "16px" }}>⏳</div>
                              <h2>Loading...</h2>
                         </div>
                    </div>
               }
          >
               <OAuthCallbackHandler />
          </Suspense>
     );
}

