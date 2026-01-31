interface SyncSymbolsSectionProps {
     selectedAccountId: number | null;
     markets: Array<{ symbol: string; base: string; quote: string; active: boolean }>;
     symbolsLoading: boolean;
     syncingAll: boolean;
     syncingExchange: boolean;
     selectedExchangeName: string;
     setSelectedExchangeName: (name: string) => void;
     exchanges: Array<{ id: number; name: string; display_name: string; is_active: boolean }>;
     syncSymbols: () => void;
     syncAllExchanges: () => void;
     syncSpecificExchange: () => void;
     showSyncAllResults: boolean;
     setShowSyncAllResults: (show: boolean) => void;
     syncAllResults: {
          summary?: {
               exchanges_synced: number;
               exchanges_failed: number;
               total_symbols: number;
               total_added: number;
               total_updated: number;
          };
          results?: Record<string, any>;
     } | null;
     showSyncExchangeResult: boolean;
     setShowSyncExchangeResult: (show: boolean) => void;
     syncExchangeResult: {
          exchange_name?: string;
          total?: number;
          added?: number;
          updated?: number;
          error?: string;
     } | null;
}

export default function SyncSymbolsSection({
     selectedAccountId,
     markets,
     symbolsLoading,
     syncingAll,
     syncingExchange,
     selectedExchangeName,
     setSelectedExchangeName,
     exchanges,
     syncSymbols,
     syncAllExchanges,
     syncSpecificExchange,
     showSyncAllResults,
     setShowSyncAllResults,
     syncAllResults,
     showSyncExchangeResult,
     setShowSyncExchangeResult,
     syncExchangeResult,
}: SyncSymbolsSectionProps) {
     if (!selectedAccountId) return null;

     return (
          <>
               <div style={{ marginBottom: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ 
                         display: "flex", 
                         justifyContent: "space-between", 
                         alignItems: "center", 
                         gap: "16px",
                         flexWrap: "wrap"
                    }}>
                         <div style={{ fontSize: "14px", color: "#888888" }}>
                              {markets.length > 0 ? <>📊 {markets.length} symbols loaded from database</> : <>⚠️ No symbols in database. Sync from exchange to load symbols.</>}
                         </div>
                         <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                              <button
                                   onClick={syncSymbols}
                                   disabled={symbolsLoading}
                                   style={{
                                        padding: "8px 16px",
                                        backgroundColor: "rgba(37, 99, 235, 0.2)",
                                        border: "1px solid rgba(59, 130, 246, 0.3)",
                                        color: "#60a5fa",
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        fontWeight: "500",
                                        cursor: symbolsLoading ? "not-allowed" : "pointer",
                                        opacity: symbolsLoading ? 0.5 : 1,
                                        transition: "all 0.2s",
                                   }}
                                   onMouseEnter={(e) => {
                                        if (!symbolsLoading) {
                                             e.currentTarget.style.backgroundColor = "rgba(37, 99, 235, 0.3)";
                                        }
                                   }}
                                   onMouseLeave={(e) => {
                                        if (!symbolsLoading) {
                                             e.currentTarget.style.backgroundColor = "rgba(37, 99, 235, 0.2)";
                                        }
                                   }}
                              >
                                   {symbolsLoading ? "⏳ Syncing..." : "🔄 Sync Current Exchange"}
                              </button>
                              <button
                                   onClick={syncAllExchanges}
                                   disabled={syncingAll || symbolsLoading}
                                   style={{
                                        padding: "8px 16px",
                                        backgroundColor: "rgba(255, 174, 0, 0.2)",
                                        border: "1px solid rgba(255, 174, 0, 0.3)",
                                        color: "#FFAE00",
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        fontWeight: "500",
                                        cursor: (syncingAll || symbolsLoading) ? "not-allowed" : "pointer",
                                        opacity: (syncingAll || symbolsLoading) ? 0.5 : 1,
                                        transition: "all 0.2s",
                                   }}
                                   onMouseEnter={(e) => {
                                        if (!syncingAll && !symbolsLoading) {
                                             e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.3)";
                                        }
                                   }}
                                   onMouseLeave={(e) => {
                                        if (!syncingAll && !symbolsLoading) {
                                             e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.2)";
                                        }
                                   }}
                              >
                                   {syncingAll ? "⏳ Syncing All..." : "🌐 Sync All Exchanges"}
                              </button>
                         </div>
                    </div>
                    
                    {/* Sync Specific Exchange */}
                    <div style={{
                         display: "flex",
                         alignItems: "center",
                         gap: "12px",
                         padding: "16px",
                         backgroundColor: "#1a1a1a",
                         border: "1px solid rgba(255, 255, 255, 0.1)",
                         borderRadius: "8px",
                         flexWrap: "wrap"
                    }}>
                         <label style={{ 
                              fontSize: "14px", 
                              color: "#888888", 
                              whiteSpace: "nowrap" 
                         }}>
                              Sync Specific Exchange:
                         </label>
                         <select
                              value={selectedExchangeName}
                              onChange={(e) => setSelectedExchangeName(e.target.value)}
                              disabled={syncingExchange || syncingAll}
                              style={{
                                   flex: 1,
                                   minWidth: "200px",
                                   padding: "8px 16px",
                                   backgroundColor: "#252525",
                                   border: "1px solid rgba(255, 255, 255, 0.1)",
                                   color: "#ededed",
                                   borderRadius: "8px",
                                   fontSize: "14px",
                                   outline: "none",
                                   cursor: (syncingExchange || syncingAll) ? "not-allowed" : "pointer",
                                   opacity: (syncingExchange || syncingAll) ? 0.5 : 1,
                              }}
                              onFocus={(e) => {
                                   e.currentTarget.style.borderColor = "#FFAE00";
                              }}
                              onBlur={(e) => {
                                   e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                              }}
                         >
                              <option value="">Select Exchange...</option>
                              {exchanges.map((ex) => (
                                   <option key={ex.id} value={ex.name}>
                                        {ex.display_name} ({ex.name})
                                   </option>
                              ))}
                         </select>
                         <button
                              onClick={syncSpecificExchange}
                              disabled={!selectedExchangeName || syncingExchange || syncingAll || symbolsLoading}
                              style={{
                                   padding: "8px 16px",
                                   backgroundColor: "rgba(147, 51, 234, 0.2)",
                                   border: "1px solid rgba(168, 85, 247, 0.3)",
                                   color: "#a855f7",
                                   borderRadius: "8px",
                                   fontSize: "14px",
                                   fontWeight: "500",
                                   whiteSpace: "nowrap",
                                   cursor: (!selectedExchangeName || syncingExchange || syncingAll || symbolsLoading) ? "not-allowed" : "pointer",
                                   opacity: (!selectedExchangeName || syncingExchange || syncingAll || symbolsLoading) ? 0.5 : 1,
                                   transition: "all 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                   if (selectedExchangeName && !syncingExchange && !syncingAll && !symbolsLoading) {
                                        e.currentTarget.style.backgroundColor = "rgba(147, 51, 234, 0.3)";
                                   }
                              }}
                              onMouseLeave={(e) => {
                                   if (selectedExchangeName && !syncingExchange && !syncingAll && !symbolsLoading) {
                                        e.currentTarget.style.backgroundColor = "rgba(147, 51, 234, 0.2)";
                                   }
                              }}
                         >
                              {syncingExchange ? "⏳ Syncing..." : "🔄 Sync"}
                         </button>
                    </div>
               </div>

               {/* Sync All Exchanges Results Modal */}
               {showSyncAllResults && syncAllResults && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowSyncAllResults(false)}>
                         <div className="bg-[#252525] border border-[#333] rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-between items-center mb-6">
                                   <h2 className="text-2xl font-semibold text-[#FFAE00]">Sync All Exchanges - Results</h2>
                                   <button
                                        onClick={() => setShowSyncAllResults(false)}
                                        className="text-gray-400 hover:text-white transition-colors text-2xl"
                                   >
                                        ×
                                   </button>
                              </div>
                              
                              {/* Summary */}
                              {syncAllResults.summary && (
                                   <div className="mb-6 p-4 bg-[#1a1a1a] border border-[#333] rounded-lg">
                                        <h3 className="text-lg font-semibold mb-3 text-white">Summary</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                             <div>
                                                  <div className="text-sm text-gray-400">Exchanges Synced</div>
                                                  <div className="text-xl font-bold text-green-400">{syncAllResults.summary.exchanges_synced}</div>
                                             </div>
                                             <div>
                                                  <div className="text-sm text-gray-400">Exchanges Failed</div>
                                                  <div className="text-xl font-bold text-red-400">{syncAllResults.summary.exchanges_failed}</div>
                                             </div>
                                             <div>
                                                  <div className="text-sm text-gray-400">Total Symbols</div>
                                                  <div className="text-xl font-bold text-blue-400">{syncAllResults.summary.total_symbols}</div>
                                             </div>
                                             <div>
                                                  <div className="text-sm text-gray-400">Added</div>
                                                  <div className="text-xl font-bold text-green-400">{syncAllResults.summary.total_added}</div>
                                             </div>
                                             <div>
                                                  <div className="text-sm text-gray-400">Updated</div>
                                                  <div className="text-xl font-bold text-yellow-400">{syncAllResults.summary.total_updated}</div>
                                             </div>
                                        </div>
                                   </div>
                              )}
                              
                              {/* Detailed Results */}
                              {syncAllResults.results && (
                                   <div>
                                        <h3 className="text-lg font-semibold mb-3 text-white">Exchange Details</h3>
                                        <div className="space-y-3">
                                             {Object.entries(syncAllResults.results).map(([exchangeName, result]: [string, any]) => (
                                                  <div
                                                       key={exchangeName}
                                                       className={`p-4 rounded-lg border ${
                                                            result.error
                                                                 ? "bg-red-500/10 border-red-500/30"
                                                                 : "bg-green-500/10 border-green-500/30"
                                                       }`}
                                                  >
                                                       <div className="flex justify-between items-start mb-2">
                                                            <div className="font-semibold text-white">{exchangeName}</div>
                                                            {result.error ? (
                                                                 <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">Failed</span>
                                                            ) : (
                                                                 <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Success</span>
                                                            )}
                                                       </div>
                                                       {result.error ? (
                                                            <div className="text-sm text-red-400">{result.error}</div>
                                                       ) : (
                                                            <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                                                                 <div>
                                                                      <span className="text-gray-400">Total: </span>
                                                                      <span className="text-white font-semibold">{result.total || 0}</span>
                                                                 </div>
                                                                 <div>
                                                                      <span className="text-gray-400">Added: </span>
                                                                      <span className="text-green-400 font-semibold">{result.added || 0}</span>
                                                                 </div>
                                                                 <div>
                                                                      <span className="text-gray-400">Updated: </span>
                                                                      <span className="text-yellow-400 font-semibold">{result.updated || 0}</span>
                                                                 </div>
                                                            </div>
                                                       )}
                                                  </div>
                                             ))}
                                        </div>
                                   </div>
                              )}
                              
                              <div className="mt-6 flex justify-end">
                                   <button
                                        onClick={() => setShowSyncAllResults(false)}
                                        className="px-6 py-2 bg-[#FFAE00] text-black rounded-lg hover:bg-[#FFD700] transition-colors font-semibold"
                                   >
                                        Close
                                   </button>
                              </div>
                         </div>
                    </div>
               )}

               {/* Sync Specific Exchange Result Modal */}
               {showSyncExchangeResult && syncExchangeResult && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowSyncExchangeResult(false)}>
                         <div className="bg-[#252525] border border-[#333] rounded-xl p-6 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-between items-center mb-6">
                                   <h2 className="text-2xl font-semibold text-[#FFAE00]">Sync Exchange - Results</h2>
                                   <button
                                        onClick={() => setShowSyncExchangeResult(false)}
                                        className="text-gray-400 hover:text-white transition-colors text-2xl"
                                   >
                                        ×
                                   </button>
                              </div>
                              
                              {syncExchangeResult.error ? (
                                   <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                             <span className="text-red-400 font-semibold">❌ Error</span>
                                        </div>
                                        <div className="text-sm text-gray-300 mb-2">
                                             <span className="text-gray-400">Exchange: </span>
                                             <span className="font-semibold">{syncExchangeResult.exchange_name}</span>
                                        </div>
                                        <div className="text-sm text-red-400">{syncExchangeResult.error}</div>
                                   </div>
                              ) : (
                                   <div className="space-y-4">
                                        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                                             <div className="flex items-center gap-2 mb-3">
                                                  <span className="text-green-400 font-semibold">✅ Success</span>
                                             </div>
                                             <div className="text-sm text-gray-300 mb-2">
                                                  <span className="text-gray-400">Exchange: </span>
                                                  <span className="font-semibold">{syncExchangeResult.exchange_name}</span>
                                             </div>
                                             <div className="grid grid-cols-3 gap-4 mt-4">
                                                  <div>
                                                       <div className="text-xs text-gray-400 mb-1">Total Symbols</div>
                                                       <div className="text-xl font-bold text-blue-400">{syncExchangeResult.total || 0}</div>
                                                  </div>
                                                  <div>
                                                       <div className="text-xs text-gray-400 mb-1">Added</div>
                                                       <div className="text-xl font-bold text-green-400">{syncExchangeResult.added || 0}</div>
                                                  </div>
                                                  <div>
                                                       <div className="text-xs text-gray-400 mb-1">Updated</div>
                                                       <div className="text-xl font-bold text-yellow-400">{syncExchangeResult.updated || 0}</div>
                                                  </div>
                                             </div>
                                        </div>
                                   </div>
                              )}
                              
                              <div className="mt-6 flex justify-end">
                                   <button
                                        onClick={() => setShowSyncExchangeResult(false)}
                                        className="px-6 py-2 bg-[#FFAE00] text-black rounded-lg hover:bg-[#FFD700] transition-colors font-semibold"
                                   >
                                        Close
                                   </button>
                              </div>
                         </div>
                    </div>
               )}
          </>
     );
}

