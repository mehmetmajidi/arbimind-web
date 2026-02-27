"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getApiV1Base } from "@/lib/apiBaseUrl";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface MetricsData {
    requests_total: number;
    requests_by_method: Record<string, number>;
    requests_by_status: Record<string, number>;
    avg_request_duration_seconds: number;
}

const COLORS = ["#10b981", "#ef4444", "#6366f1", "#f59e0b", "#8b5cf6", "#ec4899"];

export default function MetricsPage() {
    const router = useRouter();
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState<MetricsData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [refreshInterval, setRefreshInterval] = useState(10); // seconds

    const apiUrl = getApiV1Base();

    // Check if user is admin
    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const token = localStorage.getItem("auth_token");
                if (!token) {
                    router.push("/login");
                    return;
                }

                const meRes = await fetch(`${apiUrl}/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (meRes.ok) {
                    const meData = await meRes.json();
                    const isUserAdmin = meData.username === "admin" || meData.role === "admin";
                    setIsAdmin(isUserAdmin);
                    setLoading(false);

                    if (!isUserAdmin) {
                        setError("Access denied. Admin only.");
                    }
                } else {
                    router.push("/login");
                }
            } catch (err) {
                console.error("Error checking admin status:", err);
                setError("Failed to verify admin status");
                setLoading(false);
            }
        };

        checkAdmin();
    }, [apiUrl, router]);

    const fetchMetrics = useCallback(async () => {
        try {
            const token = localStorage.getItem("auth_token");
            if (!token) return;

            const response = await fetch(`${apiUrl}/metrics`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch metrics: ${response.statusText}`);
            }

            const data = await response.json();
            setMetrics(data);
            setError(null);
        } catch (err) {
            console.error("Error fetching metrics:", err);
            setError(err instanceof Error ? err.message : "Failed to fetch metrics");
        }
    }, [apiUrl]);

    useEffect(() => {
        if (!isAdmin) return;

        fetchMetrics();

        if (autoRefresh) {
            const interval = setInterval(() => {
                fetchMetrics();
            }, refreshInterval * 1000);

            return () => clearInterval(interval);
        }
    }, [isAdmin, autoRefresh, refreshInterval, fetchMetrics]);

    // Prepare chart data
    const methodData = metrics
        ? Object.entries(metrics.requests_by_method).map(([method, count]) => ({
              method,
              count,
          }))
        : [];

    const statusData = metrics
        ? Object.entries(metrics.requests_by_status).map(([status, count]) => ({
              status,
              count,
          }))
        : [];

    if (loading) {
        return (
            <div style={{ padding: "40px", textAlign: "center", color: "#888888" }}>
                Loading...
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div style={{ padding: "40px", textAlign: "center" }}>
                <div
                    style={{
                        padding: "24px",
                        backgroundColor: "#2a1a1a",
                        border: "1px solid #ef4444",
                        borderRadius: "8px",
                        color: "#ef4444",
                        maxWidth: "600px",
                        margin: "0 auto",
                    }}
                >
                    <h2 style={{ marginTop: 0 }}>Access Denied</h2>
                    <p>This page is only accessible to administrators.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "600", color: "#FFAE00" }}>
                    System Metrics
                </h1>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#ffffff" }}>
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                        />
                        Auto-refresh
                    </label>
                    {autoRefresh && (
                        <select
                            value={refreshInterval}
                            onChange={(e) => setRefreshInterval(Number(e.target.value))}
                            style={{
                                padding: "6px 12px",
                                backgroundColor: "#1a1a1a",
                                border: "1px solid #2a2a2a",
                                borderRadius: "6px",
                                color: "#ffffff",
                                fontSize: "14px",
                            }}
                        >
                            <option value="5">5s</option>
                            <option value="10">10s</option>
                            <option value="30">30s</option>
                            <option value="60">60s</option>
                        </select>
                    )}
                    <button
                        onClick={fetchMetrics}
                        style={{
                            padding: "8px 16px",
                            backgroundColor: "#FFAE00",
                            color: "#1a1a1a",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: "pointer",
                        }}
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {error && (
                <div
                    style={{
                        padding: "16px",
                        backgroundColor: "#2a1a1a",
                        border: "1px solid #ef4444",
                        borderRadius: "8px",
                        marginBottom: "24px",
                        color: "#ef4444",
                    }}
                >
                    {error}
                </div>
            )}

            {metrics && (
                <>
                    {/* Summary Cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px", marginBottom: "24px" }}>
                        <div
                            style={{
                                padding: "20px",
                                backgroundColor: "#202020",
                                border: "1px solid #2a2a2a",
                                borderRadius: "8px",
                            }}
                        >
                            <div style={{ fontSize: "12px", color: "#888888", marginBottom: "8px" }}>Total Requests</div>
                            <div style={{ fontSize: "32px", fontWeight: "700", color: "#FFAE00" }}>
                                {metrics.requests_total.toLocaleString()}
                            </div>
                        </div>
                        <div
                            style={{
                                padding: "20px",
                                backgroundColor: "#202020",
                                border: "1px solid #2a2a2a",
                                borderRadius: "8px",
                            }}
                        >
                            <div style={{ fontSize: "12px", color: "#888888", marginBottom: "8px" }}>Avg Duration</div>
                            <div style={{ fontSize: "32px", fontWeight: "700", color: "#10b981" }}>
                                {(metrics.avg_request_duration_seconds * 1000).toFixed(2)}ms
                            </div>
                        </div>
                        <div
                            style={{
                                padding: "20px",
                                backgroundColor: "#202020",
                                border: "1px solid #2a2a2a",
                                borderRadius: "8px",
                            }}
                        >
                            <div style={{ fontSize: "12px", color: "#888888", marginBottom: "8px" }}>HTTP Methods</div>
                            <div style={{ fontSize: "32px", fontWeight: "700", color: "#6366f1" }}>
                                {Object.keys(metrics.requests_by_method).length}
                            </div>
                        </div>
                        <div
                            style={{
                                padding: "20px",
                                backgroundColor: "#202020",
                                border: "1px solid #2a2a2a",
                                borderRadius: "8px",
                            }}
                        >
                            <div style={{ fontSize: "12px", color: "#888888", marginBottom: "8px" }}>Status Codes</div>
                            <div style={{ fontSize: "32px", fontWeight: "700", color: "#8b5cf6" }}>
                                {Object.keys(metrics.requests_by_status).length}
                            </div>
                        </div>
                    </div>

                    {/* Charts */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))", gap: "24px", marginBottom: "24px" }}>
                        {/* Requests by Method */}
                        {methodData.length > 0 && (
                            <div
                                style={{
                                    padding: "20px",
                                    backgroundColor: "#202020",
                                    border: "1px solid #2a2a2a",
                                    borderRadius: "8px",
                                }}
                            >
                                <h3 style={{ marginBottom: "16px", fontSize: "18px", color: "#ffffff" }}>
                                    Requests by HTTP Method
                                </h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={methodData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                                        <XAxis dataKey="method" stroke="#888" tick={{ fill: "#888" }} />
                                        <YAxis stroke="#888" tick={{ fill: "#888" }} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "#1a1a1a",
                                                border: "1px solid #2a2a2a",
                                                borderRadius: "8px",
                                                color: "#ffffff",
                                            }}
                                        />
                                        <Bar dataKey="count" fill="#FFAE00" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Requests by Status */}
                        {statusData.length > 0 && (
                            <div
                                style={{
                                    padding: "20px",
                                    backgroundColor: "#202020",
                                    border: "1px solid #2a2a2a",
                                    borderRadius: "8px",
                                }}
                            >
                                <h3 style={{ marginBottom: "16px", fontSize: "18px", color: "#ffffff" }}>
                                    Requests by Status Code
                                </h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={statusData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={(entry) => `${entry.status}: ${entry.count}`}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            dataKey="count"
                                        >
                                            {statusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "#1a1a1a",
                                                border: "1px solid #2a2a2a",
                                                borderRadius: "8px",
                                                color: "#ffffff",
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    {/* Raw Data */}
                    <div
                        style={{
                            padding: "20px",
                            backgroundColor: "#202020",
                            border: "1px solid #2a2a2a",
                            borderRadius: "8px",
                        }}
                    >
                        <h3 style={{ marginBottom: "16px", fontSize: "18px", color: "#ffffff" }}>Raw Metrics Data</h3>
                        <pre
                            style={{
                                padding: "16px",
                                backgroundColor: "#1a1a1a",
                                borderRadius: "6px",
                                overflow: "auto",
                                fontSize: "12px",
                                color: "#ffffff",
                                fontFamily: "monospace",
                            }}
                        >
                            {JSON.stringify(metrics, null, 2)}
                        </pre>
                    </div>
                </>
            )}
        </div>
    );
}

