"use client";

import { useState, useEffect } from "react";
import {
    TrainingControlsPanel,
    FilterStatusPanel,
    TrainingJobsTable,
    TrainingQueuePanel,
    TrainingMetricsCharts,
    TrainingSettingsModal,
    StartTrainingModal,
    ToastContainer,
    ErrorBoundary,
} from "@/components/training";

export default function TrainingPage() {
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showStartTrainingModal, setShowStartTrainingModal] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    return (
        <ErrorBoundary>
            <div style={{ 
                padding: isMobile ? "12px" : "24px", 
                width: "100%", 
                color: "#ededed" 
            }}>
                {/* Main Layout - Flexbox مشابه Market Page */}
                <div style={{ 
                    marginTop: "8px", 
                    marginBottom: "8px", 
                    display: "flex", 
                    flexDirection: isMobile ? "column" : "row",
                    gap: "0.5rem", 
                    alignItems: "flex-start", 
                    height: isMobile ? "auto" : "calc(100vh - 200px)", 
                    minHeight: isMobile ? "auto" : "600px" 
                }}>
                    {/* Left Panel - مشابه TradingPanel */}
                    <div style={{ 
                        display: "flex", 
                        flexDirection: "column", 
                        gap: "12px",
                        width: isMobile ? "100%" : "auto",
                        minWidth: isMobile ? "auto" : "280px",
                    }}>
                        <TrainingControlsPanel 
                            onStartTraining={() => setShowStartTrainingModal(true)}
                            onCheckFilter={() => console.log("Check Filter clicked")}
                            onSettings={() => setShowSettingsModal(true)}
                        />
                        {!isMobile && <FilterStatusPanel />}
                    </div>
                    
                    {/* Main Content - مشابه MainChart area */}
                    <div style={{ flex: isMobile ? "none" : "1", minWidth: 0, width: isMobile ? "100%" : "auto" }}>
                        <TrainingJobsTable 
                            onStartTraining={() => setShowStartTrainingModal(true)}
                        />
                    </div>
                    
                    {/* Right Panel - Optional (مشابه OrderPanel) */}
                    {!isMobile && (
                        <TrainingQueuePanel />
                    )}
                </div>
                
                {/* Bottom Panel - مشابه ArbitragePanel */}
                <div style={{ marginTop: isMobile ? "12px" : "0", width: "100%" }}>
                    <TrainingMetricsCharts />
                </div>
                
                {/* Mobile: Filter Status Panel (moved to bottom on mobile) */}
                {isMobile && (
                    <div style={{ marginTop: "12px" }}>
                        <FilterStatusPanel />
                    </div>
                )}
                
                {/* Mobile: Queue Panel (moved to bottom on mobile) */}
                {isMobile && (
                    <div style={{ marginTop: "12px" }}>
                        <TrainingQueuePanel />
                    </div>
                )}

                {/* Settings Modal */}
                <TrainingSettingsModal 
                    isOpen={showSettingsModal}
                    onClose={() => setShowSettingsModal(false)}
                />

                {/* Start Training Modal */}
                <StartTrainingModal
                    isOpen={showStartTrainingModal}
                    onClose={() => setShowStartTrainingModal(false)}
                    onSuccess={() => {
                        // Jobs will be refreshed automatically via WebSocket or polling
                        // But we can also trigger a manual refresh after a short delay
                        setTimeout(() => {
                            // Dispatch a custom event that TrainingJobsTable can listen to
                            window.dispatchEvent(new CustomEvent("refreshTrainingJobs"));
                        }, 1000);
                    }}
                />

                {/* Toast Container */}
                <ToastContainer />
            </div>
        </ErrorBoundary>
    );
}
