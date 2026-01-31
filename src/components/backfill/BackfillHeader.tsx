export default function BackfillHeader() {
     return (
          <div style={{ marginBottom: "32px", marginTop: "24px" }}>
               <h1 style={{ 
                    fontSize: "32px", 
                    fontWeight: "bold", 
                    marginBottom: "8px",
                    background: "linear-gradient(to right, #FFAE00, #FFD700)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text"
               }}>
                    📥 Backfill Management
               </h1>
               <p style={{ color: "#888888", fontSize: "16px", margin: 0 }}>
                    Manage historical data collection with start/stop, resume, and backup capabilities
               </p>
          </div>
     );
}

