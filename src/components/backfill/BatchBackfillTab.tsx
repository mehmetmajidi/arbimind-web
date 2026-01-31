import React from 'react';
import type { Market, BatchBackfillJob } from './types';

type BatchFormData = {
     exchange_account_id: number;
     symbols: string[];
     intervals: string[];
     total_pages_per_job: number;
     auto_backup: boolean;
};

interface BatchBackfillTabProps {
     markets: Market[];
     availableIntervals: string[];
     batchFormData: BatchFormData;
     setBatchFormData: React.Dispatch<React.SetStateAction<BatchFormData>>;
     batchJobs: BatchBackfillJob[];
     loading: boolean;
     processing: Record<string, boolean>;
     handleStartBatch: () => Promise<void>;
     handleProcessBatch: (batchId: string) => Promise<void>;
}

export default function BatchBackfillTab({
     markets,
     availableIntervals,
     batchFormData,
     setBatchFormData,
     batchJobs,
     loading,
     processing,
     handleStartBatch,
     handleProcessBatch,
}: BatchBackfillTabProps) {
     return (
          <div>
               {/* Batch Backfill Form */}
               <div className="mb-8 p-6 bg-[#202020] border border-[#2a2a2a] rounded-lg">
                    <h2 className="text-2xl font-bold mb-6 text-[#FFAE00]">Start Batch Backfill</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {/* Exchange Account ID */}
                         <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                   Exchange Account ID *
                              </label>
                              <input
                                   type="number"
                                   value={batchFormData.exchange_account_id}
                                   onChange={(e) =>
                                        setBatchFormData((prev) => ({
                                             ...prev,
                                             exchange_account_id: parseInt(e.target.value) || 0,
                                        }))
                                   }
                                   className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white"
                                   placeholder="Exchange Account ID"
                              />
                         </div>

                         {/* Total Pages Per Job */}
                         <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                   Total Pages Per Job
                              </label>
                              <input
                                   type="number"
                                   value={batchFormData.total_pages_per_job}
                                   onChange={(e) =>
                                        setBatchFormData((prev) => ({
                                             ...prev,
                                             total_pages_per_job: parseInt(e.target.value) || 18,
                                        }))
                                   }
                                   className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white"
                                   placeholder="18"
                              />
                         </div>

                         {/* Symbols Selection */}
                         <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                   Symbols * (Select multiple)
                              </label>
                              <div className="max-h-40 overflow-y-auto p-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg">
                                   <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                                        {markets.map((market) => (
                                             <label
                                                  key={market.symbol}
                                                  className="flex items-center gap-2 cursor-pointer hover:bg-[#2a2a2a] p-2 rounded"
                                             >
                                                  <input
                                                       type="checkbox"
                                                       checked={batchFormData.symbols.includes(market.symbol)}
                                                       onChange={(e) => {
                                                            if (e.target.checked) {
                                                                 setBatchFormData((prev) => ({
                                                                      ...prev,
                                                                      symbols: [...prev.symbols, market.symbol],
                                                                 }));
                                                            } else {
                                                                 setBatchFormData((prev) => ({
                                                                      ...prev,
                                                                      symbols: prev.symbols.filter((s) => s !== market.symbol),
                                                                 }));
                                                            }
                                                       }}
                                                       className="w-4 h-4"
                                                  />
                                                  <span className="text-sm text-gray-300">{market.symbol}</span>
                                             </label>
                                        ))}
                                   </div>
                              </div>
                              <div className="mt-2 text-sm text-gray-400">
                                   Selected: {batchFormData.symbols.length} symbols
                              </div>
                         </div>

                         {/* Intervals Selection */}
                         <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                   Intervals * (Select multiple)
                              </label>
                              <div className="flex flex-wrap gap-2">
                                   {availableIntervals.map((interval) => (
                                        <label
                                             key={interval}
                                             className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border transition-colors ${
                                                  batchFormData.intervals.includes(interval)
                                                       ? "bg-[#FFAE00]/20 border-[#FFAE00] text-[#FFAE00]"
                                                       : "bg-[#1a1a1a] border-[#2a2a2a] text-gray-300 hover:border-[#FFAE00]/50"
                                             }`}
                                        >
                                             <input
                                                  type="checkbox"
                                                  checked={batchFormData.intervals.includes(interval)}
                                                  onChange={(e) => {
                                                       if (e.target.checked) {
                                                            setBatchFormData((prev) => ({
                                                                 ...prev,
                                                                 intervals: [...prev.intervals, interval],
                                                            }));
                                                       } else {
                                                            setBatchFormData((prev) => ({
                                                                 ...prev,
                                                                 intervals: prev.intervals.filter((i) => i !== interval),
                                                            }));
                                                       }
                                                  }}
                                                  className="w-4 h-4"
                                             />
                                             <span>{interval}</span>
                                        </label>
                                   ))}
                              </div>
                         </div>

                         {/* Auto Backup */}
                         <div className="md:col-span-2">
                              <label className="flex items-center gap-2 cursor-pointer">
                                   <input
                                        type="checkbox"
                                        checked={batchFormData.auto_backup}
                                        onChange={(e) =>
                                             setBatchFormData((prev) => ({
                                                  ...prev,
                                                  auto_backup: e.target.checked,
                                             }))
                                        }
                                        className="w-4 h-4"
                                   />
                                   <span className="text-sm text-gray-300">Auto Backup</span>
                              </label>
                         </div>
                    </div>

                    <div className="mt-6">
                         <button
                              onClick={handleStartBatch}
                              disabled={loading}
                              className="px-6 py-3 bg-[#FFAE00] text-[#1a1a1a] font-semibold rounded-lg hover:bg-[#FFD700] transition-colors disabled:opacity-50"
                         >
                              {loading ? "Starting..." : "Start Batch Backfill"}
                         </button>
                    </div>
               </div>

               {/* Batch Jobs Table */}
               <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-4 text-[#FFAE00]">Batch Jobs</h2>
                    {batchJobs.length === 0 ? (
                         <div className="p-6 bg-[#202020] border border-[#2a2a2a] rounded-lg text-center text-gray-400">
                              No batch jobs found
                         </div>
                    ) : (
                         <div className="overflow-x-auto">
                              <table className="w-full border-collapse">
                                   <thead>
                                        <tr className="bg-[#1a1a1a] border-b border-[#2a2a2a]">
                                             <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Batch ID</th>
                                             <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Status</th>
                                             <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Progress</th>
                                             <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Symbols</th>
                                             <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Intervals</th>
                                             <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Started At</th>
                                             <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Actions</th>
                                        </tr>
                                   </thead>
                                   <tbody>
                                        {batchJobs.map((batchJob) => {
                                             const progress = batchJob.total_jobs > 0 ? (batchJob.completed_jobs / batchJob.total_jobs) * 100 : 0;
                                             const isProcessing = processing[`batch_${batchJob.batch_id}`] || false;

                                             return (
                                                  <tr key={batchJob.batch_id} className="hover:bg-[#1a1a1a]/50 transition-colors border-b border-[#2a2a2a]">
                                                       <td className="px-4 py-4">
                                                            <div className="font-semibold text-white text-sm">{batchJob.batch_id}</div>
                                                       </td>
                                                       <td className="px-4 py-4">
                                                            <span
                                                                 className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                                      batchJob.status === "running"
                                                                           ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                                                           : batchJob.status === "completed"
                                                                           ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                                                           : batchJob.status === "failed"
                                                                           ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                                                           : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                                                                 }`}
                                                            >
                                                                 {batchJob.status.toUpperCase()}
                                                            </span>
                                                       </td>
                                                       <td className="px-4 py-4">
                                                            <div className="flex items-center gap-2">
                                                                 <div className="flex-1 bg-[#1a1a1a] rounded-full h-2 overflow-hidden">
                                                                      <div
                                                                           className="h-full bg-[#FFAE00] transition-all duration-300"
                                                                           style={{ width: `${progress}%` }}
                                                                      />
                                                                 </div>
                                                                 <span className="text-sm text-gray-300 whitespace-nowrap">
                                                                      {batchJob.completed_jobs}/{batchJob.total_jobs} ({progress.toFixed(1)}%)
                                                                 </span>
                                                            </div>
                                                            {batchJob.failed_jobs > 0 && (
                                                                 <div className="text-xs text-red-400 mt-1">
                                                                      {batchJob.failed_jobs} failed
                                                                 </div>
                                                            )}
                                                       </td>
                                                       <td className="px-4 py-4">
                                                            <div className="text-sm text-gray-300">
                                                                 {batchJob.symbols.length} symbols
                                                                 <div className="text-xs text-gray-500 mt-1">
                                                                      {batchJob.symbols.slice(0, 3).join(", ")}
                                                                      {batchJob.symbols.length > 3 && "..."}
                                                                 </div>
                                                            </div>
                                                       </td>
                                                       <td className="px-4 py-4">
                                                            <div className="text-sm text-gray-300">
                                                                 {batchJob.intervals.join(", ")}
                                                            </div>
                                                       </td>
                                                       <td className="px-4 py-4">
                                                            <div className="text-sm text-gray-400">
                                                                 {new Date(batchJob.started_at).toLocaleString()}
                                                            </div>
                                                       </td>
                                                       <td className="px-4 py-4">
                                                            <div className="flex gap-2">
                                                                 {batchJob.status === "running" && (
                                                                      <button
                                                                           onClick={() => handleProcessBatch(batchJob.batch_id)}
                                                                           disabled={isProcessing}
                                                                           className="px-4 py-2 bg-green-600/20 border border-green-500/30 text-green-400 rounded hover:bg-green-600/30 transition-colors disabled:opacity-50 text-sm font-medium"
                                                                      >
                                                                           {isProcessing ? "Processing..." : "Process"}
                                                                      </button>
                                                                 )}
                                                            </div>
                                                       </td>
                                                  </tr>
                                             );
                                        })}
                                   </tbody>
                              </table>
                         </div>
                    )}
               </div>
          </div>
     );
}

