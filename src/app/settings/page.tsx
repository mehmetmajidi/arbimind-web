"use client";

import { useState, useEffect } from "react";

// Helper function to mask sensitive data (show first 4 and last 4 chars)
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
     const [showAddForm, setShowAddForm] = useState(false);
     const [formData, setFormData] = useState({
          exchangeName: "",
          apiKey: "",
          apiSecret: "",
          passphrase: "",
          isTestnet: false,
     });
     const [creating, setCreating] = useState(false);
     const [testingAccountId, setTestingAccountId] = useState<number | null>(null);
     const [testResults, setTestResults] = useState<Record<number, { status: "success" | "error"; message: string }>>({});
     const [errors, setErrors] = useState<Record<string, string>>({});

     // Fetch supported exchanges via REST API
     const [exchangesData, setExchangesData] = useState<any>(null);
     const [accountsData, setAccountsData] = useState<any>(null);
     const [loading, setLoading] = useState(true);

     useEffect(() => {
          const fetchData = async () => {
               try {
                    const token = localStorage.getItem("auth_token") || "";

                    // Use backend URL - browser makes request, so use localhost
                    const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

     return (
          <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
               <h1>Exchange API Keys</h1>

               <div style={{ marginBottom: "24px" }}>
                    <button
                         onClick={() => setShowAddForm(!showAddForm)}
                         style={{
                              padding: "12px 24px",
                              backgroundColor: "#0070f3",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                         }}
                    >
                         {showAddForm ? "Cancel" : "+ Add Exchange Account"}
                    </button>
               </div>

               {showAddForm && (
                    <form
                         onSubmit={handleSubmit}
                         style={{
                              padding: "24px",
                              border: "1px solid #eaeaea",
                              borderRadius: "8px",
                              marginBottom: "24px",
                         }}
                    >
                         <h2>Add Exchange Account</h2>

                         <div style={{ marginBottom: "16px" }}>
                              <label>
                                   Exchange:
                                   <select
                                        value={formData.exchangeName}
                                        onChange={(e) => setFormData({ ...formData, exchangeName: e.target.value })}
                                        required
                                        style={{
                                             width: "100%",
                                             padding: "8px",
                                             marginTop: "4px",
                                             borderRadius: "4px",
                                             border: "1px solid #ddd",
                                        }}
                                   >
                                        <option value="">Select Exchange</option>
                                        {exchangesData?.exchanges && exchangesData.exchanges.length > 0 ? (
                                             exchangesData.exchanges.map((ex: { id: string; name: string }) => (
                                                  <option key={ex.id} value={ex.id}>
                                                       {ex.name}
                                                  </option>
                                             ))
                                        ) : (
                                             <option value="" disabled>
                                                  Loading exchanges...
                                             </option>
                                        )}
                                   </select>
                              </label>
                         </div>

                         <div style={{ marginBottom: "16px" }}>
                              <label>
                                   API Key:
                                   <input
                                        type="text"
                                        value={formData.apiKey}
                                        onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                                        required
                                        style={{
                                             width: "100%",
                                             padding: "8px",
                                             marginTop: "4px",
                                             borderRadius: "4px",
                                             border: "1px solid #ddd",
                                        }}
                                   />
                              </label>
                         </div>

                         <div style={{ marginBottom: "16px" }}>
                              <label>
                                   API Secret:
                                   <input
                                        type="password"
                                        value={formData.apiSecret}
                                        onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                                        required
                                        style={{
                                             width: "100%",
                                             padding: "8px",
                                             marginTop: "4px",
                                             borderRadius: "4px",
                                             border: "1px solid #ddd",
                                        }}
                                   />
                              </label>
                         </div>

                         <div style={{ marginBottom: "16px" }}>
                              <label>
                                   Passphrase (optional):
                                   <input
                                        type="password"
                                        value={formData.passphrase}
                                        onChange={(e) => setFormData({ ...formData, passphrase: e.target.value })}
                                        style={{
                                             width: "100%",
                                             padding: "8px",
                                             marginTop: "4px",
                                             borderRadius: "4px",
                                             border: "1px solid #ddd",
                                        }}
                                   />
                              </label>
                         </div>

                         <div style={{ marginBottom: "16px" }}>
                              <label>
                                   <input type="checkbox" checked={formData.isTestnet} onChange={(e) => setFormData({ ...formData, isTestnet: e.target.checked })} style={{ marginRight: "8px" }} />
                                   Use Testnet
                              </label>
                         </div>

                         {errors.submit && (
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
                                   {errors.submit}
                              </div>
                         )}

                         <button
                              type="submit"
                              disabled={creating}
                              style={{
                                   padding: "12px 24px",
                                   backgroundColor: "#0070f3",
                                   color: "white",
                                   border: "none",
                                   borderRadius: "4px",
                                   cursor: creating ? "not-allowed" : "pointer",
                              }}
                         >
                              {creating ? "Adding..." : "Add Account"}
                         </button>
                    </form>
               )}

               <div>
                    <h2>Your Exchange Accounts</h2>

                    {loading ? (
                         <p>Loading...</p>
                    ) : accountsData?.exchangeAccounts?.length > 0 ? (
                         <table
                              style={{
                                   width: "100%",
                                   borderCollapse: "collapse",
                                   marginTop: "16px",
                              }}
                         >
                              <thead>
                                   <tr style={{ borderBottom: "2px solid #eaeaea" }}>
                                        <th style={{ padding: "12px", textAlign: "left" }}>Exchange</th>
                                        <th style={{ padding: "12px", textAlign: "left" }}>API Key</th>
                                        <th style={{ padding: "12px", textAlign: "left" }}>Status</th>
                                        <th style={{ padding: "12px", textAlign: "left" }}>Type</th>
                                        <th style={{ padding: "12px", textAlign: "left" }}>Last Verified</th>
                                        <th style={{ padding: "12px", textAlign: "left" }}>Actions</th>
                                   </tr>
                              </thead>
                              <tbody>
                                   {accountsData.exchangeAccounts.map((account: any) => {
                                        const testResult = testResults[account.id];
                                        const isTesting = testingAccountId === account.id;

                                        return (
                                             <tr key={account.id} style={{ borderBottom: "1px solid #eaeaea" }}>
                                                  <td style={{ padding: "12px" }}>{(account.exchangeName || account.exchange_name || "Unknown").toUpperCase()}</td>
                                                  <td style={{ padding: "12px", fontFamily: "monospace", fontSize: "12px" }}>{account.api_key_preview || "••••••••"}</td>
                                                  <td style={{ padding: "12px" }}>
                                                       {account.isActive ? <span style={{ color: "green", fontWeight: "bold" }}>Active</span> : <span style={{ color: "gray" }}>Inactive</span>}
                                                  </td>
                                                  <td style={{ padding: "12px" }}>{account.isTestnet ? "Testnet" : "Live"}</td>
                                                  <td style={{ padding: "12px" }}>{account.lastVerifiedAt ? new Date(account.lastVerifiedAt).toLocaleString() : "Never"}</td>
                                                  <td style={{ padding: "12px" }}>
                                                       <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                                            <button
                                                                 style={{
                                                                      padding: "6px 12px",
                                                                      backgroundColor: isTesting ? "#ccc" : "#28a745",
                                                                      color: "white",
                                                                      border: "none",
                                                                      borderRadius: "4px",
                                                                      cursor: isTesting ? "not-allowed" : "pointer",
                                                                      fontSize: "12px",
                                                                      minWidth: "100px",
                                                                 }}
                                                                 onClick={() => handleTestConnection(account.id)}
                                                                 disabled={isTesting}
                                                            >
                                                                 {isTesting ? "Testing..." : "Test Connection"}
                                                            </button>

                                                            {testResult && (
                                                                 <div
                                                                      style={{
                                                                           padding: "6px",
                                                                           fontSize: "11px",
                                                                           borderRadius: "4px",
                                                                           backgroundColor: testResult.status === "success" ? "#d4edda" : "#f8d7da",
                                                                           color: testResult.status === "success" ? "#155724" : "#721c24",
                                                                           border: `1px solid ${testResult.status === "success" ? "#c3e6cb" : "#f5c6cb"}`,
                                                                      }}
                                                                 >
                                                                      {testResult.message}
                                                                 </div>
                                                            )}

                                                            <button
                                                                 style={{
                                                                      padding: "6px 12px",
                                                                      backgroundColor: "#ff4444",
                                                                      color: "white",
                                                                      border: "none",
                                                                      borderRadius: "4px",
                                                                      cursor: "pointer",
                                                                      fontSize: "12px",
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
                                                                                     alert("Failed to delete account");
                                                                                }
                                                                           } catch (error) {
                                                                                console.error("Error:", error);
                                                                                alert("Network error. Please try again.");
                                                                           }
                                                                      }
                                                                 }}
                                                            >
                                                                 Delete
                                                            </button>
                                                       </div>
                                                  </td>
                                             </tr>
                                        );
                                   })}
                              </tbody>
                         </table>
                    ) : (
                         <p style={{ marginTop: "16px", color: "#666" }}>No exchange accounts added yet. Add one to get started.</p>
                    )}
               </div>
          </div>
     );
}
