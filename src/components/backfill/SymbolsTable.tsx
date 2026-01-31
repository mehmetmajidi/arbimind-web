import React from 'react';
import type { Market, SymbolDataStatus, BackfillJob, BackupFile } from './types';

interface SymbolsTableProps {
     selectedAccountId: number | null;
     markets: Market[];
     dataStatus: Record<string, SymbolDataStatus>;
     jobs: BackfillJob[];
     backups: BackupFile[];
     availableIntervals: string[];
     searchQuery: string;
     setSearchQuery: (query: string) => void;
     statusFilter: "all" | "missing" | "incomplete" | "complete" | "running" | "paused";
     setStatusFilter: (filter: "all" | "missing" | "incomplete" | "complete" | "running" | "paused") => void;
     intervalFilter: string;
     setIntervalFilter: (filter: string) => void;
     filteredMarkets: Market[];
     loading: boolean;
     processing: Record<string, boolean>;
     fetchMarkets: () => Promise<void>;
     fetchDataStatus: () => Promise<void>;
     startBackfillForSymbol: (symbol: string, interval: string, totalPages?: number, resume?: boolean) => Promise<{ success: boolean; message: string }>;
     handleRestoreBackup: (backupFile: string, replaceExisting?: boolean) => Promise<void>;
     setSuccess: (message: string | null) => void;
     setError: (message: string | null) => void;
}

export default function SymbolsTable({
     selectedAccountId,
     markets,
     dataStatus,
     jobs,
     backups,
     availableIntervals,
     searchQuery,
     setSearchQuery,
     statusFilter,
     setStatusFilter,
     intervalFilter,
     setIntervalFilter,
     filteredMarkets,
     loading,
     processing,
     fetchMarkets,
     fetchDataStatus,
     startBackfillForSymbol,
     handleRestoreBackup,
     setSuccess,
     setError,
}: SymbolsTableProps) {
     if (!selectedAccountId || markets.length === 0) return null;

     return (
          <div style={{
               backgroundColor: "#252525",
               border: "1px solid rgba(255, 255, 255, 0.1)",
               borderRadius: "12px",
               padding: "24px",
               marginBottom: "24px",
               boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)"
          }}>
               <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center", 
                    marginBottom: "24px",
                    flexWrap: "wrap",
                    gap: "16px"
               }}>
                    <h2 style={{ 
                         fontSize: "24px", 
                         fontWeight: "600", 
                         color: "#FFAE00",
                         margin: 0
                    }}>
                         All Symbols - Start Download
                    </h2>
                    <button
                         onClick={() => {
                              fetchMarkets();
                              fetchDataStatus();
                         }}
                         style={{
                              padding: "8px 16px",
                              backgroundColor: "#1a1a1a",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              color: "#ededed",
                              borderRadius: "8px",
                              fontSize: "14px",
                              cursor: "pointer",
                              transition: "all 0.2s",
                         }}
                         onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#2a2a2a";
                         }}
                         onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "#1a1a1a";
                         }}
                    >
                         🔄 Refresh
                    </button>
               </div>

               {/* Search and Filter Bar */}
               <div style={{ 
                    marginBottom: "24px", 
                    display: "flex", 
                    flexDirection: "column",
                    gap: "16px"
               }}>
                    <div style={{ 
                         display: "flex", 
                         flexDirection: "row",
                         gap: "12px",
                         flexWrap: "wrap"
                    }}>
                         {/* Search Input */}
                         <div style={{ flex: 1, minWidth: "200px" }}>
                              <input
                                   type="text"
                                   placeholder="🔍 Search symbols (e.g., BTC, ETH, USDT)..."
                                   value={searchQuery}
                                   onChange={(e) => setSearchQuery(e.target.value)}
                                   style={{
                                        width: "100%",
                                        padding: "10px 16px",
                                        backgroundColor: "#1a1a1a",
                                        border: "1px solid rgba(255, 255, 255, 0.1)",
                                        color: "#ededed",
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        outline: "none",
                                        transition: "all 0.2s",
                                   }}
                                   onFocus={(e) => {
                                        e.currentTarget.style.borderColor = "#FFAE00";
                                   }}
                                   onBlur={(e) => {
                                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                                   }}
                              />
                         </div>

                         {/* Status Filter */}
                         <div style={{ flexShrink: 0 }}>
                              <select
                                   value={statusFilter}
                                   onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                                   style={{
                                        padding: "10px 16px",
                                        backgroundColor: "#1a1a1a",
                                        border: "1px solid rgba(255, 255, 255, 0.1)",
                                        color: "#ededed",
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        outline: "none",
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                   }}
                                   onFocus={(e) => {
                                        e.currentTarget.style.borderColor = "#FFAE00";
                                   }}
                                   onBlur={(e) => {
                                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                                   }}
                              >
                                   <option value="all">All Status</option>
                                   <option value="missing">❌ Missing</option>
                                   <option value="incomplete">⚠️ Incomplete</option>
                                   <option value="complete">✅ Complete</option>
                                   <option value="running">🔄 Running</option>
                                   <option value="paused">⏸️ Paused</option>
                              </select>
                         </div>

                         {/* Interval Filter */}
                         <div style={{ flexShrink: 0 }}>
                              <select
                                   value={intervalFilter}
                                   onChange={(e) => setIntervalFilter(e.target.value)}
                                   style={{
                                        padding: "10px 16px",
                                        backgroundColor: "#1a1a1a",
                                        border: "1px solid rgba(255, 255, 255, 0.1)",
                                        color: "#ededed",
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        outline: "none",
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                   }}
                                   onFocus={(e) => {
                                        e.currentTarget.style.borderColor = "#FFAE00";
                                   }}
                                   onBlur={(e) => {
                                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                                   }}
                              >
                                   <option value="all">All Intervals</option>
                                   {availableIntervals.map((interval) => (
                                        <option key={interval} value={interval}>
                                             {interval}
                                        </option>
                                   ))}
                              </select>
                         </div>

                         {/* Clear Filters */}
                         {(searchQuery || statusFilter !== "all" || intervalFilter !== "all") && (
                              <button
                                   onClick={() => {
                                        setSearchQuery("");
                                        setStatusFilter("all");
                                        setIntervalFilter("all");
                                   }}
                                   style={{
                                        padding: "10px 16px",
                                        backgroundColor: "rgba(220, 38, 38, 0.2)",
                                        border: "1px solid rgba(239, 68, 68, 0.3)",
                                        color: "#ef4444",
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                   }}
                                   onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = "rgba(220, 38, 38, 0.3)";
                                   }}
                                   onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = "rgba(220, 38, 38, 0.2)";
                                   }}
                              >
                                   ✕ Clear
                              </button>
                         )}
                    </div>

                    {/* Results Count */}
                    <div style={{ fontSize: "14px", color: "#888888" }}>
                         Showing {filteredMarkets.length} of {markets.length} symbols
                         {filteredMarkets.length === 0 && markets.length > 0 && (
                              <span style={{ marginLeft: "8px", color: "#FFAE00" }}>
                                   (Try clearing filters or adjusting your search)
                              </span>
                         )}
                    </div>
               </div>

               <div style={{
                    overflowX: "auto",
                    maxHeight: "600px",
                    overflowY: "auto"
               }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                         <thead style={{
                              backgroundColor: "#1a1a1a",
                              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                              position: "sticky",
                              top: 0,
                              zIndex: 10
                         }}>
                              <tr>
                                   <th style={{
                                        padding: "12px 16px",
                                        textAlign: "left",
                                        fontSize: "14px",
                                        fontWeight: "500",
                                        color: "#ededed",
                                        position: "sticky",
                                        left: 0,
                                        backgroundColor: "#1a1a1a",
                                        zIndex: 11,
                                        borderRight: "1px solid rgba(255, 255, 255, 0.1)"
                                   }}>
                                        Symbol
                                   </th>
                                   {availableIntervals.map((interval) => (
                                        <th key={interval} style={{
                                             padding: "12px",
                                             textAlign: "center",
                                             fontSize: "12px",
                                             fontWeight: "500",
                                             color: "#ededed",
                                             minWidth: "120px"
                                        }}>
                                             {interval}
                                        </th>
                                   ))}
                                   <th style={{
                                        padding: "12px 16px",
                                        textAlign: "left",
                                        fontSize: "14px",
                                        fontWeight: "500",
                                        color: "#ededed"
                                   }}>
                                        Actions
                                   </th>
                              </tr>
                         </thead>
                         <tbody>
                              {filteredMarkets.map((market) => {
                                   const symbolStatus = dataStatus[market.symbol] || {};
                                   // Normalize symbol for backup filename matching
                                   const normalizedSymbol = market.symbol.replace("/", "_");

                                   return (
                                        <tr 
                                             key={market.symbol}
                                             style={{
                                                  borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                                                  transition: "background-color 0.2s",
                                             }}
                                             onMouseEnter={(e) => {
                                                  e.currentTarget.style.backgroundColor = "rgba(26, 26, 26, 0.5)";
                                             }}
                                             onMouseLeave={(e) => {
                                                  e.currentTarget.style.backgroundColor = "transparent";
                                             }}
                                        >
                                             <td style={{
                                                  padding: "12px 16px",
                                                  fontWeight: "600",
                                                  color: "#ededed",
                                                  position: "sticky",
                                                  left: 0,
                                                  backgroundColor: "#252525",
                                                  zIndex: 10,
                                                  borderRight: "1px solid rgba(255, 255, 255, 0.1)"
                                             }}>
                                                  {market.symbol}
                                             </td>
                                                  {availableIntervals.map((interval) => {
                                                       const status = symbolStatus[interval];
                                                       const hasData = status && status.exists && status.count > 0;
                                                       const isComplete = status && status.status === "complete";
                                                       const isIncomplete = status && status.status === "incomplete";

                                                       // Check if there's an active job for this symbol/interval
                                                       const activeJob = jobs.find((j) => j.symbol === market.symbol && j.interval === interval);

                                                       // Check if backup exists for this symbol/interval
                                                       const backupFilePattern = `${normalizedSymbol}_${interval}`;
                                                       const hasBackup = backups.some((b) => {
                                                            const nameWithoutExt = b.filename.replace(".json", "");
                                                            return nameWithoutExt === backupFilePattern || nameWithoutExt.startsWith(`${backupFilePattern}_`);
                                                       });
                                                       const backupFile = backups.find((b) => {
                                                            const nameWithoutExt = b.filename.replace(".json", "");
                                                            return nameWithoutExt === backupFilePattern || nameWithoutExt.startsWith(`${backupFilePattern}_`);
                                                       })?.filename;

                                                       return (
                                                            <td key={interval} style={{
                                                                 padding: "12px",
                                                                 textAlign: "center"
                                                            }}>
                                                                 <div style={{
                                                                      display: "flex",
                                                                      flexDirection: "column",
                                                                      alignItems: "center",
                                                                      gap: "4px"
                                                                 }}>
                                                                      {activeJob ? (
                                                                           <span
                                                                                style={{
                                                                                     display: "inline-block",
                                                                                     padding: "4px 8px",
                                                                                     borderRadius: "4px",
                                                                                     fontSize: "12px",
                                                                                     fontWeight: "500",
                                                                                     ...(activeJob.status === "running" ? {
                                                                                          backgroundColor: "rgba(59, 130, 246, 0.2)",
                                                                                          color: "#60a5fa",
                                                                                          border: "1px solid rgba(59, 130, 246, 0.3)"
                                                                                     } : activeJob.status === "paused" ? {
                                                                                          backgroundColor: "rgba(234, 179, 8, 0.2)",
                                                                                          color: "#eab308",
                                                                                          border: "1px solid rgba(234, 179, 8, 0.3)"
                                                                                     } : activeJob.status === "completed" ? {
                                                                                          backgroundColor: "rgba(34, 197, 94, 0.2)",
                                                                                          color: "#22c55e",
                                                                                          border: "1px solid rgba(34, 197, 94, 0.3)"
                                                                                     } : {
                                                                                          backgroundColor: "rgba(239, 68, 68, 0.2)",
                                                                                          color: "#ef4444",
                                                                                          border: "1px solid rgba(239, 68, 68, 0.3)"
                                                                                     })
                                                                                }}
                                                                           >
                                                                                {activeJob.status.toUpperCase()}
                                                                           </span>
                                                                      ) : hasData ? (
                                                                           <span
                                                                                style={{
                                                                                     display: "inline-block",
                                                                                     padding: "4px 8px",
                                                                                     borderRadius: "4px",
                                                                                     fontSize: "12px",
                                                                                     fontWeight: "500",
                                                                                     ...(isComplete ? {
                                                                                          backgroundColor: "rgba(34, 197, 94, 0.2)",
                                                                                          color: "#22c55e",
                                                                                          border: "1px solid rgba(34, 197, 94, 0.3)"
                                                                                     } : isIncomplete ? {
                                                                                          backgroundColor: "rgba(234, 179, 8, 0.2)",
                                                                                          color: "#eab308",
                                                                                          border: "1px solid rgba(234, 179, 8, 0.3)"
                                                                                     } : {
                                                                                          backgroundColor: "rgba(107, 114, 128, 0.2)",
                                                                                          color: "#9ca3af",
                                                                                          border: "1px solid rgba(107, 114, 128, 0.3)"
                                                                                     })
                                                                                }}
                                                                           >
                                                                                {isComplete ? "✅" : isIncomplete ? "⚠️" : "📊"}
                                                                           </span>
                                                                      ) : (
                                                                           <span style={{
                                                                                display: "inline-block",
                                                                                padding: "4px 8px",
                                                                                borderRadius: "4px",
                                                                                fontSize: "12px",
                                                                                backgroundColor: "rgba(107, 114, 128, 0.2)",
                                                                                color: "#9ca3af",
                                                                                border: "1px solid rgba(107, 114, 128, 0.3)"
                                                                           }}>
                                                                                ❌
                                                                           </span>
                                                                      )}
                                                                      {!activeJob && (
                                                                           <div style={{ display: "flex", gap: "4px" }}>
                                                                                {hasBackup && !hasData && backupFile && (
                                                                                     <button
                                                                                          onClick={async () => {
                                                                                               await handleRestoreBackup(backupFile, false);
                                                                                               await fetchDataStatus();
                                                                                          }}
                                                                                          disabled={processing[`restore_${backupFile}`] || loading}
                                                                                          style={{
                                                                                               padding: "4px 8px",
                                                                                               fontSize: "12px",
                                                                                               backgroundColor: "rgba(147, 51, 234, 0.2)",
                                                                                               border: "1px solid rgba(168, 85, 247, 0.3)",
                                                                                               color: "#a855f7",
                                                                                               borderRadius: "4px",
                                                                                               cursor: (processing[`restore_${backupFile}`] || loading) ? "not-allowed" : "pointer",
                                                                                               opacity: (processing[`restore_${backupFile}`] || loading) ? 0.5 : 1,
                                                                                               transition: "all 0.2s",
                                                                                          }}
                                                                                          title={`Restore backup for ${market.symbol} ${interval} from ${backupFile}`}
                                                                                          onMouseEnter={(e) => {
                                                                                               if (!processing[`restore_${backupFile}`] && !loading) {
                                                                                                    e.currentTarget.style.backgroundColor = "rgba(147, 51, 234, 0.3)";
                                                                                               }
                                                                                          }}
                                                                                          onMouseLeave={(e) => {
                                                                                               if (!processing[`restore_${backupFile}`] && !loading) {
                                                                                                    e.currentTarget.style.backgroundColor = "rgba(147, 51, 234, 0.2)";
                                                                                               }
                                                                                          }}
                                                                                     >
                                                                                          📥
                                                                                     </button>
                                                                                )}
                                                                                <button
                                                                                     onClick={async () => {
                                                                                          const result = await startBackfillForSymbol(market.symbol, interval);
                                                                                          if (result.success) {
                                                                                               setSuccess(`Started download for ${market.symbol} ${interval}`);
                                                                                          } else {
                                                                                               setError(result.message);
                                                                                          }
                                                                                     }}
                                                                                     disabled={loading}
                                                                                     style={{
                                                                                          padding: "4px 8px",
                                                                                          fontSize: "12px",
                                                                                          backgroundColor: "rgba(34, 197, 94, 0.2)",
                                                                                          border: "1px solid rgba(34, 197, 94, 0.3)",
                                                                                          color: "#22c55e",
                                                                                          borderRadius: "4px",
                                                                                          cursor: loading ? "not-allowed" : "pointer",
                                                                                          opacity: loading ? 0.5 : 1,
                                                                                          transition: "all 0.2s",
                                                                                     }}
                                                                                     title={`Start download for ${market.symbol} ${interval}`}
                                                                                     onMouseEnter={(e) => {
                                                                                          if (!loading) {
                                                                                               e.currentTarget.style.backgroundColor = "rgba(34, 197, 94, 0.3)";
                                                                                          }
                                                                                     }}
                                                                                     onMouseLeave={(e) => {
                                                                                          if (!loading) {
                                                                                               e.currentTarget.style.backgroundColor = "rgba(34, 197, 94, 0.2)";
                                                                                          }
                                                                                     }}
                                                                                >
                                                                                     ⬇️
                                                                                </button>
                                                                           </div>
                                                                      )}
                                                                 </div>
                                                            </td>
                                                       );
                                                  })}
                                             <td style={{ padding: "12px 16px" }}>
                                                  <button
                                                       onClick={async () => {
                                                            // Start download for all intervals sequentially
                                                            const intervals = availableIntervals;
                                                            let started = 0;
                                                            for (const interval of intervals) {
                                                                 const existingJob = jobs.find((j) => j.symbol === market.symbol && j.interval === interval);
                                                                 if (!existingJob) {
                                                                      const result = await startBackfillForSymbol(market.symbol, interval);
                                                                      if (result.success) {
                                                                           started++;
                                                                      }
                                                                      // Small delay between starts
                                                                      await new Promise((resolve) => setTimeout(resolve, 500));
                                                                 }
                                                            }
                                                            if (started > 0) {
                                                                 setSuccess(`Started ${started} download(s) for ${market.symbol}`);
                                                            }
                                                       }}
                                                       disabled={loading}
                                                       style={{
                                                            padding: "6px 12px",
                                                            fontSize: "12px",
                                                            backgroundColor: "rgba(37, 99, 235, 0.2)",
                                                            border: "1px solid rgba(59, 130, 246, 0.3)",
                                                            color: "#60a5fa",
                                                            borderRadius: "4px",
                                                            cursor: loading ? "not-allowed" : "pointer",
                                                            opacity: loading ? 0.5 : 1,
                                                            transition: "all 0.2s",
                                                       }}
                                                       title="Start download for all intervals"
                                                       onMouseEnter={(e) => {
                                                            if (!loading) {
                                                                 e.currentTarget.style.backgroundColor = "rgba(37, 99, 235, 0.3)";
                                                            }
                                                       }}
                                                       onMouseLeave={(e) => {
                                                            if (!loading) {
                                                                 e.currentTarget.style.backgroundColor = "rgba(37, 99, 235, 0.2)";
                                                            }
                                                       }}
                                                  >
                                                       ⬇️ All
                                                  </button>
                                             </td>
                                        </tr>
                                   );
                              })}
                         </tbody>
                    </table>
               </div>
          </div>
     );
}

