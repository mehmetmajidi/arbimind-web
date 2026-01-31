interface BackfillMessagesProps {
     error: string | null;
     success: string | null;
}

export default function BackfillMessages({ error, success }: BackfillMessagesProps) {
     return (
          <>
               {error && (
                    <div style={{
                         marginBottom: "16px",
                         padding: "12px",
                         backgroundColor: "rgba(239, 68, 68, 0.15)",
                         border: "2px solid rgba(239, 68, 68, 0.5)",
                         borderRadius: "8px",
                         color: "#ef4444",
                         fontSize: "14px",
                         fontWeight: "500",
                         display: "flex",
                         alignItems: "center",
                         gap: "8px"
                    }}>
                         <span>⚠️</span>
                         <span>{error}</span>
                    </div>
               )}
               {success && (
                    <div style={{
                         marginBottom: "16px",
                         padding: "12px",
                         backgroundColor: "rgba(34, 197, 94, 0.15)",
                         border: "2px solid rgba(34, 197, 94, 0.5)",
                         borderRadius: "8px",
                         color: "#22c55e",
                         fontSize: "14px",
                         fontWeight: "500",
                         display: "flex",
                         alignItems: "center",
                         gap: "8px"
                    }}>
                         <span>✅</span>
                         <span>{success}</span>
                    </div>
               )}
          </>
     );
}

