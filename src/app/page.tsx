"use client";

import { gql, useQuery } from "@apollo/client";
import Link from "next/link";
import { useEffect, useState } from "react";

const HEALTH = gql`
     query Health {
          health {
               name
               version
               status
          }
     }
`;

export default function Home() {
     const { data, loading, error } = useQuery(HEALTH, {
          errorPolicy: "all", // Don't throw on error
          fetchPolicy: "cache-and-network",
     });

     const [isAuthenticated, setIsAuthenticated] = useState(false);

     useEffect(() => {
          const token = localStorage.getItem("auth_token");
          setIsAuthenticated(!!token);
     }, []);

     const handleLogout = () => {
          localStorage.removeItem("auth_token");
          setIsAuthenticated(false);
          window.location.href = "/";
     };

     return (
          <main style={{ padding: 24 }}>
               <h1>ArbiMind - Trading Platform</h1>

               <nav style={{ marginBottom: 24 }}>
                    {isAuthenticated ? (
                         <>
                              <Link href="/market" style={{ marginRight: 16, color: "#0070f3" }}>
                                   Market Data
                              </Link>
                              <Link href="/trading" style={{ marginRight: 16, color: "#0070f3" }}>
                                   Trading
                              </Link>
                              <Link href="/bots" style={{ marginRight: 16, color: "#0070f3" }}>
                                   Bots
                              </Link>
                              <Link href="/settings" style={{ marginRight: 16, color: "#0070f3" }}>
                                   Settings
                              </Link>
                              <button
                                   onClick={handleLogout}
                                   style={{
                                        marginRight: 16,
                                        padding: "8px 16px",
                                        backgroundColor: "#ff4444",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                   }}
                              >
                                   Logout
                              </button>
                         </>
                    ) : (
                         <>
                              <Link href="/login" style={{ marginRight: 16, color: "#0070f3" }}>
                                   Login
                              </Link>
                              <Link href="/register" style={{ marginRight: 16, color: "#0070f3" }}>
                                   Register
                              </Link>
                         </>
                    )}
               </nav>

               {loading && <p>Loading health status...</p>}

               {error && (
                    <div style={{ padding: 16, backgroundColor: "#fee", borderRadius: 4, marginBottom: 16 }}>
                         <p style={{ color: "red", margin: 0 }}>
                              <strong>Error:</strong> {error.message}
                         </p>
                         <p style={{ color: "#666", fontSize: "14px", marginTop: 8, marginBottom: 0 }}>Make sure the backend API is running at http://localhost:8000</p>
                    </div>
               )}

               {data?.health && (
                    <div style={{ padding: 16, backgroundColor: "#efe", borderRadius: 4 }}>
                         <h2>API Status</h2>
                         <pre>{JSON.stringify(data.health, null, 2)}</pre>
                    </div>
               )}
          </main>
     );
}
