"use client";

interface SymbolSyncStatusProps {
     lastSynced: string | null;
     showLabel?: boolean;
     size?: "small" | "medium" | "large";
}

export default function SymbolSyncStatus({ lastSynced, showLabel = true, size = "medium" }: SymbolSyncStatusProps) {
     const getTimeAgo = (dateString: string | null): string => {
          if (!dateString) return "Never";
          
          try {
               const date = new Date(dateString);
               const now = new Date();
               const diffMs = now.getTime() - date.getTime();
               const diffMins = Math.floor(diffMs / 60000);
               const diffHours = Math.floor(diffMs / 3600000);
               const diffDays = Math.floor(diffMs / 86400000);
               
               if (diffMins < 1) return "Just now";
               if (diffMins < 60) return `${diffMins}m ago`;
               if (diffHours < 24) return `${diffHours}h ago`;
               if (diffDays < 7) return `${diffDays}d ago`;
               
               return date.toLocaleDateString();
          } catch {
               return "Invalid date";
          }
     };
     
     const getStatusColor = (dateString: string | null): string => {
          if (!dateString) return "#888";
          
          try {
               const date = new Date(dateString);
               const now = new Date();
               const diffMs = now.getTime() - date.getTime();
               const diffHours = diffMs / 3600000;
               
               if (diffHours < 1) return "#22c55e"; // Green - synced within last hour
               if (diffHours < 24) return "#fbbf24"; // Yellow - synced within last day
               return "#ef4444"; // Red - synced more than a day ago
          } catch {
               return "#888";
          }
     };
     
     const fontSize = size === "small" ? "11px" : size === "large" ? "14px" : "12px";
     const statusColor = getStatusColor(lastSynced);
     const timeAgo = getTimeAgo(lastSynced);
     const fullDate = lastSynced ? new Date(lastSynced).toLocaleString() : "Never";
     
     return (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
               <span
                    style={{
                         width: size === "small" ? "6px" : size === "large" ? "10px" : "8px",
                         height: size === "small" ? "6px" : size === "large" ? "10px" : "8px",
                         borderRadius: "50%",
                         backgroundColor: statusColor,
                         display: "inline-block",
                    }}
               />
               {showLabel && (
                    <span style={{ color: "#888", fontSize, cursor: "help" }} title={fullDate}>
                         {timeAgo}
                    </span>
               )}
          </div>
     );
}

