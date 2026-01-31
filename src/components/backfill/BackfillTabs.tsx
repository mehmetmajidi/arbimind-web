interface BackfillTabsProps {
     currentTab: "symbols" | "single" | "batch";
     setCurrentTab: (tab: "symbols" | "single" | "batch") => void;
}

export default function BackfillTabs({ currentTab, setCurrentTab }: BackfillTabsProps) {
     const tabs = [
          { id: "symbols" as const, label: "All Symbols" },
          { id: "single" as const, label: "Single Backfill" },
          { id: "batch" as const, label: "Batch Backfill" },
     ];

     return (
          <div style={{ 
               marginBottom: "24px", 
               display: "flex", 
               gap: "16px", 
               borderBottom: "1px solid rgba(255, 255, 255, 0.1)" 
          }}>
               {tabs.map((tab) => (
                    <button
                         key={tab.id}
                         onClick={() => setCurrentTab(tab.id)}
                         style={{
                              padding: "12px 24px",
                              fontWeight: "600",
                              fontSize: "14px",
                              transition: "all 0.2s",
                              border: "none",
                              background: "transparent",
                              color: currentTab === tab.id ? "#FFAE00" : "#888888",
                              borderBottom: currentTab === tab.id ? "2px solid #FFAE00" : "2px solid transparent",
                              cursor: "pointer",
                         }}
                         onMouseEnter={(e) => {
                              if (currentTab !== tab.id) {
                                   e.currentTarget.style.color = "#ededed";
                              }
                         }}
                         onMouseLeave={(e) => {
                              if (currentTab !== tab.id) {
                                   e.currentTarget.style.color = "#888888";
                              }
                         }}
                    >
                         {tab.label}
                    </button>
               ))}
          </div>
     );
}

