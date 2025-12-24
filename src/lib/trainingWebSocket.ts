// WebSocket service for real-time training job updates

import { TrainingJob } from "@/types/training";

type JobStatusUpdateCallback = (job: TrainingJob) => void;
type ErrorCallback = (error: Error) => void;

class TrainingWebSocketService {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 3000; // 3 seconds
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private jobStatusCallbacks: Set<JobStatusUpdateCallback> = new Set();
    private errorCallbacks: Set<ErrorCallback> = new Set();
    private isConnecting = false;

    constructor() {
        if (typeof window === "undefined") {
            return; // Server-side rendering
        }
    }

    /**
     * Connect to WebSocket server
     */
    connect(): void {
        if (typeof window === "undefined" || this.ws?.readyState === WebSocket.OPEN) {
            return;
        }

        if (this.isConnecting) {
            return;
        }

        this.isConnecting = true;

        try {
            const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
            const token = localStorage.getItem("auth_token");
            
            // Connect to training WebSocket endpoint
            // Note: This assumes a WebSocket endpoint exists at /ws/training
            // If not available, we'll use polling instead
            const url = `${wsUrl}/ws/training${token ? `?token=${token}` : ""}`;
            
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                console.log("Training WebSocket connected");
                this.isConnecting = false;
                this.reconnectAttempts = 0;
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === "job_status_update" && data.job) {
                        this.notifyJobStatusCallbacks(data.job);
                    } else if (data.type === "all_jobs_update" && data.jobs) {
                        // Handle initial list or full refresh
                        data.jobs.forEach((job: TrainingJob) => {
                            this.notifyJobStatusCallbacks(job);
                        });
                    }
                } catch (error) {
                    console.error("Error parsing WebSocket message:", error);
                }
            };

            this.ws.onerror = (error) => {
                console.error("Training WebSocket error:", error);
                this.isConnecting = false;
                this.notifyErrorCallbacks(new Error("WebSocket connection error"));
            };

            this.ws.onclose = () => {
                console.log("Training WebSocket disconnected");
                this.isConnecting = false;
                this.ws = null;
                this.attemptReconnect();
            };
        } catch (error) {
            console.error("Error connecting to WebSocket:", error);
            this.isConnecting = false;
            this.notifyErrorCallbacks(error instanceof Error ? error : new Error("WebSocket connection failed"));
        }
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.reconnectAttempts = 0;
        this.isConnecting = false;
    }

    /**
     * Subscribe to job status updates
     */
    onJobStatusUpdate(callback: JobStatusUpdateCallback): () => void {
        this.jobStatusCallbacks.add(callback);
        
        // Return unsubscribe function
        return () => {
            this.jobStatusCallbacks.delete(callback);
        };
    }

    /**
     * Subscribe to error events
     */
    onError(callback: ErrorCallback): () => void {
        this.errorCallbacks.add(callback);
        
        // Return unsubscribe function
        return () => {
            this.errorCallbacks.delete(callback);
        };
    }

    /**
     * Check if WebSocket is connected
     */
    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    private notifyJobStatusCallbacks(job: TrainingJob): void {
        this.jobStatusCallbacks.forEach((callback) => {
            try {
                callback(job);
            } catch (error) {
                console.error("Error in job status callback:", error);
            }
        });
    }

    private notifyErrorCallbacks(error: Error): void {
        this.errorCallbacks.forEach((callback) => {
            try {
                callback(error);
            } catch (err) {
                console.error("Error in error callback:", err);
            }
        });
    }

    private attemptReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.warn("Max reconnection attempts reached");
            return;
        }

        this.reconnectAttempts++;
        this.reconnectTimeout = setTimeout(() => {
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            this.connect();
        }, this.reconnectDelay);
    }
}

// Singleton instance
let wsServiceInstance: TrainingWebSocketService | null = null;

export function getTrainingWebSocketService(): TrainingWebSocketService {
    if (typeof window === "undefined") {
        // Return a mock service for SSR
        // Create a minimal instance that satisfies the class structure
        const mockService = Object.create(TrainingWebSocketService.prototype);
        mockService.ws = null;
        mockService.reconnectAttempts = 0;
        mockService.maxReconnectAttempts = 5;
        mockService.reconnectDelay = 3000;
        mockService.reconnectTimeout = null;
        mockService.jobStatusCallbacks = new Set();
        mockService.errorCallbacks = new Set();
        mockService.isConnecting = false;
        mockService.connect = () => {};
        mockService.disconnect = () => {};
        mockService.onJobStatusUpdate = () => () => {};
        mockService.onError = () => () => {};
        mockService.isConnected = () => false;
        return mockService;
    }

    if (!wsServiceInstance) {
        wsServiceInstance = new TrainingWebSocketService();
    }

    return wsServiceInstance;
}

