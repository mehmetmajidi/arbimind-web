"use client";

import { useState, useMemo } from "react";

export type ExportFormat = "csv" | "json" | "xlsx";

interface ExportModalProps {
     isOpen: boolean;
     onClose: () => void;
     onExport: (format: ExportFormat) => Promise<void>;
     data: any[];
     dataType: "trades" | "stats" | "orders" | "positions";
     title?: string;
     columns?: string[];
     loading?: boolean;
}

export default function ExportModal({
     isOpen,
     onClose,
     onExport,
     data,
     dataType,
     title,
     columns,
     loading = false,
}: ExportModalProps) {
     const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("csv");
     const [previewRows, setPreviewRows] = useState(10);
     const [exporting, setExporting] = useState(false);

     // Get column names based on data type
     const getColumns = useMemo(() => {
          if (columns) return columns;
          
          if (data.length === 0) return [];
          
          if (dataType === "trades") {
               return ["ID", "Symbol", "Side", "Entry Price", "Exit Price", "Quantity", "P&L", "P&L %", "Win/Loss", "Prediction Accuracy", "Entry Time", "Exit Time", "Duration (minutes)"];
          } else if (dataType === "stats") {
               // For stats, data is an array with one object
               return Object.keys(data[0] || {});
          } else if (dataType === "orders") {
               return ["ID", "Symbol", "Side", "Type", "Status", "Quantity", "Price", "Filled", "Created At"];
          } else if (dataType === "positions") {
               return ["ID", "Symbol", "Side", "Quantity", "Entry Price", "Current Price", "Unrealized P&L", "Realized P&L", "Opened At"];
          }
          return Object.keys(data[0] || {});
     }, [data, dataType, columns]);

     // Generate preview data
     const previewData = useMemo(() => {
          if (data.length === 0) return [];
          return data.slice(0, previewRows);
     }, [data, previewRows]);

     // Generate CSV preview
     const generateCSVPreview = useMemo(() => {
          if (previewData.length === 0) return "";
          
          const headers = getColumns;
          const rows = previewData.map((item: any) => {
               if (dataType === "trades") {
                    return [
                         item.id,
                         item.symbol,
                         item.side,
                         item.entry_price,
                         item.exit_price,
                         item.quantity,
                         item.pnl,
                         item.pnl_percent,
                         item.win_loss ? "Win" : "Loss",
                         item.prediction_accuracy || "N/A",
                         item.entry_time,
                         item.exit_time,
                         item.duration_minutes,
                    ];
               } else if (dataType === "stats") {
                    return Object.values(item);
               } else if (dataType === "orders") {
                    return [
                         item.id,
                         item.symbol,
                         item.side,
                         item.order_type,
                         item.status,
                         item.quantity,
                         item.price || "MARKET",
                         item.filled_quantity,
                         item.created_at,
                    ];
               } else if (dataType === "positions") {
                    return [
                         item.id,
                         item.symbol,
                         item.side,
                         item.quantity,
                         item.entry_price,
                         item.current_price || "N/A",
                         item.unrealized_pnl,
                         item.realized_pnl,
                         item.opened_at,
                    ];
               }
               return Object.values(item);
          });
          
          return [headers, ...rows].map((row) => row.join(",")).join("\n");
     }, [previewData, getColumns, dataType]);

     // Generate JSON preview
     const generateJSONPreview = useMemo(() => {
          return JSON.stringify(previewData, null, 2);
     }, [previewData]);

     const handleExport = async () => {
          setExporting(true);
          try {
               await onExport(selectedFormat);
               onClose();
          } catch (error) {
               console.error("Export error:", error);
          } finally {
               setExporting(false);
          }
     };

     if (!isOpen) return null;

     return (
          <div
               style={{
                    position: "fixed",
                    inset: 0,
                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1000,
                    padding: "20px",
               }}
               onClick={onClose}
          >
               <div
                    style={{
                         backgroundColor: "#2a2a2a",
                         borderRadius: "12px",
                         border: "1px solid rgba(255, 174, 0, 0.3)",
                         padding: "24px",
                         maxWidth: "900px",
                         width: "100%",
                         maxHeight: "90vh",
                         overflowY: "auto",
                    }}
                    onClick={(e) => e.stopPropagation()}
               >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                         <h2 style={{ color: "#FFAE00", margin: 0, fontSize: "24px", fontWeight: "bold" }}>
                              {title || "Export Data"}
                         </h2>
                         <button
                              onClick={onClose}
                              style={{
                                   padding: "8px 16px",
                                   backgroundColor: "#6b7280",
                                   color: "white",
                                   border: "none",
                                   borderRadius: "8px",
                                   cursor: "pointer",
                                   fontSize: "14px",
                                   fontWeight: "600",
                              }}
                         >
                              ×
                         </button>
                    </div>

                    {/* Export Info */}
                    <div style={{ marginBottom: "24px", padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px" }}>
                         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                              <span style={{ color: "#888", fontSize: "14px" }}>Total Records:</span>
                              <span style={{ color: "#ededed", fontSize: "16px", fontWeight: "600" }}>{data.length}</span>
                         </div>
                         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ color: "#888", fontSize: "14px" }}>Preview Rows:</span>
                              <input
                                   type="number"
                                   min={1}
                                   max={50}
                                   value={previewRows}
                                   onChange={(e) => setPreviewRows(Math.min(50, Math.max(1, parseInt(e.target.value) || 10)))}
                                   style={{
                                        padding: "6px 12px",
                                        backgroundColor: "#2a2a2a",
                                        border: "1px solid rgba(255, 174, 0, 0.3)",
                                        borderRadius: "6px",
                                        color: "#ededed",
                                        fontSize: "14px",
                                        width: "80px",
                                        outline: "none",
                                   }}
                              />
                         </div>
                    </div>

                    {/* Format Selection */}
                    <div style={{ marginBottom: "24px" }}>
                         <label style={{ display: "block", color: "#FFAE00", fontSize: "14px", fontWeight: "600", marginBottom: "12px" }}>
                              Export Format
                         </label>
                         <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                              <button
                                   onClick={() => setSelectedFormat("csv")}
                                   style={{
                                        padding: "12px 24px",
                                        backgroundColor: selectedFormat === "csv" ? "#FFAE00" : "#1a1a1a",
                                        color: selectedFormat === "csv" ? "#1a1a1a" : "#ededed",
                                        border: `2px solid ${selectedFormat === "csv" ? "#FFAE00" : "rgba(255, 174, 0, 0.3)"}`,
                                        borderRadius: "8px",
                                        cursor: "pointer",
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        transition: "all 0.2s",
                                   }}
                              >
                                   📄 CSV
                              </button>
                              <button
                                   onClick={() => setSelectedFormat("json")}
                                   style={{
                                        padding: "12px 24px",
                                        backgroundColor: selectedFormat === "json" ? "#FFAE00" : "#1a1a1a",
                                        color: selectedFormat === "json" ? "#1a1a1a" : "#ededed",
                                        border: `2px solid ${selectedFormat === "json" ? "#FFAE00" : "rgba(255, 174, 0, 0.3)"}`,
                                        borderRadius: "8px",
                                        cursor: "pointer",
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        transition: "all 0.2s",
                                   }}
                              >
                                   📋 JSON
                              </button>
                              <button
                                   onClick={() => setSelectedFormat("xlsx")}
                                   style={{
                                        padding: "12px 24px",
                                        backgroundColor: selectedFormat === "xlsx" ? "#FFAE00" : "#1a1a1a",
                                        color: selectedFormat === "xlsx" ? "#1a1a1a" : "#ededed",
                                        border: `2px solid ${selectedFormat === "xlsx" ? "#FFAE00" : "rgba(255, 174, 0, 0.3)"}`,
                                        borderRadius: "8px",
                                        cursor: "pointer",
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        transition: "all 0.2s",
                                   }}
                              >
                                   📊 Excel (XLSX)
                              </button>
                         </div>
                    </div>

                    {/* Preview */}
                    <div style={{ marginBottom: "24px" }}>
                         <label style={{ display: "block", color: "#FFAE00", fontSize: "14px", fontWeight: "600", marginBottom: "12px" }}>
                              Preview ({previewRows} of {data.length} rows)
                         </label>
                         <div
                              style={{
                                   backgroundColor: "#1a1a1a",
                                   borderRadius: "8px",
                                   border: "1px solid rgba(255, 174, 0, 0.2)",
                                   padding: "16px",
                                   maxHeight: "400px",
                                   overflow: "auto",
                              }}
                         >
                              {selectedFormat === "csv" ? (
                                   <pre
                                        style={{
                                             margin: 0,
                                             color: "#ededed",
                                             fontSize: "12px",
                                             fontFamily: "monospace",
                                             whiteSpace: "pre-wrap",
                                             wordBreak: "break-all",
                                        }}
                                   >
                                        {generateCSVPreview}
                                   </pre>
                              ) : selectedFormat === "json" ? (
                                   <pre
                                        style={{
                                             margin: 0,
                                             color: "#ededed",
                                             fontSize: "12px",
                                             fontFamily: "monospace",
                                             whiteSpace: "pre-wrap",
                                        }}
                                   >
                                        {generateJSONPreview}
                                   </pre>
                              ) : (
                                   <div style={{ color: "#888", fontSize: "14px", textAlign: "center", padding: "20px" }}>
                                        Excel preview will be generated on export
                                        <div style={{ marginTop: "12px", fontSize: "12px" }}>
                                             Columns: {getColumns.join(", ")}
                                        </div>
                                   </div>
                              )}
                         </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                         <button
                              onClick={onClose}
                              disabled={exporting}
                              style={{
                                   padding: "12px 24px",
                                   backgroundColor: "#6b7280",
                                   color: "white",
                                   border: "none",
                                   borderRadius: "8px",
                                   cursor: exporting ? "not-allowed" : "pointer",
                                   fontSize: "14px",
                                   fontWeight: "600",
                                   opacity: exporting ? 0.5 : 1,
                              }}
                         >
                              Cancel
                         </button>
                         <button
                              onClick={handleExport}
                              disabled={exporting || data.length === 0}
                              style={{
                                   padding: "12px 24px",
                                   backgroundColor: exporting || data.length === 0 ? "#6b7280" : "#FFAE00",
                                   color: exporting || data.length === 0 ? "#888" : "#1a1a1a",
                                   border: "none",
                                   borderRadius: "8px",
                                   cursor: exporting || data.length === 0 ? "not-allowed" : "pointer",
                                   fontSize: "14px",
                                   fontWeight: "600",
                              }}
                         >
                              {exporting ? "Exporting..." : `Export as ${selectedFormat.toUpperCase()}`}
                         </button>
                    </div>
               </div>
          </div>
     );
}

