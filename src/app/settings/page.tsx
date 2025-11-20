"use client";

import { useState, useEffect } from "react";

// Helper function to mask sensitive data (show first 4 and last 4 chars)
// Currently unused but kept for potential future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function maskSensitiveData(value: string): string {
     if (!value || value.length <= 8) {
          return "••••••••";
     }
     const start = value.substring(0, 4);
     const end = value.substring(value.length - 4);
     const middle = "•".repeat(Math.min(value.length - 8, 8));
     return `${start}${middle}${end}`;
}

export default function SettingsPage() {
     const [activeTab, setActiveTab] = useState<"profile" | "exchange-accounts" | "exchanges" | "users">("profile");
     const [showAddForm, setShowAddForm] = useState(false);
     const [showAddExchangeForm, setShowAddExchangeForm] = useState(false);
     const [isAdmin, setIsAdmin] = useState(false);
     const [userProfile, setUserProfile] = useState<{ username: string; email: string; role: string } | null>(null);
     const [allExchanges, setAllExchanges] = useState<any[]>([]);
     const [allUsers, setAllUsers] = useState<any[]>([]);
     const [formData, setFormData] = useState({
          exchangeName: "",
          apiKey: "",
          apiSecret: "",
          passphrase: "",
          isTestnet: false,
     });
     const [exchangeFormData, setExchangeFormData] = useState({
          exchangeName: "",
          displayName: "",
          ccxtId: "",
          hasTestnet: false,
          requiresPassphrase: false,
     });
     const [creatingExchange, setCreatingExchange] = useState(false);
     const [requiresPassphrase, setRequiresPassphrase] = useState(false);
     const [creating, setCreating] = useState(false);
     const [testingAccountId, setTestingAccountId] = useState<number | null>(null);
     const [testResults, setTestResults] = useState<Record<number, { status: "success" | "error"; message: string }>>({});
     const [errors, setErrors] = useState<Record<string, string>>({});
     const [exchangeErrors, setExchangeErrors] = useState<Record<string, string>>({});
     const [jsonFileError, setJsonFileError] = useState<string | null>(null);

     // Fetch supported exchanges via REST API
     interface ExchangeData {
          exchanges?: Array<{ id: string; name: string; requires_passphrase?: boolean; ccxt_id?: string | null }>;
     }
     interface AccountData {
          exchangeAccounts?: Array<{
               id: number;
               exchangeName?: string;
               exchange_name?: string;
               api_key_preview?: string;
               isActive?: boolean;
               isTestnet?: boolean;
               lastVerifiedAt?: string;
          }>;
     }
     const [exchangesData, setExchangesData] = useState<ExchangeData | null>(null);
     const [accountsData, setAccountsData] = useState<AccountData | null>(null);
     const [loading, setLoading] = useState(true);

     useEffect(() => {
          const fetchData = async () => {
               try {
                    const token = localStorage.getItem("auth_token") || "";

                    // Use backend URL - browser makes request, so use localhost
                    const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

                    // Check if user is admin
                    try {
                         const meRes = await fetch(`${apiUrl}/auth/me`, {
                              headers: token ? { Authorization: `Bearer ${token}` } : {},
                         });
                         if (meRes.ok) {
                              const meData = await meRes.json();
                              // Check if user is admin
                              const isUserAdmin = meData.username === "admin" || meData.role === "admin";
                              console.log("User data:", meData, "Is admin:", isUserAdmin);
                              setIsAdmin(isUserAdmin);
                              setUserProfile(meData);
                              
                              // Fetch all exchanges
                              try {
                                   const exchangesRes = await fetch(`${apiUrl}/exchange/exchanges`, {
                                        headers: token ? { Authorization: `Bearer ${token}` } : {},
                                   });
                                   if (exchangesRes.ok) {
                                        const exchanges = await exchangesRes.json();
                                        setAllExchanges(exchanges);
                                   }
                              } catch (error) {
                                   console.warn("Failed to fetch exchanges:", error);
                              }
                              
                              // Fetch all users (admin only)
                              if (isUserAdmin) {
                                   try {
                                        const usersRes = await fetch(`${apiUrl}/auth/users`, {
                                             headers: token ? { Authorization: `Bearer ${token}` } : {},
                                        });
                                        if (usersRes.ok) {
                                             const users = await usersRes.json();
                                             setAllUsers(users);
                                        }
                                   } catch (error) {
                                        console.warn("Failed to fetch users:", error);
                                   }
                              }
                         }
                    } catch (error) {
                         console.warn("Failed to check admin status:", error);
                    }

                    // Fetch supported exchanges
                    try {
                         const exchangesRes = await fetch(`${apiUrl}/exchange/supported`);
                         if (!exchangesRes.ok) {
                              throw new Error(`HTTP ${exchangesRes.status}`);
                         }
                         const exchanges = await exchangesRes.json();
                         console.log("Exchanges data received:", exchanges); // Debug log
                         setExchangesData(exchanges);
                    } catch (error) {
                         console.error("Failed to fetch supported exchanges:", error);
                         // Set empty array on error but show warning
                         setExchangesData({ exchanges: [] });
                         console.warn("⚠️ Could not load exchanges. Backend may not be ready. Error:", error);
                    }

                    // Fetch user's exchange accounts
                    try {
                         const accountsRes = await fetch(`${apiUrl}/exchange/accounts`, {
                              headers: token ? { Authorization: `Bearer ${token}` } : {},
                         });
                         if (!accountsRes.ok) {
                              if (accountsRes.status === 401) {
                                   console.warn("Not authenticated. Please login.");
                              } else {
                                   throw new Error(`HTTP ${accountsRes.status}`);
                              }
                              setAccountsData({ exchangeAccounts: [] });
                         } else {
                              const accounts = await accountsRes.json();
                              setAccountsData({ exchangeAccounts: Array.isArray(accounts) ? accounts : [] });
                         }
                    } catch (error) {
                         console.warn("Failed to fetch exchange accounts:", error);
                         setAccountsData({ exchangeAccounts: [] });
                    }
               } catch (error) {
                    console.error("Error fetching data:", error);
               } finally {
                    setLoading(false);
               }
          };

          fetchData();
     }, []);

     const refetch = async () => {
          try {
               const token = localStorage.getItem("auth_token") || "";
               const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
               const accountsRes = await fetch(`${apiUrl}/exchange/accounts`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
               });
               const accounts = await accountsRes.json();
               setAccountsData({ exchangeAccounts: accounts });
          } catch (error) {
               console.error("Error refetching:", error);
          }
     };

     const handleSubmit = async (e: React.FormEvent) => {
          e.preventDefault();
          setCreating(true);
          setErrors({});

          try {
               // Get auth token if available
               const token = localStorage.getItem("auth_token") || "";
               const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

               const response = await fetch(`${apiUrl}/exchange/accounts`, {
                    method: "POST",
                    headers: {
                         "Content-Type": "application/json",
                         ...(token && { Authorization: `Bearer ${token}` }),
                    },
                    body: JSON.stringify({
                         exchange_name: formData.exchangeName,
                         api_key: formData.apiKey,
                         api_secret: formData.apiSecret,
                         passphrase: formData.passphrase || undefined,
                         is_testnet: formData.isTestnet,
                    }),
               });

               if (response.ok) {
                    setShowAddForm(false);
                    setFormData({
                         exchangeName: "",
                         apiKey: "",
                         apiSecret: "",
                         passphrase: "",
                         isTestnet: false,
                    });
                    await refetch();
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMessage = errorData.detail || errorData.message || "Failed to add exchange account";
                    setErrors({ submit: errorMessage });
               }
          } catch (error) {
               console.error("Error:", error);
               setErrors({ submit: "Network error. Please check your connection and try again." });
          } finally {
               setCreating(false);
          }
     };

     const handleTestConnection = async (accountId: number) => {
          setTestingAccountId(accountId);
          setTestResults((prev) => ({ ...prev, [accountId]: { status: "error", message: "" } }));

          try {
               const token = localStorage.getItem("auth_token") || "";
               const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
               const response = await fetch(`${apiUrl}/exchange/accounts/${accountId}/verify`, {
                    method: "POST",
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
               });

               if (response.ok) {
                    const result = await response.json().catch(() => ({}));
                    setTestResults((prev) => ({
                         ...prev,
                         [accountId]: {
                              status: "success",
                              message: result.message || "Connection successful!",
                         },
                    }));
                    await refetch(); // Refresh to update last_verified_at
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    setTestResults((prev) => ({
                         ...prev,
                         [accountId]: {
                              status: "error",
                              message: errorData.detail || errorData.message || "Connection failed",
                         },
                    }));
               }
          } catch (error) {
               console.error("Error testing connection:", error);
               setTestResults((prev) => ({
                    ...prev,
                    [accountId]: {
                         status: "error",
                         message: "Network error. Please check your connection.",
                    },
               }));
          } finally {
               setTestingAccountId(null);
          }
     };

     const handleAddExchange = async (e: React.FormEvent) => {
          e.preventDefault();
          setCreatingExchange(true);
          setExchangeErrors({});

          try {
               const token = localStorage.getItem("auth_token") || "";
               const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

               const params = new URLSearchParams();
               params.append("exchange_name", exchangeFormData.exchangeName);
               params.append("display_name", exchangeFormData.displayName);
               if (exchangeFormData.ccxtId) params.append("ccxt_id", exchangeFormData.ccxtId);
               params.append("has_testnet", exchangeFormData.hasTestnet.toString());
               params.append("requires_passphrase", exchangeFormData.requiresPassphrase.toString());

               const response = await fetch(`${apiUrl}/exchange/exchanges?${params.toString()}`, {
                    method: "POST",
                    headers: {
                         ...(token && { Authorization: `Bearer ${token}` }),
                    },
               });

               if (response.ok) {
                    const result = await response.json();
                    setShowAddExchangeForm(false);
                    setExchangeFormData({
                         exchangeName: "",
                         displayName: "",
                         ccxtId: "",
                         hasTestnet: false,
                         requiresPassphrase: false,
                    });
                    alert(`Exchange created successfully! ${result.symbols_sync?.synced ? `Synced ${result.symbols_sync.symbols_count} symbols.` : result.symbols_sync?.message || ""}`);
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMessage = errorData.detail || errorData.message || "Failed to create exchange";
                    setExchangeErrors({ submit: errorMessage });
               }
          } catch (error) {
               console.error("Error:", error);
               setExchangeErrors({ submit: "Network error. Please check your connection and try again." });
          } finally {
               setCreatingExchange(false);
          }
     };

     return (
          <div style={{ display: "flex", gap: "24px", padding: "24px", maxWidth: "1400px", margin: "0 auto", color: "#ededed" }}>
               {/* Sidebar */}
               <div
                    style={{
                         width: "250px",
                         backgroundColor: "#1a1a1a",
                         borderRadius: "12px",
                         padding: "20px",
                         height: "fit-content",
                         border: "1px solid rgba(255, 174, 0, 0.2)",
                    }}
               >
                    <h2 style={{ color: "#FFAE00", marginTop: 0, marginBottom: "20px", fontSize: "18px", fontWeight: "600" }}>
                         Settings
                    </h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                         <button
                              onClick={() => setActiveTab("profile")}
                              style={{
                                   padding: "12px 16px",
                                   backgroundColor: activeTab === "profile" ? "#FFAE00" : "transparent",
                                   color: activeTab === "profile" ? "#1a1a1a" : "#ededed",
                                   border: "none",
                                   borderRadius: "8px",
                                   cursor: "pointer",
                                   textAlign: "left",
                                   fontWeight: activeTab === "profile" ? "600" : "400",
                                   fontSize: "14px",
                                   transition: "all 0.2s ease",
                              }}
                         >
                              👤 Profile
                         </button>
                         <button
                              onClick={() => setActiveTab("exchange-accounts")}
                              style={{
                                   padding: "12px 16px",
                                   backgroundColor: activeTab === "exchange-accounts" ? "#FFAE00" : "transparent",
                                   color: activeTab === "exchange-accounts" ? "#1a1a1a" : "#ededed",
                                   border: "none",
                                   borderRadius: "8px",
                                   cursor: "pointer",
                                   textAlign: "left",
                                   fontWeight: activeTab === "exchange-accounts" ? "600" : "400",
                                   fontSize: "14px",
                                   transition: "all 0.2s ease",
                              }}
                         >
                              💼 Exchange Accounts
                         </button>
                         <button
                              onClick={() => setActiveTab("exchanges")}
                              style={{
                                   padding: "12px 16px",
                                   backgroundColor: activeTab === "exchanges" ? "#FFAE00" : "transparent",
                                   color: activeTab === "exchanges" ? "#1a1a1a" : "#ededed",
                                   border: "none",
                                   borderRadius: "8px",
                                   cursor: "pointer",
                                   textAlign: "left",
                                   fontWeight: activeTab === "exchanges" ? "600" : "400",
                                   fontSize: "14px",
                                   transition: "all 0.2s ease",
                              }}
                         >
                              🏢 Exchanges
                         </button>
                         {isAdmin && (
                              <button
                                   onClick={() => setActiveTab("users")}
                                   style={{
                                        padding: "12px 16px",
                                        backgroundColor: activeTab === "users" ? "#FFAE00" : "transparent",
                                        color: activeTab === "users" ? "#1a1a1a" : "#ededed",
                                        border: "none",
                                        borderRadius: "8px",
                                        cursor: "pointer",
                                        textAlign: "left",
                                        fontWeight: activeTab === "users" ? "600" : "400",
                                        fontSize: "14px",
                                        transition: "all 0.2s ease",
                                   }}
                              >
                                   👥 Users
                              </button>
                         )}
                    </div>
               </div>

               {/* Main Content */}
               <div style={{ flex: 1 }}>
                    {activeTab === "profile" && (
                         <div>
                              <h1 style={{ color: "#FFAE00", marginBottom: "24px" }}>Profile Settings</h1>
                              {userProfile && (
                                   <div
                                        style={{
                                             backgroundColor: "#1a1a1a",
                                             borderRadius: "12px",
                                             padding: "24px",
                                             border: "1px solid rgba(255, 174, 0, 0.2)",
                                        }}
                                   >
                                        <div style={{ marginBottom: "20px" }}>
                                             <label style={{ display: "block", marginBottom: "8px", color: "#ededed", fontSize: "14px", fontWeight: "500" }}>
                                                  Username
                                             </label>
                                             <input
                                                  type="text"
                                                  value={userProfile.username}
                                                  readOnly
                                                  style={{
                                                       width: "100%",
                                                       padding: "12px",
                                                       backgroundColor: "#2a2a2a",
                                                       border: "1px solid #2a2a2a",
                                                       borderRadius: "8px",
                                                       color: "#888",
                                                       fontSize: "14px",
                                                  }}
                                             />
                                        </div>
                                        <div style={{ marginBottom: "20px" }}>
                                             <label style={{ display: "block", marginBottom: "8px", color: "#ededed", fontSize: "14px", fontWeight: "500" }}>
                                                  Email
                                             </label>
                                             <input
                                                  type="email"
                                                  value={userProfile.email || ""}
                                                  readOnly
                                                  style={{
                                                       width: "100%",
                                                       padding: "12px",
                                                       backgroundColor: "#2a2a2a",
                                                       border: "1px solid #2a2a2a",
                                                       borderRadius: "8px",
                                                       color: "#888",
                                                       fontSize: "14px",
                                                  }}
                                             />
                                        </div>
                                        <div style={{ marginBottom: "20px" }}>
                                             <label style={{ display: "block", marginBottom: "8px", color: "#ededed", fontSize: "14px", fontWeight: "500" }}>
                                                  Role
                                             </label>
                                             <input
                                                  type="text"
                                                  value={userProfile.role || "user"}
                                                  readOnly
                                                  style={{
                                                       width: "100%",
                                                       padding: "12px",
                                                       backgroundColor: "#2a2a2a",
                                                       border: "1px solid #2a2a2a",
                                                       borderRadius: "8px",
                                                       color: "#888",
                                                       fontSize: "14px",
                                                  }}
                                             />
                                        </div>
                                        <p style={{ color: "#888", fontSize: "14px", margin: 0 }}>
                                             Profile editing functionality coming soon.
                                        </p>
                                   </div>
                              )}
                         </div>
                    )}

                    {activeTab === "exchange-accounts" && (
                         <div>
                              <h1 style={{ color: "#FFAE00", marginBottom: "24px" }}>Exchange Accounts</h1>
                              <div style={{ marginBottom: "24px" }}>
                                   <button
                                        onClick={() => setShowAddForm(true)}
                                        style={{
                                             padding: "12px 24px",
                                             backgroundColor: "#FFAE00",
                                             color: "#1a1a1a",
                                             border: "none",
                                             borderRadius: "8px",
                                             cursor: "pointer",
                                             fontWeight: "600",
                                             fontSize: "14px",
                                             transition: "all 0.2s ease",
                                        }}
                                        onMouseEnter={(e) => {
                                             e.currentTarget.style.backgroundColor = "#ffb84d";
                                        }}
                                        onMouseLeave={(e) => {
                                             e.currentTarget.style.backgroundColor = "#FFAE00";
                                        }}
                                   >
                                        + Add Exchange Account
                                   </button>
                              </div>
                              {loading ? (
                                   <div style={{ padding: "24px", textAlign: "center", color: "#888" }}>
                                        <p>Loading...</p>
                                   </div>
                              ) : (accountsData?.exchangeAccounts?.length ?? 0) > 0 ? (
                                   <div style={{ backgroundColor: "#2a2a2a", borderRadius: "12px", border: "1px solid rgba(255, 174, 0, 0.2)", overflow: "hidden" }}>
                                        <table
                                             style={{
                                                  width: "100%",
                                                  borderCollapse: "collapse",
                                             }}
                                        >
                                             <thead>
                                                  <tr style={{ borderBottom: "2px solid rgba(255, 174, 0, 0.2)", backgroundColor: "#1a1a1a" }}>
                                                       <th style={{ padding: "16px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Exchange</th>
                                                       <th style={{ padding: "16px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>API Key</th>
                                                       <th style={{ padding: "16px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Status</th>
                                                       <th style={{ padding: "16px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Type</th>
                                                       <th style={{ padding: "16px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Last Verified</th>
                                                       <th style={{ padding: "16px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Actions</th>
                                                  </tr>
                                             </thead>
                                             <tbody>
                                                  {accountsData?.exchangeAccounts?.map(
                                                       (account: {
                                                            id: number;
                                                            exchangeName?: string;
                                                            exchange_name?: string;
                                                            api_key_preview?: string;
                                                            isActive?: boolean;
                                                            isTestnet?: boolean;
                                                            lastVerifiedAt?: string;
                                                       }) => {
                                                            const testResult = testResults[account.id];
                                                            const isTesting = testingAccountId === account.id;

                                                            return (
                                                                 <tr key={account.id} style={{ borderBottom: "1px solid rgba(255, 174, 0, 0.1)" }}>
                                                                      <td style={{ padding: "16px", color: "#ededed" }}>{(account.exchangeName || account.exchange_name || "Unknown").toUpperCase()}</td>
                                                                      <td style={{ padding: "16px", fontFamily: "monospace", fontSize: "12px", color: "#888" }}>{account.api_key_preview || "••••••••"}</td>
                                                                      <td style={{ padding: "16px" }}>
                                                                           {account.isActive ? (
                                                                                <span style={{ color: "#22c55e", fontWeight: "bold" }}>Active</span>
                                                                           ) : (
                                                                                <span style={{ color: "#888" }}>Inactive</span>
                                                                           )}
                                                                      </td>
                                                                      <td style={{ padding: "16px", color: "#ededed" }}>{account.isTestnet ? "Testnet" : "Live"}</td>
                                                                      <td style={{ padding: "16px", color: "#888", fontSize: "13px" }}>
                                                                           {account.lastVerifiedAt ? new Date(account.lastVerifiedAt).toLocaleString() : "Never"}
                                                                      </td>
                                                                      <td style={{ padding: "16px" }}>
                                                                           <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                                                                <button
                                                                                     style={{
                                                                                          padding: "8px 16px",
                                                                                          backgroundColor: isTesting ? "#666" : "#22c55e",
                                                                                          color: "white",
                                                                                          border: "none",
                                                                                          borderRadius: "8px",
                                                                                          cursor: isTesting ? "not-allowed" : "pointer",
                                                                                          fontSize: "13px",
                                                                                          fontWeight: "600",
                                                                                          minWidth: "120px",
                                                                                          transition: "all 0.2s ease",
                                                                                     }}
                                                                                     onClick={() => handleTestConnection(account.id)}
                                                                                     disabled={isTesting}
                                                                                     onMouseEnter={(e) => {
                                                                                          if (!isTesting) {
                                                                                               e.currentTarget.style.backgroundColor = "#16a34a";
                                                                                          }
                                                                                     }}
                                                                                     onMouseLeave={(e) => {
                                                                                          if (!isTesting) {
                                                                                               e.currentTarget.style.backgroundColor = "#22c55e";
                                                                                          }
                                                                                     }}
                                                                                >
                                                                                     {isTesting ? "Testing..." : "Test Connection"}
                                                                                </button>

                                                                                {testResult && (
                                                                                     <div
                                                                                          style={{
                                                                                               padding: "8px",
                                                                                               fontSize: "12px",
                                                                                               borderRadius: "8px",
                                                                                               backgroundColor: testResult.status === "success" ? "rgba(34, 197, 94, 0.15)" : "rgba(255, 68, 68, 0.15)",
                                                                                               color: testResult.status === "success" ? "#22c55e" : "#ff4444",
                                                                                               border: `2px solid ${testResult.status === "success" ? "rgba(34, 197, 94, 0.3)" : "rgba(255, 68, 68, 0.3)"}`,
                                                                                          }}
                                                                                     >
                                                                                          {testResult.message}
                                                                                     </div>
                                                                                )}

                                                                                <button
                                                                                     style={{
                                                                                          padding: "8px 16px",
                                                                                          backgroundColor: "#ef4444",
                                                                                          color: "white",
                                                                                          border: "none",
                                                                                          borderRadius: "8px",
                                                                                          cursor: "pointer",
                                                                                          fontSize: "13px",
                                                                                          fontWeight: "600",
                                                                                          transition: "all 0.2s ease",
                                                                                     }}
                                                                                     onClick={async () => {
                                                                                          if (confirm("Are you sure you want to delete this account?")) {
                                                                                               try {
                                                                                                    const token = localStorage.getItem("auth_token") || "";
                                                                                                    const apiUrl =
                                                                                                         typeof window !== "undefined"
                                                                                                              ? "http://localhost:8000"
                                                                                                              : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
                                                                                                    const response = await fetch(`${apiUrl}/exchange/accounts/${account.id}`, {
                                                                                                         method: "DELETE",
                                                                                                         headers: token ? { Authorization: `Bearer ${token}` } : {},
                                                                                                    });
                                                                                                    if (response.ok) {
                                                                                                         await refetch();
                                                                                                    } else {
                                                                                                         const errorData = await response.json().catch(() => ({}));
                                                                                                         const errorMessage = errorData.detail || "Failed to delete account";
                                                                                                         alert(errorMessage);
                                                                                                    }
                                                                                               } catch (error) {
                                                                                                    console.error("Error:", error);
                                                                                                    alert("Network error. Please try again.");
                                                                                               }
                                                                                          }
                                                                                     }}
                                                                                     onMouseEnter={(e) => {
                                                                                          e.currentTarget.style.backgroundColor = "#dc2626";
                                                                                     }}
                                                                                     onMouseLeave={(e) => {
                                                                                          e.currentTarget.style.backgroundColor = "#ef4444";
                                                                                     }}
                                                                                >
                                                                                     Delete
                                                                                </button>
                                                                           </div>
                                                                      </td>
                                                                 </tr>
                                                            );
                                                       }
                                                  )}
                                             </tbody>
                                        </table>
                                   </div>
                              ) : (
                                   <div style={{ padding: "24px", textAlign: "center", color: "#888", backgroundColor: "#2a2a2a", borderRadius: "12px", border: "1px solid rgba(255, 174, 0, 0.2)" }}>
                                        <p>No exchange accounts added yet. Add one to get started.</p>
                                   </div>
                              )}
                         </div>
                    )}

                    {activeTab === "exchanges" && (
                         <div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                                   <h1 style={{ color: "#FFAE00", margin: 0 }}>Exchanges</h1>
                                   {isAdmin && (
                                        <button
                                             onClick={() => setShowAddExchangeForm(true)}
                                             style={{
                                                  padding: "10px 20px",
                                                  backgroundColor: "#FFAE00",
                                                  color: "#1a1a1a",
                                                  border: "none",
                                                  borderRadius: "8px",
                                                  cursor: "pointer",
                                                  fontWeight: "600",
                                                  fontSize: "14px",
                                                  transition: "all 0.2s ease",
                                             }}
                                             onMouseEnter={(e) => {
                                                  e.currentTarget.style.backgroundColor = "#ffb84d";
                                             }}
                                             onMouseLeave={(e) => {
                                                  e.currentTarget.style.backgroundColor = "#FFAE00";
                                             }}
                                        >
                                             + Add New Exchange
                                        </button>
                                   )}
                              </div>
                              {allExchanges.length > 0 ? (
                                   <div
                                        style={{
                                             backgroundColor: "#1a1a1a",
                                             borderRadius: "12px",
                                             border: "1px solid rgba(255, 174, 0, 0.2)",
                                             overflow: "hidden",
                                        }}
                                   >
                                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                             <thead>
                                                  <tr style={{ backgroundColor: "#2a2a2a", borderBottom: "1px solid rgba(255, 174, 0, 0.2)" }}>
                                                       <th style={{ padding: "16px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Display Name</th>
                                                       <th style={{ padding: "16px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Name</th>
                                                       <th style={{ padding: "16px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>CCXT ID</th>
                                                       <th style={{ padding: "16px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Status</th>
                                                       <th style={{ padding: "16px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Features</th>
                                                  </tr>
                                             </thead>
                                             <tbody>
                                                  {allExchanges.map((ex) => (
                                                       <tr key={ex.id} style={{ borderBottom: "1px solid rgba(255, 174, 0, 0.1)" }}>
                                                            <td style={{ padding: "16px", color: "#ededed" }}>{ex.display_name}</td>
                                                            <td style={{ padding: "16px", color: "#888", fontFamily: "monospace", fontSize: "12px" }}>{ex.name}</td>
                                                            <td style={{ padding: "16px", color: "#888", fontFamily: "monospace", fontSize: "12px" }}>{ex.ccxt_id || "N/A"}</td>
                                                            <td style={{ padding: "16px" }}>
                                                                 {ex.is_active ? (
                                                                      <span style={{ color: "#22c55e", fontSize: "12px", fontWeight: "600" }}>● Active</span>
                                                                 ) : (
                                                                      <span style={{ color: "#888", fontSize: "12px" }}>● Inactive</span>
                                                                 )}
                                                            </td>
                                                            <td style={{ padding: "16px", color: "#888", fontSize: "12px" }}>
                                                                 {ex.has_testnet && "Testnet "}
                                                                 {ex.requires_passphrase && "Passphrase"}
                                                            </td>
                                                       </tr>
                                                  ))}
                                             </tbody>
                                        </table>
                                   </div>
                              ) : (
                                   <div style={{ padding: "24px", textAlign: "center", color: "#888", backgroundColor: "#1a1a1a", borderRadius: "12px", border: "1px solid rgba(255, 174, 0, 0.2)" }}>
                                        <p>No exchanges found.</p>
                                   </div>
                              )}
                         </div>
                    )}

                    {activeTab === "users" && isAdmin && (
                         <div>
                              <h1 style={{ color: "#FFAE00", marginBottom: "24px" }}>Users</h1>
                              {allUsers.length > 0 ? (
                                   <div
                                        style={{
                                             backgroundColor: "#1a1a1a",
                                             borderRadius: "12px",
                                             border: "1px solid rgba(255, 174, 0, 0.2)",
                                             overflow: "hidden",
                                        }}
                                   >
                                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                             <thead>
                                                  <tr style={{ backgroundColor: "#2a2a2a", borderBottom: "1px solid rgba(255, 174, 0, 0.2)" }}>
                                                       <th style={{ padding: "16px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Username</th>
                                                       <th style={{ padding: "16px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Email</th>
                                                       <th style={{ padding: "16px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Role</th>
                                                  </tr>
                                             </thead>
                                             <tbody>
                                                  {allUsers.map((user) => (
                                                       <tr key={user.id} style={{ borderBottom: "1px solid rgba(255, 174, 0, 0.1)" }}>
                                                            <td style={{ padding: "16px", color: "#ededed" }}>{user.username}</td>
                                                            <td style={{ padding: "16px", color: "#888" }}>{user.email || "N/A"}</td>
                                                            <td style={{ padding: "16px" }}>
                                                                 <span
                                                                      style={{
                                                                           padding: "4px 12px",
                                                                           borderRadius: "12px",
                                                                           fontSize: "12px",
                                                                           fontWeight: "600",
                                                                           backgroundColor: user.role === "admin" ? "rgba(255, 174, 0, 0.2)" : "rgba(136, 136, 136, 0.2)",
                                                                           color: user.role === "admin" ? "#FFAE00" : "#888",
                                                                      }}
                                                                 >
                                                                      {user.role || "user"}
                                                                 </span>
                                                            </td>
                                                       </tr>
                                                  ))}
                                             </tbody>
                                        </table>
                                   </div>
                              ) : (
                                   <div style={{ padding: "24px", textAlign: "center", color: "#888", backgroundColor: "#1a1a1a", borderRadius: "12px", border: "1px solid rgba(255, 174, 0, 0.2)" }}>
                                        <p>No users found.</p>
                                   </div>
                              )}
                         </div>
                    )}

               </div>
               {/* End Main Content */}

               {/* Modals */}

               {showAddForm && (
                    <>
                         {/* Modal Overlay */}
                         <div
                              style={{
                                   position: "fixed",
                                   top: 0,
                                   left: 0,
                                   right: 0,
                                   bottom: 0,
                                   backgroundColor: "rgba(0, 0, 0, 0.3)",
                                   zIndex: 1000,
                                   display: "flex",
                                   alignItems: "center",
                                   justifyContent: "center",
                              }}
                              onClick={() => {
                                   setShowAddForm(false);
                                   setFormData({
                                        exchangeName: "",
                                        apiKey: "",
                                        apiSecret: "",
                                        passphrase: "",
                                        isTestnet: false,
                                   });
                                   setErrors({});
                              }}
                         >
                              {/* Modal Content */}
                              <form
                                   onSubmit={handleSubmit}
                                   onClick={(e) => e.stopPropagation()}
                                   style={{
                                        backgroundColor: "#2a2a2a",
                                        padding: "32px",
                                        borderRadius: "12px",
                                        border: "1px solid rgba(255, 174, 0, 0.3)",
                                        maxWidth: "600px",
                                        width: "90%",
                                        maxHeight: "90vh",
                                        overflowY: "auto",
                                        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
                                   }}
                              >
                                   <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                                        <h2 style={{ color: "#FFAE00", margin: 0, fontSize: "24px", fontWeight: "bold" }}>Add Exchange Account</h2>
                                        <button
                                             type="button"
                                             onClick={() => {
                                                  setShowAddForm(false);
                                                  setFormData({
                                                       exchangeName: "",
                                                       apiKey: "",
                                                       apiSecret: "",
                                                       passphrase: "",
                                                       isTestnet: false,
                                                  });
                                                  setErrors({});
                                                  setJsonFileError(null);
                                             }}
                                             style={{
                                                  background: "none",
                                                  border: "none",
                                                  color: "#888",
                                                  fontSize: "24px",
                                                  cursor: "pointer",
                                                  padding: "0",
                                                  width: "32px",
                                                  height: "32px",
                                                  display: "flex",
                                                  alignItems: "center",
                                                  justifyContent: "center",
                                                  borderRadius: "4px",
                                             }}
                                             onMouseEnter={(e) => {
                                                  e.currentTarget.style.color = "#ff4444";
                                                  e.currentTarget.style.backgroundColor = "rgba(255, 68, 68, 0.1)";
                                             }}
                                             onMouseLeave={(e) => {
                                                  e.currentTarget.style.color = "#888";
                                                  e.currentTarget.style.backgroundColor = "transparent";
                                             }}
                                        >
                                             ×
                                        </button>
                                   </div>

                                   {/* JSON File Upload for Coinbase Advanced Trade */}
                                   {formData.exchangeName?.toLowerCase().includes("coinbase") && (
                                        <div style={{ marginBottom: "20px", padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px", border: "1px solid rgba(255, 174, 0, 0.2)" }}>
                                             <label style={{ display: "block", marginBottom: "8px", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Upload JSON File (Optional):</label>
                                             <input
                                                  type="file"
                                                  accept=".json"
                                                  onChange={(e) => {
                                                       const file = e.target.files?.[0];
                                                       if (!file) return;

                                                       setJsonFileError(null);
                                                       const reader = new FileReader();
                                                       reader.onload = (event) => {
                                                            try {
                                                                 const jsonContent = JSON.parse(event.target?.result as string);

                                                                 // Extract API key name and private key from JSON
                                                                 // Coinbase Advanced Trade JSON format can vary, try common field names
                                                                 const apiKeyName = jsonContent.apiKeyName || jsonContent.api_key_name || jsonContent.name || jsonContent.apiKey || jsonContent.api_key;

                                                                 const privateKey =
                                                                      jsonContent.privateKey || jsonContent.private_key || jsonContent.secret || jsonContent.apiSecret || jsonContent.api_secret;

                                                                 if (apiKeyName && privateKey) {
                                                                      setFormData({
                                                                           ...formData,
                                                                           apiKey: apiKeyName,
                                                                           apiSecret: privateKey,
                                                                      });
                                                                      setErrors({});
                                                                 } else {
                                                                      setJsonFileError("JSON file must contain 'apiKeyName' (or 'api_key_name') and 'privateKey' (or 'private_key') fields.");
                                                                 }
                                                            } catch (error) {
                                                                 setJsonFileError(`Failed to parse JSON file: ${error instanceof Error ? error.message : "Invalid JSON format"}`);
                                                            }
                                                       };
                                                       reader.onerror = () => {
                                                            setJsonFileError("Failed to read file");
                                                       };
                                                       reader.readAsText(file);
                                                  }}
                                                  style={{
                                                       width: "100%",
                                                       padding: "8px",
                                                       borderRadius: "8px",
                                                       border: "2px solid rgba(255, 174, 0, 0.3)",
                                                       backgroundColor: "#2a2a2a",
                                                       color: "#ededed",
                                                       fontSize: "14px",
                                                       cursor: "pointer",
                                                  }}
                                             />
                                             {jsonFileError && (
                                                  <div
                                                       style={{
                                                            marginTop: "8px",
                                                            padding: "12px",
                                                            backgroundColor: "rgba(255, 68, 68, 0.15)",
                                                            border: "2px solid rgba(255, 68, 68, 0.5)",
                                                            borderRadius: "8px",
                                                            color: "#ff4444",
                                                            fontSize: "13px",
                                                       }}
                                                  >
                                                       {jsonFileError}
                                                  </div>
                                             )}
                                             <div style={{ fontSize: "12px", color: "#888", marginTop: "8px" }}>
                                                  <strong style={{ color: "#FFAE00" }}>Coinbase Advanced Trade:</strong> Upload a JSON file with your API credentials. Expected format:{" "}
                                                  <code style={{ color: "#FFAE00", fontSize: "11px" }}>{`{"apiKeyName": "...", "privateKey": "..."}`}</code>
                                             </div>
                                        </div>
                                   )}

                                   <div style={{ marginBottom: "20px" }}>
                                        <label style={{ display: "block", marginBottom: "8px", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Exchange:</label>
                                        <select
                                             value={formData.exchangeName}
                                             onChange={(e) => {
                                                  const selectedExchange = exchangesData?.exchanges?.find(
                                                       (ex: { id: string; requires_passphrase?: boolean; ccxt_id?: string | null }) => ex.id === e.target.value
                                                  );
                                                  setErrors({});
                                                  setRequiresPassphrase(selectedExchange?.requires_passphrase || false);
                                                  setFormData({ ...formData, exchangeName: e.target.value, passphrase: "" });
                                             }}
                                             required
                                             style={{
                                                  width: "100%",
                                                  padding: "12px",
                                                  marginTop: "4px",
                                                  borderRadius: "8px",
                                                  border: "2px solid rgba(255, 174, 0, 0.3)",
                                                  backgroundColor: "#1a1a1a",
                                                  color: "#ededed",
                                                  fontSize: "14px",
                                                  cursor: "pointer",
                                                  outline: "none",
                                             }}
                                             onFocus={(e) => (e.target.style.borderColor = "#FFAE00")}
                                             onBlur={(e) => (e.target.style.borderColor = "rgba(255, 174, 0, 0.3)")}
                                        >
                                             <option value="" style={{ backgroundColor: "#1a1a1a", color: "#888" }}>
                                                  Select Exchange
                                             </option>
                                             {exchangesData?.exchanges && exchangesData.exchanges.length > 0 ? (
                                                  exchangesData.exchanges.map((ex: { id: string; name: string; requires_passphrase?: boolean; ccxt_id?: string | null }) => {
                                                       return (
                                                            <option key={ex.id} value={ex.id} style={{ backgroundColor: "#1a1a1a", color: "#ededed" }}>
                                                                 {ex.name}
                                                            </option>
                                                       );
                                                  })
                                             ) : (
                                                  <option value="" disabled style={{ backgroundColor: "#1a1a1a", color: "#888" }}>
                                                       Loading exchanges...
                                                  </option>
                                             )}
                                        </select>
                                        {errors.exchangeName && (
                                             <div
                                                  style={{
                                                       marginTop: "8px",
                                                       padding: "12px",
                                                       backgroundColor: "rgba(255, 68, 68, 0.15)",
                                                       border: "2px solid rgba(255, 68, 68, 0.5)",
                                                       borderRadius: "8px",
                                                       color: "#ff4444",
                                                       fontSize: "14px",
                                                  }}
                                             >
                                                  {errors.exchangeName}
                                             </div>
                                        )}
                                   </div>

                                   <div style={{ marginBottom: "20px" }}>
                                        <label style={{ display: "block", marginBottom: "8px", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>API Key:</label>
                                        <input
                                             type="text"
                                             value={formData.apiKey}
                                             onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                                             required
                                             placeholder={
                                                  formData.exchangeName?.toLowerCase().includes("coinbase") ? "organizations/.../apiKeys/... (Full API Key name from Coinbase)" : "Enter your API Key"
                                             }
                                             style={{
                                                  width: "100%",
                                                  padding: "12px",
                                                  marginTop: "4px",
                                                  borderRadius: "8px",
                                                  border: "2px solid rgba(255, 174, 0, 0.3)",
                                                  backgroundColor: "#1a1a1a",
                                                  color: "#ededed",
                                                  fontSize: "14px",
                                                  outline: "none",
                                             }}
                                             onFocus={(e) => (e.target.style.borderColor = "#FFAE00")}
                                             onBlur={(e) => (e.target.style.borderColor = "rgba(255, 174, 0, 0.3)")}
                                        />
                                        {formData.exchangeName?.toLowerCase().includes("coinbase") && (
                                             <div style={{ fontSize: "12px", color: "#888", marginTop: "8px" }}>
                                                  <strong style={{ color: "#FFAE00" }}>Coinbase Advanced Trade:</strong> Enter the full API Key name (e.g., organizations/.../apiKeys/...)
                                             </div>
                                        )}
                                   </div>

                                   <div style={{ marginBottom: "20px" }}>
                                        <label style={{ display: "block", marginBottom: "8px", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>API Secret:</label>
                                        <input
                                             type="password"
                                             value={formData.apiSecret}
                                             onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                                             required
                                             placeholder={
                                                  formData.exchangeName?.toLowerCase().includes("coinbase") ? "-----BEGIN EC PRIVATE KEY-----... (Paste your private key)" : "Enter your API Secret"
                                             }
                                             style={{
                                                  width: "100%",
                                                  padding: "12px",
                                                  marginTop: "4px",
                                                  borderRadius: "8px",
                                                  border: "2px solid rgba(255, 174, 0, 0.3)",
                                                  backgroundColor: "#1a1a1a",
                                                  color: "#ededed",
                                                  fontSize: "14px",
                                                  outline: "none",
                                             }}
                                             onFocus={(e) => (e.target.style.borderColor = "#FFAE00")}
                                             onBlur={(e) => (e.target.style.borderColor = "rgba(255, 174, 0, 0.3)")}
                                        />
                                        {formData.exchangeName?.toLowerCase().includes("coinbase") && (
                                             <div style={{ fontSize: "12px", color: "#888", marginTop: "8px" }}>
                                                  <strong style={{ color: "#FFAE00" }}>Coinbase Advanced Trade:</strong> Paste your EC Private Key (starts with -----BEGIN EC PRIVATE KEY-----)
                                             </div>
                                        )}
                                   </div>

                                   <div style={{ marginBottom: "20px" }}>
                                        <label style={{ display: "block", marginBottom: "8px", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>
                                             Passphrase {requiresPassphrase ? "(required)" : "(optional)"}:
                                        </label>
                                        <input
                                             type="password"
                                             value={formData.passphrase}
                                             onChange={(e) => setFormData({ ...formData, passphrase: e.target.value })}
                                             required={requiresPassphrase}
                                             placeholder={
                                                  requiresPassphrase
                                                       ? "Coinbase requires a passphrase. Enter the passphrase you created when generating your API key."
                                                       : "Some exchanges require a passphrase (e.g., Coinbase)"
                                             }
                                             style={{
                                                  width: "100%",
                                                  padding: "12px",
                                                  marginTop: "4px",
                                                  borderRadius: "8px",
                                                  border: requiresPassphrase && !formData.passphrase ? "2px solid #ff4444" : "2px solid rgba(255, 174, 0, 0.3)",
                                                  backgroundColor: "#1a1a1a",
                                                  color: "#ededed",
                                                  fontSize: "14px",
                                                  outline: "none",
                                             }}
                                             onFocus={(e) => (e.target.style.borderColor = "#FFAE00")}
                                             onBlur={(e) => {
                                                  if (requiresPassphrase && !formData.passphrase) {
                                                       e.target.style.borderColor = "#ff4444";
                                                  } else {
                                                       e.target.style.borderColor = "rgba(255, 174, 0, 0.3)";
                                                  }
                                             }}
                                        />
                                        {requiresPassphrase && (
                                             <div style={{ fontSize: "12px", color: "#888", marginTop: "8px" }}>
                                                  <strong style={{ color: "#FFAE00" }}>توضیح:</strong> Passphrase یک رمز عبور اضافی است که هنگام ساخت API Key در Coinbase تعریف می‌کنید. این رمز باید
                                                  حداقل 8 کاراکتر باشد.
                                             </div>
                                        )}
                                   </div>

                                   <div style={{ marginBottom: "20px" }}>
                                        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", color: "#ededed", fontSize: "14px" }}>
                                             <input
                                                  type="checkbox"
                                                  checked={formData.isTestnet}
                                                  onChange={(e) => setFormData({ ...formData, isTestnet: e.target.checked })}
                                                  style={{
                                                       width: "18px",
                                                       height: "18px",
                                                       cursor: "pointer",
                                                       accentColor: "#FFAE00",
                                                  }}
                                             />
                                             <span>Use Testnet</span>
                                        </label>
                                   </div>

                                   {errors.submit && (
                                        <div
                                             style={{
                                                  padding: "16px",
                                                  backgroundColor: "rgba(255, 68, 68, 0.15)",
                                                  border: "2px solid rgba(255, 68, 68, 0.5)",
                                                  borderRadius: "8px",
                                                  marginBottom: "20px",
                                                  color: "#ff4444",
                                                  fontSize: "14px",
                                             }}
                                        >
                                             {errors.submit}
                                        </div>
                                   )}

                                   <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "24px" }}>
                                        <button
                                             type="button"
                                             onClick={() => {
                                                  setShowAddForm(false);
                                                  setFormData({
                                                       exchangeName: "",
                                                       apiKey: "",
                                                       apiSecret: "",
                                                       passphrase: "",
                                                       isTestnet: false,
                                                  });
                                                  setErrors({});
                                             }}
                                             style={{
                                                  padding: "12px 24px",
                                                  backgroundColor: "#2a2a2a",
                                                  color: "#ededed",
                                                  border: "2px solid rgba(255, 174, 0, 0.3)",
                                                  borderRadius: "8px",
                                                  cursor: "pointer",
                                                  fontWeight: "600",
                                                  fontSize: "14px",
                                                  transition: "all 0.2s ease",
                                             }}
                                             onMouseEnter={(e) => {
                                                  e.currentTarget.style.backgroundColor = "#1a1a1a";
                                                  e.currentTarget.style.borderColor = "#FFAE00";
                                             }}
                                             onMouseLeave={(e) => {
                                                  e.currentTarget.style.backgroundColor = "#2a2a2a";
                                                  e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.3)";
                                             }}
                                        >
                                             Cancel
                                        </button>
                                        <button
                                             type="submit"
                                             disabled={creating}
                                             style={{
                                                  padding: "12px 24px",
                                                  backgroundColor: creating ? "#666" : "#FFAE00",
                                                  color: "#1a1a1a",
                                                  border: "none",
                                                  borderRadius: "8px",
                                                  cursor: creating ? "not-allowed" : "pointer",
                                                  fontWeight: "600",
                                                  fontSize: "14px",
                                                  transition: "all 0.2s ease",
                                             }}
                                             onMouseEnter={(e) => {
                                                  if (!creating) {
                                                       e.currentTarget.style.backgroundColor = "#ffb84d";
                                                  }
                                             }}
                                             onMouseLeave={(e) => {
                                                  if (!creating) {
                                                       e.currentTarget.style.backgroundColor = "#FFAE00";
                                                  }
                                             }}
                                        >
                                             {creating ? "Adding..." : "Add Account"}
                                        </button>
                                   </div>
                              </form>
                         </div>
                    </>
               )}

               {/* Add Exchange Modal */}
               {showAddExchangeForm && (
                    <>
                         <div
                              style={{
                                   position: "fixed",
                                   top: 0,
                                   left: 0,
                                   right: 0,
                                   bottom: 0,
                                   backgroundColor: "rgba(0, 0, 0, 0.3)",
                                   zIndex: 1000,
                                   display: "flex",
                                   alignItems: "center",
                                   justifyContent: "center",
                              }}
                              onClick={() => {
                                   setShowAddExchangeForm(false);
                                   setExchangeFormData({
                                        exchangeName: "",
                                        displayName: "",
                                        ccxtId: "",
                                        hasTestnet: false,
                                        requiresPassphrase: false,
                                   });
                                   setExchangeErrors({});
                              }}
                         >
                              <form
                                   onSubmit={handleAddExchange}
                                   onClick={(e) => e.stopPropagation()}
                                   style={{
                                        backgroundColor: "#2a2a2a",
                                        padding: "32px",
                                        borderRadius: "12px",
                                        border: "1px solid rgba(255, 174, 0, 0.3)",
                                        maxWidth: "600px",
                                        width: "90%",
                                        maxHeight: "90vh",
                                        overflowY: "auto",
                                        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
                                   }}
                              >
                                   <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                                        <h2 style={{ color: "#FFAE00", margin: 0, fontSize: "24px", fontWeight: "bold" }}>Add New Exchange</h2>
                                        <button
                                             type="button"
                                             onClick={() => {
                                                  setShowAddExchangeForm(false);
                                                  setExchangeFormData({
                                                       exchangeName: "",
                                                       displayName: "",
                                                       ccxtId: "",
                                                       hasTestnet: false,
                                                       requiresPassphrase: false,
                                                  });
                                                  setExchangeErrors({});
                                             }}
                                             style={{
                                                  background: "none",
                                                  border: "none",
                                                  color: "#888",
                                                  fontSize: "24px",
                                                  cursor: "pointer",
                                                  padding: "0",
                                                  width: "32px",
                                                  height: "32px",
                                                  display: "flex",
                                                  alignItems: "center",
                                                  justifyContent: "center",
                                             }}
                                        >
                                             ×
                                        </button>
                                   </div>

                                   {exchangeErrors.submit && (
                                        <div
                                             style={{
                                                  padding: "12px",
                                                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                                                  border: "1px solid rgba(239, 68, 68, 0.3)",
                                                  borderRadius: "8px",
                                                  marginBottom: "20px",
                                                  color: "#ef4444",
                                             }}
                                        >
                                             {exchangeErrors.submit}
                                        </div>
                                   )}

                                   <div style={{ marginBottom: "20px" }}>
                                        <label style={{ display: "block", marginBottom: "8px", color: "#ededed", fontSize: "14px", fontWeight: "500" }}>
                                             Exchange Name *
                                        </label>
                                        <input
                                             type="text"
                                             value={exchangeFormData.exchangeName}
                                             onChange={(e) => setExchangeFormData({ ...exchangeFormData, exchangeName: e.target.value })}
                                             required
                                             placeholder="e.g., bybit"
                                             style={{
                                                  width: "100%",
                                                  padding: "12px",
                                                  backgroundColor: "#1a1a1a",
                                                  border: "1px solid #2a2a2a",
                                                  borderRadius: "8px",
                                                  color: "#ededed",
                                                  fontSize: "14px",
                                             }}
                                        />
                                   </div>

                                   <div style={{ marginBottom: "20px" }}>
                                        <label style={{ display: "block", marginBottom: "8px", color: "#ededed", fontSize: "14px", fontWeight: "500" }}>
                                             Display Name *
                                        </label>
                                        <input
                                             type="text"
                                             value={exchangeFormData.displayName}
                                             onChange={(e) => setExchangeFormData({ ...exchangeFormData, displayName: e.target.value })}
                                             required
                                             placeholder="e.g., Bybit"
                                             style={{
                                                  width: "100%",
                                                  padding: "12px",
                                                  backgroundColor: "#1a1a1a",
                                                  border: "1px solid #2a2a2a",
                                                  borderRadius: "8px",
                                                  color: "#ededed",
                                                  fontSize: "14px",
                                             }}
                                        />
                                   </div>

                                   <div style={{ marginBottom: "20px" }}>
                                        <label style={{ display: "block", marginBottom: "8px", color: "#ededed", fontSize: "14px", fontWeight: "500" }}>
                                             CCXT ID (Optional)
                                        </label>
                                        <input
                                             type="text"
                                             value={exchangeFormData.ccxtId}
                                             onChange={(e) => setExchangeFormData({ ...exchangeFormData, ccxtId: e.target.value })}
                                             placeholder="e.g., bybit (leave empty for custom implementations)"
                                             style={{
                                                  width: "100%",
                                                  padding: "12px",
                                                  backgroundColor: "#1a1a1a",
                                                  border: "1px solid #2a2a2a",
                                                  borderRadius: "8px",
                                                  color: "#ededed",
                                                  fontSize: "14px",
                                             }}
                                        />
                                        <p style={{ color: "#888", fontSize: "12px", marginTop: "4px", margin: "4px 0 0 0" }}>
                                             CCXT library ID. Leave empty if using custom implementation.
                                        </p>
                                   </div>

                                   <div style={{ marginBottom: "20px" }}>
                                        <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#ededed", fontSize: "14px", cursor: "pointer" }}>
                                             <input
                                                  type="checkbox"
                                                  checked={exchangeFormData.hasTestnet}
                                                  onChange={(e) => setExchangeFormData({ ...exchangeFormData, hasTestnet: e.target.checked })}
                                                  style={{ cursor: "pointer" }}
                                             />
                                             <span>Has Testnet</span>
                                        </label>
                                   </div>

                                   <div style={{ marginBottom: "24px" }}>
                                        <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#ededed", fontSize: "14px", cursor: "pointer" }}>
                                             <input
                                                  type="checkbox"
                                                  checked={exchangeFormData.requiresPassphrase}
                                                  onChange={(e) => setExchangeFormData({ ...exchangeFormData, requiresPassphrase: e.target.checked })}
                                                  style={{ cursor: "pointer" }}
                                             />
                                             <span>Requires Passphrase</span>
                                        </label>
                                   </div>

                                   <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                                        <button
                                             type="button"
                                             onClick={() => {
                                                  setShowAddExchangeForm(false);
                                                  setExchangeFormData({
                                                       exchangeName: "",
                                                       displayName: "",
                                                       ccxtId: "",
                                                       hasTestnet: false,
                                                       requiresPassphrase: false,
                                                  });
                                                  setExchangeErrors({});
                                             }}
                                             style={{
                                                  padding: "12px 24px",
                                                  backgroundColor: "#2a2a2a",
                                                  color: "#ededed",
                                                  border: "1px solid #2a2a2a",
                                                  borderRadius: "8px",
                                                  cursor: "pointer",
                                                  fontWeight: "600",
                                                  fontSize: "14px",
                                             }}
                                        >
                                             Cancel
                                        </button>
                                        <button
                                             type="submit"
                                             disabled={creatingExchange}
                                             style={{
                                                  padding: "12px 24px",
                                                  backgroundColor: creatingExchange ? "#666" : "#FFAE00",
                                                  color: "#1a1a1a",
                                                  border: "none",
                                                  borderRadius: "8px",
                                                  cursor: creatingExchange ? "not-allowed" : "pointer",
                                                  fontWeight: "600",
                                                  fontSize: "14px",
                                             }}
                                        >
                                             {creatingExchange ? "Creating..." : "Create Exchange"}
                                        </button>
                                   </div>
                              </form>
                         </div>
                    </>
               )}
          </div>
     );
}
