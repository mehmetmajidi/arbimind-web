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
          ssr: false, // Disable SSR for this query
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
          <main style={{ padding: 24, color: "#ededed" }}>
               <h1 style={{ color: "#FFAE00", marginBottom: 24 }}>ArbiMind - Trading Platform</h1>

               {!isAuthenticated && (
                    <nav style={{ marginBottom: 24 }}>
                         <Link
                              href="/login"
                              style={{
                                   marginRight: 16,
                                   color: "#FFAE00",
                                   textDecoration: "none",
                                   padding: "8px 16px",
                                   border: "1px solid rgba(255, 174, 0, 0.3)",
                                   borderRadius: "4px",
                              }}
                         >
                              Login
                         </Link>
                         <Link
                              href="/register"
                              style={{
                                   marginRight: 16,
                                   color: "#FFAE00",
                                   textDecoration: "none",
                                   padding: "8px 16px",
                                   border: "1px solid rgba(255, 174, 0, 0.3)",
                                   borderRadius: "4px",
                              }}
                         >
                              Register
                         </Link>
                    </nav>
               )}

               {loading && <p style={{ color: "#888" }}>Loading health status...</p>}

               {error && (
                    <div
                         style={{
                              padding: 16,
                              backgroundColor: "rgba(255, 68, 68, 0.1)",
                              border: "1px solid rgba(255, 68, 68, 0.3)",
                              borderRadius: 8,
                              marginBottom: 16,
                         }}
                    >
                         <p style={{ color: "#ff4444", margin: 0 }}>
                              <strong>Error:</strong> {error.message}
                         </p>
                         <p style={{ color: "#888", fontSize: "14px", marginTop: 8, marginBottom: 0 }}>
                              Make sure the backend API is running at http://localhost:8000
                         </p>
                    </div>
               )}

               {data?.health && (
                    <div
                         style={{
                              padding: 16,
                              backgroundColor: "rgba(255, 174, 0, 0.05)",
                              border: "1px solid rgba(255, 174, 0, 0.2)",
                              borderRadius: 8,
                         }}
                    >
                         <h2 style={{ color: "#FFAE00", marginBottom: 12 }}>API Status</h2>
                         <pre style={{ color: "#ededed", backgroundColor: "#2a2a2a", padding: 12, borderRadius: 4, overflow: "auto" }}>
                              {JSON.stringify(data.health, null, 2)}
                         </pre>
                    </div>
               )}
          </main>
     );
}
