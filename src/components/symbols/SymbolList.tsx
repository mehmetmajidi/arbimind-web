"use client";

import { useState, useMemo } from "react";
import SymbolSyncStatus from "./SymbolSyncStatus";

interface Symbol {
     symbol: string;
     base: string;
     quote: string;
     exchange_symbol?: string;
     active: boolean;
     type?: string;
     last_synced: string | null;
}

interface SymbolListProps {
     symbols: Symbol[];
     exchangeName?: string;
     displayName?: string;
     loading?: boolean;
     showSearch?: boolean;
     showFilters?: boolean;
     maxHeight?: string;
}

export default function SymbolList({
     symbols,
     exchangeName,
     displayName,
     loading = false,
     showSearch = true,
     showFilters = true,
     maxHeight = "600px",
}: SymbolListProps) {
     const [searchQuery, setSearchQuery] = useState("");
     const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
     const [typeFilter, setTypeFilter] = useState<string>("all");
     
     // Get unique types from symbols
     const availableTypes = useMemo(() => {
          const types = new Set<string>();
          symbols.forEach((s) => {
               if (s.type) types.add(s.type);
          });
          return Array.from(types).sort();
     }, [symbols]);
     
     // Filter symbols
     const filteredSymbols = useMemo(() => {
          return symbols.filter((symbol) => {
               // Search filter
               if (searchQuery) {
                    const query = searchQuery.toLowerCase();
                    if (
                         !symbol.symbol.toLowerCase().includes(query) &&
                         !symbol.base.toLowerCase().includes(query) &&
                         !symbol.quote.toLowerCase().includes(query)
                    ) {
                         return false;
                    }
               }
               
               // Status filter
               if (statusFilter === "active" && !symbol.active) return false;
               if (statusFilter === "inactive" && symbol.active) return false;
               
               // Type filter
               if (typeFilter !== "all" && symbol.type !== typeFilter) return false;
               
               return true;
          });
     }, [symbols, searchQuery, statusFilter, typeFilter]);
     
     if (loading) {
          return (
               <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
                    <p>Loading symbols...</p>
               </div>
          );
     }
     
     if (symbols.length === 0) {
          return (
               <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
                    <p>No symbols found.</p>
               </div>
          );
     }
     
     return (
          <div
               style={{
                    backgroundColor: "#1a1a1a",
                    borderRadius: "12px",
                    border: "1px solid rgba(255, 174, 0, 0.2)",
                    overflow: "hidden",
               }}
          >
               {/* Header */}
               <div style={{ padding: "16px", backgroundColor: "#2a2a2a", borderBottom: "1px solid rgba(255, 174, 0, 0.2)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showSearch || showFilters ? "16px" : "0" }}>
                         <h2 style={{ color: "#FFAE00", margin: 0, fontSize: "18px", fontWeight: "600" }}>
                              {displayName || exchangeName || "Symbols"}
                         </h2>
                         <span style={{ color: "#888", fontSize: "14px" }}>
                              {filteredSymbols.length} / {symbols.length} {symbols.length === 1 ? "symbol" : "symbols"}
                         </span>
                    </div>
                    
                    {/* Search and Filters */}
                    {(showSearch || showFilters) && (
                         <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                              {showSearch && (
                                   <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search symbols, base, or quote..."
                                        style={{
                                             flex: 1,
                                             minWidth: "200px",
                                             padding: "8px 12px",
                                             backgroundColor: "#1a1a1a",
                                             border: "1px solid rgba(255, 174, 0, 0.3)",
                                             borderRadius: "8px",
                                             color: "#ededed",
                                             fontSize: "14px",
                                             outline: "none",
                                        }}
                                   />
                              )}
                              
                              {showFilters && (
                                   <>
                                        <select
                                             value={statusFilter}
                                             onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
                                             style={{
                                                  padding: "8px 12px",
                                                  backgroundColor: "#1a1a1a",
                                                  border: "1px solid rgba(255, 174, 0, 0.3)",
                                                  borderRadius: "8px",
                                                  color: "#ededed",
                                                  fontSize: "14px",
                                                  cursor: "pointer",
                                                  outline: "none",
                                             }}
                                        >
                                             <option value="all">All Status</option>
                                             <option value="active">Active Only</option>
                                             <option value="inactive">Inactive Only</option>
                                        </select>
                                        
                                        {availableTypes.length > 0 && (
                                             <select
                                                  value={typeFilter}
                                                  onChange={(e) => setTypeFilter(e.target.value)}
                                                  style={{
                                                       padding: "8px 12px",
                                                       backgroundColor: "#1a1a1a",
                                                       border: "1px solid rgba(255, 174, 0, 0.3)",
                                                       borderRadius: "8px",
                                                       color: "#ededed",
                                                       fontSize: "14px",
                                                       cursor: "pointer",
                                                       outline: "none",
                                                  }}
                                             >
                                                  <option value="all">All Types</option>
                                                  {availableTypes.map((type) => (
                                                       <option key={type} value={type}>
                                                            {type}
                                                       </option>
                                                  ))}
                                             </select>
                                        )}
                                   </>
                              )}
                         </div>
                    )}
               </div>
               
               {/* Table */}
               <div style={{ maxHeight, overflowY: "auto" }}>
                    {filteredSymbols.length === 0 ? (
                         <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
                              <p>No symbols match your filters.</p>
                         </div>
                    ) : (
                         <table style={{ width: "100%", borderCollapse: "collapse" }}>
                              <thead style={{ position: "sticky", top: 0, backgroundColor: "#2a2a2a", zIndex: 10 }}>
                                   <tr style={{ borderBottom: "1px solid rgba(255, 174, 0, 0.2)" }}>
                                        <th style={{ padding: "12px 16px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Symbol</th>
                                        <th style={{ padding: "12px 16px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Base</th>
                                        <th style={{ padding: "12px 16px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Quote</th>
                                        <th style={{ padding: "12px 16px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Type</th>
                                        <th style={{ padding: "12px 16px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Status</th>
                                        <th style={{ padding: "12px 16px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Last Synced</th>
                                   </tr>
                              </thead>
                              <tbody>
                                   {filteredSymbols.map((symbol, index) => (
                                        <tr key={index} style={{ borderBottom: "1px solid rgba(255, 174, 0, 0.1)" }}>
                                             <td style={{ padding: "12px 16px", color: "#ededed", fontFamily: "monospace", fontSize: "14px" }}>{symbol.symbol}</td>
                                             <td style={{ padding: "12px 16px", color: "#ededed" }}>{symbol.base}</td>
                                             <td style={{ padding: "12px 16px", color: "#ededed" }}>{symbol.quote}</td>
                                             <td style={{ padding: "12px 16px", color: "#888", fontSize: "12px" }}>{symbol.type || "N/A"}</td>
                                             <td style={{ padding: "12px 16px" }}>
                                                  <span
                                                       style={{
                                                            padding: "4px 12px",
                                                            borderRadius: "12px",
                                                            fontSize: "12px",
                                                            fontWeight: "600",
                                                            backgroundColor: symbol.active ? "rgba(34, 197, 94, 0.2)" : "rgba(136, 136, 136, 0.2)",
                                                            color: symbol.active ? "#22c55e" : "#888",
                                                       }}
                                                  >
                                                       {symbol.active ? "Active" : "Inactive"}
                                                  </span>
                                             </td>
                                             <td style={{ padding: "12px 16px" }}>
                                                  <SymbolSyncStatus lastSynced={symbol.last_synced} showLabel={true} size="small" />
                                             </td>
                                        </tr>
                                   ))}
                              </tbody>
                         </table>
                    )}
               </div>
          </div>
     );
}

