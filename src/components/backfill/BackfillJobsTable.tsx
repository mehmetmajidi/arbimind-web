import React from 'react';
import type { BackfillJob, BackupFile } from './types';

interface BackfillJobsTableProps {
     jobs: BackfillJob[];
     backups: BackupFile[];
     availableIntervals: string[];
     jobSearchQuery: string;
     setJobSearchQuery: (query: string) => void;
     jobStatusFilter: string;
     setJobStatusFilter: (filter: string) => void;
     jobIntervalFilter: string;
     setJobIntervalFilter: (filter: string) => void;
     processing: Record<string, boolean>;
     autoProcessingJobs: Set<string>;
     formData: {
          symbol: string;
          interval: string;
          total_pages: number;
          resume: boolean;
     };
     setFormData: (data: any) => void;
     fetchJobs: () => Promise<void>;
     fetchBackups: () => Promise<void>;
     fetchDataStatus: () => Promise<void>;
     handlePause: (symbol: string, interval: string) => Promise<void>;
     handleRestart: (symbol: string, interval: string, totalPages: number) => Promise<void>;
     handleStart: () => Promise<void>;
     handleCreateBackup: (symbol: string, interval: string) => Promise<void>;
     handleUpdate: (symbol: string, interval: string) => Promise<void>;
     toggleAutoProcess: (symbol: string, interval: string) => void;
     calculateProgress: (job: BackfillJob) => number;
     getStatusColor: (status: string) => string;
}

export default function BackfillJobsTable({
     jobs,
     backups,
     availableIntervals,
     jobSearchQuery,
     setJobSearchQuery,
     jobStatusFilter,
     setJobStatusFilter,
     jobIntervalFilter,
     setJobIntervalFilter,
     processing,
     autoProcessingJobs,
     formData,
     setFormData,
     fetchJobs,
     fetchBackups,
     fetchDataStatus,
     handlePause,
     handleRestart,
     handleStart,
     handleCreateBackup,
     handleUpdate,
     toggleAutoProcess,
     calculateProgress,
     getStatusColor,
}: BackfillJobsTableProps) {
     const filteredJobs = jobs.filter((job) => {
          // Search filter
          if (jobSearchQuery && !job.symbol.toLowerCase().includes(jobSearchQuery.toLowerCase())) {
               return false;
          }
          
          // Status filter
          if (jobStatusFilter !== "all" && job.status !== jobStatusFilter) {
               return false;
          }
          
          // Interval filter
          if (jobIntervalFilter !== "all" && job.interval !== jobIntervalFilter) {
               return false;
          }
          
          return true;
     });

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
                         Backfill Jobs
                    </h2>
                    <button
                         onClick={() => {
                              fetchJobs();
                              fetchBackups();
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

               {/* Filter Bar for Backfill Jobs */}
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
                                   placeholder="🔍 Search jobs (e.g., BTC, ETH, USDT)..."
                                   value={jobSearchQuery}
                                   onChange={(e) => setJobSearchQuery(e.target.value)}
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
                         <div style={{ minWidth: "180px" }}>
                              <select
                                   value={jobStatusFilter}
                                   onChange={(e) => setJobStatusFilter(e.target.value)}
                                   style={{
                                        width: "100%",
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
                                   <option value="running">Running</option>
                                   <option value="paused">Paused</option>
                                   <option value="completed">Completed</option>
                                   <option value="failed">Failed</option>
                                   <option value="error">Error</option>
                              </select>
                         </div>

                         {/* Interval Filter */}
                         <div style={{ minWidth: "150px" }}>
                              <select
                                   value={jobIntervalFilter}
                                   onChange={(e) => setJobIntervalFilter(e.target.value)}
                                   style={{
                                        width: "100%",
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
                    </div>
               </div>

               {/* Filtered Jobs */}
               {filteredJobs.length === 0 ? (
                    <div style={{
                         textAlign: "center",
                         padding: "48px 0",
                         color: "#888888"
                    }}>
                         <div style={{ fontSize: "48px", marginBottom: "16px" }}>📭</div>
                         <p style={{ margin: 0 }}>No backfill jobs found</p>
                         {jobSearchQuery || jobStatusFilter !== "all" || jobIntervalFilter !== "all" ? (
                              <p style={{ margin: "8px 0 0 0", fontSize: "14px", color: "#666" }}>
                                   Try adjusting your filters
                              </p>
                         ) : null}
                    </div>
               ) : (
                    <div style={{ overflowX: "auto" }}>
                         <div style={{ 
                              marginBottom: "16px", 
                              fontSize: "14px", 
                              color: "#888888" 
                         }}>
                              Showing {filteredJobs.length} of {jobs.length} jobs
                         </div>
                         <table style={{ width: "100%", borderCollapse: "collapse" }}>
                              <thead style={{
                                   backgroundColor: "#1a1a1a",
                                   borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
                              }}>
                                   <tr>
                                        <th style={{
                                             padding: "12px 16px",
                                             textAlign: "left",
                                             fontSize: "14px",
                                             fontWeight: "500",
                                             color: "#ededed"
                                        }}>
                                             Symbol
                                        </th>
                                        <th style={{
                                             padding: "12px 16px",
                                             textAlign: "left",
                                             fontSize: "14px",
                                             fontWeight: "500",
                                             color: "#ededed"
                                        }}>
                                             Last Updated
                                        </th>
                                        <th style={{
                                             padding: "12px 16px",
                                             textAlign: "left",
                                             fontSize: "14px",
                                             fontWeight: "500",
                                             color: "#ededed"
                                        }}>
                                             Intervals
                                        </th>
                                        <th style={{
                                             padding: "12px 16px",
                                             textAlign: "left",
                                             fontSize: "14px",
                                             fontWeight: "500",
                                             color: "#ededed"
                                        }}>
                                             Progress
                                        </th>
                                        <th style={{
                                             padding: "12px 16px",
                                             textAlign: "left",
                                             fontSize: "14px",
                                             fontWeight: "500",
                                             color: "#ededed"
                                        }}>
                                             Pages
                                        </th>
                                        <th style={{
                                             padding: "12px 16px",
                                             textAlign: "left",
                                             fontSize: "14px",
                                             fontWeight: "500",
                                             color: "#ededed"
                                        }}>
                                             Status
                                        </th>
                                        <th style={{
                                             padding: "12px 16px",
                                             textAlign: "left",
                                             fontSize: "14px",
                                             fontWeight: "500",
                                             color: "#ededed"
                                        }}>
                                             Backup File Name
                                        </th>
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
                                   {filteredJobs.map((job) => {
                                        const progress = calculateProgress(job);
                                        const isProcessing = processing[`${job.symbol}_${job.interval}`] || false;

                                        // Find backup file for this symbol/interval
                                        const normalizedSymbol = job.symbol.replace("/", "_");
                                        const backupFile = backups.find(
                                             (b) => b.filename.startsWith(`${normalizedSymbol}_${job.interval}.json`) || b.filename.startsWith(`${normalizedSymbol}_${job.interval}_`)
                                        );

                                        return (
                                             <tr key={`${job.symbol}_${job.interval}`} style={{ transition: "background-color 0.2s" }}
                                                  onMouseEnter={(e) => {
                                                       e.currentTarget.style.backgroundColor = "rgba(26, 26, 26, 0.5)";
                                                  }}
                                                  onMouseLeave={(e) => {
                                                       e.currentTarget.style.backgroundColor = "transparent";
                                                  }}
                                             >
                                                  {/* Symbol */}
                                                  <td style={{ padding: "12px 16px" }}>
                                                       <div style={{ fontWeight: "600", color: "#ededed" }}>{job.symbol}</div>
                                                  </td>

                                                  {/* Last Updated */}
                                                  <td style={{ padding: "12px 16px" }}>
                                                       <div style={{ fontSize: "14px", color: "#d1d5db" }}>
                                                            {job.last_updated
                                                                 ? new Date(job.last_updated).toLocaleDateString()
                                                                 : job.started_at
                                                                 ? new Date(job.started_at).toLocaleDateString()
                                                                 : "N/A"}
                                                       </div>
                                                  </td>

                                                  {/* Intervals */}
                                                  <td style={{ padding: "12px 16px" }}>
                                                       <div style={{ fontSize: "14px", color: "#d1d5db", fontWeight: "500" }}>{job.interval}</div>
                                                  </td>

                                                  {/* Progress */}
                                                  <td style={{ padding: "12px 16px" }}>
                                                       <div style={{ fontSize: "14px", fontWeight: "600", color: "#d1d5db" }}>%{progress.toFixed(0)}</div>
                                                  </td>

                                                  {/* Pages */}
                                                  <td style={{ padding: "12px 16px" }}>
                                                       <div style={{ fontSize: "14px", color: "#d1d5db" }}>
                                                            <span style={{ fontWeight: "600" }}>{job.current_page}</span>
                                                            <span style={{ color: "#6b7280" }}> / </span>
                                                            <span style={{ color: "#9ca3af" }}>{job.total_pages}</span>
                                                       </div>
                                                  </td>

                                                  {/* Status */}
                                                  <td style={{ padding: "12px 16px" }}>
                                                       <span className={`inline-block px-3 py-1 rounded text-xs font-medium ${getStatusColor(job.status)}`}>{job.status.toUpperCase()}</span>
                                                  </td>

                                                  {/* Backup File Name */}
                                                  <td style={{ padding: "12px 16px" }}>
                                                       {backupFile ? (
                                                            <div>
                                                                 <div style={{ fontSize: "12px", color: "#9ca3af", fontFamily: "monospace" }}>{backupFile.filename}</div>
                                                                 {backupFile.created && (
                                                                      <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                                                                           {new Date(backupFile.created).toLocaleDateString('en-US', { 
                                                                                year: 'numeric', 
                                                                                month: '2-digit', 
                                                                                day: '2-digit',
                                                                                hour: '2-digit',
                                                                                minute: '2-digit'
                                                                           })}
                                                                      </div>
                                                                 )}
                                                            </div>
                                                       ) : (
                                                            <div style={{ fontSize: "12px", color: "#9ca3af" }}>-</div>
                                                       )}
                                                  </td>

                                                  {/* Actions */}
                                                  <td style={{ padding: "12px 16px" }}>
                                                       <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                                            {job.status === "running" && (
                                                                 <button
                                                                      onClick={() => handlePause(job.symbol, job.interval)}
                                                                      disabled={isProcessing}
                                                                      className="px-4 py-2 bg-orange-600/20 border border-orange-500/30 text-orange-400 rounded hover:bg-orange-600/30 transition-colors disabled:opacity-50 text-sm font-medium"
                                                                      title="Pause"
                                                                 >
                                                                      Pause
                                                                 </button>
                                                            )}
                                                            {job.status === "paused" && (
                                                                 <button
                                                                      onClick={() => {
                                                                           setFormData({
                                                                                symbol: job.symbol,
                                                                                interval: job.interval,
                                                                                total_pages: job.total_pages,
                                                                                resume: true,
                                                                           });
                                                                           handleStart();
                                                                      }}
                                                                      disabled={isProcessing}
                                                                      className="px-4 py-2 bg-green-600/20 border border-green-500/30 text-green-400 rounded hover:bg-green-600/30 transition-colors disabled:opacity-50 text-sm font-medium"
                                                                      title="Resume/Download"
                                                                 >
                                                                      Download
                                                                 </button>
                                                            )}
                                                            {(job.status === "error" || job.status === "failed") && (
                                                                 <button
                                                                      onClick={() => handleRestart(job.symbol, job.interval, job.total_pages)}
                                                                      disabled={isProcessing}
                                                                      className="px-4 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded hover:bg-blue-600/30 transition-colors disabled:opacity-50 text-sm font-medium"
                                                                      title="Restart failed/error job"
                                                                 >
                                                                      🔄 Restart
                                                                 </button>
                                                            )}
                                                            {job.status === "completed" && (
                                                                 <button
                                                                      onClick={() => {
                                                                           setFormData({
                                                                                symbol: job.symbol,
                                                                                interval: job.interval,
                                                                                total_pages: job.total_pages,
                                                                                resume: false,
                                                                           });
                                                                           handleStart();
                                                                      }}
                                                                      disabled={isProcessing}
                                                                      className="px-4 py-2 bg-green-600/20 border border-green-500/30 text-green-400 rounded hover:bg-green-600/30 transition-colors disabled:opacity-50 text-sm font-medium"
                                                                      title="Start/Download"
                                                                 >
                                                                      Download
                                                                 </button>
                                                            )}
                                                            {job.status === "running" && (
                                                                 <button
                                                                      onClick={() => {
                                                                           const jobKey = `${job.symbol}_${job.interval}`;
                                                                           toggleAutoProcess(job.symbol, job.interval);
                                                                      }}
                                                                      disabled={isProcessing}
                                                                      style={{
                                                                           padding: "8px 16px",
                                                                           backgroundColor: autoProcessingJobs.has(`${job.symbol}_${job.interval}`) 
                                                                                ? "rgba(239, 68, 68, 0.2)" 
                                                                                : "rgba(34, 197, 94, 0.2)",
                                                                           border: `1px solid ${autoProcessingJobs.has(`${job.symbol}_${job.interval}`) 
                                                                                ? "rgba(239, 68, 68, 0.3)" 
                                                                                : "rgba(34, 197, 94, 0.3)"}`,
                                                                           color: autoProcessingJobs.has(`${job.symbol}_${job.interval}`) 
                                                                                ? "#ef4444" 
                                                                                : "#22c55e",
                                                                           borderRadius: "4px",
                                                                           fontSize: "14px",
                                                                           fontWeight: "500",
                                                                           cursor: isProcessing ? "not-allowed" : "pointer",
                                                                           opacity: isProcessing ? 0.5 : 1,
                                                                           transition: "all 0.2s",
                                                                      }}
                                                                      title={autoProcessingJobs.has(`${job.symbol}_${job.interval}`) 
                                                                           ? "Stop auto-download" 
                                                                           : "Start auto-download (will continue until complete)"}
                                                                      onMouseEnter={(e) => {
                                                                           if (!isProcessing) {
                                                                                const jobKey = `${job.symbol}_${job.interval}`;
                                                                                if (autoProcessingJobs.has(jobKey)) {
                                                                                     e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.3)";
                                                                                } else {
                                                                                     e.currentTarget.style.backgroundColor = "rgba(34, 197, 94, 0.3)";
                                                                                }
                                                                           }
                                                                      }}
                                                                      onMouseLeave={(e) => {
                                                                           if (!isProcessing) {
                                                                                const jobKey = `${job.symbol}_${job.interval}`;
                                                                                if (autoProcessingJobs.has(jobKey)) {
                                                                                     e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.2)";
                                                                                } else {
                                                                                     e.currentTarget.style.backgroundColor = "rgba(34, 197, 94, 0.2)";
                                                                                }
                                                                           }
                                                                      }}
                                                                 >
                                                                      {isProcessing ? "Processing..." : (autoProcessingJobs.has(`${job.symbol}_${job.interval}`) ? "⏹️ Stop" : "⬇️ Auto Download")}
                                                                 </button>
                                                            )}
                                                            <button
                                                                 onClick={() => handleCreateBackup(job.symbol, job.interval)}
                                                                 disabled={processing[`backup_${job.symbol}_${job.interval}`] || false}
                                                                 className="px-4 py-2 bg-orange-600/20 border border-orange-500/30 text-orange-400 rounded hover:bg-orange-600/30 transition-colors disabled:opacity-50 text-sm font-medium"
                                                                 title="Create Backup"
                                                            >
                                                                 {processing[`backup_${job.symbol}_${job.interval}`] ? "Creating..." : "Backup"}
                                                            </button>
                                                            <button
                                                                 onClick={() => {
                                                                      handleUpdate(job.symbol, job.interval);
                                                                 }}
                                                                 disabled={processing[`update_${job.symbol}_${job.interval}`] || false}
                                                                 className="px-4 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded hover:bg-blue-600/30 transition-colors disabled:opacity-50 text-sm font-medium"
                                                                 title="Update - Download new candles from last timestamp to now"
                                                            >
                                                                 {processing[`update_${job.symbol}_${job.interval}`] ? "Updating..." : "Update"}
                                                            </button>
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
     );
}

